/** Hyperliquid mainnet = gerçek piyasa fiyatları; testnet fiyatları piyasadan sapar. */
const DEFAULT_HL_API = 'https://api.hyperliquid.xyz';

export const CONFIG = {
  exchange: 'hyperliquid',
  /** Market data kaynağı: varsayılan mainnet (CoinGlass / HL UI ile uyumlu fiyatlar) */
  hyperliquidApiUrl: (process.env.HYPERLIQUID_API_URL || DEFAULT_HL_API).replace(/\/$/, ''),
  scanInterval: parseInt(process.env.SCAN_INTERVAL_MS) || 60000,
  maxOpenTrades: parseInt(process.env.MAX_OPEN_TRADES) || 3,
  riskPerTrade: parseFloat(process.env.RISK_PER_TRADE) || 0.01,
  capital: 0, // Will be fetched dynamically from agent balances
  /** Aynı coin için tekrar Telegram / dosya sinyali (ms). Varsayılan 4 saat. */
  signalCooldownMs: parseInt(process.env.SIGNAL_COOLDOWN_MS, 10) || 4 * 60 * 60 * 1000,
  /** Telegram'a sadece bu güven ve üzeri: HIGH | MEDIUM (varsayılan HIGH = daha az spam) */
  telegramMinConfidence: (process.env.TELEGRAM_MIN_CONFIDENCE || 'HIGH').toUpperCase(),
  /**
   * Degen Claw otomatik emir eşiği.
   * Boş bırakılırsa TELEGRAM_MIN_CONFIDENCE ile aynı (Railway'de sadece TELEGRAM=MEDIUM yeter).
   * Farklı istiyorsan AUTO_TRADE_MIN_CONFIDENCE=HIGH gibi açıkça yaz.
   */
  autoTradeMinConfidence: (() => {
    const raw = process.env.AUTO_TRADE_MIN_CONFIDENCE;
    const telegram = (process.env.TELEGRAM_MIN_CONFIDENCE || 'HIGH').toUpperCase();
    if (raw != null && String(raw).trim() !== '') {
      return String(raw).trim().toUpperCase();
    }
    return telegram;
  })(),
  
  coins: process.env.COINS?.split(',') || [
    'BTC/USDC', 'ETH/USDC', 'SOL/USDC', 'DOGE/USDC',
    'PENGU/USDC', 'HYPE/USDC', 'PEPE/USDC', 'POPCAT/USDC',
    'BNB/USDC', 'XRP/USDC', 'ADA/USDC', 'AVAX/USDC',
    'LINK/USDC', 'MATIC/USDC', 'DOT/USDC', 'UNI/USDC',
    'ATOM/USDC', 'LTC/USDC', 'NEAR/USDC', 'APT/USDC'
  ],
  
  timeframes: {
    trend: '1h',
    setup: '15m',
    entry: '5m'
  },
  
  indicators: {
    ema200Period: 200,
    ema50Period: 50,
    rsiPeriod: 14,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    atrPeriod: 14,
    atrMultiplier: 1.5
  },
  
  risk: {
    minRiskReward: 2,
    tp1Multiplier: 1,
    tp2Multiplier: 2,
    tp3Multiplier: 3
  },
  
  leverage: {
    high: 5,
    medium: 3,
    low: 1
  },
  
  thresholds: {
    funding: {
      highPositive: 0.01,
      veryHighPositive: 0.02,
      highNegative: -0.01
    },
    rsi: {
      longMin: 35,      // 40'tan 35'e düşürdük (daha geniş aralık)
      longMax: 60,      // 55'ten 60'a çıkardık
      shortMin: 50,     // 55'ten 50'ye düşürdük
      shortMax: 75      // 70'ten 75'e çıkardık
    },
    confidence: {
      high: 6,
      medium: 4
    },
    volumeSpike: 1.3,   // 1.5'ten 1.3'e (daha hassas)
    oiChangeMin: 0.03   // 0.05'ten 0.03'e (daha hassas)
  }
};
