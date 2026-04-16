import { fetchWithTimeout, logFetchError } from './httpFetch.js';
import { DEGEN_CLAW_PROVIDER, DEFAULT_ACP_BASE_URL } from './degenConstants.js';
import { pairForAcp, baseCoinFromPair } from './perpSymbols.js';
import { getHlDirectCredentials, HyperliquidDirectSession } from './hyperliquidDirect.js';

export { pairForAcp, baseCoinFromPair } from './perpSymbols.js';

const POSITIONS_API =
  process.env.DEGEN_CLAW_USERS_API_URL || 'https://dgclaw-app-production.up.railway.app/users';

function acpBaseUrl() {
  const raw = (process.env.DEGEN_ACP_API_URL || process.env.ACP_API_URL || DEFAULT_ACP_BASE_URL).trim();
  return raw.replace(/\/$/, '');
}

/**
 * Degen Claw ACP: pair alanında yalnızca baz sembol (BTC, HYPE) veya HIP-3 (xyz:COIN).
 */
export class DegenClawTrader {
  constructor(agent) {
    this.agent = agent;
    this.apiKey = agent.apiKey;
    this.walletAddress = agent.walletAddress;
    this.acpBase = acpBaseUrl();
    const hl = getHlDirectCredentials(agent);
    this._hlDirect = hl ? new HyperliquidDirectSession({ ...hl, label: agent.label }) : null;
  }

  usesDirectHyperliquid() {
    return this._hlDirect != null;
  }

  buildAcpHeaders() {
    const h = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey
    };
    const bc = process.env.ACP_BUILDER_CODE?.trim();
    if (bc) h['x-builder-code'] = bc;
    return h;
  }

  /**
   * Virtuals ACP: POST /acp/jobs
   */
  async postAcpJob(jobOfferingName, serviceRequirements) {
    const req = { ...serviceRequirements };
    if (typeof req.pair === 'string' && req.pair.length > 0) {
      req.pair = pairForAcp(req.pair);
    }

    const url = `${this.acpBase}/acp/jobs`;
    const body = {
      providerWalletAddress: DEGEN_CLAW_PROVIDER,
      jobOfferingName,
      serviceRequirements: req
    };

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      timeoutMs: 90_000,
      headers: this.buildAcpHeaders(),
      body: JSON.stringify(body)
    });

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: `HTTP ${response.status}: ${text.slice(0, 200)}`
      };
    }

    if (!response.ok) {
      const err =
        json.message ||
        json.error ||
        json.detail ||
        (typeof json === 'string' ? json : JSON.stringify(json));
      return { success: false, error: String(err) };
    }

    const jobId = json?.data?.jobId ?? json?.data?.data?.jobId ?? json?.jobId;
    if (jobId != null || json?.success === true || json?.ok === true) {
      return { success: true, data: json, jobId };
    }

    if (json?.message && String(json.message).toLowerCase().includes('error')) {
      return { success: false, error: json.message };
    }

    return { success: true, data: json, jobId };
  }

  async getAccountBalance() {
    if (this._hlDirect) {
      return this._hlDirect.getAccountBalance();
    }
    try {
      const response = await fetchWithTimeout(`${POSITIONS_API}/${this.walletAddress}/account`, {
        timeoutMs: 20_000
      });
      const data = await response.json();

      if (data.data && data.data.hlBalance) {
        return {
          success: true,
          balance: parseFloat(data.data.hlBalance),
          withdrawable: parseFloat(data.data.withdrawableBalance)
        };
      }
      return { success: false, error: 'No balance data' };
    } catch (error) {
      logFetchError(`[${this.agent.label}] balance`, error);
      return { success: false, error: error.message };
    }
  }

  async getPositions() {
    if (this._hlDirect) {
      return this._hlDirect.getPositions();
    }
    try {
      const response = await fetchWithTimeout(`${POSITIONS_API}/${this.walletAddress}/positions`, {
        timeoutMs: 20_000
      });
      const data = await response.json();

      if (data.data) {
        return {
          success: true,
          positions: data.data
        };
      }
      return { success: false, error: 'No position data' };
    } catch (error) {
      logFetchError(`[${this.agent.label}] positions`, error);
      return { success: false, error: error.message };
    }
  }

  static formatPriceLevel(price) {
    const n = Number(price);
    if (!Number.isFinite(n)) return '0';
    const a = Math.abs(n);
    if (a >= 1000) return n.toFixed(2);
    if (a >= 1) return n.toFixed(4);
    if (a >= 0.01) return n.toFixed(6);
    return n.toFixed(8);
  }

  calculateTPSL(entryPrice, tpPercent, slPercent, side) {
    if (side === 'long') {
      const tp = entryPrice * (1 + tpPercent / 100);
      const sl = entryPrice * (1 - slPercent / 100);
      return {
        takeProfit: DegenClawTrader.formatPriceLevel(tp),
        stopLoss: DegenClawTrader.formatPriceLevel(sl)
      };
    }
    const tp = entryPrice * (1 - tpPercent / 100);
    const sl = entryPrice * (1 + slPercent / 100);
    return {
      takeProfit: DegenClawTrader.formatPriceLevel(tp),
      stopLoss: DegenClawTrader.formatPriceLevel(sl)
    };
  }

  /**
   * @param {{ pair: string, side: string, size: number, leverage?: number, tpPercent?: number, slPercent?: number, currentPrice?: number, takeProfitPrice?: number, stopLossPrice?: number, orderType?: 'market'|'limit', limitPrice?: string|number }} opts
   */
  async openPosition({
    pair,
    side,
    size,
    leverage = 3,
    tpPercent,
    slPercent,
    currentPrice,
    takeProfitPrice,
    stopLossPrice,
    orderType = 'market',
    limitPrice
  }) {
    const pairU = pairForAcp(pair);
    const sideLc = String(side).toLowerCase();

    let takeProfit;
    let stopLoss;

    const entry = Number(currentPrice);
    const tpAbs = takeProfitPrice != null ? Number(takeProfitPrice) : NaN;
    const slAbs = stopLossPrice != null ? Number(stopLossPrice) : NaN;
    if (Number.isFinite(entry) && entry > 0 && Number.isFinite(tpAbs) && Number.isFinite(slAbs)) {
      const longOk = sideLc !== 'short' && slAbs < entry && tpAbs > entry;
      const shortOk = sideLc === 'short' && slAbs > entry && tpAbs < entry;
      if (longOk || shortOk) {
        takeProfit = DegenClawTrader.formatPriceLevel(tpAbs);
        stopLoss = DegenClawTrader.formatPriceLevel(slAbs);
      }
    }

    if (!takeProfit && tpPercent && slPercent && currentPrice) {
      const calc = this.calculateTPSL(currentPrice, tpPercent, slPercent, sideLc);
      takeProfit = calc.takeProfit;
      stopLoss = calc.stopLoss;
    }

    const mode = this._hlDirect ? 'Hyperliquid (direkt)' : `ACP ${this.acpBase}`;
    console.log(
      `[${this.agent.label}] Opening ${sideLc.toUpperCase()} ${pairU} | $${size} @ ${Math.floor(Number(leverage)) || 3}x | TP: ${takeProfit} | SL: ${stopLoss} | ${mode}`
    );

    if (this._hlDirect) {
      try {
        return await this._hlDirect.openPosition({
          pair,
          side: sideLc,
          size,
          leverage,
          takeProfit,
          stopLoss,
          currentPrice,
          orderType,
          limitPrice
        });
      } catch (error) {
        logFetchError(`[${this.agent.label}] openPosition HL`, error);
        return { success: false, error: error.message };
      }
    }

    const serviceRequirements = {
      action: 'open',
      pair: pairU,
      side: sideLc === 'short' ? 'short' : 'long',
      size: String(size),
      leverage: Math.floor(Number(leverage)) || 3
    };
    if (takeProfit) serviceRequirements.takeProfit = takeProfit;
    if (stopLoss) serviceRequirements.stopLoss = stopLoss;
    if (orderType === 'limit' && limitPrice != null) {
      serviceRequirements.orderType = 'limit';
      serviceRequirements.limitPrice = String(limitPrice);
    }

    try {
      const result = await this.postAcpJob('perp_trade', serviceRequirements);
      if (result.success) {
        console.log(`[${this.agent.label}] ✅ Job submitted | jobId: ${result.jobId ?? '?'}`);
        return { success: true, data: result.data };
      }
      console.error(`[${this.agent.label}] ❌ Failed:`, result.error);
      return { success: false, error: result.error || 'Unknown' };
    } catch (error) {
      logFetchError(`[${this.agent.label}] openPosition`, error);
      const detail = error.cause
        ? `${error.message} — ${error.cause.message || error.cause}`
        : error.message;
      return { success: false, error: detail };
    }
  }

  async closePosition(pairOrCoin, _side) {
    const pairU = pairForAcp(pairOrCoin);
    console.log(`[${this.agent.label}] Closing ${pairU}...`);

    if (this._hlDirect) {
      try {
        const result = await this._hlDirect.closePosition(pairOrCoin);
        if (result.success) {
          console.log(`[${this.agent.label}] ✅ HL close ok`);
        }
        return result;
      } catch (error) {
        logFetchError(`[${this.agent.label}] closePosition HL`, error);
        return { success: false, error: error.message };
      }
    }

    try {
      const result = await this.postAcpJob('perp_trade', {
        action: 'close',
        pair: pairU
      });
      if (result.success) {
        console.log(`[${this.agent.label}] ✅ Close job submitted`);
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    } catch (error) {
      logFetchError(`[${this.agent.label}] closePosition`, error);
      const detail = error.cause
        ? `${error.message} — ${error.cause.message || error.cause}`
        : error.message;
      return { success: false, error: detail };
    }
  }

  static baseCoinFromPair(pair) {
    return baseCoinFromPair(pair);
  }

  async modifyPosition({ pair, side: _side, leverage, takeProfit, stopLoss }) {
    const pairU = pairForAcp(pair);
    const req = { pair: pairU };
    if (leverage != null && Number.isFinite(Number(leverage))) req.leverage = Math.floor(Number(leverage));
    if (takeProfit) req.takeProfit = takeProfit;
    if (stopLoss) req.stopLoss = stopLoss;

    console.log(`[${this.agent.label}] Modifying ${pairU}...`);

    if (this._hlDirect) {
      try {
        return await this._hlDirect.modifyPosition({
          pair,
          leverage,
          takeProfit,
          stopLoss
        });
      } catch (error) {
        logFetchError(`[${this.agent.label}] modifyPosition HL`, error);
        return { success: false, error: error.message };
      }
    }

    try {
      const result = await this.postAcpJob('perp_modify', req);
      if (result.success) {
        console.log(`[${this.agent.label}] ✅ Modify job submitted`);
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    } catch (error) {
      logFetchError(`[${this.agent.label}] modifyPosition`, error);
      const detail = error.cause
        ? `${error.message} — ${error.cause.message || error.cause}`
        : error.message;
      return { success: false, error: detail };
    }
  }

  async executeWithRetry(tradeFunction, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await tradeFunction();

        if (result.success) {
          return result;
        }

        if (attempt < maxRetries) {
          const delay = 2000 * attempt;
          console.log(`[${this.agent.label}] Retry ${attempt}/${maxRetries} in ${delay / 1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
        } else {
          return result;
        }
      } catch (err) {
        console.error(`[${this.agent.label}] Attempt ${attempt} failed:`, err.message);

        if (attempt === maxRetries) {
          return { success: false, error: err.message };
        }
      }
    }

    return { success: false, error: 'Failed after max retries' };
  }
}
