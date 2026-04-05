# Getting Started with Crypto Signal Bot

## 🎬 Complete Beginner's Guide

This guide will walk you through setting up and running the crypto trading signal bot from scratch.

---

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ Windows, macOS, or Linux computer
- ✅ Internet connection
- ✅ 30 minutes of time

---

## Step 1: Install Node.js

### Windows

1. Download Node.js from [nodejs.org](https://nodejs.org/)
2. Choose the LTS version (recommended)
3. Run the installer
4. Accept defaults and complete installation

### macOS

```bash
# Using Homebrew
brew install node

# Or download from nodejs.org
```

### Linux (Ubuntu/Debian)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Verify Installation

```bash
node --version
# Should show v18.x.x or higher

npm --version
# Should show 9.x.x or higher
```

---

## Step 2: Download the Bot

### Option A: Download ZIP
1. Download the project as ZIP
2. Extract to a folder (e.g., `C:\trading-bot` or `~/trading-bot`)

### Option B: Git Clone (if you have git)
```bash
git clone <repository-url> trading-bot
cd trading-bot
```

---

## Step 3: Open Terminal/Command Prompt

### Windows
1. Press `Win + R`
2. Type `powershell`
3. Press Enter
4. Navigate to project: `cd path\to\trading-bot`

### macOS/Linux
1. Open Terminal
2. Navigate to project: `cd path/to/trading-bot`

---

## Step 4: Install Dependencies

In the terminal, run:

```bash
npm install
```

You should see:
```
added 3 packages, and audited 4 packages in 4s
found 0 vulnerabilities
```

---

## Step 5: Configure the Bot

### Create Configuration File

The bot needs a `.env` file. There's already an example:

```bash
# The .env file already exists with default settings
# You can edit it to customize
```

### Open `.env` File

**Windows**: Right-click → Open with Notepad
**macOS/Linux**: Use any text editor

### Configuration Explained

```env
# Which exchange to use (default: binance)
EXCHANGE=binance

# How often to scan in milliseconds (60000 = 1 minute)
SCAN_INTERVAL_MS=60000

# Maximum number of concurrent open trades
MAX_OPEN_TRADES=3

# Risk per trade (0.01 = 1% of capital)
RISK_PER_TRADE=0.01

# Your trading capital in USD
CAPITAL=10000

# Which coins to monitor (comma-separated)
COINS=BTC/USDT,ETH/USDT,SOL/USDT
```

### Recommended Starting Configuration

For beginners, use these settings:

```env
EXCHANGE=binance
SCAN_INTERVAL_MS=60000
MAX_OPEN_TRADES=3
RISK_PER_TRADE=0.01
CAPITAL=10000
COINS=BTC/USDT,ETH/USDT,SOL/USDT,BNB/USDT,XRP/USDT
```

**Save the file** after editing.

---

## Step 6: Run Health Check

Before starting, verify everything is working:

```bash
npm run health
```

You should see:

```
🏥 System Health Check

✅ All checks passed! System is ready.
```

If you see any ❌, follow the error messages to fix issues.

---

## Step 7: Start the Bot

```bash
npm start
```

You should see:

```
╔═══════════════════════════════════════════════════════════════╗
║           CRYPTO TRADING SIGNAL BOT                           ║
║           Perpetual Futures Edition                           ║
╚═══════════════════════════════════════════════════════════════╝

🚀 Starting Crypto Signal Bot...
📊 Monitoring 5 coins
⏱️  Scan interval: 60s
💰 Capital: $10000
🎯 Risk per trade: 1%
📈 Max open trades: 3
```

The bot will now start scanning!

---

## Step 8: Understanding the Output

### Normal Operation

Most of the time, you'll see:

```
🔍 Scan #1 - 1/15/2024, 10:30:00 AM
📊 Open trades: 0/3
   Analyzing BTC... ⏭️  No trade
   Analyzing ETH... ⏭️  No trade
   Analyzing SOL... ⏭️  No trade

✓ Scan completed in 12.3s
📡 Signals generated: 0
💤 No high-confidence setups found
```

**This is NORMAL and GOOD!** The bot is selective.

### When a Signal is Found

```
🔍 Scan #5 - 1/15/2024, 11:45:00 AM
📊 Open trades: 0/3
   Analyzing BTC... ✅ LONG signal!

════════════════════════════════════════════════════════════════
🎯 TRADING SIGNAL GENERATED
════════════════════════════════════════════════════════════════
{
  "coin": "BTC",
  "action": "LONG",
  "entry": 65000,
  "stop_loss": 64000,
  "take_profit": [66000, 67000, 68000],
  "leverage": 5,
  "confidence": "HIGH",
  "reason": "1H uptrend + MACD bull cross + Volume spike"
}
════════════════════════════════════════════════════════════════
```

**This means**: A high-quality trading setup was detected!

---

## Step 9: Understanding Signals

### Signal Fields Explained

```json
{
  "coin": "BTC",              // Which cryptocurrency
  "action": "LONG",           // LONG (buy) or SHORT (sell)
  "entry": 65000,            // Price to enter at
  "stop_loss": 64000,        // Price to exit if wrong (limit loss)
  "take_profit": [           // Prices to take profit at
    66000,                   // TP1: First target (1R)
    67000,                   // TP2: Second target (2R)
    68000                    // TP3: Third target (3R)
  ],
  "leverage": 5,             // Recommended leverage multiplier
  "confidence": "HIGH",      // How strong the signal is
  "reason": "..."            // Why this signal was generated
}
```

### What to Do with Signals

**Option 1: Manual Trading**
- Use the signal as guidance
- Enter trade on your exchange
- Set stop loss and take profit orders

**Option 2: Automated Execution**
- Send signals to your trading bot (e.g., Degen Claw)
- Signals are saved to `signals/` folder as JSON files

---

## Step 10: Where are Signals Saved?

All signals are automatically saved to:

```
trading-bot/
  └── signals/
      ├── signal_BTC_1705318800000.json
      ├── signal_ETH_1705319400000.json
      └── ...
```

You can:
- Read these files to review past signals
- Parse them with other programs
- Send them to execution systems

---

## Step 11: Stopping the Bot

To stop the bot:

1. Press `Ctrl + C` in the terminal
2. Wait for graceful shutdown message
3. Bot will stop scanning

```
⚠️  Shutting down gracefully...
🛑 Scanner stopped
```

---

## Step 12: Running 24/7 (Optional)

The bot only runs while the terminal is open. For 24/7 operation:

### Option 1: Keep Computer On
- Simple but not efficient
- Computer must stay on

### Option 2: Use PM2 (Recommended)

Install PM2:
```bash
npm install -g pm2
```

Start bot with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
```

PM2 Commands:
```bash
pm2 status        # Check if running
pm2 logs          # View logs
pm2 restart all   # Restart
pm2 stop all      # Stop
```

### Option 3: Deploy to Server
- Rent a VPS (DigitalOcean, AWS, etc.)
- See `docs/DEPLOYMENT.md` for details

---

## 📊 What to Expect

### Signal Frequency

- **0-5 signals per day** is normal
- Most scans will find nothing (by design)
- Quality over quantity

### Confidence Levels

- **HIGH** (6-7 points): Best setups, 5x leverage
- **MEDIUM** (4-5 points): Good setups, 3x leverage
- **LOW** (<4 points): Filtered out, no signal

### Market Conditions

Bot works best in:
- ✅ Trending markets (up or down)
- ✅ Normal volatility
- ✅ Clear directional moves

Bot struggles in:
- ❌ Sideways/choppy markets
- ❌ Extremely low volatility
- ❌ Major news events

---

## 🔧 Customization

### Monitor More Coins

Edit `.env`:
```env
COINS=BTC/USDT,ETH/USDT,SOL/USDT,BNB/USDT,XRP/USDT,ADA/USDT,DOGE/USDT
```

### Change Scan Frequency

```env
# Scan every 2 minutes instead of 1
SCAN_INTERVAL_MS=120000
```

### Adjust Risk

```env
# Risk 2% per trade instead of 1%
RISK_PER_TRADE=0.02
```

---

## 🆘 Troubleshooting

### "npm not found"
- Install Node.js (Step 1)
- Restart terminal after installation

### "Cannot find module 'ccxt'"
- Run `npm install` in project directory

### "Error fetching market data"
- Check internet connection
- Verify exchange API is accessible
- Try again in a few minutes

### "No signals generated"
- This is normal! Bot is selective
- Wait for market conditions to improve
- Try lowering confidence thresholds (advanced)

### Bot crashes immediately
- Run `npm run health` to diagnose
- Check for error messages
- Verify `.env` file exists

---

## 📚 Next Steps

Once comfortable:

1. **Read Strategy Guide**: `docs/STRATEGY.md`
   - Understand why signals are generated
   - Learn the trading logic

2. **Explore Configuration**: `docs/API.md`
   - Customize indicator periods
   - Adjust thresholds

3. **Deploy to Production**: `docs/DEPLOYMENT.md`
   - Set up 24/7 operation
   - Add monitoring

4. **Integrate with Execution**: 
   - Connect to Degen Claw
   - Automate trading

---

## 💡 Tips for Beginners

1. **Start Small**
   - Monitor just 3-5 coins initially
   - Use conservative capital settings

2. **Paper Trade First**
   - Don't use real money immediately
   - Observe signals for a week

3. **Understand the Strategy**
   - Read `docs/STRATEGY.md`
   - Know why signals are generated

4. **Be Patient**
   - Bot is selective by design
   - Quality > quantity

5. **Keep Learning**
   - Study technical analysis
   - Understand perpetual futures
   - Practice risk management

---

## ✅ Quick Command Reference

```bash
# Install dependencies
npm install

# Run health check
npm run health

# Start the bot
npm start

# Test indicators
npm run test:indicators

# Test risk management
npm run test:risk

# Stop the bot
Ctrl + C
```

---

## 🎓 Learning Resources

### Technical Analysis
- [Investopedia - Technical Analysis](https://www.investopedia.com/technical-analysis-4689657)
- [BabyPips - Forex School](https://www.babypips.com/learn/forex)

### Risk Management
- [Position Sizing](https://www.investopedia.com/terms/p/positionsizing.asp)
- [Risk/Reward Ratio](https://www.investopedia.com/terms/r/riskrewardratio.asp)

### Perpetual Futures
- [What are Perpetual Futures?](https://www.binance.com/en/support/faq/what-are-perpetual-futures-contracts-360039645972)
- [Understanding Funding Rate](https://www.binance.com/en/support/faq/what-is-funding-rate-and-how-is-it-calculated-360033525271)

---

## 🎉 You're Ready!

Congratulations! You've successfully set up the crypto trading signal bot.

**Remember**:
- This bot generates signals only (does not execute trades)
- Always practice proper risk management
- Start with paper trading
- Never risk more than you can afford to lose

**Need Help?**
- Check documentation in `docs/` folder
- Review examples in `examples/` folder
- Run health check: `npm run health`

**Happy Trading!** 🚀📈

---

*For advanced features and customization, see the full documentation.*
