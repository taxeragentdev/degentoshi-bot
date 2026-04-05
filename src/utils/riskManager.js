export class RiskManager {
  static calculatePositionSize(capital, riskPerTrade, entry, stopLoss) {
    const riskAmount = capital * riskPerTrade;
    const riskPerUnit = Math.abs(entry - stopLoss);
    const positionSize = riskAmount / riskPerUnit;
    return positionSize;
  }
  
  static calculatePnL(action, entry, exit, positionSize, leverage = 1) {
    const priceChange = action === 'LONG' ? (exit - entry) : (entry - exit);
    const pnl = priceChange * positionSize * leverage;
    const pnlPercent = (priceChange / entry) * leverage * 100;
    return { pnl, pnlPercent };
  }
  
  static validateRiskReward(entry, stopLoss, takeProfit) {
    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(takeProfit - entry);
    return reward / risk;
  }
  
  static calculateMaxDrawdown(equity, peakEquity) {
    return ((peakEquity - equity) / peakEquity) * 100;
  }
}
