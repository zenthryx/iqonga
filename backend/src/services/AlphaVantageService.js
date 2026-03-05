/**
 * Alpha Vantage API – stocks, forex, crypto, technical indicators.
 * Free API key: https://www.alphavantage.co/support/#api-key
 * Docs: https://www.alphavantage.co/documentation/
 * Free tier: 25 requests/day, 5/min. Use compact output where possible.
 */

const axios = require('axios');
const logger = require('../utils/logger');

const BASE_URL = 'https://www.alphavantage.co/query';

class AlphaVantageService {
  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!this.apiKey) {
      logger.warn('[AlphaVantage] ALPHA_VANTAGE_API_KEY not set - market data tools will fail');
    }
  }

  isAvailable() {
    return !!this.apiKey;
  }

  async query(params) {
    if (!this.apiKey) throw new Error('Alpha Vantage API key not configured. Set ALPHA_VANTAGE_API_KEY.');
    const qs = new URLSearchParams({ ...params, apikey: this.apiKey });
    const res = await axios.get(`${BASE_URL}?${qs.toString()}`, { timeout: 15000 });
    const data = res.data;
    if (data['Error Message']) throw new Error(data['Error Message']);
    if (data['Note']) throw new Error(data['Note']); // rate limit message
    return data;
  }

  /** Latest price and volume for a stock (GLOBAL_QUOTE). */
  async getGlobalQuote(symbol) {
    const data = await this.query({ function: 'GLOBAL_QUOTE', symbol: String(symbol).trim().toUpperCase() });
    const q = data['Global Quote'];
    if (!q || !q['01. symbol']) return null;
    return {
      symbol: q['01. symbol'],
      price: q['05. price'],
      change: q['09. change'],
      changePercent: q['10. change percent'],
      volume: q['06. volume'],
      high: q['03. high'],
      low: q['04. low'],
      open: q['02. open'],
      previousClose: q['08. previous close']
    };
  }

  /** Realtime exchange rate (forex or crypto). CURRENCY_EXCHANGE_RATE. */
  async getCurrencyExchangeRate(fromCurrency, toCurrency) {
    const data = await this.query({
      function: 'CURRENCY_EXCHANGE_RATE',
      from_currency: String(fromCurrency).trim().toUpperCase(),
      to_currency: String(toCurrency).trim().toUpperCase()
    });
    const rate = data['Realtime Currency Exchange Rate'];
    if (!rate) return null;
    return {
      from: rate['1. From_Currency Code'],
      to: rate['3. To_Currency Code'],
      rate: rate['5. Exchange Rate'],
      bid: rate['8. Bid Price'],
      ask: rate['9. Ask Price'],
      lastUpdate: rate['6. Last Refreshed']
    };
  }

  /** Daily OHLCV (compact = last 100 points). TIME_SERIES_DAILY. */
  async getTimeSeriesDaily(symbol, outputsize = 'compact') {
    const data = await this.query({
      function: 'TIME_SERIES_DAILY',
      symbol: String(symbol).trim().toUpperCase(),
      outputsize: outputsize === 'full' ? 'full' : 'compact'
    });
    const series = data['Time Series (Daily)'];
    if (!series) return null;
    const dates = Object.keys(series).sort().reverse();
    const latest = dates.slice(0, 10).map(d => {
      const o = series[d];
      return { date: d, open: o['1. open'], high: o['2. high'], low: o['3. low'], close: o['4. close'], volume: o['5. volume'] };
    });
    return { symbol: data['Meta Data']?.['2. Symbol'] || symbol, series: latest };
  }

  /** Daily FX (e.g. EUR/USD). FX_DAILY. */
  async getFxDaily(fromSymbol, toSymbol, outputsize = 'compact') {
    const data = await this.query({
      function: 'FX_DAILY',
      from_symbol: String(fromSymbol).trim().toUpperCase(),
      to_symbol: String(toSymbol).trim().toUpperCase(),
      outputsize: outputsize === 'full' ? 'full' : 'compact'
    });
    const series = data['Time Series FX (Daily)'];
    if (!series) return null;
    const dates = Object.keys(series).sort().reverse();
    const latest = dates.slice(0, 10).map(d => {
      const o = series[d];
      return { date: d, open: o['1. open'], high: o['2. high'], low: o['3. low'], close: o['4. close'] };
    });
    return { pair: `${fromSymbol}/${toSymbol}`, series: latest };
  }

  /** Technical indicator: RSI, SMA, EMA, MACD. interval: daily, weekly, etc. */
  async getTechnicalIndicator(indicator, symbol, interval = 'daily', options = {}) {
    const params = {
      function: String(indicator).toUpperCase(),
      symbol: String(symbol).trim().toUpperCase(),
      interval: String(interval).toLowerCase(),
      series_type: (options.series_type || 'close').toLowerCase()
    };
    if (options.time_period != null) params.time_period = Number(options.time_period);
    if (options.fastperiod != null) params.fastperiod = Number(options.fastperiod);
    if (options.slowperiod != null) params.slowperiod = Number(options.slowperiod);
    if (options.signalperiod != null) params.signalperiod = Number(options.signalperiod);
    const data = await this.query(params);
    const key = Object.keys(data).find(k => k.startsWith('Technical Analysis') || k.startsWith('Meta Data'));
    if (!key) return null;
    const metaKey = Object.keys(data).find(k => k.includes('Meta Data'));
    const seriesKey = Object.keys(data).find(k => k.includes('Technical Analysis') || (k.includes('Indicator') && !k.includes('Meta')));
    const series = seriesKey ? data[seriesKey] : null;
    if (!series) return null;
    const dates = Object.keys(series).sort().reverse().slice(0, 15);
    const values = dates.map(d => ({ date: d, ...series[d] }));
    return { symbol: data[metaKey]?.['2. Symbol'] || symbol, indicator: indicator, values };
  }

  /**
   * Get daily OHLC candles suitable for strategy computation (oldest first, numbers).
   * Auto-detects forex pairs (e.g. EURUSD) vs equity/indices (e.g. AAPL, SPY).
   * Returns ~100 trading days (compact output) – enough for all Zenthryx indicators.
   * @param {string} symbol - e.g. 'EURUSD', 'AAPL', 'SPY'
   * @param {string} [avSymbol] - override the AV symbol (e.g. for index proxies like DIA)
   * @returns {{ symbol: string, candles: Array<{ time, open, high, low, close }> } | null}
   */
  async getDailyCandles(symbol, avSymbol) {
    const sym = String(symbol).trim().toUpperCase();
    const target = avSymbol ? String(avSymbol).trim().toUpperCase() : sym;
    const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK', 'SGD', 'HKD', 'CNY', 'MXN', 'ZAR'];
    const isForex = sym.length === 6 && CURRENCIES.includes(sym.slice(0, 3)) && CURRENCIES.includes(sym.slice(3, 6));

    try {
      let entries;
      if (isForex) {
        const from = sym.slice(0, 3);
        const to = sym.slice(3, 6);
        const data = await this.query({ function: 'FX_DAILY', from_symbol: from, to_symbol: to, outputsize: 'compact' });
        const series = data['Time Series FX (Daily)'];
        if (!series) return null;
        entries = Object.entries(series)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, o]) => ({
            time: date,
            open: parseFloat(o['1. open']),
            high: parseFloat(o['2. high']),
            low: parseFloat(o['3. low']),
            close: parseFloat(o['4. close'])
          }));
      } else {
        const data = await this.query({ function: 'TIME_SERIES_DAILY', symbol: target, outputsize: 'compact' });
        const series = data['Time Series (Daily)'];
        if (!series) return null;
        entries = Object.entries(series)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, o]) => ({
            time: date,
            open: parseFloat(o['1. open']),
            high: parseFloat(o['2. high']),
            low: parseFloat(o['3. low']),
            close: parseFloat(o['4. close']),
            volume: parseFloat(o['5. volume'])
          }));
      }
      return { symbol: sym, candles: entries };
    } catch (err) {
      logger.warn(`[AlphaVantage] getDailyCandles failed for ${sym}:`, err.message);
      return null;
    }
  }

  /** Symbol search (stocks, ETFs). SYMBOL_SEARCH. */
  async symbolSearch(keywords) {
    const data = await this.query({ function: 'SYMBOL_SEARCH', keywords: String(keywords).trim() });
    const matches = data['bestMatches'];
    if (!matches || !matches.length) return [];
    return matches.slice(0, 10).map(m => ({
      symbol: m['1. symbol'],
      name: m['2. name'],
      type: m['3. type'],
      region: m['4. region']
    }));
  }
}

module.exports = new AlphaVantageService();
