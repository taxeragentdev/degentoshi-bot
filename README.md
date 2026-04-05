# 🤖 Crypto Trading Signal Bot

**Production-ready cryptocurrency trading signal generator for perpetual futures markets.**

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-production--ready-success.svg)]()

---

## 📌 Overview

A sophisticated trading signal bot that analyzes multiple timeframes, technical indicators, and perpetual market data to generate high-confidence trade signals. **Does not execute trades** - only generates signals for external execution systems.

### Key Features

✅ **Multi-Timeframe Analysis** - 1H trend, 15M setup, 5M entry  
✅ **8+ Technical Indicators** - EMA, RSI, MACD, ATR, Volume, Patterns  
✅ **Perpetual Market Edge** - Funding rate & open interest analysis  
✅ **Confidence Scoring** - 7-point system for signal quality  
✅ **Dynamic Risk Management** - Adaptive leverage & position sizing  
✅ **Production Ready** - Error handling, logging, monitoring  
✅ **Highly Selective** - Quality over quantity (0-5 signals/day)  
✅ **No API Keys Required** - Uses public market data  

---

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Run health check
npm run health

# Start the bot
npm start
```

### First-Time Setup

1. **Requirements**: Node.js 18+
2. **Configure**: Edit `.env` file (coins, capital, risk)
3. **Test**: Run `npm run test:indicators`
4. **Launch**: Run `npm start`

**📖 New User?** See [GETTING_STARTED.md](GETTING_STARTED.md) for complete beginner's guide.

---

## 📊 How It Works

### Multi-Timeframe Strategy

| Timeframe | Purpose | Key Indicator |
|-----------|---------|---------------|
| **1H** | Trend Direction | EMA(200) |
| **15M** | Setup Detection | EMA(50) + RSI |
| **5M** | Entry Trigger | MACD + Patterns |

### Signal Example

```json
{
  "coin": "BTC",
  "action": "LONG",
  "entry": 65000,
  "stop_loss": 64000,
  "take_profit": [66000, 67000, 68000],
  "leverage": 5,
  "confidence": "HIGH",
  "reason": "1H uptrend + MACD bull cross + Volume spike",
  "timeframe": "5m/15m/1h confluence",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Confidence Scoring

| Score | Confidence | Leverage | Criteria |
|-------|-----------|----------|----------|
| 6-7 | **HIGH** | 5x | All conditions aligned |
| 4-5 | **MEDIUM** | 3x | Good setup, some confirmation |
| <4 | **LOW** | - | Filtered (no signal) |

**Score Points:**
- Trend alignment: +2
- Valid RSI zone: +1
- MACD/Pattern trigger: +1
- Volume spike: +1
- OI increasing: +1
- Favorable funding: +1

---

## 🎯 What Makes This Bot Different?

### Quality Over Quantity
- Generates 0-5 signals per day (by design)
- Only HIGH and MEDIUM confidence signals
- Minimum 1:2 risk/reward enforced

### Perpetual Futures Edge
- **Funding Rate Analysis**: Detect overcrowded positions
- **Open Interest Tracking**: Confirm trend sustainability
- **Trap Detection**: Fade extreme positioning

### Robust Risk Management
- 1% risk per trade (configurable)
- Max 3 concurrent trades
- ATR-based stop loss (adapts to volatility)
- Multi-target profit taking (1R, 2R, 3R)

---

## 📁 Project Structure

```
best-signalbot/
├── src/
│   ├── index.js              # Main entry point
│   ├── config.js             # Configuration
│   ├── dataFetcher.js        # Exchange data fetching
│   ├── indicators.js         # Technical indicators
│   ├── analyzer.js           # Market analysis
│   ├── signalEngine.js       # Signal generation
│   ├── scanner.js            # Scanner orchestration
│   └── utils/                # Utilities
├── docs/
│   ├── QUICKSTART.md         # Setup guide
│   ├── STRATEGY.md           # Trading strategy
│   ├── ARCHITECTURE.md       # System design
│   ├── API.md                # Code reference
│   └── DEPLOYMENT.md         # Production deployment
├── test/                     # Unit tests
├── examples/                 # Example signals
└── signals/                  # Generated signals
```

---

## ⚙️ Configuration

### Basic Settings (.env)

```env
EXCHANGE=binance              # Exchange (binance, bybit, etc.)
SCAN_INTERVAL_MS=60000       # Scan every 60 seconds
MAX_OPEN_TRADES=3            # Max concurrent trades
RISK_PER_TRADE=0.01          # 1% risk per trade
CAPITAL=10000                # Trading capital in USD
COINS=BTC/USDT,ETH/USDT      # Coins to monitor
```

### Advanced Settings (src/config.js)

- Indicator periods (EMA, RSI, MACD, ATR)
- Threshold values (funding, RSI zones, confidence)
- Risk parameters (R/R, leverage, TP multiples)

---

## 🧪 Testing

```bash
# Test all indicators
npm run test:indicators

# Test risk management
npm run test:risk

# Run system health check
npm run health
```

All tests passing ✅

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | Complete beginner's guide |
| [QUICKSTART.md](docs/QUICKSTART.md) | Quick setup instructions |
| [STRATEGY.md](docs/STRATEGY.md) | Trading strategy explained |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture |
| [API.md](docs/API.md) | Code API reference |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | Complete project overview |

---

## 🚢 Deployment

### Local Development
```bash
npm start
```

### Production with PM2
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
```

### Docker
```bash
docker-compose up -d
```

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

---

## 🔌 Integration

### Option 1: File Monitoring
Monitor `./signals/` directory for new JSON files.

### Option 2: Webhook
```javascript
// Add to scanner.js outputSignal()
await fetch('https://your-api.com/signals', {
  method: 'POST',
  body: JSON.stringify(signal)
});
```

### Option 3: Message Queue
Publish to Redis/RabbitMQ for distributed systems.

---

## 📊 Performance Expectations

- **Signal Frequency**: 0-5 per day
- **Win Rate Target**: 50-60%
- **Average R:R**: 1:2.5
- **Max Drawdown**: <15% (with proper sizing)
- **NO_TRADE Rate**: 80-90% (selective)

---

## 🛠️ Customization

### Add New Coins
```env
COINS=BTC/USDT,ETH/USDT,SOL/USDT,BNB/USDT,XRP/USDT
```

### Adjust Risk
```env
RISK_PER_TRADE=0.02  # 2% instead of 1%
```

### Change Indicator Periods
```javascript
// src/config.js
indicators: {
  ema200Period: 200,
  rsiPeriod: 14,
  // ... customize
}
```

---

## 🔒 Security

- ✅ No API keys required
- ✅ Read-only market data access
- ✅ No trade execution capability
- ✅ Environment-based configuration
- ✅ No sensitive data storage

---

## 📈 Monitoring

### Console Output
- Real-time scan progress
- Signal generation alerts
- Error logging

### File Output
- Signals saved to `./signals/` as JSON
- Timestamped for tracking
- Easy integration with external systems

### Health Check
```bash
npm run health
```

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| No signals generated | Normal! Bot is selective. Wait for better setups. |
| Network errors | Check internet. Verify exchange API accessible. |
| Module not found | Run `npm install` |
| High memory usage | Set PM2 memory limit: `--max-memory-restart 500M` |

---

## 🗺️ Roadmap

- [ ] Historical backtesting engine
- [ ] Web dashboard for monitoring
- [ ] Telegram/Discord integration
- [ ] Multi-exchange support
- [ ] Machine learning confidence scoring
- [ ] Advanced order flow analysis

---

## 📜 License

MIT License - Free to use and modify.

---

## 🙏 Credits

Built with:
- [CCXT](https://github.com/ccxt/ccxt) - Exchange connectivity
- Node.js - Runtime environment

---

## ⚠️ Disclaimer

**This bot generates trading signals for educational and informational purposes.**

- Does NOT execute trades automatically
- Does NOT guarantee profits
- Trading cryptocurrencies involves substantial risk
- Always practice proper risk management
- Start with paper trading
- Never risk more than you can afford to lose

**Use at your own risk.**

---

## 📞 Support

- 📖 Read the [documentation](docs/)
- 🔍 Check [examples](examples/)
- 🏥 Run health check: `npm run health`
- 📊 Review [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)

---

## 🎉 Ready to Start?

```bash
npm install
npm run health
npm start
```

**Happy Trading!** 🚀📈

---

*Built with attention to detail for serious crypto traders.*
