/**
 * Scheduled trade signals: compute signals for each (symbol, timeframe) pair ONCE,
 * then broadcast each signal to every opted-in Telegram connection.
 * Signals are computed before the connection loop so N connections never multiply API calls.
 *
 * Data sources (auto-detected by symbol type):
 *   Crypto (e.g. BTCUSDT)     → Binance, all timeframes (15m, 1h, 4h, 1d)
 *   Forex / Stocks / Indices   → Alpha Vantage, 1d only (until AV premium intraday is added)
 *
 * Env:
 *   SIGNAL_PAIRS      - comma-separated symbols, e.g. "BTCUSDT,EURUSD,AAPL,US30"
 *   SIGNAL_TIMEFRAMES - comma-separated timeframes, default "15m,1h,4h,1d"
 *   SIGNAL_STRATEGY   - "rsi" (default) or "zenthryx" (all patterns run simultaneously)
 *   SIGNAL_CRON       - cron schedule, default every 15 min
 *   SIGNAL_SWING_STRENGTH - swing detection bars each side for Zenthryx (default 3)
 */

const database = require('../database/connection');
const TradeSignalService = require('../services/TradeSignalService');
const TelegramAssistantConnector = require('../services/TelegramAssistantConnector');
const logger = require('../utils/logger');

const connector = new TelegramAssistantConnector();

const VALID_TIMEFRAMES = ['15m', '1h', '4h', '1d'];

function parseTimeframes(envValue) {
  if (!envValue || typeof envValue !== 'string') return VALID_TIMEFRAMES;
  return envValue
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((t) => VALID_TIMEFRAMES.includes(t));
}

/**
 * Parse SIGNAL_PAIRS and optionally SIGNAL_TIMEFRAMES into list of { symbol, timeframe }.
 * - If any part contains ":": legacy format "symbol:timeframe" (e.g. "BTCUSDT:4h,ETHUSDT:1h").
 * - Else: SIGNAL_PAIRS is symbols only (e.g. "BTCUSDT,ETHUSDT"); use SIGNAL_TIMEFRAMES or default 15m,1h,4h,1d.
 */
function parseSignalPairs(pairsEnv, timeframesEnv) {
  if (!pairsEnv || typeof pairsEnv !== 'string') return [];
  const parts = pairsEnv.split(',').map((s) => s.trim()).filter(Boolean);
  const timeframes = parseTimeframes(timeframesEnv);
  const result = [];
  const useLegacy = parts.some((p) => p.includes(':'));
  if (useLegacy) {
    for (const part of parts) {
      const [symbol, timeframe] = part.split(':').map((x) => x.trim());
      if (symbol && timeframe && VALID_TIMEFRAMES.includes(timeframe.toLowerCase())) {
        result.push({ symbol: symbol.toUpperCase(), timeframe: timeframe.toLowerCase() });
      }
    }
  } else {
    for (const symbol of parts) {
      if (!symbol) continue;
      for (const tf of timeframes) {
        result.push({ symbol: symbol.toUpperCase(), timeframe: tf });
      }
    }
  }
  return result;
}

/**
 * Run one cycle: load Telegram connections with receive_scheduled_signals,
 * for each (connection, pair) run getSignal; if hasSignal, send one message.
 * If no signal, do nothing.
 */
async function run() {
  const pairs = parseSignalPairs(process.env.SIGNAL_PAIRS, process.env.SIGNAL_TIMEFRAMES);
  if (pairs.length === 0) {
    logger.debug('[SignalJob] No SIGNAL_PAIRS configured, skipping');
    return;
  }

  let connections = [];
  try {
    const result = await database.query(`
      SELECT id, channel_connection_id, channel_metadata
      FROM channel_connections
      WHERE channel = 'telegram' AND is_active = true AND receive_scheduled_signals = true
    `);
    connections = result.rows || [];
  } catch (err) {
    if (err.message && err.message.includes('receive_scheduled_signals')) {
      logger.debug('[SignalJob] receive_scheduled_signals column not present yet, skipping');
      return;
    }
    logger.error('[SignalJob] Failed to load connections:', err.message);
    return;
  }

  if (connections.length === 0) {
    logger.info('[SignalJob] Run skipped: no Telegram connections with receive_scheduled_signals');
    return;
  }

  logger.info('[SignalJob] Run started', { pairs: pairs.length, connections: connections.length });
  let signalsSent = 0;

  // ── Step 1: compute all signals once (avoids duplicate API calls per connection) ──
  const signalMap = new Map(); // key: "SYMBOL:TF" → Signal[]
  for (const { symbol, timeframe } of pairs) {
    const key = `${symbol}:${timeframe}`;
    if (signalMap.has(key)) continue; // dedup (legacy format may repeat)
    try {
      const signals = await TradeSignalService.getSignals(symbol, timeframe);
      signalMap.set(key, signals);
    } catch (err) {
      logger.warn('[SignalJob] Signal compute failed:', symbol, timeframe, err.message);
      signalMap.set(key, []);
    }
  }

  const totalSignals = [...signalMap.values()].reduce((n, arr) => n + arr.length, 0);
  logger.info('[SignalJob] Signals computed', { withSignal: totalSignals, checked: signalMap.size });

  // ── Step 2: broadcast each signal to every opted-in connection ──
  for (const connection of connections) {
    const chatId = connection.channel_connection_id;
    for (const { symbol, timeframe } of pairs) {
      const key = `${symbol}:${timeframe}`;
      const signals = signalMap.get(key) || [];
      for (const s of signals) {
        try {
          const text = TradeSignalService.formatSignalMessage(s);
          await connector.sendReply(connection, chatId, text);
          signalsSent += 1;
          logger.info('[SignalJob] Sent signal', {
            connectionId: connection.id,
            symbol,
            timeframe,
            pattern: s.pattern || 'rsi'
          });
        } catch (err) {
          const msg = err.response?.body?.description || err.message || String(err);
          logger.warn('[SignalJob] Send failed: ' + msg, { connectionId: connection.id, symbol, timeframe });
        }
      }
    }
  }

  logger.info('[SignalJob] Run finished', { signalsSent });
}

module.exports = { run, parseSignalPairs, parseTimeframes };
