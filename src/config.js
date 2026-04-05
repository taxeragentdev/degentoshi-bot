export const CONFIG = {
  exchange: 'hyperliquid', // Hyperliquid Testnet
  scanInterval: parseInt(process.env.SCAN_INTERVAL_MS) || 60000,
  maxOpenTrades: parseInt(process.env.MAX_OPEN_TRADES) || 3,
  riskPerTrade: parseFloat(process.env.RISK_PER_TRADE) || 0.01,
  capital: parseFloat(process.env.CAPITAL) || 10000,
  
  coins: process.env.COINS?.split(',') || [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'DOGE/USDT',
    'PENGU/USDT', 'HYPE/USDT', 'PEPE/USDT', 'POPCAT/USDT',
    'BNB/USDT', 'XRP/USDT', 'ADA/USDT', 'AVAX/USDT',
    'LINK/USDT', 'MATIC/USDT', 'DOT/USDT', 'UNI/USDT',
    'ATOM/USDT', 'LTC/USDT', 'NEAR/USDT', 'APT/USDT'
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
      high: 5,          // 6'dan 5'e düşürdük (daha kolay HIGH)
      medium: 3         // 4'ten 3'e düşürdük (daha kolay MEDIUM)
    },
    volumeSpike: 1.3,   // 1.5'ten 1.3'e (daha hassas)
    oiChangeMin: 0.03   // 0.05'ten 0.03'e (daha hassas)
  }
};
