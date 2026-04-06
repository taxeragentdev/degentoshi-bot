import { TechnicalIndicators } from './indicators.js';
import { CONFIG } from './config.js';

export class MarketAnalyzer {
  analyze(marketData) {
    const { candles1h, candles15m, candles5m, fundingRate, currentPrice } = marketData;
    
    const closes1h = candles1h.map(c => c.close);
    const closes15m = candles15m.map(c => c.close);
    const closes5m = candles5m.map(c => c.close);
    const highs5m = candles5m.map(c => c.high);
    const lows5m = candles5m.map(c => c.low);
    const volumes15m = candles15m.map(c => c.volume);
    
    const ema200_1h = TechnicalIndicators.calculateEMA(closes1h, CONFIG.indicators.ema200Period);
    const ema50_15m = TechnicalIndicators.calculateEMA(closes15m, CONFIG.indicators.ema50Period);
    const rsi15m = TechnicalIndicators.calculateRSI(closes15m, CONFIG.indicators.rsiPeriod);
    const macd5m = TechnicalIndicators.calculateMACD(
      closes5m,
      CONFIG.indicators.macdFast,
      CONFIG.indicators.macdSlow,
      CONFIG.indicators.macdSignal
    );
    const atr5m = TechnicalIndicators.calculateATR(
      highs5m,
      lows5m,
      closes5m,
      CONFIG.indicators.atrPeriod
    );
    
    const bullishEngulfing = TechnicalIndicators.detectBullishEngulfing(candles5m);
    const bearishEngulfing = TechnicalIndicators.detectBearishEngulfing(candles5m);
    const higherLow = TechnicalIndicators.detectHigherLow(candles5m);
    const lowerHigh = TechnicalIndicators.detectLowerHigh(candles5m);
    const volumeRatio = TechnicalIndicators.calculateVolumeChange(volumes15m, 20);
    
    if (!ema200_1h || !ema50_15m || !rsi15m || !macd5m || !atr5m) {
      return null;
    }
    
    return {
      currentPrice,
      ema200_1h,
      ema50_15m,
      rsi15m,
      macd5m,
      atr5m,
      fundingRate,
      bullishEngulfing,
      bearishEngulfing,
      higherLow,
      lowerHigh,
      volumeRatio,
      candles5m
    };
  }
  
  checkLongConditions(analysis) {
    const conditions = {
      trend: false,
      setup: false,
      entry: false,
      perpConfirmation: false,
      score: 0,
      reasons: []
    };
    
    if (analysis.currentPrice > analysis.ema200_1h) {
      conditions.trend = true;
      conditions.score += 2;
      conditions.reasons.push('1H uptrend');
    }
    
    const nearEma50 = Math.abs(analysis.currentPrice - analysis.ema50_15m) / analysis.currentPrice < 0.02;
    const rsiValid = analysis.rsi15m >= CONFIG.thresholds.rsi.longMin && 
                      analysis.rsi15m <= CONFIG.thresholds.rsi.longMax;
    
    if (nearEma50 && rsiValid) {
      conditions.setup = true;
      conditions.score += 1;
      conditions.reasons.push('15M pullback + RSI valid');
    }
    
    if (rsiValid) {
      conditions.score += 1;
    }
    
    if (analysis.macd5m.bullishCrossover || analysis.bullishEngulfing || analysis.higherLow) {
      conditions.entry = true;
      conditions.score += 1;
      
      if (analysis.macd5m.bullishCrossover) conditions.reasons.push('MACD bull cross');
      if (analysis.bullishEngulfing) conditions.reasons.push('Bullish engulfing');
      if (analysis.higherLow) conditions.reasons.push('Higher low');
    }
    
    if (analysis.volumeRatio >= CONFIG.thresholds.volumeSpike) {
      conditions.score += 1;
      conditions.reasons.push('Volume spike');
    }
    
    if (analysis.fundingRate <= CONFIG.thresholds.funding.highPositive) {
      conditions.perpConfirmation = true;
      conditions.score += 1;
      conditions.reasons.push('Favorable funding');
    }
    
    if (analysis.fundingRate < CONFIG.thresholds.funding.highNegative) {
      conditions.score += 1;
      conditions.reasons.push('Negative funding trap bias');
    }
    
    return conditions;
  }
  
  checkShortConditions(analysis) {
    const conditions = {
      trend: false,
      setup: false,
      entry: false,
      perpConfirmation: false,
      score: 0,
      reasons: []
    };
    
    if (analysis.currentPrice < analysis.ema200_1h) {
      conditions.trend = true;
      conditions.score += 2;
      conditions.reasons.push('1H downtrend');
    }
    
    const nearEma50 = Math.abs(analysis.currentPrice - analysis.ema50_15m) / analysis.currentPrice < 0.02;
    const rsiValid = analysis.rsi15m >= CONFIG.thresholds.rsi.shortMin && 
                      analysis.rsi15m <= CONFIG.thresholds.rsi.shortMax;
    
    if (nearEma50 && rsiValid) {
      conditions.setup = true;
      conditions.score += 1;
      conditions.reasons.push('15M pullback + RSI valid');
    }
    
    if (rsiValid) {
      conditions.score += 1;
    }
    
    if (analysis.macd5m.bearishCrossover || analysis.bearishEngulfing || analysis.lowerHigh) {
      conditions.entry = true;
      conditions.score += 1;
      
      if (analysis.macd5m.bearishCrossover) conditions.reasons.push('MACD bear cross');
      if (analysis.bearishEngulfing) conditions.reasons.push('Bearish engulfing');
      if (analysis.lowerHigh) conditions.reasons.push('Lower high');
    }
    
    if (analysis.volumeRatio >= CONFIG.thresholds.volumeSpike) {
      conditions.score += 1;
      conditions.reasons.push('Volume spike');
    }
    
    if (analysis.fundingRate >= CONFIG.thresholds.funding.veryHighPositive) {
      conditions.perpConfirmation = true;
      conditions.score += 1;
      conditions.reasons.push('High funding trap bias');
    }
    
    return conditions;
  }
  
  calculateStopLoss(action, analysis) {
    const { currentPrice, atr5m, candles5m } = analysis;
    const minPct = CONFIG.risk.minStopDistancePct;
    const maxPct = CONFIG.risk.maxStopDistancePct;
    const entry = currentPrice;

    const atrStop =
      action === 'LONG'
        ? entry - atr5m * CONFIG.indicators.atrMultiplier
        : entry + atr5m * CONFIG.indicators.atrMultiplier;

    const recentCandles = candles5m.slice(-10);
    const swingStop =
      action === 'LONG'
        ? Math.min(...recentCandles.map((c) => c.low))
        : Math.max(...recentCandles.map((c) => c.high));

    let rawSl;
    if (action === 'LONG') {
      rawSl = Math.max(atrStop, swingStop);
    } else {
      rawSl = Math.min(atrStop, swingStop);
    }

    if (action === 'LONG') {
      const minSl = entry * (1 - minPct);
      const maxSl = entry * (1 - maxPct);
      let sl = Math.min(rawSl, minSl);
      sl = Math.max(sl, maxSl);
      return sl;
    }

    const minSl = entry * (1 + minPct);
    const maxSl = entry * (1 + maxPct);
    let sl = Math.max(rawSl, minSl);
    sl = Math.min(sl, maxSl);
    return sl;
  }
  
  calculateTakeProfits(action, entry, stopLoss) {
    const risk = Math.abs(entry - stopLoss);
    
    if (action === 'LONG') {
      return [
        entry + (risk * CONFIG.risk.tp1Multiplier),
        entry + (risk * CONFIG.risk.tp2Multiplier),
        entry + (risk * CONFIG.risk.tp3Multiplier)
      ];
    } else {
      return [
        entry - (risk * CONFIG.risk.tp1Multiplier),
        entry - (risk * CONFIG.risk.tp2Multiplier),
        entry - (risk * CONFIG.risk.tp3Multiplier)
      ];
    }
  }
  
  calculateLeverage(confidence, score = 0) {
    const L = CONFIG.leverage;
    const s = Number(score) || 0;
    if (confidence === 'HIGH') {
      if (s >= L.veryHighMinScore) return L.veryHigh;
      return L.high;
    }
    if (confidence === 'MEDIUM') return L.medium;
    return L.low;
  }
  
  getConfidence(score) {
    if (score >= CONFIG.thresholds.confidence.high) return 'HIGH';
    if (score >= CONFIG.thresholds.confidence.medium) return 'MEDIUM';
    return 'LOW';
  }
}
