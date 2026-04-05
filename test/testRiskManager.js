import { RiskManager } from '../src/utils/riskManager.js';

console.log('🧪 Testing Risk Manager...\n');
console.log('─'.repeat(60));

const capital = 10000;
const riskPerTrade = 0.01;
const entry = 65000;
const stopLoss = 64000;

console.log('Test Scenario:');
console.log(`Capital: $${capital}`);
console.log(`Risk per trade: ${riskPerTrade * 100}%`);
console.log(`Entry: $${entry}`);
console.log(`Stop Loss: $${stopLoss}`);
console.log();

console.log('─'.repeat(60));
console.log('Position Sizing');
console.log('─'.repeat(60));

const positionSize = RiskManager.calculatePositionSize(
  capital,
  riskPerTrade,
  entry,
  stopLoss
);

console.log(`Position Size: ${positionSize.toFixed(4)} BTC`);
console.log(`Position Value: $${(positionSize * entry).toFixed(2)}`);
console.log(`Risk Amount: $${(capital * riskPerTrade).toFixed(2)}`);
console.log();

console.log('─'.repeat(60));
console.log('P&L Calculations');
console.log('─'.repeat(60));

const tp1 = 66000;
const tp2 = 67000;
const tp3 = 68000;
const leverage = 5;

console.log(`Leverage: ${leverage}x\n`);

const pnlTP1 = RiskManager.calculatePnL('LONG', entry, tp1, positionSize, leverage);
const pnlTP2 = RiskManager.calculatePnL('LONG', entry, tp2, positionSize, leverage);
const pnlTP3 = RiskManager.calculatePnL('LONG', entry, tp3, positionSize, leverage);
const pnlStop = RiskManager.calculatePnL('LONG', entry, stopLoss, positionSize, leverage);

console.log(`TP1 ($${tp1}): $${pnlTP1.pnl.toFixed(2)} (${pnlTP1.pnlPercent.toFixed(2)}%)`);
console.log(`TP2 ($${tp2}): $${pnlTP2.pnl.toFixed(2)} (${pnlTP2.pnlPercent.toFixed(2)}%)`);
console.log(`TP3 ($${tp3}): $${pnlTP3.pnl.toFixed(2)} (${pnlTP3.pnlPercent.toFixed(2)}%)`);
console.log(`Stop ($${stopLoss}): $${pnlStop.pnl.toFixed(2)} (${pnlStop.pnlPercent.toFixed(2)}%)`);
console.log();

console.log('─'.repeat(60));
console.log('Risk/Reward Validation');
console.log('─'.repeat(60));

const rrTP1 = RiskManager.validateRiskReward(entry, stopLoss, tp1);
const rrTP2 = RiskManager.validateRiskReward(entry, stopLoss, tp2);
const rrTP3 = RiskManager.validateRiskReward(entry, stopLoss, tp3);

console.log(`R:R to TP1: 1:${rrTP1.toFixed(2)} ${rrTP1 >= 2 ? '✅' : '❌'}`);
console.log(`R:R to TP2: 1:${rrTP2.toFixed(2)} ${rrTP2 >= 2 ? '✅' : '❌'}`);
console.log(`R:R to TP3: 1:${rrTP3.toFixed(2)} ${rrTP3 >= 2 ? '✅' : '❌'}`);
console.log();

console.log('─'.repeat(60));
console.log('Portfolio Impact (3 trades scenario)');
console.log('─'.repeat(60));

const maxTrades = 3;
const totalRisk = capital * riskPerTrade * maxTrades;

console.log(`Max open trades: ${maxTrades}`);
console.log(`Risk per trade: $${(capital * riskPerTrade).toFixed(2)}`);
console.log(`Total portfolio risk: $${totalRisk.toFixed(2)} (${((totalRisk / capital) * 100).toFixed(2)}%)`);
console.log();

console.log('✅ Risk management tests completed!\n');
