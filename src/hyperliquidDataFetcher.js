import { CONFIG } from './config.js';

export class HyperliquidDataFetcher {
  constructor() {
    this.apiUrl = CONFIG.hyperliquidApiUrl;
    this.metaCache = null;
    this.metaCacheTime = 0;
  }

  async fetchMeta() {
    // Cache meta for 60 seconds
    if (this.metaCache && Date.now() - this.metaCacheTime < 60000) {
      return this.metaCache;
    }

    try {
      const response = await fetch(`${this.apiUrl}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'meta' })
      });

      this.metaCache = await response.json();
      this.metaCacheTime = Date.now();
      return this.metaCache;
    } catch (error) {
      console.error('Error fetching Hyperliquid meta:', error.message);
      return null;
    }
  }

  async fetchOHLCV(symbol, interval, limit = 300) {
    try {
      // Hyperliquid coin formatı (BTC/USDT -> BTC)
      const coin = symbol.split('/')[0];
      
      const endTime = Date.now();
      const startTime = endTime - (limit * this.intervalToMs(interval));
      
      const response = await fetch(`${this.apiUrl}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'candleSnapshot',
          req: {
            coin: coin,
            interval: interval,
            startTime: startTime,
            endTime: endTime
          }
        })
      });

      const data = await response.json();
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        return null;
      }

      const sorted = [...data].sort((a, b) => a.t - b.t);

      return sorted.map(candle => ({
        timestamp: candle.t,
        open: parseFloat(candle.o),
        high: parseFloat(candle.h),
        low: parseFloat(candle.l),
        close: parseFloat(candle.c),
        volume: parseFloat(candle.v || 0)
      }));
    } catch (error) {
      console.error(`Error fetching OHLCV for ${symbol} ${interval}:`, error.message);
      return null;
    }
  }

  async fetchAllMids() {
    try {
      const response = await fetch(`${this.apiUrl}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'allMids' })
      });

      return await response.json();
    } catch (error) {
      console.error('Error fetching all mids:', error.message);
      return null;
    }
  }

  async fetchFundingRate(symbol) {
    try {
      const coin = symbol.split('/')[0];
      const meta = await this.fetchMeta();
      
      if (!meta || !meta.universe) {
        return { rate: 0, timestamp: Date.now() };
      }

      const coinData = meta.universe.find(u => u.name === coin);
      
      return {
        rate: coinData?.funding ? parseFloat(coinData.funding) : 0,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error fetching funding rate for ${symbol}:`, error.message);
      return { rate: 0, timestamp: Date.now() };
    }
  }

  async fetchOpenInterest(symbol) {
    try {
      const coin = symbol.split('/')[0];
      const meta = await this.fetchMeta();
      
      if (!meta || !meta.universe) {
        return { value: 0, timestamp: Date.now() };
      }

      const coinData = meta.universe.find(u => u.name === coin);
      
      return {
        value: coinData?.openInterest ? parseFloat(coinData.openInterest) : 0,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error fetching open interest for ${symbol}:`, error.message);
      return { value: 0, timestamp: Date.now() };
    }
  }

  async fetchTicker(symbol) {
    try {
      const coin = symbol.split('/')[0];

      // Mid fiyat (HL UI / allMids) — gerçek piyasa ile uyumlu referans
      const mids = await this.fetchAllMids();
      if (mids && typeof mids === 'object' && mids[coin] != null && mids[coin] !== '') {
        const mid = parseFloat(mids[coin]);
        if (Number.isFinite(mid) && mid > 0) {
          return {
            last: mid,
            volume: 0,
            timestamp: Date.now()
          };
        }
      }

      const recentCandles = await this.fetchOHLCV(symbol, '5m', 3);
      if (recentCandles && recentCandles.length > 0) {
        const lastCandle = recentCandles[recentCandles.length - 1];
        return {
          last: lastCandle.close,
          volume: lastCandle.volume,
          timestamp: lastCandle.timestamp
        };
      }

      return null;
    } catch (error) {
      console.error(`Error fetching ticker for ${symbol}:`, error.message);
      return null;
    }
  }

  async fetchMarketData(symbol) {
    try {
      // Parallel fetch with proper error handling
      const results = await Promise.allSettled([
        this.fetchOHLCV(symbol, '1h', 250),
        this.fetchOHLCV(symbol, '15m', 150),
        this.fetchOHLCV(symbol, '5m', 100),
        this.fetchFundingRate(symbol),
        this.fetchOpenInterest(symbol),
        this.fetchTicker(symbol)
      ]);

      const [candles1h, candles15m, candles5m, fundingRate, openInterest, ticker] = results.map(r => 
        r.status === 'fulfilled' ? r.value : null
      );

      if (!candles1h || !candles15m || !candles5m || !ticker) {
        return null;
      }

      // Calculate volume from recent candles
      const recentVolume = candles1h.slice(-24).reduce((sum, c) => sum + (c.volume || 0), 0);

      return {
        symbol,
        candles1h,
        candles15m,
        candles5m,
        fundingRate: fundingRate?.rate || 0,
        openInterest: openInterest?.value || 0,
        currentPrice: ticker.last,
        volume: recentVolume,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error.message);
      return null;
    }
  }

  intervalToMs(interval) {
    const map = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };
    return map[interval] || 60 * 1000;
  }
}
