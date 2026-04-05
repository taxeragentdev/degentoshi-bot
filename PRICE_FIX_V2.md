# Fiyat Düzeltmesi v2 - Candle Close Yöntemi

## Problem
Telegram'dan gelen sinyallerde BTC fiyatı gerçek piyasa fiyatından ~$300 daha yüksek görünüyordu.

## Çözüm
`dgc-signal` repo'sundan öğrenilen yöntem uygulandı: **OHLCV candle close fiyatları** kullanmak.

### Değişiklikler

#### 1. `src/hyperliquidDataFetcher.js`
**`fetchTicker()` güncellendi:**
```javascript
// ÖNCEKİ: Sadece allMids kullanıyordu
const mids = await this.fetchAllMids();
const price = mids[coin];

// YENİ: İlk önce candle close, fallback olarak allMids
const recentCandles = await this.fetchOHLCV(symbol, '5m', 2);
const lastCandle = recentCandles[recentCandles.length - 1];
return { last: lastCandle.close };
```

**Neden daha iyi?**
- Candle close fiyatları daha güvenilir (tamamlanmış işlem verileri)
- `allMids` anlık fiyat olabilir, slippage olabilir
- `dgc-signal` gibi üretim botları bu yöntemi kullanıyor

#### 2. `src/telegramBot.js`
**`handleOpenPosition()` güncellendi:**
```javascript
// YENİ: İlk önce 5m candle'dan fiyat al
const candleResponse = await fetch(..., {
  type: 'candleSnapshot',
  req: {
    coin: coinSymbol,
    interval: '5m',
    startTime: Date.now() - (2 * 5 * 60 * 1000),
    endTime: Date.now()
  }
});
const lastCandle = candleData[candleData.length - 1];
currentPrice = parseFloat(lastCandle.c);

// Fallback: allMids (eğer candle alınamazsa)
if (!currentPrice) {
  const priceResponse = await fetch(..., { type: 'allMids' });
}
```

### Nasıl Çalışır?

1. **Sinyal üretimi** (`hyperliquidDataFetcher.fetchTicker`):
   - En son 2 adet 5m candle çek
   - Son candle'ın `close` fiyatını kullan
   - Eğer candle alınamazsa → `allMids`'e düş

2. **Manuel işlem** (`telegramBot.handleOpenPosition`):
   - Son 2 adet 5m candle çek (son 10 dakika)
   - En son candle'ın `close` fiyatını kullan
   - Eğer candle alınamazsa → `allMids`'e düş

### Test Edilmesi Gerekenler

```bash
# 1. Bot'u başlat
npm start

# 2. Telegram'dan sinyalleri izle
# BTC fiyatı şimdi doğru olmalı (örn: $67,350 civarı)

# 3. Manuel işlem test et
/open raichu BTC long 15 5x tp=3 sl=1.5

# 4. Fiyatın doğru olduğunu kontrol et
```

### Referans
Bu çözüm `dgc-signal` repo'sundan alındı:
- https://github.com/taxeragentdev/dgc-signal
- `src/exchange.js` → CCXT `fetchOHLCV` kullanıyor
- `src/autoTrade.js` → Candle close fiyatlarını kullanıyor

## Özet
✅ **ÖNCEKİ**: `allMids` API'si (anlık fiyat, yanlış olabilir)  
✅ **ŞİMDİ**: 5m candle close fiyatı (güvenilir, gerçek işlem verisi)  
✅ **Fallback**: Eğer candle alınamazsa → `allMids`

---
**Tarih**: 5 Nisan 2026  
**Kaynak**: dgc-signal repo analizi
