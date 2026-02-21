const pino = require('pino');

const isProduction = process.env.NODE_ENV === 'production';

let logger;

if (isProduction) {
  // Production: structured JSON logs (no pretty transport)
  logger = pino({
    level: 'info',
  });
} else {
  // Development: pretty logs
  logger = pino({
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  });
}

module.exports = logger;
