export const CONFIG = {
  exchange: process.env.EXCHANGE || 'binance',
  scanInterval: parseInt(process.env.SCAN_INTERVAL_MS) || 60000,
  maxOpenTrades: parseInt(process.env.MAX_OPEN_TRADES) || 3,
  riskPerTrade: parseFloat(process.env.RISK_PER_TRADE) || 0.01,
  capital: parseFloat(process.env.CAPITAL) || 10000,
  
  coins: process.env.COINS?.split(',') || [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
    'ADA/USDT', 'DOGE/USDT', 'MATIC/USDT', 'DOT/USDT', 'AVAX/USDT',
    'LINK/USDT', 'UNI/USDT', 'ATOM/USDT', 'LTC/USDT', 'NEAR/USDT',
    'APT/USDT', 'ARB/USDT', 'OP/USDT', 'INJ/USDT', 'TIA/USDT'
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
      longMin: 40,
      longMax: 55,
      shortMin: 55,
      shortMax: 70
    },
    confidence: {
      high: 6,
      medium: 4
    },
    volumeSpike: 1.5,
    oiChangeMin: 0.05
  }
};
