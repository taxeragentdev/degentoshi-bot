import { AGENTS, getAgentByAlias, getAllAgents } from './degenClawAgents.js';
import { DegenClawTrader } from './degenClawTrader.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8770019273:AAE0lTPVhB26s9c7XUSsEEqXoPzEpAewehg";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "750170873";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export class TelegramBot {
  constructor() {
    this.botToken = TELEGRAM_BOT_TOKEN;
    this.chatId = TELEGRAM_CHAT_ID;
    this.lastUpdateId = 0;
  }

  async sendMessage(text, options = {}) {
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

  async sendSignal(signal) {
    if (signal.action === 'NO_TRADE') return;

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

    await this.sendMessage(message);
  }

  async getUpdates() {
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

Hoş geldin! Bu bot otomatik olarak yüksek kaliteli kripto trading sinyalleri üretir ve Degen Claw ile işlem yapabilir.

<b>Özellikler:</b>
✅ Multi-timeframe analiz (1H, 15M, 5M)
✅ 8+ teknik indikatör
✅ Perpetual market analizi
✅ 12 Degen Claw agent yönetimi
✅ Otomatik sinyal bildirimleri

<b>Komutlar için:</b> /help
<b>Agent listesi için:</b> /agents
`;

    await this.sendMessage(message);
  }

  async sendHelpMessage(chatId) {
    const message = `
📚 <b>Komut Listesi</b>

<b>Sinyal Botu:</b>
/start - Botu başlat
/help - Yardım menüsü

<b>Agent Yönetimi:</b>
/agents - 12 agent listesi
/balance [alias] - Agent bakiyesi
/positions [alias|all] - Açık pozisyonlar

<b>Trading:</b>
/open [agent] [coin] [long/short] [size] [leverage]x tp=[%] sl=[%]
Örnek: /open raichu BTC long 15 5x tp=3.5 sl=2

/close [agent] [coin] [long/short]
Örnek: /close raichu BTC long

<b>Örnekler:</b>
• <code>/open venom ETH short 20 3x tp=2.5 sl=1.5</code>
• <code>/close friday SOL long</code>
• <code>/balance doctorstrange</code>
• <code>/positions all</code>
`;

    await this.sendMessage(message);
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
    
    // Hyperliquid fiyatını al (Hyperliquid API'den)
    const coinSymbol = coin.replace('/USDT', '');
    const priceResponse = await fetch('https://api.hyperliquid-testnet.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'allMids' })
    });
    const priceData = await priceResponse.json();
    const currentPrice = parseFloat(priceData[coinSymbol] || 0);
    
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
    const result = await trader.getPositions();

    if (result.success) {
      const balance = result.balance;
      let msg = `💰 <b>${agent.label} - Bakiye</b>\n\n`;
      msg += `💵 Account Value: $${parseFloat(balance.accountValue).toFixed(2)}\n`;
      msg += `📊 Margin Used: $${parseFloat(balance.totalMarginUsed).toFixed(2)}\n`;
      msg += `📈 Total PnL: $${parseFloat(balance.totalNtlPos).toFixed(2)}\n`;
      msg += `💎 Available: $${parseFloat(balance.totalRawUsd).toFixed(2)}\n\n`;
      msg += `📦 Açık Pozisyon: ${result.positions.length}`;

      await this.sendMessage(msg);
    } else {
      await this.sendMessage(`❌ Bakiye alınamadı: ${result.error}`);
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
            const p = pos.position;
            const pnl = parseFloat(p.unrealizedPnl);
            const pnlEmoji = pnl >= 0 ? '🟢' : '🔴';
            
            msg += `  ${pnlEmoji} ${p.coin} | Entry: $${p.entryPx} | PnL: $${pnl.toFixed(2)}\n`;
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
          const p = pos.position;
          const pnl = parseFloat(p.unrealizedPnl);
          const pnlEmoji = pnl >= 0 ? '🟢' : '🔴';
          
          msg += `${pnlEmoji} <b>${p.coin}</b>\n`;
          msg += `📊 Entry: $${p.entryPx}\n`;
          msg += `💰 Size: ${p.szi}\n`;
          msg += `⚡ Leverage: ${p.leverage.value}x\n`;
          msg += `📈 PnL: $${pnl.toFixed(2)} (${(parseFloat(p.returnOnEquity) * 100).toFixed(2)}%)\n`;
          msg += `🛑 Liquidation: $${p.liquidationPx}\n\n`;
        }

        await this.sendMessage(msg);
      } else {
        await this.sendMessage(`❌ ${agent.label} için açık pozisyon yok.`);
      }
    }
  }

  async startPolling() {
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
