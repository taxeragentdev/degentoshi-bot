import { AGENTS, getAgentByAlias, getAllAgents } from './degenClawAgents.js';
import { DegenClawTrader } from './degenClawTrader.js';
import { CONFIG } from './config.js';
import { pairForAcp } from './perpSymbols.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API = TELEGRAM_BOT_TOKEN ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}` : '';

/** Scanner ile aynı: ACTIVE_AGENTS yok → raichu; boş string → [] */
function activeAgentsFromEnv() {
  const raw = process.env.ACTIVE_AGENTS;
  if (raw === undefined) return ['raichu'];
  return raw.split(',').map((a) => a.trim()).filter(Boolean);
}

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
   * Aynı sinyalle birden fazla agent: özet tek mesaj
   */
  async sendAutoTradeBatchResults(signal, { pairLabel, successes, balanceSkips, openFailures, executedAction }) {
    const act = (executedAction || signal.action || '').toString().toUpperCase();
    const sideEmoji = act === 'LONG' ? '🟢' : '🔴';
    let msg = `📊 <b>Otomatik işlem özeti</b> — ${sideEmoji} ${act} <code>${pairLabel}</code>\n`;
    if (executedAction && executedAction.toUpperCase() !== String(signal.action).toUpperCase()) {
      msg += `<i>Sinyal yönü: ${signal.action} — env ile ters işlendi (INVERT_AUTO_TRADE_DIRECTION).</i>\n`;
    }
    msg += '\n';

    if (successes.length > 0) {
      msg += `<b>İşlem açılan agentlar (${successes.length}):</b>\n`;
      for (const s of successes) {
        msg += `• ${s.agentLabel} (<code>${s.agentAlias}</code>) — $${s.size.toFixed(2)} · ${signal.leverage}x\n`;
      }
      msg += '\n';
    }

    if (balanceSkips.length > 0) {
      msg += `<i>Atlandı (bakiye &lt; min ~$${CONFIG.autoTradeMinNotionalUsd} veya yetersiz):</i>\n`;
      for (const b of balanceSkips) {
        msg += `• ${b.label} (<code>${b.alias}</code>) — $${(b.balance ?? 0).toFixed(2)}\n`;
      }
      msg += '\n';
    }

    if (openFailures.length > 0) {
      msg += `<i>Hata / API:</i>\n`;
      for (const f of openFailures) {
        msg += `• ${f.label} (<code>${f.alias}</code>): ${f.error}\n`;
      }
      msg += '\n';
    }

    if (successes.length === 0 && balanceSkips.length === 0 && openFailures.length === 0) {
      msg += `<i>Hiçbir agentta işlem açılmadı.</i>\n\n`;
    }

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
✅ ${AGENTS.length} Degen Claw agent (manuel / otomatik)
✅ Sinyal bildirimleri

<b>Komutlar:</b> /help · <b>Otomatik işlem durumu:</b> /autotrade

<i>Otomatik işlemi tamamen durdurmak: sunucuda</i> <code>AUTO_TRADE=false</code> <i>veya</i> <code>ACTIVE_AGENTS=</code> <i>(boş liste).</i>
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

<b>Otomatik işlemi durdur (tüm agentlar):</b> Railway’de <code>AUTO_TRADE=false</code> veya <code>ACTIVE_AGENTS=</code> (boş), redeploy. Açık pozisyonları kapatmak için borsada veya <code>/close</code> ile tek tek.

<b>Agent Yönetimi:</b>
/agents - Tüm agent listesi (${AGENTS.length})
/balance [alias] - Agent bakiyesi
/positions [alias|all] - Açık pozisyonlar
/active - Aktif agent listesi
/setactive [agent1,agent2,...] - Aktif agentları ayarla

<b>Trading:</b>
/open [agent] [coin] [long/short] [size] [leverage]x tp=[%] sl=[%] [limit=fiyat]
Örnek: /open raichu BTC long 15 5x tp=3.5 sl=2
Limit: /open raichu BTC long 50 3x limit=98000 tp=2 sl=1.5

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
    const aliases = activeAgentsFromEnv();

    let msg = '🎮 <b>Otomatik işlem (Degen Claw)</b>\n\n';

    const tradeMin = CONFIG.autoTradeMinConfidence;
    const telMin = CONFIG.telegramMinConfidence;
    const explicitAuto =
      process.env.AUTO_TRADE_MIN_CONFIDENCE != null &&
      String(process.env.AUTO_TRADE_MIN_CONFIDENCE).trim() !== '';

    if (autoOn) {
      msg += '✅ <b>Durum:</b> AÇIK\n';
      msg += `Sinyal güveni <b>${tradeMin}</b> ve üzeriyse, bu coinde pozisyonu olmayan ve bakiyesi yeterli <b>tüm</b> aktif agentlar ayrı ayrı emir dener.\n\n`;
    } else {
      msg += '⛔ <b>Durum:</b> KAPALI\n';
      msg += 'Şu an sadece sinyal üretilir / Telegram bildirimi gider; <b>otomatik emir gönderilmez</b>.\n';
      msg += 'Açmak için Railway’de <code>AUTO_TRADE=true</code> yap ve yeniden deploy et.\n\n';
    }

    msg += '<b>ACTIVE_AGENTS</b> (sıra ile):\n';
    msg +=
      '\n<i>v2 Hyperliquid:</i> örn. <code>HL_RAICHU_API_WALLET_KEY</code> + <code>HL_RAICHU_MASTER_ADDRESS</code> (alias büyük harf) tanımlıysa emirler doğrudan HL; yoksa ACP <code>perp_trade</code>. Repo: github.com/Virtual-Protocol/dgclaw-skill — docs/DEGEN_CLAW_V2.md\n';

    if (aliases.length === 0) {
      msg += '<i>Liste boş — otomatik emir için agent yok (env’de ACTIVE_AGENTS boş).</i>\n';
    } else {
      for (const alias of aliases) {
        const agent = getAgentByAlias(alias);
        if (agent) {
          msg += `• ${agent.label} (<code>${alias}</code>)\n`;
        } else {
          msg += `• <code>${alias}</code> (tanımsız alias)\n`;
        }
      }
    }

    msg += `\n💵 <b>Emir tutarı (USDC):</b> min <code>${CONFIG.autoTradeMinNotionalUsd}</code> · bakiyenin <code>${(CONFIG.autoTradeBalanceFraction * 100).toFixed(0)}%</code> · üst sınır <code>${CONFIG.autoTradeMaxPositionUsd}</code>\n`;
    msg += `<i>Env: AUTO_TRADE_MIN_NOTIONAL_USD, AUTO_TRADE_BALANCE_FRACTION (0–1), AUTO_TRADE_MAX_POSITION_USD</i>\n`;

    const lev = CONFIG.leverage;
    msg += `\n⚡ <b>Kaldıraç (sinyal):</b> MEDIUM <code>${lev.medium}x</code> · HIGH <code>${lev.high}x</code> · skor ≥ <code>${lev.veryHighMinScore}</code> → <code>${lev.veryHigh}x</code>\n`;
    msg += `<i>Env: LEVERAGE_LOW/MEDIUM/HIGH, LEVERAGE_VERY_HIGH, LEVERAGE_VERY_HIGH_MIN_SCORE</i>\n`;

    msg += `\n↔ <b>Ters otomatik işlem:</b> <code>${CONFIG.invertAutoTradeDirection ? 'AÇIK' : 'KAPALI'}</code> (<code>INVERT_AUTO_TRADE_DIRECTION=true</code>)\n`;

    msg += `\n📊 <b>Telegram eşik:</b> <code>${telMin}</code>\n`;
    msg += `📊 <b>Otomatik emir eşik:</b> <code>${tradeMin}</code>`;
    if (!explicitAuto) {
      msg += ` <i>(AUTO_TRADE_MIN_CONFIDENCE boş → Telegram ile aynı)</i>`;
    }
    msg += `\n\n<i>Ayrı kısıtlamak için Railway’e <code>AUTO_TRADE_MIN_CONFIDENCE=HIGH</code> yaz (Telegram MEDIUM kalabilir).</i>`;

    await this.sendMessage(msg);
  }

  async sendAgentsList(chatId) {
    let message = `👥 <b>Degen Claw Agents (${AGENTS.length})</b>\n\n`;

    for (const agent of AGENTS) {
      message += `• <code>${agent.alias}</code> - ${agent.label}\n`;
    }

    message += '\n💡 Kullanım: /open [agent] [coin] [long/short] ...';

    await this.sendMessage(message);
  }

  async handleOpenPosition(parts, chatId) {
    // /open raichu BTC long 15 5x tp=3.5 sl=2
    if (parts.length < 5) {
      await this.sendMessage(
        '❌ Format: /open [agent] [coin] [long/short] [size] [leverage]x tp=[%] sl=[%] [opsiyonel: limit=fiyat]'
      );
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

    const limitMatch = parts.find((p) => /^limit=/i.test(p))?.match(/^limit=(\d+\.?\d*)$/i);
    const limitPrice = limitMatch ? parseFloat(limitMatch[1]) : null;
    const orderType = limitPrice != null && Number.isFinite(limitPrice) ? 'limit' : 'market';

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
    
    const coinSymbol = pairForAcp(coin);
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

    if (orderType === 'limit' && (!Number.isFinite(limitPrice) || limitPrice <= 0)) {
      await this.sendMessage('❌ Limit emir için geçerli bir <code>limit=fiyat</code> yaz (örn. limit=98000)');
      return;
    }

    const refPrice =
      orderType === 'limit' && Number.isFinite(limitPrice) && limitPrice > 0 ? limitPrice : currentPrice;

    const result = await trader.executeWithRetry(() =>
      trader.openPosition({
        pair: coin,
        side,
        size,
        leverage,
        tpPercent,
        slPercent,
        currentPrice: refPrice,
        orderType,
        limitPrice: orderType === 'limit' ? limitPrice : undefined
      })
    );

    if (result.success) {
      const tpsl =
        tpPercent != null && slPercent != null
          ? trader.calculateTPSL(refPrice, tpPercent, slPercent, side)
          : null;
      let msg = `✅ <b>Pozisyon Açıldı</b>\n\n`;
      msg += `👤 Agent: ${agent.label}\n`;
      msg += `${side === 'long' ? '🟢' : '🔴'} ${side.toUpperCase()} ${coin}\n`;
      msg += `💰 Size: $${size}\n`;
      msg += `⚡ Leverage: ${leverage}x\n`;
      msg +=
        orderType === 'limit'
          ? `📌 Limit fiyat: $${limitPrice}\n`
          : `📊 Referans fiyat: $${currentPrice.toFixed(2)}\n`;
      if (tpsl) {
        msg += `🎯 TP: $${tpsl.takeProfit}\n`;
        msg += `🛑 SL: $${tpsl.stopLoss}\n`;
      }

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
    const activeAliases = activeAgentsFromEnv();

    let msg = '👥 <b>Aktif Trading Agentlar</b>\n\n';

    if (activeAliases.length === 0) {
      msg += '<i>Liste boş — otomatik sinyal emri için hiç agent seçili değil.</i>\n\n';
    }

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
