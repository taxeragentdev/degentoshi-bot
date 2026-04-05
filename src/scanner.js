import { DataFetcher } from './dataFetcher.js';
import { SignalEngine } from './signalEngine.js';
import { CONFIG } from './config.js';
import { TelegramBot } from './telegramBot.js';
import { getAgentByAlias } from './degenClawAgents.js';
import { DegenClawTrader } from './degenClawTrader.js';

export class Scanner {
  constructor() {
    this.dataFetcher = new DataFetcher();
    this.signalEngine = new SignalEngine();
    this.telegramBot = new TelegramBot();
    this.isRunning = false;
    this.scanCount = 0;
    this.autoTrade = process.env.AUTO_TRADE === 'true';
    this.autoTradeAgent = process.env.AUTO_TRADE_AGENT || 'raichu';
  }
  
  async start() {
    console.log('🚀 Starting Crypto Signal Bot...');
    console.log(`📊 Monitoring ${CONFIG.coins.length} coins`);
    console.log(`⏱️  Scan interval: ${CONFIG.scanInterval / 1000}s`);
    console.log(`💰 Capital: $${CONFIG.capital}`);
    console.log(`🎯 Risk per trade: ${CONFIG.riskPerTrade * 100}%`);
    console.log(`📈 Max open trades: ${CONFIG.maxOpenTrades}`);
    console.log(`🤖 Telegram bot: ACTIVE`);
    console.log(`🎮 Auto-trade: ${this.autoTrade ? 'ENABLED (' + this.autoTradeAgent + ')' : 'DISABLED'}`);
    console.log('─'.repeat(80));
    
    this.isRunning = true;
    
    this.telegramBot.startPolling().catch(err => {
      console.error('❌ Telegram bot error:', err);
    });
    
    await this.telegramBot.sendMessage('🚀 <b>Kripto Sinyal Botu Başlatıldı!</b>\n\nSinyal taraması başladı. Yüksek kaliteli sinyaller Telegram\'a gönderilecek.');
    
    await this.scan();
  }
  
  stop() {
    this.isRunning = false;
    console.log('🛑 Scanner stopped');
  }
  
  async scan() {
    if (!this.isRunning) return;
    
    this.scanCount++;
    const scanStartTime = Date.now();
    
    console.log(`\n🔍 Scan #${this.scanCount} - ${new Date().toLocaleString()}`);
    console.log(`📊 Open trades: ${this.signalEngine.getOpenTrades().length}/${CONFIG.maxOpenTrades}`);
    
    const signals = [];
    
    for (const symbol of CONFIG.coins) {
      try {
        const coinSymbol = symbol.split('/')[0];
        process.stdout.write(`   Analyzing ${coinSymbol}... `);
        
        const marketData = await this.dataFetcher.fetchMarketData(symbol);
        
        if (!marketData) {
          console.log('❌ No data');
          continue;
        }
        
        const signal = this.signalEngine.generateSignal(marketData);
        
        if (signal.action !== 'NO_TRADE') {
          signals.push(signal);
          console.log(`✅ ${signal.action} signal!`);
          this.outputSignal(signal);
        } else {
          console.log('⏭️  No trade');
        }
        
        await this.sleep(100);
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    
    const scanDuration = ((Date.now() - scanStartTime) / 1000).toFixed(1);
    console.log(`\n✓ Scan completed in ${scanDuration}s`);
    console.log(`📡 Signals generated: ${signals.length}`);
    
    if (signals.length === 0) {
      console.log('💤 No high-confidence setups found');
    }
    
    console.log('─'.repeat(80));
    
    setTimeout(() => this.scan(), CONFIG.scanInterval);
  }
  
  async outputSignal(signal) {
    console.log('\n' + '═'.repeat(80));
    console.log('🎯 TRADING SIGNAL GENERATED');
    console.log('═'.repeat(80));
    console.log(JSON.stringify(signal, null, 2));
    console.log('═'.repeat(80) + '\n');
    
    this.saveSignalToFile(signal);
    
    await this.telegramBot.sendSignal(signal);
    
    if (this.autoTrade && signal.action !== 'NO_TRADE' && signal.confidence === 'HIGH') {
      await this.executeAutoTrade(signal);
    }
  }
  
  async executeAutoTrade(signal) {
    const agent = getAgentByAlias(this.autoTradeAgent);
    
    if (!agent) {
      console.error(`❌ Auto-trade agent not found: ${this.autoTradeAgent}`);
      return;
    }
    
    console.log(`\n🎮 AUTO-TRADE: Executing ${signal.action} ${signal.coin} with ${agent.label}...`);
    
    const trader = new DegenClawTrader(agent);
    
    const tpPercent = ((signal.take_profit[1] - signal.entry) / signal.entry) * 100;
    const slPercent = Math.abs((signal.stop_loss - signal.entry) / signal.entry) * 100;
    
    const size = Math.max(15, CONFIG.capital * CONFIG.riskPerTrade);
    
    const result = await trader.executeWithRetry(() =>
      trader.openPosition({
        pair: signal.coin,
        side: signal.action.toLowerCase(),
        size: size,
        leverage: signal.leverage,
        tpPercent: Math.abs(tpPercent),
        slPercent: Math.abs(slPercent),
        currentPrice: signal.entry
      })
    );
    
    if (result.success) {
      console.log(`✅ AUTO-TRADE: Position opened successfully!`);
      await this.telegramBot.sendMessage(
        `🎮 <b>AUTO-TRADE Executed</b>\n\n` +
        `👤 ${agent.label}\n` +
        `${signal.action === 'LONG' ? '🟢' : '🔴'} ${signal.action} ${signal.coin}\n` +
        `💰 Size: $${size.toFixed(2)}\n` +
        `⚡ Leverage: ${signal.leverage}x\n` +
        `📊 Entry: $${signal.entry}\n` +
        `🎯 TP: $${signal.take_profit[1]}\n` +
        `🛑 SL: $${signal.stop_loss}`
      );
    } else {
      console.error(`❌ AUTO-TRADE: Failed - ${result.error}`);
      await this.telegramBot.sendMessage(
        `❌ <b>AUTO-TRADE Failed</b>\n\n` +
        `Agent: ${agent.label}\n` +
        `Signal: ${signal.action} ${signal.coin}\n` +
        `Error: ${result.error}`
      );
    }
  }
  
  saveSignalToFile(signal) {
    const fs = require('fs');
    const path = require('path');
    
    const signalsDir = path.join(process.cwd(), 'signals');
    if (!fs.existsSync(signalsDir)) {
      fs.mkdirSync(signalsDir, { recursive: true });
    }
    
    const filename = `signal_${signal.coin}_${Date.now()}.json`;
    const filepath = path.join(signalsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(signal, null, 2));
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
