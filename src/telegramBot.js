import { AGENTS, getAgentByAlias, getAllAgents } from './degenClawAgents.js';
import { DegenClawTrader } from './degenClawTrader.js';
import { CONFIG } from './config.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API = TELEGRAM_BOT_TOKEN ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}` : '';

export class TelegramBot {
  constructor() {
    this.botToken = TELEGRAM_BOT_TOKEN;
    this.chatId = TELEGRAM_CHAT_ID;
    this.lastUpdateId = 0;
  }

  async sendMessage(text, options = {}) {
    if (!TELEGRAM_API || !this.chatId) {
      console.warn('Telegram: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID eksik');
      return null;
    }
    try {
      const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: text,
          parse_mode: 'HTML',
          ...options
        })
      });

      const data = await response.json();
      
      if (!data.ok) {
        console.error('Telegram API error:', data);
      }
      
      return data;
    } catch (error) {
      console.error('Failed to send Telegram message:', error.message);
    }
  }

  formatSignalBlock(signal) {
    if (signal.action === 'NO_TRADE') return '';

    const emoji = signal.action === 'LONG' ? '🟢' : '🔴';
    const confidence = signal.confidence === 'HIGH' ? '⭐⭐⭐' : '⭐⭐';

    let message = `${emoji} <b>${signal.action} ${signal.coin}</b> ${confidence}\n\n`;
    message += `📊 <b>Entry:</b> $${signal.entry.toLocaleString()}\n`;
    message += `🛑 <b>Stop Loss:</b> $${signal.stop_loss.toLocaleString()}\n`;
    message += `🎯 <b>Take Profit:</b>\n`;
    message += `   TP1: $${signal.take_profit[0].toLocaleString()} (1R)\n`;
    message += `   TP2: $${signal.take_profit[1].toLocaleString()} (2R)\n`;
    message += `   TP3: $${signal.take_profit[2].toLocaleString()} (3R)\n\n`;
    message += `⚡ <b>Leverage:</b> ${signal.leverage}x\n`;
    message += `💪 <b>Confidence:</b> ${signal.confidence}\n`;
    message += `📈 <b>RSI:</b> ${signal.rsi}\n`;
    message += `💰 <b>Funding:</b> ${signal.fundingRate}\n\n`;
    message += `💡 <b>Reason:</b> ${signal.reason}\n`;
    message += `⏱ <b>Timeframe:</b> ${signal.timeframe}\n\n`;
    message += `🕐 ${new Date(signal.timestamp).toLocaleString()}`;
    return message;
  }

  async sendSignal(signal) {
    if (signal.action === 'NO_TRADE') return;
    await this.sendMessage(this.formatSignalBlock(signal));
  }

  /**
   * Otomatik işlem başarılı: sinyal özeti + işleme giren agent
   */
  async sendAutoTradeSuccess(signal, { agentLabel, agentAlias, size, perpPair }) {
    const sideEmoji = signal.action === 'LONG' ? '🟢' : '🔴';
    let msg = `✅ <b>Otomatik işlem açıldı</b>\n\n`;
    msg += `<b>İşleme giren agent</b>\n`;
    msg += `👤 ${agentLabel} (<code>${agentAlias}</code>)\n`;
    msg += `${sideEmoji} <b>${signal.action}</b> <code>${perpPair}</code>\n`;
    msg += `💰 Boyut: $${size.toFixed(2)} · ⚡ ${signal.leverage}x\n\n`;
    msg += `<b>Sinyal özeti</b>\n`;
    msg += this.formatSignalBlock(signal);
    await this.sendMessage(msg);
  }

  /**
   * Aynı coinde tüm aktif agentlarda zaten pozisyon var
   */
  async sendAutoTradeSkippedAllHolding(signal, holders) {
    let msg = `⏭ <b>Otomatik işlem açılmadı</b>\n\n`;
    msg += `<code>${signal.coin}</code> için aktif agentların <b>hepsinde</b> bu coinde açık pozisyon var; ikinci kez girilmedi.\n\n`;
    msg += `<b>Mevcut pozisyonlar:</b>\n`;
    for (const h of holders) {
      msg += `• ${h.label} (<code>${h.alias}</code>): ${h.pair} ${String(h.side).toUpperCase()}\n`;
    }
    msg += `\n<i>Sinyal özeti:</i>\n`;
    msg += this.formatSignalBlock(signal);
    await this.sendMessage(msg);
  }

  async getUpdates() {
    if (!TELEGRAM_API) return [];
    try {
      const response = await fetch(`${TELEGRAM_API}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=30`);
      const data = await response.json();

      if (data.ok && data.result.length > 0) {
        this.lastUpdateId = data.result[data.result.length - 1].update_id;
        return data.result;
      }

      return [];
    } catch (error) {
      console.error('Failed to get Telegram updates:', error.message);
      return [];
    }
  }

  async handleCommand(message) {
    const text = message.text || '';
    const chatId = message.chat.id;

    if (!text.startsWith('/')) return;

    const parts = text.split(' ');
    const command = parts[0].toLowerCase();

    try {
      switch (command) {
        case '/start':
          await this.sendWelcomeMessage(chatId);
          break;

        case '/agents':
          await this.sendAgentsList(chatId);
          break;

        case '/open':
          await this.handleOpenPosition(parts, chatId);
          break;

        case '/close':
          await this.handleClosePosition(parts, chatId);
          break;

        case '/balance':
          await this.handleBalance(parts, chatId);
          break;

        case '/positions':
          await this.handlePositions(parts, chatId);
          break;

        case '/help':
          await this.sendHelpMessage(chatId);
          break;

        case '/setactive':
          await this.handleSetActiveAgents(parts, chatId);
          break;

        case '/active':
          await this.handleShowActiveAgents(chatId);
          break;

        case '/autotrade':
        case '/status':
          await this.handleAutoTradeStatus(chatId);
          break;

        default:
          await this.sendMessage(`❓ Bilinmeyen komut: ${command}\n\n/help yazarak komutları görebilirsin.`);
      }
    } catch (error) {
      await this.sendMessage(`❌ Hata: ${error.message}`);
    }
  }

  async sendWelcomeMessage(chatId) {
    const message = `
🤖 <b>Kripto Sinyal Botu</b>

Hoş geldin! Bot sürekli tarama yapar; Telegram’a sinyal gönderir. <b>Otomatik işlem</b> (Degen Claw’a emir) ayrıca <code>AUTO_TRADE=true</code> ile açılır — durum: <code>/autotrade</code>

<b>Özellikler:</b>
✅ Multi-timeframe analiz (1H, 15M, 5M)
✅ 8+ teknik indikatör
✅ Perpetual market analizi
✅ 12 Degen Claw agent (manuel / otomatik)
✅ Sinyal bildirimleri

<b>Komutlar:</b> /help · <b>Otomatik işlem durumu:</b> /autotrade
`;

    await this.sendMessage(message);
  }

  async sendHelpMessage(chatId) {
    const message = `
📚 <b>Komut Listesi</b>

<b>Sinyal Botu:</b>
/start - Botu başlat
/help - Yardım menüsü
/autotrade veya /status - Otomatik işlem açık mı, hangi agentlar

<b>Agent Yönetimi:</b>
/agents - 12 agent listesi
/balance [alias] - Agent bakiyesi
/positions [alias|all] - Açık pozisyonlar
/active - Aktif agent listesi
/setactive [agent1,agent2,...] - Aktif agentları ayarla

<b>Trading:</b>
/open [agent] [coin] [long/short] [size] [leverage]x tp=[%] sl=[%]
Örnek: /open raichu BTC long 15 5x tp=3.5 sl=2

/close [agent] [coin] [long/short]
Örnek: /close raichu BTC long

<b>Aktif Agent Ayarlama:</b>
/setactive raichu,venom,friday
→ Otomatik sinyaller bu 3 agent ile açılır

<b>Örnekler:</b>
• <code>/setactive raichu,venom</code> (2 agent aktif)
• <code>/active</code> (hangi agentlar aktif göster)
• <code>/open venom ETH short 20 3x tp=2.5 sl=1.5</code>
• <code>/close friday SOL long</code>
• <code>/balance doctorstrange</code>
• <code>/positions all</code>
`;

    await this.sendMessage(message);
  }

  /**
   * Sunucudaki env ile uyumlu: AUTO_TRADE ve ACTIVE_AGENTS Railway’de tanımlı olmalı.
   */
  async handleAutoTradeStatus(chatId) {
    const autoOn = process.env.AUTO_TRADE === 'true';
    const agentsStr = process.env.ACTIVE_AGENTS || 'raichu';
    const aliases = agentsStr.split(',').map((a) => a.trim()).filter(Boolean);

    let msg = '🎮 <b>Otomatik işlem (Degen Claw)</b>\n\n';

    if (autoOn) {
      msg += '✅ <b>Durum:</b> AÇIK\n';
      msg += 'Sinyallerde <b>güven HIGH</b> olduğunda sırayla bu agentlar işlem dener (round-robin).\n\n';
    } else {
      msg += '⛔ <b>Durum:</b> KAPALI\n';
      msg += 'Şu an sadece sinyal üretilir / Telegram bildirimi gider; <b>otomatik emir gönderilmez</b>.\n';
      msg += 'Açmak için Railway’de <code>AUTO_TRADE=true</code> yap ve yeniden deploy et.\n\n';
    }

    msg += '<b>ACTIVE_AGENTS</b> (sıra ile):\n';
    for (const alias of aliases) {
      const agent = getAgentByAlias(alias);
      if (agent) {
        msg += `• ${agent.label} (<code>${alias}</code>)\n`;
      } else {
        msg += `• <code>${alias}</code> (tanımsız alias)\n`;
      }
    }

    msg += '\n<i>Not: MEDIUM sinyaller otomatik işlem açmaz; sadece HIGH.</i>\n';
    msg += '<i>/active ile aynı liste; otomatik işlem için üstteki durum AÇIK olmalı.</i>';

    await this.sendMessage(msg);
  }

  async sendAgentsList(chatId) {
    let message = '👥 <b>Degen Claw Agents (12)</b>\n\n';

    for (const agent of AGENTS) {
      message += `• <code>${agent.alias}</code> - ${agent.label}\n`;
    }

    message += '\n💡 Kullanım: /open [agent] [coin] [long/short] ...';

    await this.sendMessage(message);
  }

  async handleOpenPosition(parts, chatId) {
    // /open raichu BTC long 15 5x tp=3.5 sl=2
    if (parts.length < 5) {
      await this.sendMessage('❌ Format: /open [agent] [coin] [long/short] [size] [leverage]x tp=[%] sl=[%]');
      return;
    }

    const agentAlias = parts[1];
    const coin = parts[2].toUpperCase();
    const side = parts[3].toLowerCase();
    const size = parseFloat(parts[4]);
    
    const leverageMatch = parts[5]?.match(/(\d+)x/);
    const leverage = leverageMatch ? parseInt(leverageMatch[1]) : 3;
    
    const tpMatch = parts.find(p => p.startsWith('tp='))?.match(/tp=(\d+\.?\d*)/);
    const slMatch = parts.find(p => p.startsWith('sl='))?.match(/sl=(\d+\.?\d*)/);
    
    const tpPercent = tpMatch ? parseFloat(tpMatch[1]) : null;
    const slPercent = slMatch ? parseFloat(slMatch[1]) : null;

    const agent = getAgentByAlias(agentAlias);
    if (!agent) {
      await this.sendMessage(`❌ Agent bulunamadı: ${agentAlias}\n\n/agents ile listeyi görebilirsin.`);
      return;
    }

    if (size < 11) {
      await this.sendMessage('❌ Minimum pozisyon boyutu: 11 USDC');
      return;
    }

    await this.sendMessage(`⏳ ${agent.label} için ${side.toUpperCase()} ${coin} pozisyonu açılıyor...`);
    
    const trader = new DegenClawTrader(agent);
    
    const coinSymbol = coin.replace('/USDC', '').replace(/^.*\//, '');
    const hlInfo = `${CONFIG.hyperliquidApiUrl}/info`;
    let currentPrice = 0;

    try {
      const midsRes = await fetch(hlInfo, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'allMids' })
      });
      const mids = await midsRes.json();
      if (mids && mids[coinSymbol] != null) {
        currentPrice = parseFloat(mids[coinSymbol]);
      }
    } catch (err) {
      console.error('allMids price error:', err);
    }

    if (!currentPrice || !Number.isFinite(currentPrice) || currentPrice <= 0) {
      try {
        const candleResponse = await fetch(hlInfo, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'candleSnapshot',
            req: {
              coin: coinSymbol,
              interval: '5m',
              startTime: Date.now() - (2 * 5 * 60 * 1000),
              endTime: Date.now()
            }
          })
        });
        const candleData = await candleResponse.json();

        if (candleData && candleData.length > 0) {
          const sorted = [...candleData].sort((a, b) => a.t - b.t);
          const lastCandle = sorted[sorted.length - 1];
          currentPrice = parseFloat(lastCandle.c);
        }
      } catch (err) {
        console.error('Candle price error:', err);
      }
    }
    
    if (!currentPrice) {
      await this.sendMessage(`❌ ${coin} fiyatı alınamadı (Hyperliquid)`);
      return;
    }

    const result = await trader.executeWithRetry(() => 
      trader.openPosition({
        pair: coin,
        side,
        size,
        leverage,
        tpPercent,
        slPercent,
        currentPrice
      })
    );

    if (result.success) {
      const tpsl = trader.calculateTPSL(currentPrice, tpPercent, slPercent, side);
      let msg = `✅ <b>Pozisyon Açıldı</b>\n\n`;
      msg += `👤 Agent: ${agent.label}\n`;
      msg += `${side === 'long' ? '🟢' : '🔴'} ${side.toUpperCase()} ${coin}\n`;
      msg += `💰 Size: $${size}\n`;
      msg += `⚡ Leverage: ${leverage}x\n`;
      msg += `📊 Entry: $${currentPrice.toFixed(2)}\n`;
      msg += `🎯 TP: $${tpsl.takeProfit}\n`;
      msg += `🛑 SL: $${tpsl.stopLoss}\n`;

      await this.sendMessage(msg);
    } else {
      await this.sendMessage(`❌ Pozisyon açılamadı: ${result.error}`);
    }
  }

  async handleClosePosition(parts, chatId) {
    // /close raichu BTC long
    if (parts.length < 4) {
      await this.sendMessage('❌ Format: /close [agent] [coin] [long/short]');
      return;
    }

    const agentAlias = parts[1];
    const coin = parts[2].toUpperCase();
    const side = parts[3].toLowerCase();

    const agent = getAgentByAlias(agentAlias);
    if (!agent) {
      await this.sendMessage(`❌ Agent bulunamadı: ${agentAlias}`);
      return;
    }

    await this.sendMessage(`⏳ ${agent.label} için ${side.toUpperCase()} ${coin} pozisyonu kapatılıyor...`);

    const trader = new DegenClawTrader(agent);
    const result = await trader.executeWithRetry(() => 
      trader.closePosition(coin, side)
    );

    if (result.success) {
      await this.sendMessage(`✅ ${agent.label} - ${side.toUpperCase()} ${coin} pozisyonu kapatıldı!`);
    } else {
      await this.sendMessage(`❌ Pozisyon kapatılamadı: ${result.error}`);
    }
  }

  async handleBalance(parts, chatId) {
    // /balance raichu
    if (parts.length < 2) {
      await this.sendMessage('❌ Format: /balance [agent]');
      return;
    }

    const agentAlias = parts[1];
    const agent = getAgentByAlias(agentAlias);
    
    if (!agent) {
      await this.sendMessage(`❌ Agent bulunamadı: ${agentAlias}`);
      return;
    }

    const trader = new DegenClawTrader(agent);
    
    // Gerçek balance'ı API'den al
    const balanceResult = await trader.getAccountBalance();
    const positionsResult = await trader.getPositions();

    if (balanceResult.success) {
      let msg = `💰 <b>${agent.label} - Bakiye</b>\n\n`;
      msg += `💵 Balance: $${balanceResult.balance.toFixed(2)}\n`;
      msg += `💎 Withdrawable: $${balanceResult.withdrawable.toFixed(2)}\n\n`;
      
      if (positionsResult.success) {
        msg += `📦 Açık Pozisyon: ${positionsResult.positions.length}\n`;
        
        if (positionsResult.positions.length > 0) {
          msg += '\n<b>Pozisyonlar:</b>\n';
          for (const pos of positionsResult.positions) {
            const pnl = parseFloat(pos.unrealizedPnl);
            const pnlEmoji = pnl >= 0 ? '🟢' : '🔴';
            msg += `${pnlEmoji} ${pos.pair} ${pos.side.toUpperCase()} | PnL: $${pnl.toFixed(2)}\n`;
          }
        }
      }

      await this.sendMessage(msg);
    } else {
      await this.sendMessage(`❌ Bakiye alınamadı: ${balanceResult.error}`);
    }
  }

  async handlePositions(parts, chatId) {
    // /positions raichu OR /positions all
    const target = parts[1] || 'all';

    if (target === 'all') {
      let msg = '📊 <b>Tüm Açık Pozisyonlar</b>\n\n';
      let totalPositions = 0;

      for (const agent of AGENTS) {
        const trader = new DegenClawTrader(agent);
        const result = await trader.getPositions();

        if (result.success && result.positions.length > 0) {
          msg += `👤 <b>${agent.label}</b>\n`;
          
          for (const pos of result.positions) {
            const pnl = parseFloat(pos.unrealizedPnl);
            const pnlEmoji = pnl >= 0 ? '🟢' : '🔴';
            
            msg += `  ${pnlEmoji} ${pos.pair} ${pos.side.toUpperCase()} ${pos.leverage}x | Entry: $${pos.entryPrice} | PnL: $${pnl.toFixed(2)}\n`;
            totalPositions++;
          }
          msg += '\n';
        }
      }

      if (totalPositions === 0) {
        msg += '❌ Hiç açık pozisyon yok.';
      } else {
        msg += `📈 Toplam: ${totalPositions} pozisyon`;
      }

      await this.sendMessage(msg);
    } else {
      const agent = getAgentByAlias(target);
      
      if (!agent) {
        await this.sendMessage(`❌ Agent bulunamadı: ${target}`);
        return;
      }

      const trader = new DegenClawTrader(agent);
      const result = await trader.getPositions();

      if (result.success && result.positions.length > 0) {
        let msg = `📊 <b>${agent.label} - Açık Pozisyonlar</b>\n\n`;

        for (const pos of result.positions) {
          const pnl = parseFloat(pos.unrealizedPnl);
          const pnlEmoji = pnl >= 0 ? '🟢' : '🔴';
          
          msg += `${pnlEmoji} <b>${pos.pair} ${pos.side.toUpperCase()}</b>\n`;
          msg += `📊 Entry: $${pos.entryPrice}\n`;
          msg += `💰 Mark: $${pos.markPrice}\n`;
          msg += `⚡ Leverage: ${pos.leverage}x\n`;
          msg += `📈 PnL: $${pnl.toFixed(2)}\n`;
          msg += `💵 Margin: $${pos.margin}\n`;
          msg += `🛑 Liquidation: $${pos.liquidationPrice}\n\n`;
        }

        await this.sendMessage(msg);
      } else {
        await this.sendMessage(`❌ ${agent.label} için açık pozisyon yok.`);
      }
    }
  }

  async handleSetActiveAgents(parts, chatId) {
    // /setactive raichu,venom,friday
    if (parts.length < 2) {
      await this.sendMessage('❌ Format: /setactive [agent1,agent2,...]\n\nÖrnek: /setactive raichu,venom,friday');
      return;
    }

    const agentAliases = parts[1].split(',').map(a => a.trim());
    const validAgents = [];
    const invalidAgents = [];

    for (const alias of agentAliases) {
      const agent = getAgentByAlias(alias);
      if (agent) {
        validAgents.push(agent.alias);
      } else {
        invalidAgents.push(alias);
      }
    }

    if (validAgents.length === 0) {
      await this.sendMessage('❌ Hiç geçerli agent bulunamadı.\n\n/agents ile listeyi görebilirsin.');
      return;
    }

    // Scanner'daki aktif agent listesini güncelle
    // Not: Bu geçici bir çözüm, ideali .env'i güncellemek ama o runtime'da yapılamaz
    // Bu yüzden global bir değişken veya file-based config kullanabiliriz
    
    // Şimdilik sadece bilgilendirme mesajı gönderelim
    let msg = '✅ <b>Aktif Agentlar Ayarlandı</b>\n\n';
    msg += '<b>Aktif:</b>\n';
    for (const alias of validAgents) {
      const agent = getAgentByAlias(alias);
      msg += `• ${agent.label} (${alias})\n`;
    }
    
    if (invalidAgents.length > 0) {
      msg += '\n<b>Geçersiz:</b>\n';
      for (const alias of invalidAgents) {
        msg += `• ${alias} ❌\n`;
      }
    }
    
    msg += `\n💡 .env dosyasında ACTIVE_AGENTS değişkenini güncelle:\n`;
    msg += `<code>ACTIVE_AGENTS=${validAgents.join(',')}</code>\n\n`;
    msg += '🔄 Botu yeniden başlat (Railway redeploy)';

    await this.sendMessage(msg);
  }

  async handleShowActiveAgents(chatId) {
    // Railway environment variable'dan oku
    const activeAgentsStr = process.env.ACTIVE_AGENTS || 'raichu';
    const activeAliases = activeAgentsStr.split(',').map(a => a.trim());
    
    let msg = '👥 <b>Aktif Trading Agentlar</b>\n\n';
    
    for (const alias of activeAliases) {
      const agent = getAgentByAlias(alias);
      if (agent) {
        msg += `✅ ${agent.label} (${alias})\n`;
      }
    }
    
    msg += '\n💡 Değiştirmek için:\n';
    msg += '<code>/setactive agent1,agent2,agent3</code>\n\n';
    msg += '⚠️ Not: Değişiklik için Railway\'de ACTIVE_AGENTS değişkenini güncelle ve redeploy et.';

    await this.sendMessage(msg);
  }

  async startPolling() {
    if (!TELEGRAM_API) {
      console.warn('Telegram polling kapalı (TELEGRAM_BOT_TOKEN yok)');
      return;
    }
    console.log('🤖 Telegram bot polling started...');

    while (true) {
      try {
        const updates = await this.getUpdates();

        for (const update of updates) {
          if (update.message) {
            await this.handleCommand(update.message);
          }
        }

        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error('Telegram polling error:', error.message);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }
}
