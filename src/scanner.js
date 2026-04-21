import { DataFetcher } from './dataFetcher.js';
import { SignalEngine } from './signalEngine.js';
import { CONFIG } from './config.js';
import { TelegramBot } from './telegramBot.js';
import { getAgentByAlias } from './degenClawAgents.js';
import { DegenClawTrader } from './degenClawTrader.js';
import { baseCoinFromPair } from './perpSymbols.js';
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
    this.autoTradeMinConfidence = CONFIG.autoTradeMinConfidence;

    // Aktif trading agentları (virgülle ayrılmış). ACTIVE_AGENTS tanımsız → varsayılan raichu;
    // boş string veya sadece virgül → otomatik işlemde hiç agent yok (AUTO_TRADE açık olsa bile).
    const rawAgents = process.env.ACTIVE_AGENTS;
    this.activeAgents =
      rawAgents === undefined
        ? ['raichu']
        : rawAgents.split(',').map((a) => a.trim()).filter(Boolean);
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
    for (const agent of allAgents.slice(0, 3)) {
      // İlk 3 agent'ı göster
      const trader = new DegenClawTrader(agent);
      const balanceResult = await trader.getAccountBalance();
      const mode = trader.usesDirectHyperliquid() ? 'HL-direkt' : 'ACP';
      if (balanceResult.success) {
        console.log(`   ${agent.alias}: $${balanceResult.balance.toFixed(2)} (${mode})`);
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
      console.log(`🎯 Auto-trade min confidence: ${this.autoTradeMinConfidence} (sinyal bunun altındaysa Degen Claw emri yok)`);
      console.log(`↔ Invert auto-trade: ${CONFIG.invertAutoTradeDirection ? 'ON' : 'OFF'}`);
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

    if (this.autoTrade && signal.action !== 'NO_TRADE') {
      if (this.signalMeetsAutoTradeMin(signal)) {
        await this.executeAutoTrade(signal);
      } else {
        console.log(
          `📵 AUTO-TRADE atlandı — sinyal ${signal.confidence}, gerekli min: ${this.autoTradeMinConfidence} (AUTO_TRADE_MIN_CONFIDENCE)`
        );
      }
    }
  }

  signalMeetsAutoTradeMin(signal) {
    return this.confidenceRank(signal.confidence) >= this.confidenceRank(this.autoTradeMinConfidence);
  }
  
  /**
   * Bu coinde pozisyonu olmayan tüm aktif agentlar (her sinyalde birden fazla giriş mümkün).
   */
  async collectEligibleAgentsForAutoTrade(signal) {
    const coinBase = signal.coin.toUpperCase();
    const holders = [];
    const eligible = [];
    const apiFailedAliases = [];

    for (const alias of this.activeAgents) {
      const agent = getAgentByAlias(alias);
      if (!agent) continue;

      const trader = new DegenClawTrader(agent);
      const posResult = await trader.getPositions();

      if (!posResult.success || !Array.isArray(posResult.positions)) {
        apiFailedAliases.push(alias);
        console.warn(`AUTO-TRADE: getPositions failed for ${alias}`);
        continue;
      }

      const hasCoin = posResult.positions.some(
        (p) => baseCoinFromPair(p.pair) === coinBase
      );

      if (hasCoin) {
        const pos = posResult.positions.find(
          (p) => baseCoinFromPair(p.pair) === coinBase
        );
        holders.push({
          label: agent.label,
          alias,
          pair: pos.pair,
          side: pos.side
        });
        continue;
      }

      eligible.push({ agent, trader, alias });
    }

    const validAgentCount = this.activeAgents.filter((a) => getAgentByAlias(a)).length;

    return { eligible, holders, apiFailedAliases, validAgentCount };
  }

  async executeAutoTrade(signal) {
    if (this.activeAgents.length === 0) {
      console.log('❌ AUTO-TRADE: No active agents configured');
      return;
    }

    const pairLabel = signal.coin;
    const { eligible, holders, apiFailedAliases, validAgentCount } =
      await this.collectEligibleAgentsForAutoTrade(signal);

    if (validAgentCount === 0) {
      console.error('❌ AUTO-TRADE: ACTIVE_AGENTS içinde tanımlı agent yok');
      return;
    }

    if (apiFailedAliases.length === validAgentCount && eligible.length === 0) {
      console.error('❌ AUTO-TRADE: Tüm agentlar için pozisyon API başarısız');
      await this.telegramBot.sendMessage(
        `⚠️ <b>Otomatik işlem yapılamadı</b>\n\n` +
        `Açık pozisyon bilgisi alınamadı (API). Güvenlik için emir gönderilmedi.\n` +
        `<code>${signal.coin}</code> · ${signal.action}`
      );
      return;
    }

    if (eligible.length === 0 && holders.length === validAgentCount && apiFailedAliases.length === 0) {
      console.log(`⏭ AUTO-TRADE: Tüm aktif agentlarda ${signal.coin} pozisyonu var`);
      await this.telegramBot.sendAutoTradeSkippedAllHolding(signal, holders);
      return;
    }

    if (eligible.length === 0) {
      console.log('❌ AUTO-TRADE: Bu coinde giriş için uygun agent yok');
      let extra = '';
      if (apiFailedAliases.length)
        extra += `\nAPI hata: <code>${apiFailedAliases.join(', ')}</code>`;
      if (holders.length)
        extra += `\nZaten pozisyon: ${holders.length} agent`;
      await this.telegramBot.sendMessage(
        `⏭ <b>Otomatik işlem yok</b> — ${signal.coin}\n${extra}`
      );
      return;
    }

    let tradeSide = String(signal.action).toLowerCase();
    let takeProfitPrice = signal.take_profit?.[0];
    let stopLossPrice = signal.stop_loss;
    let tpPercent = ((signal.take_profit[1] - signal.entry) / signal.entry) * 100;
    let slPercent = Math.abs((signal.stop_loss - signal.entry) / signal.entry) * 100;

    if (CONFIG.invertAutoTradeDirection) {
      const E = Number(signal.entry);
      const S = Number(signal.stop_loss);
      const T0 = Number(signal.take_profit?.[0]);
      const T1 = Number(signal.take_profit?.[1]);
      if (Number.isFinite(E) && E > 0 && Number.isFinite(S) && Number.isFinite(T0)) {
        stopLossPrice = 2 * E - S;
        takeProfitPrice = 2 * E - T0;
        tradeSide = String(signal.action).toUpperCase() === 'LONG' ? 'short' : 'long';
        const tpRef = Number.isFinite(T1) ? 2 * E - T1 : takeProfitPrice;
        tpPercent = Math.abs(((tpRef - E) / E) * 100);
        slPercent = Math.abs(((stopLossPrice - E) / E) * 100);
        console.log(
          `↔ AUTO-TRADE INVERT: ${signal.action} → ${tradeSide.toUpperCase()} ${signal.coin} @ ${E} | TP1≈${takeProfitPrice} SL≈${stopLossPrice}`
        );
      }
    }

    const minNotional = CONFIG.autoTradeMinNotionalUsd;
    const frac = CONFIG.autoTradeBalanceFraction;
    const capUsd = CONFIG.autoTradeMaxPositionUsd;

    const successes = [];
    const balanceSkips = [];
    const openFailures = [];

    for (const { agent, trader, alias } of eligible) {
      console.log(
        `\n🎮 AUTO-TRADE: ${tradeSide.toUpperCase()} ${signal.coin} → ${agent.label} (${alias})` +
          (CONFIG.invertAutoTradeDirection ? ' [INVERT]' : '')
      );

      const balanceResult = await trader.getAccountBalance();
      if (!balanceResult.success) {
        openFailures.push({ alias, label: agent.label, error: balanceResult.error || 'Bakiye okunamadı' });
        continue;
      }

      const availableBalance = balanceResult.balance;
      let size = Math.max(minNotional, Math.min(availableBalance * frac, capUsd));
      size = Math.min(size, availableBalance);

      if (availableBalance < minNotional || size < minNotional) {
        balanceSkips.push({ alias, label: agent.label, balance: availableBalance });
        console.log(`⏭ AUTO-TRADE: ${alias} bakiye yetersiz ($${availableBalance.toFixed(2)})`);
        continue;
      }

      const result = await trader.executeWithRetry(() =>
        trader.openPosition({
          pair: pairLabel,
          side: tradeSide,
          size,
          leverage: signal.leverage,
          takeProfitPrice,
          stopLossPrice,
          tpPercent: Math.abs(tpPercent),
          slPercent: Math.abs(slPercent),
          currentPrice: signal.entry
        })
      );

      if (result.success) {
        console.log(`✅ AUTO-TRADE: ${alias} — açıldı`);
        successes.push({ agentLabel: agent.label, agentAlias: alias, size });
      } else {
        openFailures.push({ alias, label: agent.label, error: result.error || 'Bilinmeyen' });
      }
    }

    await this.telegramBot.sendAutoTradeBatchResults(signal, {
      pairLabel,
      successes,
      balanceSkips,
      openFailures,
      executedAction: CONFIG.invertAutoTradeDirection ? tradeSide.toUpperCase() : undefined
    });
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
