import ccxt from 'ccxt';
import { CONFIG } from './config.js';

export class DataFetcher {
  constructor() {
    this.exchange = new ccxt[CONFIG.exchange]({
      enableRateLimit: true,
      options: {
        defaultType: 'future'
      }
    });
  }
  
  async fetchOHLCV(symbol, timeframe, limit = 300) {
    try {
      const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
      return ohlcv.map(candle => ({
        timestamp: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5]
      }));
    } catch (error) {
      console.error(`Error fetching OHLCV for ${symbol} ${timeframe}:`, error.message);
      return null;
    }
  }
  
  async fetchFundingRate(symbol) {
    try {
      const fundingRate = await this.exchange.fetchFundingRate(symbol);
      return {
        rate: fundingRate.fundingRate || 0,
        timestamp: fundingRate.timestamp
      };
    } catch (error) {
      console.error(`Error fetching funding rate for ${symbol}:`, error.message);
      return { rate: 0, timestamp: Date.now() };
    }
  }
  
  async fetchOpenInterest(symbol) {
    try {
      const oi = await this.exchange.fetchOpenInterest(symbol);
      return {
        value: oi.openInterestAmount || oi.openInterestValue || 0,
        timestamp: oi.timestamp
      };
    } catch (error) {
      console.error(`Error fetching open interest for ${symbol}:`, error.message);
      return { value: 0, timestamp: Date.now() };
    }
  }
  
  async fetchTicker(symbol) {
    try {
      const ticker = await this.exchange.fetchTicker(symbol);
      return {
        last: ticker.last,
        volume: ticker.quoteVolume || ticker.baseVolume,
        timestamp: ticker.timestamp
      };
    } catch (error) {
      console.error(`Error fetching ticker for ${symbol}:`, error.message);
      return null;
    }
  }
  
  async fetchMarketData(symbol) {
    try {
      const [
        candles1h,
        candles15m,
        candles5m,
        fundingRate,
        openInterest,
        ticker
      ] = await Promise.all([
        this.fetchOHLCV(symbol, CONFIG.timeframes.trend, 250),
        this.fetchOHLCV(symbol, CONFIG.timeframes.setup, 150),
        this.fetchOHLCV(symbol, CONFIG.timeframes.entry, 100),
        this.fetchFundingRate(symbol),
        this.fetchOpenInterest(symbol),
        this.fetchTicker(symbol)
      ]);
      
      if (!candles1h || !candles15m || !candles5m || !ticker) {
        return null;
      }
      
      return {
        symbol,
        candles1h,
        candles15m,
        candles5m,
        fundingRate: fundingRate.rate,
        openInterest: openInterest.value,
        currentPrice: ticker.last,
        volume: ticker.volume,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error.message);
      return null;
    }
  }
}
