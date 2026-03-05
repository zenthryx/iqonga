const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for file logs (JSON) and console logs (readable)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Helper to safely stringify objects with circular references
const safeStringify = (obj) => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    // Remove circular structures from common HTTP objects
    if (value && typeof value === 'object') {
      if (value.constructor && value.constructor.name === 'ClientRequest') {
        return '[ClientRequest]';
      }
      if (value.constructor && value.constructor.name === 'TLSSocket') {
        return '[TLSSocket]';
      }
      if (value.request) {
        const { request, response, ...rest } = value;
        return rest;
      }
    }
    return value;
  });
};

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      try {
        msg += ` ${safeStringify(meta)}`;
      } catch (err) {
        // Fallback if stringify still fails
        msg += ` [Error serializing metadata: ${err.message}]`;
      }
    }
    return msg;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { service: 'socialai-backend' },
  transports: [
    // Console transport (for PM2 to capture)
    new winston.transports.Console({
      format: consoleFormat
    }),
    // Combined log file (all logs)
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    // Error log file (errors only)
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// If we're not in production, also log to a debug file
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'debug.log'),
    level: 'debug',
    format: fileFormat,
    maxsize: 10485760, // 10MB
    maxFiles: 3,
    tailable: true
  }));
}

module.exports = logger;
