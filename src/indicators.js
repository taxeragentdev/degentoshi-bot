export class TechnicalIndicators {
  static calculateEMA(prices, period) {
    if (prices.length < period) return null;
    
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    
    return ema;
  }
  
  static calculateEMAArray(prices, period) {
    if (prices.length < period) return [];
    
    const emaArray = [];
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    emaArray.push(ema);
    
    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
      emaArray.push(ema);
    }
    
    return emaArray;
  }
  
  static calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 0; i < period; i++) {
      if (changes[i] >= 0) {
        gains += changes[i];
      } else {
        losses += Math.abs(changes[i]);
      }
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    for (let i = period; i < changes.length; i++) {
      if (changes[i] >= 0) {
        avgGain = (avgGain * (period - 1) + changes[i]) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(changes[i])) / period;
      }
    }
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  static calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod + signalPeriod) return null;
    
    const emaFast = this.calculateEMAArray(prices, fastPeriod);
    const emaSlow = this.calculateEMAArray(prices, slowPeriod);
    
    if (emaFast.length === 0 || emaSlow.length === 0) return null;
    
    const macdLine = [];
    const startIndex = slowPeriod - fastPeriod;
    
    for (let i = 0; i < emaSlow.length; i++) {
      macdLine.push(emaFast[i + startIndex] - emaSlow[i]);
    }
    
    const signalLine = this.calculateEMAArray(macdLine, signalPeriod);
    
    if (signalLine.length === 0) return null;
    
    const macdValue = macdLine[macdLine.length - 1];
    const signalValue = signalLine[signalLine.length - 1];
    const histogram = macdValue - signalValue;
    
    const prevMacdValue = macdLine[macdLine.length - 2];
    const prevSignalValue = signalLine[signalLine.length - 2];
    const prevHistogram = prevMacdValue - prevSignalValue;
    
    return {
      macd: macdValue,
      signal: signalValue,
      histogram: histogram,
      bullishCrossover: prevHistogram < 0 && histogram > 0,
      bearishCrossover: prevHistogram > 0 && histogram < 0
    };
  }
  
  static calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < period + 1) return null;
    
    const trueRanges = [];
    for (let i = 1; i < highs.length; i++) {
      const high = highs[i];
      const low = lows[i];
      const prevClose = closes[i - 1];
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }
    
    let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
    
    for (let i = period; i < trueRanges.length; i++) {
      atr = (atr * (period - 1) + trueRanges[i]) / period;
    }
    
    return atr;
  }
  
  static detectBullishEngulfing(candles) {
    if (candles.length < 2) return false;
    
    const prev = candles[candles.length - 2];
    const current = candles[candles.length - 1];
    
    const prevBearish = prev.close < prev.open;
    const currentBullish = current.close > current.open;
    
    if (!prevBearish || !currentBullish) return false;
    
    return current.open <= prev.close && current.close >= prev.open;
  }
  
  static detectBearishEngulfing(candles) {
    if (candles.length < 2) return false;
    
    const prev = candles[candles.length - 2];
    const current = candles[candles.length - 1];
    
    const prevBullish = prev.close > prev.open;
    const currentBearish = current.close < current.open;
    
    if (!prevBullish || !currentBearish) return false;
    
    return current.open >= prev.close && current.close <= prev.open;
  }
  
  static detectHigherLow(candles, lookback = 5) {
    if (candles.length < lookback + 2) return false;
    
    const recentLows = candles.slice(-lookback).map(c => c.low);
    const currentLow = candles[candles.length - 1].low;
    const prevLow = Math.min(...recentLows.slice(0, -1));
    
    return currentLow > prevLow;
  }
  
  static detectLowerHigh(candles, lookback = 5) {
    if (candles.length < lookback + 2) return false;
    
    const recentHighs = candles.slice(-lookback).map(c => c.high);
    const currentHigh = candles[candles.length - 1].high;
    const prevHigh = Math.max(...recentHighs.slice(0, -1));
    
    return currentHigh < prevHigh;
  }
  
  static calculateVolumeChange(volumes, lookback = 20) {
    if (volumes.length < lookback + 1) return 0;
    
    const currentVolume = volumes[volumes.length - 1];
    const avgVolume = volumes.slice(-lookback - 1, -1).reduce((sum, v) => sum + v, 0) / lookback;
    
    return avgVolume === 0 ? 0 : currentVolume / avgVolume;
  }
}
