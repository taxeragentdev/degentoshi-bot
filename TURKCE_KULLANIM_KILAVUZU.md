# 🤖 Kripto Sinyal Botu - Türkçe Kullanım Kılavuzu

## 📌 Genel Bakış

Bu bot, kripto perpetual futures (sürekli vadeli işlemler) için **otomatik sinyal üretir** ve **Degen Claw** ile entegre çalışır.

### ⭐ Özellikler

✅ **Multi-Timeframe Analiz** - 1 saat, 15 dakika, 5 dakika  
✅ **8+ Teknik İndikatör** - EMA, RSI, MACD, ATR, Volume  
✅ **Perpetual Market Analizi** - Funding rate, Open Interest  
✅ **Telegram Entegrasyonu** - Otomatik sinyal bildirimleri  
✅ **Degen Claw Entegrasyonu** - 12 agent ile otomatik trading  
✅ **Güvenlik** - Sadece sinyal üretir, otomatik işlem isteğe bağlı  

---

## 🚀 Kurulum

### 1. Gereken Programlar

- **Node.js 18+** (https://nodejs.org'dan indir)
- Terminal/PowerShell erişimi
- İnternet bağlantısı

### 2. İlk Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Sistem kontrolü
npm run health
```

---

## ⚙️ Ayarlar (.env dosyası)

`.env` dosyasını aç ve düzenle:

```env
# Exchange ayarları
EXCHANGE=binance
SCAN_INTERVAL_MS=60000        # 60 saniyede bir tara
MAX_OPEN_TRADES=3             # Maksimum 3 işlem
RISK_PER_TRADE=0.01           # İşlem başına %1 risk
CAPITAL=10000                 # Sermaye (USD)

# İzlenecek coinler
COINS=BTC/USDT,ETH/USDT,SOL/USDT,BNB/USDT,XRP/USDT

# Telegram Botu
TELEGRAM_BOT_TOKEN=8770019273:AAE0lTPVhB26s9c7XUSsEEqXoPzEpAewehg
TELEGRAM_CHAT_ID=750170873

# Otomatik İşlem (isteğe bağlı)
AUTO_TRADE=false              # true yaparak aktif edebilirsin
AUTO_TRADE_AGENT=raichu       # Hangi agent kullanılacak
```

---

## 🎯 Botu Başlatma

```bash
npm start
```

Göreceğin ekran:

```
╔═══════════════════════════════════════════════════════════════╗
║           CRYPTO TRADING SIGNAL BOT                           ║
║           Perpetual Futures Edition                           ║
╚═══════════════════════════════════════════════════════════════╝

🚀 Starting Crypto Signal Bot...
📊 Monitoring 20 coins
⏱️  Scan interval: 60s
💰 Capital: $10000
🎯 Risk per trade: 1%
📈 Max open trades: 3
🤖 Telegram bot: ACTIVE
🎮 Auto-trade: DISABLED
```

---

## 📱 Telegram Komutları

Bot başladığında Telegram'dan kontrol edebilirsin:

### Temel Komutlar

```
/start - Botu başlat ve hoş geldin mesajı
/help - Tüm komutları göster
/agents - 12 Degen Claw agent listesi
```

### Trading Komutları

**Pozisyon Açma:**
```
/open [agent] [coin] [long/short] [miktar] [kaldıraç]x tp=[%] sl=[%]

Örnekler:
/open raichu BTC long 15 5x tp=3.5 sl=2
/open venom ETH short 20 3x tp=2.5 sl=1.5
/open friday SOL long 25 4x tp=4 sl=2
```

**Pozisyon Kapatma:**
```
/close [agent] [coin] [long/short]

Örnekler:
/close raichu BTC long
/close venom ETH short
```

**Bakiye Görüntüleme:**
```
/balance [agent]

Örnekler:
/balance raichu
/balance doctorstrange
```

**Pozisyonları Görüntüleme:**
```
/positions [agent|all]

Örnekler:
/positions raichu        # Sadece raichu'nun pozisyonları
/positions all           # Tüm agentların pozisyonları
```

---

## 🎮 12 Degen Claw Agents

Botun 12 adet trading agentı var:

1. **doctorstrange** - Doctor Strange
2. **friday** - FRIDAY
3. **ichimoku** - Ichimoku Kinko Hyo
4. **pokedex** - Pokedex
5. **raichu** - Super Saiyan Raichu ⭐ (varsayılan)
6. **redkid** - Red Kid
7. **spongebob** - Sponge Bob
8. **squirtle** - SquirtleSquad
9. **taxerclaw** - TaXerClaw
10. **venom** - VENOM
11. **virgen** - Virgen Capital
12. **welles** - Welles Wilder

Her agent bağımsız çalışır ve kendi hesabıyla işlem yapar.

---

## 📊 Sinyal Sistemi Nasıl Çalışır?

### 1. Bot Sürekli Tarama Yapar

Bot her 60 saniyede bir 20 coini tarar ve şunlara bakar:
- **1 Saatlik grafik** → Trend yönü (EMA 200)
- **15 Dakikalık grafik** → Geri çekilme noktaları (EMA 50 + RSI)
- **5 Dakikalık grafik** → Giriş sinyali (MACD + Mum kalıpları)
- **Perpetual data** → Funding rate, Open Interest, Volume

### 2. Puanlama Sistemi (7 puan üzerinden)

Her coin için puan hesaplanır:
- Trend uyumu: +2 puan
- RSI geçerli bölgede: +1 puan
- MACD sinyali: +1 puan
- Volume artışı: +1 puan
- Open Interest artıyor: +1 puan
- Funding rate uygun: +1 puan

### 3. Sinyal Üretilir

- **6-7 puan** = YÜKSEK güven → 5x kaldıraç → Sinyal üretilir ✅
- **4-5 puan** = ORTA güven → 3x kaldıraç → Sinyal üretilir ✅
- **<4 puan** = DÜŞÜK güven → Sinyal üretilmez ❌

### 4. Telegram'a Gönderilir

Sinyal bulunduğunda Telegram'a otomatik bildirim gelir:

```
🟢 LONG BTC ⭐⭐⭐

📊 Entry: $65,000
🛑 Stop Loss: $64,000
🎯 Take Profit:
   TP1: $66,000 (1R)
   TP2: $67,000 (2R)
   TP3: $68,000 (3R)

⚡ Leverage: 5x
💪 Confidence: HIGH
📈 RSI: 45.23
💰 Funding: 0.0045%

💡 Reason: 1H uptrend + MACD bull cross + Volume spike
⏱ Timeframe: 5m/15m/1h confluence
```

---

## 🎯 Örnek Kullanım Senaryoları

### Senaryo 1: Sadece Sinyal Takibi

```bash
# .env dosyasında:
AUTO_TRADE=false

# Botu başlat:
npm start

# Sonuç:
# - Bot sinyalleri Telegram'a gönderir
# - Sen manuel olarak Degen Claw'da işlem yaparsın
# - Veya /open komutuyla Telegram'dan işlem açarsın
```

### Senaryo 2: Otomatik İşlem (AUTO_TRADE)

```bash
# .env dosyasında:
AUTO_TRADE=true
AUTO_TRADE_AGENT=raichu

# Botu başlat:
npm start

# Sonuç:
# - Bot YÜKSEK güvenli sinyalleri bulduğunda
# - Otomatik olarak "raichu" agentıyla işlem açar
# - Telegram'dan bildirim alırsın
```

### Senaryo 3: Manuel Agent Yönetimi

Telegram'dan direkt komutlarla:

```
1️⃣ BTC sinyali geldi
2️⃣ /open doctorstrange BTC long 20 5x tp=3.5 sl=2
3️⃣ Bot işlemi açar
4️⃣ /positions doctorstrange (pozisyonu kontrol et)
5️⃣ Kar al veya zarar kes:
   /close doctorstrange BTC long
```

---

## 💡 İpuçları

### Sinyal Sıklığı

- **Normal**: Günde 0-5 sinyal
- **Çok sinyal görmüyorsan**: Bu NORMAL! Bot çok seçici.
- **Sebep**: Sadece A+ kalitede kurulumlar için sinyal üretir

### Minimum Pozisyon Boyutu

- **Degen Claw minimum**: 11 USDC
- **Önerilen**: 15 USDC ve üzeri
- **Botun hesapladığı**: Sermaye × %1 risk (varsayılan)

### Kaldıraç Kullanımı

- **YÜKSEK güven** → 5x kaldıraç (en iyi kurulumlar)
- **ORTA güven** → 3x kaldıraç (iyi kurulumlar)
- **Başlangıç için**: 3x ile başla, sonra artır

### Agent Seçimi

- **raichu**: Varsayılan agent (Super Saiyan Raichu)
- **Çoklu agent**: Farklı agentlarla farklı stratejiler dene
- **Bakiye kontrolü**: /balance [agent] ile düzenli kontrol et

---

## 🔧 Sorun Giderme

### Problem: Sinyal gelmiyor

**Cevap**: Bu NORMAL!

Bot çok seçici. Bazen saatlerce sinyal gelmez. Sadece A+ kurulumlar için sinyal üretir.

```bash
# Daha fazla sinyal görmek için (TESTİNDE):
# src/config.js dosyasında:
confidence: {
  high: 5,    # Normalde 6
  medium: 3   # Normalde 4
}
```

### Problem: Telegram bildirimi gelmiyor

**Kontrol et**:
1. Bot çalışıyor mu? (`npm start`)
2. .env dosyasında `TELEGRAM_BOT_TOKEN` doğru mu?
3. `TELEGRAM_CHAT_ID` doğru mu?

### Problem: Pozisyon açılamıyor

**Olası nedenler**:
- **Yetersiz bakiye**: /balance [agent] ile kontrol et
- **Minimum 11 USDC**: Daha küçük pozisyon açılmaz
- **Zaten açık pozisyon var**: Önce kapatman gerek

### Problem: "Agent bulunamadı" hatası

**Çözüm**:
```
# Doğru yazım:
/open raichu BTC long ...    ✅
/open Raichu BTC long ...    ❌ (büyük harf)

# Agent listesi:
/agents
```

---

## 🚀 Railway'e Deployment

### 1. GitHub'a Push

```bash
# Git başlat (eğer yoksa)
git init
git add .
git commit -m "Initial commit - Crypto Signal Bot"

# GitHub repo'ya push
git remote add origin <github-repo-url>
git push -u origin main
```

### 2. Railway'de Oluştur

1. https://railway.app'e git
2. "New Project" → "Deploy from GitHub"
3. Repo'yu seç: `best-signalbot`
4. Environment Variables ekle:

```
TELEGRAM_BOT_TOKEN=8770019273:AAE0lTPVhB26s9c7XUSsEEqXoPzEpAewehg
TELEGRAM_CHAT_ID=750170873
AUTO_TRADE=false
AUTO_TRADE_AGENT=raichu
SCAN_INTERVAL_MS=60000
CAPITAL=10000
RISK_PER_TRADE=0.01
```

5. Deploy

### 3. Logları İzle

Railway dashboard'dan "Logs" sekmesine tıkla:

```
🚀 Starting Crypto Signal Bot...
🤖 Telegram bot: ACTIVE
🔍 Scan #1 - Analyzing BTC...
```

---

## 📈 Performans Beklentileri

### Sinyal Kalitesi

- **Kazanma oranı hedefi**: %50-60
- **Ortalama Risk/Ödül**: 1:2.5
- **Maksimum düşüş**: <%15 (doğru pozisyon boyutuyla)

### Sistem Gereksinimleri

- **RAM**: <100MB
- **CPU**: Minimal
- **Depolama**: <50MB

---

## 🎓 Öğrenme Kaynakları

### Strateji Detayları

Botun nasıl çalıştığını anlamak için:
- `docs/STRATEGY.md` - Tam strateji açıklaması
- `docs/ARCHITECTURE.md` - Sistem mimarisi
- `examples/` - Örnek sinyaller

### Teknik Analiz

- EMA (Exponential Moving Average)
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- ATR (Average True Range)

---

## ⚠️ Önemli Uyarılar

1. **Bu bot sadece sinyal üretir**
   - Otomatik işlem KAPALIYKEN → Sadece bildirim gönderir
   - Otomatik işlem AÇIKKEN → İzin verdiğin agent'la işlem yapar

2. **Risk yönetimi kritik**
   - İşlem başına %1 risk kullan
   - Maksimum 3 açık işlem
   - Kaldıracı düşük tut (3-5x)

3. **Küçük sermayeyle başla**
   - İlk hafta $100-500 ile test et
   - Stratejiye güvendikten sonra artır

4. **Fonları asla kaybetme riski**
   - Kripto trading risklidir
   - Kaybedebileceğinden fazlasını riske atma

---

## 📞 Destek

### Dokümantasyon
- `README.md` - Genel bakış
- `GETTING_STARTED.md` - Başlangıç kılavuzu (İngilizce)
- `docs/` - Teknik dokümantasyon

### Telegram Komutları
```
/help - Tüm komutları göster
/agents - Agent listesi
```

### Sağlık Kontrolü
```bash
npm run health
```

---

## 🎉 Başlamaya Hazırsın!

```bash
# 1. Botu başlat
npm start

# 2. Telegram'dan komutları dene
/start
/agents
/help

# 3. Sinyalleri bekle
# Bot otomatik olarak Telegram'a gönderecek!

# 4. İşlem aç (isteğe bağlı)
/open raichu BTC long 15 5x tp=3.5 sl=2
```

---

**İyi şanslar ve karlı işlemler! 🚀📈**

*Sorularınız için Telegram'dan /help yazabilirsiniz.*
