import { MarketAnalyzer } from './analyzer.js';
import { CONFIG } from './config.js';

export class SignalEngine {
  constructor() {
    this.analyzer = new MarketAnalyzer();
    this.openTrades = [];
  }
  
  generateSignal(marketData) {
    const analysis = this.analyzer.analyze(marketData);
    
    if (!analysis) {
      return this.noTradeSignal('Insufficient data for analysis');
    }
    
    if (this.openTrades.length >= CONFIG.maxOpenTrades) {
      return this.noTradeSignal('Max open trades reached');
    }
    
    const longConditions = this.analyzer.checkLongConditions(analysis);
    const shortConditions = this.analyzer.checkShortConditions(analysis);
    
    const longConfidence = this.analyzer.getConfidence(longConditions.score);
    const shortConfidence = this.analyzer.getConfidence(shortConditions.score);
    
    let signal = null;
    
    if (longConfidence === 'HIGH' || longConfidence === 'MEDIUM') {
      if (longConditions.score > shortConditions.score) {
        signal = this.createLongSignal(marketData, analysis, longConditions, longConfidence);
      }
    }
    
    if (!signal && (shortConfidence === 'HIGH' || shortConfidence === 'MEDIUM')) {
      if (shortConditions.score > longConditions.score) {
        signal = this.createShortSignal(marketData, analysis, shortConditions, shortConfidence);
      }
    }
    
    if (signal && this.validateSignal(signal)) {
      return signal;
    }
    
    return this.noTradeSignal('No high-confidence setup');
  }
  
  createLongSignal(marketData, analysis, conditions, confidence) {
    const entry = analysis.currentPrice;
    const stopLoss = this.analyzer.calculateStopLoss('LONG', analysis);
    const takeProfits = this.analyzer.calculateTakeProfits('LONG', entry, stopLoss);
    const leverage = this.analyzer.calculateLeverage(confidence);
    
    const coinSymbol = marketData.symbol.split('/')[0];
    
    return {
      coin: coinSymbol,
      action: 'LONG',
      entry: this.roundPrice(entry),
      stop_loss: this.roundPrice(stopLoss),
      take_profit: takeProfits.map(tp => this.roundPrice(tp)),
      leverage: leverage,
      confidence: confidence,
      reason: conditions.reasons.join(' + '),
      timeframe: '5m/15m/1h confluence',
      timestamp: new Date().toISOString(),
      score: conditions.score,
      rsi: analysis.rsi15m.toFixed(2),
      fundingRate: (analysis.fundingRate * 100).toFixed(4) + '%'
    };
  }
  
  createShortSignal(marketData, analysis, conditions, confidence) {
    const entry = analysis.currentPrice;
    const stopLoss = this.analyzer.calculateStopLoss('SHORT', analysis);
    const takeProfits = this.analyzer.calculateTakeProfits('SHORT', entry, stopLoss);
    const leverage = this.analyzer.calculateLeverage(confidence);
    
    const coinSymbol = marketData.symbol.split('/')[0];
    
    return {
      coin: coinSymbol,
      action: 'SHORT',
      entry: this.roundPrice(entry),
      stop_loss: this.roundPrice(stopLoss),
      take_profit: takeProfits.map(tp => this.roundPrice(tp)),
      leverage: leverage,
      confidence: confidence,
      reason: conditions.reasons.join(' + '),
      timeframe: '5m/15m/1h confluence',
      timestamp: new Date().toISOString(),
      score: conditions.score,
      rsi: analysis.rsi15m.toFixed(2),
      fundingRate: (analysis.fundingRate * 100).toFixed(4) + '%'
    };
  }
  
  validateSignal(signal) {
    if (signal.action === 'NO_TRADE') return true;
    
    const risk = Math.abs(signal.entry - signal.stop_loss);
    const reward = Math.abs(signal.take_profit[1] - signal.entry);
    const riskRewardRatio = reward / risk;
    
    if (riskRewardRatio < CONFIG.risk.minRiskReward) {
      return false;
    }
    
    if (signal.entry === signal.stop_loss) {
      return false;
    }
    
    if (signal.action === 'LONG' && signal.stop_loss >= signal.entry) {
      return false;
    }
    
    if (signal.action === 'SHORT' && signal.stop_loss <= signal.entry) {
      return false;
    }
    
    return true;
  }
  
  noTradeSignal(reason = 'Conditions not met') {
    return {
      action: 'NO_TRADE',
      reason: reason,
      timestamp: new Date().toISOString()
    };
  }
  
  roundPrice(price) {
    if (price >= 1000) return Math.round(price * 10) / 10;
    if (price >= 100) return Math.round(price * 100) / 100;
    if (price >= 10) return Math.round(price * 1000) / 1000;
    if (price >= 1) return Math.round(price * 10000) / 10000;
    return Math.round(price * 100000) / 100000;
  }
  
  addOpenTrade(signal) {
    this.openTrades.push({
      coin: signal.coin,
      action: signal.action,
      entry: signal.entry,
      timestamp: signal.timestamp
    });
  }
  
  removeOpenTrade(coin) {
    this.openTrades = this.openTrades.filter(trade => trade.coin !== coin);
  }
  
  getOpenTrades() {
    return this.openTrades;
  }
}
