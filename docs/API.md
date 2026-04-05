# API Reference

## Core Classes

### DataFetcher

Handles all exchange data fetching operations.

#### Constructor

```javascript
import { DataFetcher } from './dataFetcher.js';
const fetcher = new DataFetcher();
```

#### Methods

**fetchOHLCV(symbol, timeframe, limit)**
- Fetches candlestick data
- Parameters:
  - `symbol` (string): Trading pair (e.g., 'BTC/USDT')
  - `timeframe` (string): Candle timeframe (e.g., '1h', '15m', '5m')
  - `limit` (number): Number of candles to fetch (default: 300)
- Returns: Array of candle objects or null

```javascript
const candles = await fetcher.fetchOHLCV('BTC/USDT', '1h', 200);
// Returns: [{ timestamp, open, high, low, close, volume }, ...]
```

**fetchFundingRate(symbol)**
- Fetches current funding rate
- Parameters:
  - `symbol` (string): Trading pair
- Returns: Object with rate and timestamp

```javascript
const funding = await fetcher.fetchFundingRate('BTC/USDT');
// Returns: { rate: 0.0001, timestamp: 1234567890 }
```

**fetchOpenInterest(symbol)**
- Fetches open interest data
- Parameters:
  - `symbol` (string): Trading pair
- Returns: Object with value and timestamp

**fetchMarketData(symbol)**
- Aggregates all market data for a symbol
- Parameters:
  - `symbol` (string): Trading pair
- Returns: Complete market data object

```javascript
const data = await fetcher.fetchMarketData('BTC/USDT');
// Returns: {
//   symbol, candles1h, candles15m, candles5m,
//   fundingRate, openInterest, currentPrice, volume
// }
```

---

### TechnicalIndicators

Static class with indicator calculation methods.

#### Methods

**calculateEMA(prices, period)**
- Calculates Exponential Moving Average
- Parameters:
  - `prices` (array): Array of price values
  - `period` (number): EMA period
- Returns: Single EMA value or null

```javascript
import { TechnicalIndicators } from './indicators.js';

const closes = [100, 102, 101, 103, 105];
const ema20 = TechnicalIndicators.calculateEMA(closes, 20);
```

**calculateRSI(prices, period)**
- Calculates Relative Strength Index
- Parameters:
  - `prices` (array): Array of price values
  - `period` (number): RSI period (default: 14)
- Returns: RSI value (0-100) or null

```javascript
const rsi = TechnicalIndicators.calculateRSI(closes, 14);
// Returns: 65.43
```

**calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod)**
- Calculates MACD indicator
- Parameters:
  - `prices` (array): Array of price values
  - `fastPeriod` (number): Fast EMA period (default: 12)
  - `slowPeriod` (number): Slow EMA period (default: 26)
  - `signalPeriod` (number): Signal line period (default: 9)
- Returns: MACD object or null

```javascript
const macd = TechnicalIndicators.calculateMACD(closes, 12, 26, 9);
// Returns: {
//   macd: 1.23,
//   signal: 0.98,
//   histogram: 0.25,
//   bullishCrossover: true,
//   bearishCrossover: false
// }
```

**calculateATR(highs, lows, closes, period)**
- Calculates Average True Range
- Parameters:
  - `highs` (array): Array of high prices
  - `lows` (array): Array of low prices
  - `closes` (array): Array of close prices
  - `period` (number): ATR period (default: 14)
- Returns: ATR value or null

**detectBullishEngulfing(candles)**
- Detects bullish engulfing pattern
- Parameters:
  - `candles` (array): Array of candle objects
- Returns: Boolean

**detectBearishEngulfing(candles)**
- Detects bearish engulfing pattern
- Parameters:
  - `candles` (array): Array of candle objects
- Returns: Boolean

**calculateVolumeChange(volumes, lookback)**
- Calculates volume spike ratio
- Parameters:
  - `volumes` (array): Array of volume values
  - `lookback` (number): Periods for average (default: 20)
- Returns: Volume ratio (e.g., 1.5 = 1.5x average)

---

### MarketAnalyzer

Analyzes market data and generates conditions.

#### Constructor

```javascript
import { MarketAnalyzer } from './analyzer.js';
const analyzer = new MarketAnalyzer();
```

#### Methods

**analyze(marketData)**
- Analyzes market data and calculates all indicators
- Parameters:
  - `marketData` (object): Output from DataFetcher.fetchMarketData()
- Returns: Analysis object or null

```javascript
const analysis = analyzer.analyze(marketData);
// Returns: {
//   currentPrice, ema200_1h, ema50_15m, rsi15m, macd5m,
//   atr5m, fundingRate, bullishEngulfing, bearishEngulfing,
//   higherLow, lowerHigh, volumeRatio, candles5m
// }
```

**checkLongConditions(analysis)**
- Checks if long entry conditions are met
- Parameters:
  - `analysis` (object): Output from analyze()
- Returns: Conditions object

```javascript
const longConditions = analyzer.checkLongConditions(analysis);
// Returns: {
//   trend: true,
//   setup: true,
//   entry: true,
//   perpConfirmation: true,
//   score: 7,
//   reasons: ['1H uptrend', 'MACD bull cross', ...]
// }
```

**checkShortConditions(analysis)**
- Checks if short entry conditions are met
- Parameters:
  - `analysis` (object): Output from analyze()
- Returns: Conditions object

**calculateStopLoss(action, analysis)**
- Calculates stop loss price
- Parameters:
  - `action` (string): 'LONG' or 'SHORT'
  - `analysis` (object): Market analysis
- Returns: Stop loss price

**calculateTakeProfits(action, entry, stopLoss)**
- Calculates take profit levels
- Parameters:
  - `action` (string): 'LONG' or 'SHORT'
  - `entry` (number): Entry price
  - `stopLoss` (number): Stop loss price
- Returns: Array of 3 take profit prices [TP1, TP2, TP3]

**getConfidence(score)**
- Converts score to confidence level
- Parameters:
  - `score` (number): Condition score
- Returns: 'HIGH', 'MEDIUM', or 'LOW'

---

### SignalEngine

Generates and validates trading signals.

#### Constructor

```javascript
import { SignalEngine } from './signalEngine.js';
const engine = new SignalEngine();
```

#### Methods

**generateSignal(marketData)**
- Generates trading signal from market data
- Parameters:
  - `marketData` (object): Complete market data
- Returns: Signal object

```javascript
const signal = engine.generateSignal(marketData);
// Returns: {
//   coin, action, entry, stop_loss, take_profit,
//   leverage, confidence, reason, timeframe
// }
```

**validateSignal(signal)**
- Validates signal meets all criteria
- Parameters:
  - `signal` (object): Generated signal
- Returns: Boolean

**addOpenTrade(signal)**
- Tracks open trade (for max trades limit)
- Parameters:
  - `signal` (object): Signal to track

**removeOpenTrade(coin)**
- Removes tracked trade
- Parameters:
  - `coin` (string): Coin symbol

**getOpenTrades()**
- Returns array of tracked open trades

---

### Scanner

Main scanner orchestration class.

#### Constructor

```javascript
import { Scanner } from './scanner.js';
const scanner = new Scanner();
```

#### Methods

**start()**
- Starts the scanning loop
- Returns: Promise

```javascript
await scanner.start();
```

**stop()**
- Stops the scanner gracefully

```javascript
scanner.stop();
```

**scan()**
- Performs single scan cycle (automatically loops)
- Internal method, called by start()

---

### RiskManager

Static utility class for risk calculations.

#### Methods

**calculatePositionSize(capital, riskPerTrade, entry, stopLoss)**
- Calculates position size based on risk
- Parameters:
  - `capital` (number): Total capital
  - `riskPerTrade` (number): Risk percentage (e.g., 0.01 for 1%)
  - `entry` (number): Entry price
  - `stopLoss` (number): Stop loss price
- Returns: Position size in base currency

```javascript
import { RiskManager } from './utils/riskManager.js';

const size = RiskManager.calculatePositionSize(10000, 0.01, 65000, 64000);
// Returns: 0.1 BTC
```

**calculatePnL(action, entry, exit, positionSize, leverage)**
- Calculates profit/loss for a trade
- Parameters:
  - `action` (string): 'LONG' or 'SHORT'
  - `entry` (number): Entry price
  - `exit` (number): Exit price
  - `positionSize` (number): Position size
  - `leverage` (number): Leverage multiplier
- Returns: { pnl, pnlPercent }

**validateRiskReward(entry, stopLoss, takeProfit)**
- Calculates risk/reward ratio
- Returns: R:R ratio (e.g., 2.5 for 1:2.5)

---

## Configuration

### CONFIG Object

Global configuration accessible via:

```javascript
import { CONFIG } from './config.js';
```

#### Properties

**exchange** (string)
- Exchange name (default: 'binance')

**scanInterval** (number)
- Milliseconds between scans (default: 60000)

**maxOpenTrades** (number)
- Maximum concurrent trades (default: 3)

**riskPerTrade** (number)
- Risk per trade as decimal (default: 0.01)

**capital** (number)
- Total capital in USD (default: 10000)

**coins** (array)
- Array of trading pairs to monitor

**timeframes** (object)
```javascript
{
  trend: '1h',   // Trend timeframe
  setup: '15m',  // Setup timeframe
  entry: '5m'    // Entry timeframe
}
```

**indicators** (object)
```javascript
{
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

**thresholds** (object)
```javascript
{
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
```

---

## Data Structures

### Candle Object

```javascript
{
  timestamp: 1234567890,  // Unix timestamp
  open: 65000,            // Open price
  high: 65500,            // High price
  low: 64800,             // Low price
  close: 65200,           // Close price
  volume: 1000000         // Volume
}
```

### Signal Object

```javascript
{
  coin: "BTC",                          // Asset symbol
  action: "LONG",                       // LONG, SHORT, or NO_TRADE
  entry: 65000,                         // Entry price
  stop_loss: 64000,                     // Stop loss price
  take_profit: [66000, 67000, 68000],  // TP levels
  leverage: 5,                          // Leverage multiplier
  confidence: "HIGH",                   // HIGH or MEDIUM
  reason: "...",                        // Signal explanation
  timeframe: "5m/15m/1h confluence",   // Timeframe info
  timestamp: "2024-01-01T00:00:00Z"    // ISO timestamp
}
```

### Market Data Object

```javascript
{
  symbol: "BTC/USDT",
  candles1h: [...],       // Array of 1H candles
  candles15m: [...],      // Array of 15M candles
  candles5m: [...],       // Array of 5M candles
  fundingRate: 0.0001,    // Current funding rate
  openInterest: 1000000,  // Open interest value
  currentPrice: 65000,    // Current price
  volume: 5000000,        // 24h volume
  timestamp: 1234567890   // Unix timestamp
}
```

---

## Usage Examples

### Basic Signal Generation

```javascript
import { DataFetcher } from './dataFetcher.js';
import { SignalEngine } from './signalEngine.js';

const fetcher = new DataFetcher();
const engine = new SignalEngine();

const marketData = await fetcher.fetchMarketData('BTC/USDT');
const signal = engine.generateSignal(marketData);

console.log(signal);
```

### Custom Indicator Calculation

```javascript
import { TechnicalIndicators } from './indicators.js';

const prices = [100, 102, 101, 103, 105, 104, 106];
const ema = TechnicalIndicators.calculateEMA(prices, 5);
const rsi = TechnicalIndicators.calculateRSI(prices, 14);

console.log(`EMA: ${ema}, RSI: ${rsi}`);
```

### Risk Calculation

```javascript
import { RiskManager } from './utils/riskManager.js';

const capital = 10000;
const risk = 0.01;
const entry = 65000;
const stop = 64000;

const size = RiskManager.calculatePositionSize(capital, risk, entry, stop);
console.log(`Position Size: ${size} BTC`);

const pnl = RiskManager.calculatePnL('LONG', entry, 66000, size, 5);
console.log(`P&L: $${pnl.pnl} (${pnl.pnlPercent}%)`);
```

---

## Error Handling

All async methods handle errors gracefully:

```javascript
try {
  const data = await fetcher.fetchMarketData('INVALID/PAIR');
} catch (error) {
  console.error('Error:', error.message);
}
```

Methods return `null` on error instead of throwing, allowing the scanner to continue.

---

## Extension Examples

### Add Custom Indicator

```javascript
// In indicators.js
static calculateCustomIndicator(prices, period) {
  // Your calculation logic
  return result;
}
```

### Add Webhook Notification

```javascript
// In scanner.js outputSignal()
async outputSignal(signal) {
  console.log(JSON.stringify(signal, null, 2));
  
  await fetch('https://your-webhook.com', {
    method: 'POST',
    body: JSON.stringify(signal)
  });
}
```

### Custom Confidence Scoring

```javascript
// In analyzer.js
getConfidence(score, customMetric) {
  if (score >= 7 && customMetric > threshold) return 'VERY_HIGH';
  if (score >= 6) return 'HIGH';
  if (score >= 4) return 'MEDIUM';
  return 'LOW';
}
```
