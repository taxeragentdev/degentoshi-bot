/**
 * Degen Claw v2 — dgclaw-skill ile aynı mantık: Hyperliquid API cüzdanı ile doğrudan emir.
 * @see https://github.com/Virtual-Protocol/dgclaw-skill/blob/main/scripts/trade.ts
 */
import { privateKeyToAccount } from 'viem/accounts';
import { HttpTransport, ExchangeClient, InfoClient } from '@nktkas/hyperliquid';
import { CONFIG } from './config.js';
import { pairForAcp } from './perpSymbols.js';

function hlApiBase() {
  return (CONFIG.hyperliquidApiUrl || 'https://api.hyperliquid.xyz').replace(/\/$/, '');
}

function envAliasKey(alias) {
  return String(alias || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_');
}

/** Agent başına HL_API_WALLET_KEY eşleniği (dgclaw .env ile uyumlu isimlendirme). */
export function getHlDirectCredentials(agent) {
  const a = envAliasKey(agent.alias);
  const key =
    process.env[`HL_${a}_API_WALLET_KEY`]?.trim() ||
    process.env[`HL_${a}_API_KEY`]?.trim();
  const master =
    process.env[`HL_${a}_MASTER_ADDRESS`]?.trim() ||
    process.env[`HL_${a}_MASTER`]?.trim();
  if (!key || !master) return null;
  const pk = key.startsWith('0x') ? key : `0x${key}`;
  return { apiWalletKey: pk, masterAddress: master.trim() };
}

function formatPrice(price, significantFigures = 5) {
  return Number(price).toPrecision(significantFigures);
}

function formatSize(usdSize, price, szDecimals) {
  const rawSize = usdSize / price;
  return rawSize.toFixed(szDecimals);
}

async function getAssetIndex(info, pair) {
  const metaResponse = await info.meta();
  const universe = metaResponse.universe;
  const needle = pair.toUpperCase();
  const idx = universe.findIndex((asset) => String(asset.name).toUpperCase() === needle);
  if (idx === -1) {
    const names = universe.map((x) => x.name).slice(0, 40).join(', ');
    throw new Error(`Unknown HL pair: ${pair}. Örnekler: ${names}...`);
  }
  return { index: idx, meta: universe[idx] };
}

function hlErrorMessage(err) {
  if (!err) return 'Unknown';
  if (typeof err === 'string') return err;
  return err.message || err.shortMessage || JSON.stringify(err).slice(0, 400);
}

export class HyperliquidDirectSession {
  /**
   * @param {{ apiWalletKey: `0x${string}`, masterAddress: string, label?: string }} cred
   */
  constructor(cred) {
    this.masterAddress = cred.masterAddress;
    this.label = cred.label || 'HL';
    const transport = new HttpTransport({ url: hlApiBase() });
    this.info = new InfoClient({ transport });
    this.exchange = new ExchangeClient({
      wallet: privateKeyToAccount(cred.apiWalletKey),
      transport
    });
  }

  async getAccountBalance() {
    try {
      const user = this.masterAddress;

      const perpState = await this.info.clearinghouseState({ user });
      const withdrawable = parseFloat(perpState.withdrawable);
      const w = Number.isFinite(withdrawable) ? withdrawable : 0;

      const avRaw =
        perpState.marginSummary?.accountValue ??
        perpState.crossMarginSummary?.accountValue;
      const accountValue = parseFloat(avRaw);
      const av = Number.isFinite(accountValue) ? accountValue : 0;

      /** Unified hesapta USDC spot’ta; perp withdrawable sık sık 0 kalır (dgclaw balance ile aynı mantık). */
      let spotUsdcFree = 0;
      try {
        const spotState = await this.info.spotClearinghouseState({ user });
        for (const b of spotState?.balances ?? []) {
          const coin = String(b.coin ?? '').toUpperCase();
          if (coin === 'USDC') {
            const total = parseFloat(b.total ?? 0);
            const hold = parseFloat(b.hold ?? 0);
            spotUsdcFree += Math.max(0, total - hold);
          }
        }
      } catch {
        /* spot yok / hata — sadece perp kullan */
      }

      // Eskiden: isFinite(0) true → hep 0 dönüyordu. Kullanılabilir marjin ≈ bu üçlünün max’ı.
      const balance = Math.max(av, w, spotUsdcFree);

      if (balance <= 0) {
        console.warn(
          `[${this.label}] HL bakiye ~0 (master=${user.slice(0, 10)}…): perp withdrawable=${w}, accountValue=${av}, spotUSDC≈${spotUsdcFree}`
        );
      }

      return {
        success: true,
        balance,
        withdrawable: w,
        accountValue: av,
        spotUsdcFree
      };
    } catch (e) {
      return { success: false, error: hlErrorMessage(e) };
    }
  }

  mapPositionRow(posWrapper) {
    const p = posWrapper.position || posWrapper;
    const szi = parseFloat(p.szi);
    if (!Number.isFinite(szi) || szi === 0) return null;
    const coin = p.coin || '';
    return {
      pair: coin,
      side: szi > 0 ? 'long' : 'short',
      entryPrice: parseFloat(p.entryPx ?? p.entryPrice ?? 0),
      leverage: typeof p.leverage === 'object' ? p.leverage?.value ?? 1 : parseFloat(p.leverage) || 1,
      unrealizedPnl: parseFloat(p.unrealizedPnl ?? 0),
      markPrice: parseFloat(p.markPx ?? p.markPrice ?? 0),
      margin: parseFloat(p.marginUsed ?? p.margin ?? 0),
      liquidationPrice: parseFloat(p.liquidationPx ?? p.liquidationPrice ?? 0)
    };
  }

  async getPositions() {
    try {
      const state = await this.info.clearinghouseState({ user: this.masterAddress });
      const raw = state.assetPositions || [];
      const positions = raw.map((row) => this.mapPositionRow(row)).filter(Boolean);
      return { success: true, positions };
    } catch (e) {
      return { success: false, error: hlErrorMessage(e), positions: [] };
    }
  }

  /**
   * @param {{ pair: string, side: string, size: number, leverage?: number, takeProfit?: string, stopLoss?: string, currentPrice?: number, orderType?: 'market'|'limit', limitPrice?: string|number }} args
   */
  async openPosition(args) {
    const pair = pairForAcp(args.pair);
    const sideLc = String(args.side).toLowerCase();
    const isBuy = sideLc === 'long';
    const leverage = Math.floor(Number(args.leverage)) || 1;
    const orderType = args.orderType === 'limit' ? 'limit' : 'market';
    const usdSize = Number(args.size);
    if (!Number.isFinite(usdSize) || usdSize <= 0) {
      return { success: false, error: 'Invalid size' };
    }

    try {
      const { index: assetId, meta } = await getAssetIndex(this.info, pair);

      await this.exchange.updateLeverage({
        asset: assetId,
        isCross: true,
        leverage
      });

      const mids = await this.info.allMids();
      const midPrice = parseFloat(mids[meta.name] ?? mids[pair.toUpperCase()] ?? mids[pair]);
      if (!Number.isFinite(midPrice) || midPrice <= 0) {
        return { success: false, error: `Mid fiyat alınamadı: ${pair} (HL: ${meta.name})` };
      }

      let orderPrice;
      let tif;
      if (orderType === 'limit' && args.limitPrice != null) {
        orderPrice = String(args.limitPrice);
        tif = 'Gtc';
      } else {
        const slippage = isBuy ? 1.01 : 0.99;
        orderPrice = formatPrice(midPrice * slippage);
        tif = 'Ioc';
      }

      const sz = formatSize(usdSize, midPrice, meta.szDecimals);

      await this.exchange.order({
        orders: [
          {
            a: assetId,
            b: isBuy,
            r: false,
            p: orderPrice,
            s: sz,
            t: { limit: { tif } }
          }
        ],
        grouping: 'na'
      });

      const tp = args.takeProfit != null ? String(args.takeProfit) : '';
      const sl = args.stopLoss != null ? String(args.stopLoss) : '';

      if (tp) {
        await this.exchange.order({
          orders: [
            {
              a: assetId,
              b: !isBuy,
              r: true,
              p: tp,
              s: sz,
              t: {
                trigger: {
                  triggerPx: tp,
                  isMarket: true,
                  tpsl: 'tp'
                }
              }
            }
          ],
          grouping: 'na'
        });
      }

      if (sl) {
        await this.exchange.order({
          orders: [
            {
              a: assetId,
              b: !isBuy,
              r: true,
              p: sl,
              s: sz,
              t: {
                trigger: {
                  triggerPx: sl,
                  isMarket: true,
                  tpsl: 'sl'
                }
              }
            }
          ],
          grouping: 'na'
        });
      }

      return { success: true, data: { pair, side: sideLc, orderType, midPrice } };
    } catch (e) {
      return { success: false, error: hlErrorMessage(e) };
    }
  }

  async closePosition(pairOrCoin) {
    const pair = pairForAcp(pairOrCoin);
    try {
      const { index: assetId, meta } = await getAssetIndex(this.info, pair);
      const state = await this.info.clearinghouseState({ user: this.masterAddress });
      const position = state.assetPositions.find(
        (row) => String(row.position?.coin || '').toUpperCase() === pair.toUpperCase()
      );
      if (!position) {
        return { success: false, error: `Açık pozisyon yok: ${pair}` };
      }
      const szi = parseFloat(position.position.szi);
      const isBuy = szi < 0;
      const sz = Math.abs(szi).toString();

      const mids = await this.info.allMids();
      const midPrice = parseFloat(mids[meta.name] ?? mids[pair.toUpperCase()] ?? mids[pair]);
      if (!Number.isFinite(midPrice) || midPrice <= 0) {
        return { success: false, error: `Mid fiyat alınamadı: ${pair}` };
      }
      const slippage = isBuy ? 1.01 : 0.99;
      const orderPrice = formatPrice(midPrice * slippage);

      await this.exchange.order({
        orders: [
          {
            a: assetId,
            b: isBuy,
            r: true,
            p: orderPrice,
            s: sz,
            t: { limit: { tif: 'Ioc' } }
          }
        ],
        grouping: 'na'
      });

      return { success: true, data: { pair } };
    } catch (e) {
      return { success: false, error: hlErrorMessage(e) };
    }
  }

  async modifyPosition({ pair, leverage, takeProfit, stopLoss }) {
    const pairU = pairForAcp(pair);
    try {
      if (leverage == null && !takeProfit && !stopLoss) {
        return { success: false, error: 'leverage, takeProfit veya stopLoss gerekli' };
      }

      const { index: assetId } = await getAssetIndex(this.info, pairU);
      const state = await this.info.clearinghouseState({ user: this.masterAddress });
      const position = state.assetPositions.find(
        (row) => String(row.position?.coin || '').toUpperCase() === pairU.toUpperCase()
      );
      if (!position) {
        return { success: false, error: `Açık pozisyon yok: ${pairU}` };
      }

      const szi = parseFloat(position.position.szi);
      const isBuy = szi > 0;
      const sz = Math.abs(szi).toString();

      if (leverage != null && Number.isFinite(Number(leverage))) {
        await this.exchange.updateLeverage({
          asset: assetId,
          isCross: true,
          leverage: Math.floor(Number(leverage))
        });
      }

      const openOrders = await this.info.openOrders({ user: this.masterAddress });
      const tpslOrders = openOrders.filter(
        (o) =>
          String(o.coin || '').toUpperCase() === pairU.toUpperCase() &&
          String(o.orderType || '').toLowerCase().includes('trigger')
      );
      for (const order of tpslOrders) {
        try {
          await this.exchange.cancel({ cancels: [{ a: assetId, o: order.oid }] });
        } catch {
          /* ignore */
        }
      }

      const tp = takeProfit != null ? String(takeProfit) : '';
      const sl = stopLoss != null ? String(stopLoss) : '';

      if (tp) {
        await this.exchange.order({
          orders: [
            {
              a: assetId,
              b: !isBuy,
              r: true,
              p: tp,
              s: sz,
              t: {
                trigger: {
                  triggerPx: tp,
                  isMarket: true,
                  tpsl: 'tp'
                }
              }
            }
          ],
          grouping: 'na'
        });
      }

      if (sl) {
        await this.exchange.order({
          orders: [
            {
              a: assetId,
              b: !isBuy,
              r: true,
              p: sl,
              s: sz,
              t: {
                trigger: {
                  triggerPx: sl,
                  isMarket: true,
                  tpsl: 'sl'
                }
              }
            }
          ],
          grouping: 'na'
        });
      }

      return { success: true, data: { pair: pairU } };
    } catch (e) {
      return { success: false, error: hlErrorMessage(e) };
    }
  }
}
