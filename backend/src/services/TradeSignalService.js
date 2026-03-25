/**
 * Trade signal from OHLC. Crypto via Binance; no key required.
 * Strategy: env SIGNAL_STRATEGY = "rsi" (default) or "zenthryx".
 * Zenthryx uses SIGNAL_PATTERN (e.g. "RSI Divergence", "MACD Crossover") and ATR-based SL/TP.
 * When there is no setup, returns hasSignal: false (scheduled job does nothing).
 */

const BinanceService = require('./BinanceService');
const AlphaVantageService = require('./AlphaVantageService');
const logger = require('../utils/logger');

let ZenthryxStrategy;
try {
  ZenthryxStrategy = require('./strategies/ZenthryxStrategy');
} catch (error) {
  logger.warn(
    '[TradeSignalService] Zenthryx strategy not found, zenthryx signals disabled:',
    error.message
  );
  ZenthryxStrategy = {
    MIN_CANDLES: 24,
    evaluateAll: () => []
  };
}

// ── Symbol-type helpers ────────────────────────────────────────────────────────

const FOREX_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'NZD', 'CHF',
  'SEK', 'NOK', 'DKK', 'SGD', 'HKD', 'CNY', 'MXN', 'ZAR'
]);

/**
 * Maps user-friendly index names to their Alpha Vantage ETF proxies.
 * ETF proxies are used because AV does not expose index futures directly.
 * User-visible signal messages still show the original name (UK100, US30, etc.).
 */
const INDEX_SYMBOL_MAP = {
  US30: 'DIA',    // SPDR Dow Jones Industrial Average ETF
  US100: 'QQQ',   // Invesco QQQ Trust (Nasdaq 100)
  US500: 'SPY',   // SPDR S&P 500 ETF Trust
  UK100: 'ISF.L'  // iShares Core FTSE 100 UCITS ETF (London)
};

/** True for 6-char forex pair made of two known currency codes (e.g. EURUSD, GBPJPY). */
function isForexSymbol(sym) {
  return sym.length === 6 && FOREX_CURRENCIES.has(sym.slice(0, 3)) && FOREX_CURRENCIES.has(sym.slice(3, 6));
}

/** True for known index shorthand names (UK100, US30, etc.). */
function isIndexSymbol(sym) {
  return Object.prototype.hasOwnProperty.call(INDEX_SYMBOL_MAP, sym);
}

/** True for crypto pairs (ends in USDT, BTC, ETH, BNB, SOL). */
function isCryptoSymbol(sym) {
  return /USDT$|BTC$|ETH$|BNB$|SOL$/.test(sym);
}

/** Resolve a symbol to the AV query symbol (for indices, use ETF proxy). */
function resolveAvSymbol(sym) {
  return INDEX_SYMBOL_MAP[sym] || sym;
}

/** True when the symbol should be fetched from Alpha Vantage (not Binance). */
function isAvSymbol(sym) {
  return isForexSymbol(sym) || isIndexSymbol(sym) || (!isCryptoSymbol(sym));
}

const RSI_PERIOD = 14;
const RSI_OVERSOLD = 30;
const RSI_OVERBOUGHT = 70;
const MIN_CANDLES = RSI_PERIOD + 10;

/**
 * Compute RSI from array of close prices (oldest first).
 * @param {number[]} closes
 * @returns {number | null} RSI 0–100 or null if not enough data
 */
function computeRSI(closes) {
  if (!Array.isArray(closes) || closes.length < RSI_PERIOD + 1) return null;
  const gains = [];
  const losses = [];
  for (let i = closes.length - RSI_PERIOD; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  const avgGain = gains.reduce((a, b) => a + b, 0) / RSI_PERIOD;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / RSI_PERIOD;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Get all signals for a symbol/timeframe. Returns an array (may be empty).
 * Routes to the correct data source:
 *   - Crypto (ends USDT/BTC/etc.) → Binance
 *   - Forex (e.g. EURUSD), indices (UK100, US30...), stocks (AAPL...) → Alpha Vantage (daily only until premium)
 * Strategy:
 *   - SIGNAL_STRATEGY=zenthryx: all patterns run simultaneously
 *   - SIGNAL_STRATEGY=rsi:      simple RSI oversold/overbought
 * @param {string} symbol   - e.g. BTCUSDT, EURUSD, AAPL, US30
 * @param {string} timeframe - 15m | 1h | 4h | 1d
 * @returns {Promise<Array<{ hasSignal: true, symbol, timeframe, direction, entry, sl, target, rr, confidence, pattern?, slSource?, tpSource?, rsi? }>>}
 */
async function getSignals(symbol, timeframe) {
  const sym = String(symbol).trim().toUpperCase();
  const tf = String(timeframe).toLowerCase();

  if (isAvSymbol(sym)) {
    return getAvSignals(sym, tf);
  }

  const strategy = (process.env.SIGNAL_STRATEGY || 'rsi').trim().toLowerCase();
  if (strategy === 'zenthryx') {
    return getSignalsZenthryx(sym, tf);
  }
  const s = await getSignalRsi(sym, tf);
  return s.hasSignal ? [s] : [];
}

/**
 * Signals for non-crypto symbols (forex, indices, stocks) using Alpha Vantage daily candles.
 * Only runs on 1d timeframe until Alpha Vantage premium intraday is added.
 */
async function getAvSignals(sym, tf) {
  // Until premium intraday is available, AV only supports daily data
  if (tf !== '1d') return [];
  if (!AlphaVantageService.isAvailable()) {
    logger.debug('[TradeSignalService] AlphaVantage not configured, skipping', sym);
    return [];
  }
  try {
    const avSym = resolveAvSymbol(sym);
    const data = await AlphaVantageService.getDailyCandles(sym, avSym !== sym ? avSym : undefined);
    if (!data || !data.candles || data.candles.length < ZenthryxStrategy.MIN_CANDLES) {
      logger.debug('[TradeSignalService] Not enough AV candles for', sym, data?.candles?.length ?? 0);
      return [];
    }
    const strategy = (process.env.SIGNAL_STRATEGY || 'rsi').trim().toLowerCase();
    const swingStrength = parseInt(process.env.SIGNAL_SWING_STRENGTH, 10) || 3;

    let results;
    if (strategy === 'zenthryx') {
      results = ZenthryxStrategy.evaluateAll(data.candles, { swingStrength });
    } else {
      // RSI strategy on AV candles
      const closes = data.candles.map((c) => c.close);
      const rsi = computeRSI(closes);
      if (rsi == null) return [];
      const candles = data.candles;
      const last = candles[candles.length - 1];
      const entry = last.close;
      const recentHigh = Math.max(...candles.slice(-10).map((c) => c.high));
      const recentLow = Math.min(...candles.slice(-10).map((c) => c.low));
      let direction = null, sl = null, target = null;
      if (rsi <= RSI_OVERSOLD) {
        direction = 'long';
        sl = Math.min(recentLow, entry * 0.98);
        target = entry + (entry - sl) * 1.5;
      } else if (rsi >= RSI_OVERBOUGHT) {
        direction = 'short';
        sl = Math.max(recentHigh, entry * 1.02);
        target = entry - (sl - entry) * 1.5;
      }
      if (!direction) return [];
      const risk = Math.abs(entry - sl);
      const reward = Math.abs(target - entry);
      results = [{
        hasSignal: true,
        direction,
        entry: Math.round(entry * 100000) / 100000,
        sl: Math.round(sl * 100000) / 100000,
        target: Math.round(target * 100000) / 100000,
        rr: risk > 0 ? Math.round((reward / risk) * 10) / 10 : 0,
        rsi: Math.round(rsi * 10) / 10
      }];
    }

    return results.map((r) => ({
      hasSignal: true,
      symbol: sym,
      timeframe: tf,
      direction: r.direction,
      entry: r.entry,
      sl: r.sl,
      target: r.target,
      rr: r.rr,
      confidence: r.rsi != null ? (r.rsi <= 25 || r.rsi >= 75 ? 'high' : 'medium') : 'medium',
      ...(r.pattern && { pattern: r.pattern }),
      ...(r.slSource && { slSource: r.slSource }),
      ...(r.tpSource && { tpSource: r.tpSource }),
      ...(r.rsi != null && { rsi: r.rsi })
    }));
  } catch (err) {
    logger.warn('[TradeSignalService] getAvSignals failed:', sym, err.message);
    return [];
  }
}

/**
 * Get a single signal (first match). Kept for backward compatibility.
 * @returns {Promise<{ hasSignal: boolean, ...}>}
 */
async function getSignal(symbol, timeframe) {
  const signals = await getSignals(symbol, timeframe);
  return signals.length > 0 ? signals[0] : { hasSignal: false };
}

async function getSignalZenthryx(sym, tf) {
  const signals = await getSignalsZenthryx(sym, tf);
  return signals.length > 0 ? signals[0] : { hasSignal: false };
}

/**
 * Run all Zenthryx patterns. Returns array of signals (one per pattern that fires).
 * Indicators are computed once; each pattern is evaluated independently.
 */
async function getSignalsZenthryx(sym, tf) {
  try {
    const minCandles = ZenthryxStrategy.MIN_CANDLES;
    const data = await BinanceService.getKlines(sym, tf, minCandles + 5);
    if (!data || !data.candles || data.candles.length < minCandles) return [];
    const options = {
      swingStrength: parseInt(process.env.SIGNAL_SWING_STRENGTH, 10) || 3
    };
    const results = ZenthryxStrategy.evaluateAll(data.candles, options);
    return results.map((r) => ({
      hasSignal: true,
      symbol: sym,
      timeframe: tf,
      direction: r.direction,
      entry: r.entry,
      sl: r.sl,
      target: r.target,
      rr: r.rr,
      confidence: 'medium',
      pattern: r.pattern,
      slSource: r.slSource,
      tpSource: r.tpSource
    }));
  } catch (err) {
    logger.warn('[TradeSignalService] getSignals (zenthryx) failed:', sym, tf, err.message);
    return [];
  }
}

async function getSignalRsi(sym, tf) {
  try {
    const data = await BinanceService.getKlines(sym, tf, MIN_CANDLES + 5);
    if (!data || !data.candles || data.candles.length < MIN_CANDLES) {
      return { hasSignal: false };
    }
    const candles = data.candles;
    const closes = candles.map((c) => c.close);
    const rsi = computeRSI(closes);
    if (rsi == null) return { hasSignal: false };

    const last = candles[candles.length - 1];
    const entry = last.close;
    const recentHigh = Math.max(...candles.slice(-10).map((c) => c.high));
    const recentLow = Math.min(...candles.slice(-10).map((c) => c.low));

    let direction = null;
    let sl = null;
    let target = null;

    if (rsi <= RSI_OVERSOLD) {
      direction = 'long';
      sl = Math.min(recentLow, entry * 0.98);
      target = entry + (entry - sl) * 1.5;
    } else if (rsi >= RSI_OVERBOUGHT) {
      direction = 'short';
      sl = Math.max(recentHigh, entry * 1.02);
      target = entry - (sl - entry) * 1.5;
    }

    if (!direction || sl == null || target == null) {
      return { hasSignal: false };
    }

    const risk = Math.abs(entry - sl);
    const reward = Math.abs(target - entry);
    const rr = risk > 0 ? Math.round((reward / risk) * 10) / 10 : 0;
    const confidence = rsi <= 25 || rsi >= 75 ? 'high' : 'medium';

    return {
      hasSignal: true,
      symbol: sym,
      timeframe: tf,
      direction,
      entry: Math.round(entry * 100000) / 100000,
      sl: Math.round(sl * 100000) / 100000,
      target: Math.round(target * 100000) / 100000,
      rr,
      confidence,
      rsi: Math.round(rsi * 10) / 10
    };
  } catch (err) {
    logger.warn('[TradeSignalService] getSignal failed:', sym, tf, err.message);
    return { hasSignal: false };
  }
}

/**
 * Format a signal for Telegram (one message per signal).
 * Supports both RSI strategy (shows RSI value) and Zenthryx (shows pattern name).
 * @param {object} s - result of getSignal() with hasSignal true
 * @returns {string}
 */
function formatSignalMessage(s) {
  const dirEmoji = s.direction === 'long' ? '🟢' : '🔴';
  const dirLabel = s.direction === 'long' ? 'LONG' : 'SHORT';
  const patternLine = s.pattern ? `├ Pattern: <i>${s.pattern}</i>\n` : '';

  // Label SL/TP with source when available (support/resistance/atr)
  const slLabel = s.slSource && s.slSource !== 'atr' ? ` <i>(${s.slSource})</i>` : '';
  const tpLabel = s.tpSource && s.tpSource !== 'atr' ? ` <i>(${s.tpSource})</i>` : '';

  const footerLine = s.rsi != null
    ? `└ R:R <b>${s.rr}</b>  │  RSI ${s.rsi} <i>(${s.confidence})</i>`
    : `└ R:R <b>${s.rr}</b>${s.confidence ? `  │  <i>${s.confidence}</i>` : ''}`;
  return (
    `📊 <b>${s.symbol}</b> <code>${s.timeframe}</code>\n` +
    `${dirEmoji} <b>${dirLabel}</b>\n` +
    patternLine +
    `├ Entry: <b>${s.entry}</b>\n` +
    `├ SL: ${s.sl}${slLabel}  │  Target: ${s.target}${tpLabel}\n` +
    footerLine
  );
}

/**
 * Get current price and last 30 days daily summary from Binance (one source = consistent trend).
 * Use for "long-term trend" or "last 30 days" so the agent never mixes different data sources.
 * @param {string} symbol - e.g. BTCUSDT
 * @returns {Promise<{ symbol, currentPrice, last30dHigh, last30dLow, firstClose, lastClose, trend } | null>}
 */
async function getCryptoTrend(symbol) {
  const sym = String(symbol).trim().toUpperCase();
  try {
    const [priceRes, dailyRes] = await Promise.all([
      BinanceService.getTickerPrice(sym),
      BinanceService.getKlines(sym, '1d', 31)
    ]);
    if (!priceRes || !dailyRes?.candles?.length) return null;
    const candles = dailyRes.candles;
    const first = candles[0];
    const last = candles[candles.length - 1];
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const last30dHigh = Math.max(...highs);
    const last30dLow = Math.min(...lows);
    const firstClose = first.close;
    const lastClose = last.close;
    let trend = 'sideways';
    if (lastClose > firstClose * 1.02) trend = 'up';
    else if (lastClose < firstClose * 0.98) trend = 'down';
    return {
      symbol: sym,
      currentPrice: priceRes.price,
      last30dHigh,
      last30dLow,
      firstClose,
      lastClose,
      trend
    };
  } catch (err) {
    logger.warn('[TradeSignalService] getCryptoTrend failed:', sym, err.message);
    return null;
  }
}

/**
 * Get current RSI for a crypto pair and timeframe using Binance candles (14-period).
 * @param {string} symbol - e.g. BTCUSDT, SOLUSDT
 * @param {string} timeframe - 15m | 1h | 4h | 1d
 * @returns {Promise<{ symbol, timeframe, rsi } | null>}
 */
async function getRsi(symbol, timeframe) {
  const sym = String(symbol).trim().toUpperCase();
  const tf = String(timeframe).toLowerCase();
  if (!['15m', '1h', '4h', '1d'].includes(tf)) return null;
  try {
    const data = await BinanceService.getKlines(sym, tf, RSI_PERIOD + 5);
    if (!data || !data.candles || data.candles.length < RSI_PERIOD + 1) return null;
    const closes = data.candles.map((c) => c.close);
    const rsi = computeRSI(closes);
    if (rsi == null) return null;
    return { symbol: sym, timeframe: tf, rsi: Math.round(rsi * 10) / 10 };
  } catch (err) {
    logger.warn('[TradeSignalService] getRsi failed:', sym, tf, err.message);
    return null;
  }
}

/**
 * Classic pivot points from the last closed candle (previous period H/L/C).
 * Uses Binance klines; the last closed candle is at index length-2 (current candle may be open).
 * @param {string} symbol - e.g. BTCUSDT
 * @param {string} timeframe - 15m | 1h | 4h | 1d
 * @returns {Promise<{ symbol, timeframe, high, low, close, pp, r1, r2, s1, s2 } | null>}
 */
async function getPivotPoints(symbol, timeframe) {
  const sym = String(symbol).trim().toUpperCase();
  const tf = String(timeframe).toLowerCase();
  if (!['15m', '1h', '4h', '1d'].includes(tf)) return null;
  try {
    const data = await BinanceService.getKlines(sym, tf, 3);
    if (!data || !data.candles || data.candles.length < 2) return null;
    // Candles are chronological; use the second-to-last as the last closed candle
    const c = data.candles[data.candles.length - 2];
    const high = c.high;
    const low = c.low;
    const close = c.close;
    const pp = (high + low + close) / 3;
    const range = high - low;
    const r1 = pp * 2 - low;
    const r2 = pp + range;
    const s1 = pp * 2 - high;
    const s2 = pp - range;
    return {
      symbol: sym,
      timeframe: tf,
      high,
      low,
      close,
      pp: Math.round(pp * 100) / 100,
      r1: Math.round(r1 * 100) / 100,
      r2: Math.round(r2 * 100) / 100,
      s1: Math.round(s1 * 100) / 100,
      s2: Math.round(s2 * 100) / 100
    };
  } catch (err) {
    logger.warn('[TradeSignalService] getPivotPoints failed:', sym, tf, err.message);
    return null;
  }
}

module.exports = {
  getSignal,
  getSignals,
  formatSignalMessage,
  getPivotPoints,
  getRsi,
  getCryptoTrend,
  computeRSI
};
