# Quick Start Guide

## Installation

### 1. Prerequisites
- Node.js v18+ installed
- npm or yarn package manager
- Terminal access

### 2. Install Dependencies

```bash
npm install
```

This will install:
- `ccxt` - Exchange connectivity
- `dotenv` - Environment configuration

### 3. Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` to customize:

```env
# Exchange (default: binance)
EXCHANGE=binance

# Scan interval in milliseconds (60000 = 1 minute)
SCAN_INTERVAL_MS=60000

# Maximum concurrent open trades
MAX_OPEN_TRADES=3

# Risk per trade (0.01 = 1%)
RISK_PER_TRADE=0.01

# Capital in USD
CAPITAL=10000

# Coins to monitor (comma-separated)
COINS=BTC/USDT,ETH/USDT,SOL/USDT,BNB/USDT
```

## Running the Bot

### Start the Scanner

```bash
npm start
```

### Development Mode (Auto-restart)

```bash
npm run dev
```

## What to Expect

When you start the bot, you'll see:

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    CRYPTO TRADING SIGNAL BOT                                  ║
║                    Perpetual Futures Edition                                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

🚀 Starting Crypto Signal Bot...
📊 Monitoring 20 coins
⏱️  Scan interval: 60s
💰 Capital: $10000
🎯 Risk per trade: 1%
📈 Max open trades: 3
────────────────────────────────────────────────────────────────────────────────

🔍 Scan #1 - 1/15/2024, 10:30:00 AM
📊 Open trades: 0/3
   Analyzing BTC... ✅ LONG signal!

════════════════════════════════════════════════════════════════════════════════
🎯 TRADING SIGNAL GENERATED
════════════════════════════════════════════════════════════════════════════════
{
  "coin": "BTC",
  "action": "LONG",
  "entry": 65000,
  "stop_loss": 64000,
  "take_profit": [66000, 67000, 68000],
  "leverage": 5,
  "confidence": "HIGH",
  "reason": "1H uptrend + MACD bull cross + Volume spike",
  "timeframe": "5m/15m/1h confluence"
}
════════════════════════════════════════════════════════════════════════════════
```

## Understanding the Output

### Signal Fields

- **coin**: Asset symbol (e.g., BTC, ETH)
- **action**: LONG, SHORT, or NO_TRADE
- **entry**: Recommended entry price
- **stop_loss**: Stop loss price
- **take_profit**: Array of 3 targets [TP1, TP2, TP3]
- **leverage**: 5x (HIGH confidence) or 3x (MEDIUM confidence)
- **confidence**: HIGH (6-7 points) or MEDIUM (4-5 points)
- **reason**: Why this signal was generated
- **timeframe**: Confirming all timeframes aligned

### Signal Files

All generated signals are saved to `./signals/` directory:
- Format: `signal_{COIN}_{TIMESTAMP}.json`
- Allows for logging and backtesting

## Testing Indicators

Run the indicator test suite:

```bash
node test/testIndicators.js
```

This validates all technical indicators with sample data.

## Customization

### Change Coins List

Edit `.env` file:
```env
COINS=BTC/USDT,ETH/USDT,SOL/USDT,MATIC/USDT
```

### Adjust Risk Parameters

Edit `src/config.js`:

```javascript
thresholds: {
  funding: {
    highPositive: 0.01,      // Adjust funding thresholds
    veryHighPositive: 0.02
  },
  rsi: {
    longMin: 40,              // Adjust RSI zones
    longMax: 55
  },
  confidence: {
    high: 6,                  // Adjust confidence levels
    medium: 4
  }
}
```

### Change Indicator Periods

Edit `src/config.js`:

```javascript
indicators: {
  ema200Period: 200,
  ema50Period: 50,
  rsiPeriod: 14,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  atrPeriod: 14,
  atrMultiplier: 1.5
}
```

## Integration with Degen Claw

This bot outputs JSON signals. To integrate with Degen Claw:

### Option 1: File Watching
Monitor the `./signals/` directory and parse new JSON files.

### Option 2: API Integration
Modify `scanner.js` `outputSignal()` method to POST signals to your endpoint:

```javascript
async outputSignal(signal) {
  console.log(JSON.stringify(signal, null, 2));
  
  // Add webhook/API call
  await fetch('https://your-degen-claw-endpoint.com/signals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signal)
  });
}
```

### Option 3: Message Queue
Use Redis, RabbitMQ, or similar to publish signals.

## Monitoring

### Key Metrics to Watch

1. **Signal Frequency**: 0-5 per day is normal
2. **Confidence Distribution**: More HIGH > MEDIUM signals = good
3. **NO_TRADE Rate**: Should be 80-90% (selective is good)
4. **Coin Distribution**: Some coins trade more than others

### Logs

The bot logs:
- Each scan cycle
- Coins analyzed
- Signals generated
- Errors encountered

Keep logs for performance analysis.

## Troubleshooting

### No Signals Generated

This is NORMAL and EXPECTED. The bot is designed to be selective.

Reasons:
- Markets are ranging (no clear trend)
- No high-confidence setups
- Risk/reward ratio insufficient

### Network Errors

```
Error fetching market data for BTC/USDT: Network timeout
```

Solutions:
- Check internet connection
- Verify exchange API is accessible
- Increase timeout in CCXT settings

### Rate Limiting

```
Error: Exchange rate limit exceeded
```

Solutions:
- Increase `SCAN_INTERVAL_MS` in `.env`
- Reduce number of coins in `COINS`
- CCXT automatically handles rate limiting

### Invalid Data

```
Error: Insufficient data for analysis
```

Causes:
- New coin with limited history
- Exchange API issues
- Delisted asset

Action: Remove problematic coin from `COINS` list.

## Performance Tips

### For Faster Scanning
- Reduce number of coins
- Increase scan interval
- Use faster exchange (some have better API)

### For Better Signals
- Add more coins (more opportunities)
- Lower confidence threshold (more signals, less quality)
- Adjust indicator periods for your market conditions

## Next Steps

1. **Run for 24 hours**: Observe signal quality
2. **Backtest signals**: Compare with actual price action
3. **Tune parameters**: Adjust based on results
4. **Integrate with execution**: Connect to Degen Claw
5. **Monitor performance**: Track win rate and R:R

## Support

For issues or questions:
1. Check `docs/ARCHITECTURE.md` for system details
2. Review `docs/STRATEGY.md` for trading logic
3. Examine example signals in `examples/`

## Safety Reminders

⚠️ **This bot generates signals only**
- It does NOT execute trades
- It does NOT hold funds
- It does NOT access your exchange account

✅ **For production use**:
- Start with small capital
- Validate signals manually at first
- Monitor performance continuously
- Adjust risk parameters conservatively

---

**Ready to generate your first signals!**

```bash
npm start
```

Good luck trading! 🚀
