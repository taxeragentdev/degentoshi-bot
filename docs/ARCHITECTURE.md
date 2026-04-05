# Trading Signal Bot - Architecture Documentation

## System Overview

This bot implements a multi-timeframe trading signal generation system for crypto perpetual futures markets.

## Architecture Components

### 1. Data Layer (`dataFetcher.js`)

Responsible for fetching market data from exchanges using CCXT library.

**Key Functions:**
- `fetchOHLCV()` - Get candlestick data for specified timeframe
- `fetchFundingRate()` - Get current funding rate
- `fetchOpenInterest()` - Get open interest data
- `fetchMarketData()` - Aggregate all data for a symbol

**Data Structure:**
```javascript
{
  symbol: 'BTC/USDT',
  candles1h: [...],    // 1H timeframe candles
  candles15m: [...],   // 15M timeframe candles
  candles5m: [...],    // 5M timeframe candles
  fundingRate: 0.0001,
  openInterest: 1000000,
  currentPrice: 65000,
  volume: 5000000
}
```

### 2. Indicator Layer (`indicators.js`)

Technical indicator calculations.

**Indicators:**
- EMA (Exponential Moving Average)
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- ATR (Average True Range)
- Volume Analysis
- Candlestick Patterns (Engulfing, Higher Low, Lower High)

### 3. Analysis Layer (`analyzer.js`)

Market analysis and condition checking.

**Key Functions:**
- `analyze()` - Calculate all indicators for market data
- `checkLongConditions()` - Verify long entry conditions
- `checkShortConditions()` - Verify short entry conditions
- `calculateStopLoss()` - ATR + swing-based stop loss
- `calculateTakeProfits()` - R-multiple based targets

**Condition Scoring:**
- Trend alignment: +2 points
- RSI in valid zone: +1 point
- MACD signal: +1 point
- Volume spike: +1 point
- OI increasing: +1 point
- Favorable funding: +1 point

### 4. Signal Generation Layer (`signalEngine.js`)

Signal creation and validation.

**Signal Output:**
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
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Validation Rules:**
- Minimum R:R ratio of 1:2
- Stop loss must be logical (below entry for longs)
- No duplicate trades for same coin
- Max open trades respected

### 5. Scanning Layer (`scanner.js`)

Orchestrates the entire scanning process.

**Flow:**
1. Loop through all configured coins
2. Fetch market data for each coin
3. Generate signal if conditions met
4. Output and save signal
5. Wait for next scan interval

### 6. Configuration (`config.js`)

Centralized configuration management.

**Configurable Parameters:**
- Coin list
- Timeframes
- Indicator periods
- Risk parameters
- Leverage levels
- Thresholds

## Trading Logic

### Long Entry Logic

**1H Timeframe (Trend):**
- Price > EMA(200) → Uptrend confirmed

**15M Timeframe (Setup):**
- Price pulls back near EMA(50)
- RSI between 40-55
- Volume contraction then expansion

**5M Timeframe (Entry):**
- MACD bullish crossover OR
- Bullish engulfing pattern OR
- Higher low formation

**Perpetual Confirmation:**
- Funding rate <= 0.01
- Open Interest increasing

### Short Entry Logic

**1H Timeframe (Trend):**
- Price < EMA(200) → Downtrend confirmed

**15M Timeframe (Setup):**
- Price rejects at EMA(50)
- RSI between 55-70

**5M Timeframe (Entry):**
- MACD bearish crossover OR
- Bearish engulfing pattern OR
- Lower high formation

**Perpetual Confirmation:**
- Funding rate >= 0.02 (trap detection)
- Open Interest increasing

## Risk Management

### Position Sizing
```
Risk Amount = Capital × Risk Per Trade (1%)
Risk Per Unit = |Entry - Stop Loss|
Position Size = Risk Amount / Risk Per Unit
```

### Stop Loss Methods
1. **ATR-Based**: 1.5 × ATR(14)
2. **Swing-Based**: Recent swing high/low
3. **Final**: More conservative of the two

### Take Profit Levels
- TP1: 1R (Risk amount)
- TP2: 2R
- TP3: 3R

### Leverage Allocation
- HIGH confidence (6-7 points): 5x
- MEDIUM confidence (4-5 points): 3x
- LOW confidence (<4 points): No trade

## Confidence Scoring System

Score accumulation:
- Trend alignment: +2
- RSI valid zone: +1
- MACD signal: +1
- Volume spike (>1.5x avg): +1
- OI increasing: +1
- Favorable funding: +1
- Extreme funding trap bias: +1

**Final Confidence:**
- 6-7 points: HIGH
- 4-5 points: MEDIUM
- <4 points: NO TRADE

## Data Flow

```
Exchange API
    ↓
DataFetcher (OHLCV, Funding, OI)
    ↓
MarketAnalyzer (Calculate Indicators)
    ↓
SignalEngine (Check Conditions + Score)
    ↓
Signal Validation (R:R, Logic Check)
    ↓
Output (Console + JSON File)
```

## Error Handling

- Network errors: Logged and skipped
- Invalid data: Return null, continue to next coin
- Rate limiting: Built into CCXT with `enableRateLimit`
- Graceful shutdown: SIGINT/SIGTERM handlers

## Extension Points

1. **Add New Indicators**: Extend `TechnicalIndicators` class
2. **Custom Strategies**: Modify `checkLongConditions()` / `checkShortConditions()`
3. **New Exchanges**: Change `CONFIG.exchange`
4. **Alert System**: Add webhook/email in `outputSignal()`
5. **Backtesting**: Record signals and compare with actual price action

## Performance Considerations

- Parallel data fetching with `Promise.all()`
- Rate limiting via CCXT
- Configurable scan interval
- Minimal memory footprint
- No persistent storage (stateless)

## Future Enhancements

- [ ] Historical backtesting module
- [ ] Machine learning confidence scoring
- [ ] Multi-exchange support
- [ ] Advanced order flow analysis
- [ ] Telegram/Discord notifications
- [ ] Web dashboard for monitoring
- [ ] Trade performance tracking
- [ ] Dynamic parameter optimization
