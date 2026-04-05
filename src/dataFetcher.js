import { HyperliquidDataFetcher } from './hyperliquidDataFetcher.js';
import { CONFIG } from './config.js';

export class DataFetcher {
  constructor() {
    // Hyperliquid için özel data fetcher kullan
    this.exchange = new HyperliquidDataFetcher();
  }
  
  async fetchOHLCV(symbol, timeframe, limit = 300) {
    return await this.exchange.fetchOHLCV(symbol, timeframe, limit);
  }
  
  async fetchFundingRate(symbol) {
    return await this.exchange.fetchFundingRate(symbol);
  }
  
  async fetchOpenInterest(symbol) {
    return await this.exchange.fetchOpenInterest(symbol);
  }
  
  async fetchTicker(symbol) {
    return await this.exchange.fetchTicker(symbol);
  }
  
  async fetchMarketData(symbol) {
    return await this.exchange.fetchMarketData(symbol);
  }
}
