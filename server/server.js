import { validateEnv, printIntegrationsStatus } from './config/env.js';

// 1. Validate environment configuration on startup
const env = validateEnv();
printIntegrationsStatus(env);

// 2. Conditional DNS override (only when DNS_OVERRIDE=true)
if (env.DNS_OVERRIDE === 'true') {
  const dns = await import('dns');
  dns.default.setServers(['8.8.8.8', '8.8.4.4']);
  console.log('DNS Override: nameservers set to [8.8.8.8, 8.8.4.4]');
}

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';

import { logger, requestLogger } from './utils/logger.js';
import { initSentry } from './config/sentry.js';
import { standardRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import advisorRoutes from './routes/advisorRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import decisionRoutes from './routes/decisionRoutes.js';
import discoveryRouter from './services/discoveryRouter.js';
import { seedOfferRules } from './seeds/seedOfferRules.js';

const app = express();
const PORT = env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize optional Sentry monitoring
initSentry(app);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts/styles for React frontend bundle
}));
app.use(mongoSanitize());

// Request tracking and structured logging
app.use(requestLogger);

// Strict CORS
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://pricepilot-zr6n.onrender.com'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked request from origin: ${origin}`));
  },
  credentials: true
}));

// Body size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Apply standard rate limiter to all /api/ endpoints
app.use('/api/', standardRateLimiter);

// Serve static files from public/uploads for LocalStorageProvider
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Serve static files from the React frontend build
app.use(express.static(path.join(__dirname, '../dist')));

// Health check endpoint with integration, cache backend, quota usage, and fallback transparency
let isDbConnected = false;
app.get('/api/health', (req, res) => {
  const isHealthy = isDbConnected || env.NODE_ENV !== 'production';
  const cacheBackend = env.REDIS_URL ? 'redis' : (mongoose.connection.readyState === 1 ? 'mongodb' : 'memory');

  const quotaReport = discoveryRouter.getQuotaReport();
  const trippedProviders = Object.entries(quotaReport)
    .filter(([_, report]) => report.circuitBreaker === 'OPEN')
    .map(([name]) => name);

  const isFallbackActive = env.USE_MOCK_DATA === 'true' || env.ALLOW_DEV_AUTH_BYPASS === 'true' || trippedProviders.length > 0;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    database: {
      connected: isDbConnected,
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    },
    cacheBackend,
    enabledIntegrations: {
      discovery: {
        serpapi: Boolean(env.SERPAPI_KEY || env.PRODUCT_SEARCH_API_KEY),
        serper: Boolean(env.SERPER_KEY),
        searchapi: Boolean(env.SEARCHAPI_KEY),
        dataforseo: Boolean(env.DATAFORSEO_LOGIN && env.DATAFORSEO_PASSWORD)
      },
      keepaPriceHistory: Boolean(env.KEEPA_KEY),
      openIcecatCatalog: Boolean(env.ICECAT_USER && env.ICECAT_API_TOKEN),
      geminiAi: Boolean(env.GEMINI_API_KEY),
      firebaseAuth: Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL),
      emailAlerts: Boolean(env.RESEND_API_KEY),
      telegramAlerts: Boolean(env.TELEGRAM_BOT_TOKEN),
      smsAlerts: env.ENABLE_SMS_ALERTS === 'true',
      whatsappAlerts: env.ENABLE_WHATSAPP_ALERTS === 'true',
      affiliateRouting: env.AFFILIATE_ENABLED === 'true',
      storageProvider: env.STORAGE_PROVIDER,
      observability: Boolean(env.SENTRY_DSN)
    },
    quotaUsage: quotaReport,
    activeFallbackMode: {
      active: isFallbackActive,
      useMockData: env.USE_MOCK_DATA === 'true',
      allowDevAuthBypass: env.ALLOW_DEV_AUTH_BYPASS === 'true',
      trippedProviders
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/advisor', advisorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/decision', decisionRoutes);

// Catch-all route to serve React app for non-API requests (client-side routing)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: `API route not found: ${req.method} ${req.path}` });
  }

  const indexPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend build not found. Please ensure the frontend is built.');
  }
});

// Centralized Error Handler (must be after all routes)
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, { family: 4 });
    isDbConnected = true;
    logger.info({ host: conn.connection.host }, 'MongoDB Connected successfully');
    seedOfferRules().catch(err => logger.debug({ error: err.message }, 'Offer rules seed skipped'));
  } catch (error) {
    logger.error({ error: error.message }, 'MongoDB connection error');
    if (env.NODE_ENV === 'production') {
      logger.fatal('Database connection is mandatory in production. Crashing safely.');
      process.exit(1);
    } else {
      logger.warn('Running without active MongoDB connection (development fallback mode).');
    }
  }
};

let server;
connectDB().then(() => {
  server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT} (0.0.0.0) in ${env.NODE_ENV} mode`);
  });
});

// Graceful shutdown handling
const shutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
      mongoose.connection.close(false).then(() => {
        logger.info('MongoDB connection closed.');
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
