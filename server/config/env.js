import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(ROOT_DIR, '.env') });
dotenv.config({ path: path.join(ROOT_DIR, 'server', '.env'), override: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(v => parseInt(v, 10)).default('5000'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  REDIS_URL: z.string().optional(),
  ALLOW_DEV_AUTH_BYPASS: z.enum(['true', 'false']).default('false'),
  DNS_OVERRIDE: z.enum(['true', 'false']).default('false'),
  CRON_SECRET: z.string().min(1, 'CRON_SECRET is required'),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Firebase
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // Discovery
  SERPAPI_KEY: z.string().optional(),
  PRODUCT_SEARCH_API_KEY: z.string().optional(),
  SEARCHAPI_KEY: z.string().optional(),
  SERPER_KEY: z.string().optional(),
  DATAFORSEO_LOGIN: z.string().optional(),
  DATAFORSEO_PASSWORD: z.string().optional(),
  PROVIDER_PRIORITY: z.string().default('serpapi,serper,searchapi,dataforseo'),
  PROVIDER_MONTHLY_QUOTAS: z.string().optional(),

  // Retailer Direct
  FLIPKART_AFFILIATE_ID: z.string().optional(),
  FLIPKART_AFFILIATE_TOKEN: z.string().optional(),
  AMAZON_CREDENTIAL_ID: z.string().optional(),
  AMAZON_CREDENTIAL_SECRET: z.string().optional(),
  AMAZON_ASSOCIATE_TAG: z.string().optional(),
  KEEPA_KEY: z.string().optional(),

  // Identity & Specs
  ICECAT_USER: z.string().optional(),
  ICECAT_API_TOKEN: z.string().optional(),
  ICECAT_CONTENT_TOKEN: z.string().optional(),

  // Affiliate
  CUELINKS_KEY: z.string().optional(),
  EARNKARO_KEY: z.string().optional(),
  VCOMMISSION_KEY: z.string().optional(),
  AFFILIATE_ENABLED: z.enum(['true', 'false']).default('false'),

  // Reviews
  RAINFOREST_API_KEY: z.string().optional(),
  RAPIDAPI_KEY: z.string().optional(),

  // Scraping
  ZYTE_KEY: z.string().optional(),
  APIFY_TOKEN: z.string().optional(),
  SCRAPING_ENABLED: z.enum(['true', 'false']).default('false'),

  // AI
  GEMINI_API_KEY: z.string().optional(),

  // Storage
  STORAGE_PROVIDER: z.enum(['local', 's3', 'cloudinary']).default('local'),
  ALLOW_LOCAL_STORAGE_IN_PROD: z.enum(['true', 'false']).default('false'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),

  // Alerts
  RESEND_API_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  MSG91_KEY: z.string().optional(),

  // Development Flags
  USE_MOCK_DATA: z.enum(['true', 'false']).default('false')
});

let parsedEnv;

export const validateEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorDetails = result.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    console.error('FATAL: Environment variable validation failed:\n' + errorDetails);
    process.exit(1);
  }

  const env = result.data;

  // Strict Production Safety Rules
  if (env.NODE_ENV === 'production') {
    // 1. Missing Firebase config crashes startup
    const hasFirebase = env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY;
    if (!hasFirebase) {
      console.error('FATAL: Production mode requires valid Firebase Admin configuration (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).');
      process.exit(1);
    }

    // 2. Local storage forbidden in production unless explicitly overridden
    if (env.STORAGE_PROVIDER === 'local' && env.ALLOW_LOCAL_STORAGE_IN_PROD !== 'true') {
      console.error('FATAL: Local storage provider is not permitted in production. Configure STORAGE_PROVIDER=s3 or STORAGE_PROVIDER=cloudinary, or explicitly set ALLOW_LOCAL_STORAGE_IN_PROD=true.');
      process.exit(1);
    }

    // 3. Mock data forbidden in production
    if (env.USE_MOCK_DATA === 'true') {
      console.error('FATAL: USE_MOCK_DATA=true is strictly forbidden in production.');
      process.exit(1);
    }

    // 4. Dev Auth Bypass forbidden in production
    if (env.ALLOW_DEV_AUTH_BYPASS === 'true') {
      console.error('FATAL: ALLOW_DEV_AUTH_BYPASS=true is strictly forbidden in production.');
      process.exit(1);
    }
  }

  parsedEnv = env;
  return env;
};

export const printIntegrationsStatus = (env) => {
  console.log('\n======================================================');
  console.log(`  PricePilot AI Server [Environment: ${env.NODE_ENV.toUpperCase()}]`);
  console.log('======================================================');

  const status = (enabled) => (enabled ? '\x1b[32mENABLED\x1b[0m' : '\x1b[33mDISABLED\x1b[0m');

  const integrations = [
    { name: 'Database (MongoDB)', enabled: Boolean(env.MONGODB_URI) },
    { name: 'Firebase Authentication', enabled: Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL) },
    { name: 'Dev Auth Bypass', enabled: env.NODE_ENV === 'development' && env.ALLOW_DEV_AUTH_BYPASS === 'true' },
    { name: 'DNS Override (8.8.8.8)', enabled: env.DNS_OVERRIDE === 'true' },
    { name: 'Redis Cache / Lock', enabled: Boolean(env.REDIS_URL) },
    { name: 'SerpApi Discovery', enabled: Boolean(env.SERPAPI_KEY || env.PRODUCT_SEARCH_API_KEY) },
    { name: 'Serper Discovery', enabled: Boolean(env.SERPER_KEY) },
    { name: 'SearchAPI Discovery', enabled: Boolean(env.SEARCHAPI_KEY) },
    { name: 'DataForSEO Discovery', enabled: Boolean(env.DATAFORSEO_LOGIN && env.DATAFORSEO_PASSWORD) },
    { name: 'Google Gemini 2.5 AI', enabled: Boolean(env.GEMINI_API_KEY) },
    { name: 'Storage Provider', enabled: true, extra: `[${env.STORAGE_PROVIDER.toUpperCase()}]` },
    { name: 'Keepa History Seed', enabled: Boolean(env.KEEPA_KEY) },
    { name: 'Open Icecat Specs', enabled: Boolean(env.ICECAT_USER && env.ICECAT_API_TOKEN) },
    { name: 'Affiliate Network', enabled: env.AFFILIATE_ENABLED === 'true' && Boolean(env.CUELINKS_KEY || env.EARNKARO_KEY) },
    { name: 'Sentry Error Tracing', enabled: Boolean(env.SENTRY_DSN) },
    { name: 'Resend Email Alerts', enabled: Boolean(env.RESEND_API_KEY) },
    { name: 'Telegram Bot Alerts', enabled: Boolean(env.TELEGRAM_BOT_TOKEN) },
    { name: 'Web Scraping (Zyte/Apify)', enabled: env.SCRAPING_ENABLED === 'true' && Boolean(env.ZYTE_KEY || env.APIFY_TOKEN) }
  ];

  for (const item of integrations) {
    const extra = item.extra ? ` ${item.extra}` : '';
    console.log(`  * ${item.name.padEnd(30)}: ${status(item.enabled)}${extra}`);
  }
  console.log('======================================================\n');
};

export const getEnv = () => {
  if (!parsedEnv) {
    return validateEnv();
  }
  return parsedEnv;
};
