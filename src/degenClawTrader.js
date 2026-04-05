import { fetchWithTimeout, logFetchError } from './httpFetch.js';
import { DEGEN_CLAW_PROVIDER, DEFAULT_ACP_BASE_URL } from './degenConstants.js';

const POSITIONS_API =
  process.env.DEGEN_CLAW_USERS_API_URL || 'https://dgclaw-app-production.up.railway.app/users';

function acpBaseUrl() {
  const raw = (process.env.DEGEN_ACP_API_URL || process.env.ACP_API_URL || DEFAULT_ACP_BASE_URL).trim();
  return raw.replace(/\/$/, '');
}

/** "BTC" veya "BTC/USDC" → "BTC/USDC" */
export function normalizePerpPair(pairOrCoin) {
  const p = String(pairOrCoin).toUpperCase().trim();
  if (p.includes('/')) return p;
  return `${p}/USDC`;
}

export class DegenClawTrader {
  constructor(agent) {
    this.agent = agent;
    this.apiKey = agent.apiKey;
    this.walletAddress = agent.walletAddress;
    this.acpBase = acpBaseUrl();
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
   * Eski agdp.io Bearer + /job formatı değil.
   */
  async postAcpJob(jobOfferingName, serviceRequirements) {
    const url = `${this.acpBase}/acp/jobs`;
    const body = {
      providerWalletAddress: DEGEN_CLAW_PROVIDER,
      jobOfferingName,
      serviceRequirements
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

  async openPosition({ pair, side, size, leverage = 3, tpPercent, slPercent, currentPrice }) {
    const pairU = normalizePerpPair(pair);
    const sideLc = String(side).toLowerCase();

    let takeProfit;
    let stopLoss;
    if (tpPercent && slPercent && currentPrice) {
      const calc = this.calculateTPSL(currentPrice, tpPercent, slPercent, sideLc);
      takeProfit = calc.takeProfit;
      stopLoss = calc.stopLoss;
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

    console.log(
      `[${this.agent.label}] Opening ${sideLc.toUpperCase()} ${pairU} | $${size} @ ${serviceRequirements.leverage}x | TP: ${takeProfit} | SL: ${stopLoss} | ACP ${this.acpBase}`
    );

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
    const pairU = normalizePerpPair(pairOrCoin);
    console.log(`[${this.agent.label}] Closing ${pairU}...`);

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
    if (!pair) return '';
    return String(pair).toUpperCase().split('/')[0].split(':')[0];
  }

  async modifyPosition({ pair, side: _side, leverage, takeProfit, stopLoss }) {
    const pairU = normalizePerpPair(pair);
    const req = { pair: pairU };
    if (leverage != null && Number.isFinite(Number(leverage))) req.leverage = Math.floor(Number(leverage));
    if (takeProfit) req.takeProfit = takeProfit;
    if (stopLoss) req.stopLoss = stopLoss;

    console.log(`[${this.agent.label}] Modifying ${pairU}...`);

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
