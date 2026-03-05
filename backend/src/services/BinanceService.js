/**
 * Binance public API – spot klines (candles) for crypto. No API key required.
 * Docs: https://binance-docs.github.io/apidocs/spot/en/#kline-candlestick-data
 */

const axios = require('axios');
const logger = require('../utils/logger');

const BASE_URL = 'https://api.binance.com/api/v3';

const VALID_INTERVALS = ['15m', '1h', '4h', '1d'];

class BinanceService {
  /**
   * Get klines (OHLCV) for a spot symbol.
   * @param {string} symbol - e.g. BTCUSDT, ETHUSDT
   * @param {string} interval - 15m | 1h | 4h | 1d
   * @param {number} limit - max candles (default 100, max 1000)
   * @returns {{ symbol, interval, candles: Array<{ time, open, high, low, close, volume }> } | null}
   */
  async getKlines(symbol, interval = '1h', limit = 100) {
    const sym = String(symbol).trim().toUpperCase();
    const int = String(interval).toLowerCase();
    if (!VALID_INTERVALS.includes(int)) {
      throw new Error(`Invalid interval. Use one of: ${VALID_INTERVALS.join(', ')}`);
    }
    const lim = Math.min(Math.max(Number(limit) || 100, 1), 1000);
    try {
      const res = await axios.get(`${BASE_URL}/klines`, {
        params: { symbol: sym, interval: int, limit: lim },
        timeout: 10000
      });
      const raw = res.data;
      if (!Array.isArray(raw) || raw.length === 0) return null;
      const candles = raw.map((k) => ({
        time: new Date(k[0]).toISOString(),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }));
      return { symbol: sym, interval: int, candles };
    } catch (err) {
      const msg = err.response?.data?.msg || err.message;
      if (msg) logger.warn('[Binance]', msg);
      throw err;
    }
  }

  /**
   * Get latest (real-time) price for a spot symbol. Use for "current price" in answers.
   * GET /api/v3/ticker/price
   */
  async getTickerPrice(symbol) {
    const sym = String(symbol).trim().toUpperCase();
    try {
      const res = await axios.get(`${BASE_URL}/ticker/price`, {
        params: { symbol: sym },
        timeout: 8000
      });
      const data = res.data;
      if (!data || data.price == null) return null;
      return { symbol: data.symbol, price: parseFloat(data.price) };
    } catch (err) {
      const msg = err.response?.data?.msg || err.message;
      if (msg) logger.warn('[Binance]', msg);
      throw err;
    }
  }
}

module.exports = new BinanceService();
