const winston = require('winston');
const config = require('../config');

// Simple logger — enough for local dev and basic production monitoring
const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'shipiq-cargo-optimizer' },
  transports: [
    new winston.transports.Console({
      format: config.isProduction
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
              const extra = Object.keys(meta).length > 1
                ? ` ${JSON.stringify(meta)}`
                : '';
              return `${timestamp} ${level}: ${message}${extra}`;
            })
          ),
    }),
  ],
});

module.exports = logger;
