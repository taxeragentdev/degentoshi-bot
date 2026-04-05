import { DataFetcher } from './dataFetcher.js';
import { SignalEngine } from './signalEngine.js';
import { CONFIG } from './config.js';
import { TelegramBot } from './telegramBot.js';
import { getAgentByAlias } from './degenClawAgents.js';
import { DegenClawTrader } from './degenClawTrader.js';
import fs from 'fs';
import path from 'path';

export class Scanner {
  constructor() {
    this.dataFetcher = new DataFetcher();
    this.signalEngine = new SignalEngine();
    this.telegramBot = new TelegramBot();
    this.isRunning = false;
    this.scanCount = 0;
    this.autoTrade = process.env.AUTO_TRADE === 'true';
    this.autoTradeAgent = process.env.AUTO_TRADE_AGENT || 'raichu';
    
    this.lastSignalTime = new Map();
    this.signalCooldownMs = CONFIG.signalCooldownMs;
    this.telegramMinConfidence = CONFIG.telegramMinConfidence;
    this.cooldownPath = path.join(process.cwd(), 'data', 'signal_cooldown.json');
    this.loadCooldownFromDisk();
    
    // Aktif trading agentları (virgülle ayrılmış)
    this.activeAgents = (process.env.ACTIVE_AGENTS || 'raichu').split(',').map(a => a.trim());
    this.currentAgentIndex = 0;
  }
  
  async start() {
    console.log('🚀 Starting Crypto Signal Bot...');
    console.log(`📊 Monitoring ${CONFIG.coins.length} coins`);
    console.log(`⏱️  Scan interval: ${CONFIG.scanInterval / 1000}s`);
    
    // Agent balance'larını göster
    console.log('💰 Checking agent balances...');
    const { getAgentByAlias, getAllAgents } = await import('./degenClawAgents.js');
    const { DegenClawTrader } = await import('./degenClawTrader.js');
    
    const allAgents = getAllAgents();
    let totalBalance = 0;
    for (const agent of allAgents.slice(0, 3)) { // İlk 3 agent'ı göster
      const trader = new DegenClawTrader(agent);
      const balanceResult = await trader.getAccountBalance();
      if (balanceResult.success) {
        console.log(`   ${agent.alias}: $${balanceResult.balance.toFixed(2)}`);
        totalBalance += balanceResult.balance;
      }
    }
    console.log(`   ... (${allAgents.length} agents total)`);
    
    console.log(`🎯 Risk per trade: ${CONFIG.riskPerTrade * 100}%`);
    console.log(`📈 Max open trades: ${CONFIG.maxOpenTrades}`);
    console.log(`🤖 Telegram bot: ACTIVE`);
    console.log(`🎮 Auto-trade: ${this.autoTrade ? 'ENABLED' : 'DISABLED'}`);
    if (this.autoTrade) {
      console.log(`👥 Active agents: ${this.activeAgents.join(', ')}`);
    }
    console.log(`⏱️  Signal cooldown: ${(this.signalCooldownMs / 60000).toFixed(0)} min/coin (persisted)`);
    console.log(`📡 Hyperliquid data: ${CONFIG.hyperliquidApiUrl}`);
    console.log(`📵 Telegram min confidence: ${this.telegramMinConfidence}`);
    console.log('─'.repeat(80));
    
    this.isRunning = true;
    
    this.telegramBot.startPolling().catch(err => {
      console.error('❌ Telegram bot error:', err);
    });
    
    await this.telegramBot.sendMessage(
      `🚀 <b>Kripto Sinyal Botu Başlatıldı!</b>\n\n` +
      `📡 Veri: <code>${CONFIG.hyperliquidApiUrl}</code>\n` +
      `⏱ Cooldown: ${(this.signalCooldownMs / 3600000).toFixed(1)} saat/coin\n` +
      `📵 Telegram: min güven <b>${this.telegramMinConfidence}</b>\n\n` +
      `Sinyal taraması başladı.`
    );
    
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
          // Cooldown kontrolü - aynı coin için 1 saat içinde tekrar sinyal verme
          const lastTime = this.lastSignalTime.get(coinSymbol);
          const now = Date.now();
          
          if (lastTime && (now - lastTime) < this.signalCooldownMs) {
            const remainingMinutes = Math.ceil((this.signalCooldownMs - (now - lastTime)) / 60000);
            console.log(`⏸️  Cooldown (${remainingMinutes}m remaining)`);
            continue;
          }
          
          signals.push(signal);
          this.lastSignalTime.set(coinSymbol, now);
          this.saveCooldownToDisk();
          console.log(`✅ ${signal.action} signal!`);
          await this.outputSignal(signal);
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
  
  confidenceRank(c) {
    const map = { HIGH: 2, MEDIUM: 1, LOW: 0 };
    return c in map ? map[c] : 2;
  }

  shouldNotifyTelegram(signal) {
    const min = this.telegramMinConfidence;
    return this.confidenceRank(signal.confidence) >= this.confidenceRank(min);
  }

  loadCooldownFromDisk() {
    try {
      if (!fs.existsSync(this.cooldownPath)) return;
      const raw = fs.readFileSync(this.cooldownPath, 'utf8');
      const obj = JSON.parse(raw);
      for (const [k, v] of Object.entries(obj)) {
        const t = Number(v);
        if (Number.isFinite(t)) this.lastSignalTime.set(k, t);
      }
    } catch (e) {
      console.warn('Cooldown load:', e.message);
    }
  }

  saveCooldownToDisk() {
    try {
      const dir = path.dirname(this.cooldownPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.cooldownPath, JSON.stringify(Object.fromEntries(this.lastSignalTime)));
    } catch (e) {
      console.warn('Cooldown save:', e.message);
    }
  }

  async outputSignal(signal) {
    console.log('\n' + '═'.repeat(80));
    console.log('🎯 TRADING SIGNAL GENERATED');
    console.log('═'.repeat(80));
    console.log(JSON.stringify(signal, null, 2));
    console.log('═'.repeat(80) + '\n');
    
    this.saveSignalToFile(signal);
    
    if (this.shouldNotifyTelegram(signal)) {
      await this.telegramBot.sendSignal(signal);
    } else {
      console.log(`📵 Telegram atlandı (min güven: ${this.telegramMinConfidence}, sinyal: ${signal.confidence})`);
    }
    
    if (this.autoTrade && signal.action !== 'NO_TRADE' && signal.confidence === 'HIGH') {
      await this.executeAutoTrade(signal);
    }
  }
  
  async executeAutoTrade(signal) {
    if (this.activeAgents.length === 0) {
      console.log('❌ AUTO-TRADE: No active agents configured');
      return;
    }
    
    // Round-robin: Her sinyalde farklı agent kullan
    const agentAlias = this.activeAgents[this.currentAgentIndex];
    this.currentAgentIndex = (this.currentAgentIndex + 1) % this.activeAgents.length;
    
    const agent = getAgentByAlias(agentAlias);
    
    if (!agent) {
      console.error(`❌ AUTO-TRADE: Agent not found: ${agentAlias}`);
      return;
    }
    
    console.log(`\n🎮 AUTO-TRADE: Executing ${signal.action} ${signal.coin} with ${agent.label}...`);
    
    const trader = new DegenClawTrader(agent);
    
    // Agent'ın gerçek balance'ını kontrol et
    const balanceResult = await trader.getAccountBalance();
    if (!balanceResult.success) {
      console.error(`❌ AUTO-TRADE: Failed to get balance for ${agent.label}`);
      return;
    }
    
    const availableBalance = balanceResult.balance;
    console.log(`💰 ${agent.label} balance: $${availableBalance.toFixed(2)}`);
    
    const tpPercent = ((signal.take_profit[1] - signal.entry) / signal.entry) * 100;
    const slPercent = Math.abs((signal.stop_loss - signal.entry) / signal.entry) * 100;
    
    // Pozisyon boyutunu agent balance'ına göre hesapla
    const size = Math.max(15, Math.min(availableBalance * 0.2, 100)); // Balance'ın %20'si, max 100 USDC
    
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
