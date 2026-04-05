import { TechnicalIndicators } from '../src/indicators.js';

console.log('🧪 Testing Technical Indicators...\n');

const testPrices = [
  100, 102, 101, 103, 105, 104, 106, 108, 107, 109,
  111, 110, 112, 114, 113, 115, 117, 116, 118, 120,
  119, 121, 123, 122, 124, 126, 125, 127, 129, 128,
  130, 132, 131, 133, 135, 134, 136, 138, 137, 139,
  141, 140, 142, 144, 143, 145, 147, 146, 148, 150
];

console.log('📊 Test Data: 50 price points from 100 to 150');
console.log(`First 10: [${testPrices.slice(0, 10).join(', ')}]`);
console.log(`Last 10: [${testPrices.slice(-10).join(', ')}]\n`);

console.log('─'.repeat(60));
console.log('Testing EMA (50 period)');
console.log('─'.repeat(60));
const ema50 = TechnicalIndicators.calculateEMA(testPrices, 50);
console.log(`EMA(50): ${ema50?.toFixed(2) || 'null'}`);
console.log(`Current Price: ${testPrices[testPrices.length - 1]}`);
console.log(`Price vs EMA: ${testPrices[testPrices.length - 1] > ema50 ? 'Above ✅' : 'Below ❌'}\n`);

console.log('─'.repeat(60));
console.log('Testing EMA (20 period)');
console.log('─'.repeat(60));
const ema20 = TechnicalIndicators.calculateEMA(testPrices, 20);
console.log(`EMA(20): ${ema20?.toFixed(2) || 'null'}\n`);

console.log('─'.repeat(60));
console.log('Testing RSI (14 period)');
console.log('─'.repeat(60));
const rsi = TechnicalIndicators.calculateRSI(testPrices, 14);
console.log(`RSI(14): ${rsi?.toFixed(2) || 'null'}`);
if (rsi) {
  if (rsi > 70) console.log('Status: Overbought 🔴');
  else if (rsi < 30) console.log('Status: Oversold 🟢');
  else console.log('Status: Neutral ⚪');
}
console.log();

console.log('─'.repeat(60));
console.log('Testing MACD');
console.log('─'.repeat(60));
const macd = TechnicalIndicators.calculateMACD(testPrices, 12, 26, 9);
if (macd) {
  console.log(`MACD Line: ${macd.macd.toFixed(4)}`);
  console.log(`Signal Line: ${macd.signal.toFixed(4)}`);
  console.log(`Histogram: ${macd.histogram.toFixed(4)}`);
  console.log(`Bullish Crossover: ${macd.bullishCrossover ? '✅' : '❌'}`);
  console.log(`Bearish Crossover: ${macd.bearishCrossover ? '✅' : '❌'}`);
} else {
  console.log('MACD: null');
}
console.log();

console.log('─'.repeat(60));
console.log('Testing ATR');
console.log('─'.repeat(60));
const highs = testPrices.map(p => p + Math.random() * 2);
const lows = testPrices.map(p => p - Math.random() * 2);
const atr = TechnicalIndicators.calculateATR(highs, lows, testPrices, 14);
console.log(`ATR(14): ${atr?.toFixed(2) || 'null'}`);
console.log(`1.5x ATR: ${atr ? (atr * 1.5).toFixed(2) : 'null'} (for stop loss)\n`);

console.log('─'.repeat(60));
console.log('Testing Volume Change');
console.log('─'.repeat(60));
const volumes = testPrices.map((p, i) => 1000000 + Math.random() * 500000 + i * 10000);
volumes[volumes.length - 1] = volumes[volumes.length - 1] * 2;
const volumeRatio = TechnicalIndicators.calculateVolumeChange(volumes, 20);
console.log(`Volume Ratio: ${volumeRatio.toFixed(2)}x`);
console.log(`Volume Spike: ${volumeRatio >= 1.5 ? '✅ Yes' : '❌ No'}\n`);

console.log('─'.repeat(60));
console.log('Testing Candlestick Patterns');
console.log('─'.repeat(60));

const testCandles = [
  { open: 100, high: 102, low: 99, close: 98 },
  { open: 98, high: 103, low: 97, close: 102 }
];

const bullishEngulfing = TechnicalIndicators.detectBullishEngulfing(testCandles);
console.log(`Bullish Engulfing: ${bullishEngulfing ? '✅ Detected' : '❌ Not detected'}`);

const testCandles2 = [
  { open: 100, high: 102, low: 99, close: 102 },
  { open: 102, high: 103, low: 97, close: 98 }
];

const bearishEngulfing = TechnicalIndicators.detectBearishEngulfing(testCandles2);
console.log(`Bearish Engulfing: ${bearishEngulfing ? '✅ Detected' : '❌ Not detected'}\n`);

console.log('✅ All indicator tests completed!\n');
