const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const apiRoutes = require('./api/routes');
const requestLogger = require('./api/middleware/requestLogger');
const errorHandler = require('./api/middleware/errorHandler');
const logger = require('./utils/logger');

function createApp() {
  const app = express();

  // Security headers
  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(requestLogger);

  // Basic rate limiting — protects optimize from abuse on public deploys
  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // Health check for Docker / cloud platforms
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'shipiq-cargo-optimizer',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // API routes first — before static files
  app.use('/', apiRoutes);

  // UI static files
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // 404 for unknown API paths
  app.use((req, res) => {
    res.status(404).json({ error: 'NotFound', message: `Route not found: ${req.method} ${req.path}` });
  });

  app.use(errorHandler);

  return app;
}

function startServer() {
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info(`ShipIQ Cargo Optimizer running on port ${config.port}`);
    logger.info(`UI available at http://localhost:${config.port}`);
    logger.info(`Health check at http://localhost:${config.port}/health`);
  });

  return server;
}

module.exports = { createApp, startServer };
