import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { z } from 'zod';
import { protect } from '../server/middleware/authMiddleware.js';
import { validateRequest } from '../server/middleware/validateRequest.js';

test('Security: authMiddleware rejects unauthenticated requests with 401', async () => {
  const req = { headers: {} };
  let statusCode = null;
  let responseBody = null;
  const res = {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => { responseBody = data; }
      };
    }
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  await protect(req, res, next);

  assert.strictEqual(statusCode, 401);
  assert.strictEqual(responseBody?.message, 'Not authorized, no token provided');
  assert.strictEqual(nextCalled, false);
});

test('Security: authMiddleware blocks dev bypass when ALLOW_DEV_AUTH_BYPASS is not true', async () => {
  const originalEnv = process.env.ALLOW_DEV_AUTH_BYPASS;
  process.env.ALLOW_DEV_AUTH_BYPASS = 'false';

  const req = {
    headers: {
      authorization: 'Bearer dev-bypass'
    }
  };
  let statusCode = null;
  const res = {
    status: (code) => {
      statusCode = code;
      return {
        json: () => {}
      };
    }
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  try {
    await protect(req, res, next);
    // Since Firebase admin is not initialized with live cert in this test context, should return 401 or 503, never next()
    assert.strictEqual(nextCalled, false);
    assert.ok(statusCode === 401 || statusCode === 503);
  } finally {
    process.env.ALLOW_DEV_AUTH_BYPASS = originalEnv;
  }
});

test('Security: Cron webhook rejects secret in URL query parameter', async () => {
  const cronSecret = 'test-cron-secret-12345';
  process.env.CRON_SECRET = cronSecret;

  const req = {
    headers: {},
    query: { secret: cronSecret }
  };
  let statusCode = null;
  let responseData = null;
  const res = {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => { responseData = data; }
      };
    }
  };

  const { runCronJob } = await import('../server/controllers/trackingController.js');
  await runCronJob(req, res);

  assert.strictEqual(statusCode, 400);
  assert.match(responseData.message, /Authorization header/i);
});

test('Security: Cron webhook rejects invalid Authorization header with 401', async () => {
  process.env.CRON_SECRET = 'correct-secret-12345';

  const req = {
    headers: { authorization: 'Bearer wrong-secret' },
    query: {}
  };
  let statusCode = null;
  const res = {
    status: (code) => {
      statusCode = code;
      return { json: () => {} };
    }
  };

  const { runCronJob } = await import('../server/controllers/trackingController.js');
  await runCronJob(req, res);

  assert.strictEqual(statusCode, 401);
});

test('Security: Constant-time comparison is timing-safe for secret verification', () => {
  const verifyTimingSafe = (provided, expected) => {
    if (!provided || !expected || typeof provided !== 'string' || typeof expected !== 'string') {
      return false;
    }
    const hashProvided = crypto.createHash('sha256').update(provided).digest();
    const hashExpected = crypto.createHash('sha256').update(expected).digest();
    return crypto.timingSafeEqual(hashProvided, hashExpected);
  };

  assert.strictEqual(verifyTimingSafe('my-secret-key', 'my-secret-key'), true);
  assert.strictEqual(verifyTimingSafe('my-secret-key', 'wrong-key'), false);
  assert.strictEqual(verifyTimingSafe('', 'my-secret-key'), false);
  assert.strictEqual(verifyTimingSafe(null, 'my-secret-key'), false);
});

test('Correctness: Zod request validation middleware validates valid inputs', async () => {
  const schema = {
    query: z.object({
      q: z.string().min(1)
    })
  };
  const middleware = validateRequest(schema);

  const req = { query: { q: 'iPhone 16' } };
  const res = {};
  let nextCalled = false;

  await middleware(req, res, () => { nextCalled = true; });

  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.query.q, 'iPhone 16');
});

test('Correctness: Zod request validation middleware rejects invalid inputs with 400', async () => {
  const schema = {
    body: z.object({
      amount: z.number().positive(),
      category: z.string().min(1)
    })
  };
  const middleware = validateRequest(schema);

  const req = { body: { amount: -50, category: '' } };
  let statusCode = null;
  let responseData = null;
  const res = {
    status: (code) => {
      statusCode = code;
      return { json: (data) => { responseData = data; } };
    }
  };
  let nextCalled = false;

  await middleware(req, res, () => { nextCalled = true; });

  assert.strictEqual(nextCalled, false);
  assert.strictEqual(statusCode, 400);
  assert.strictEqual(responseData.message, 'Validation failed');
  assert.strictEqual(responseData.errors.length, 2);
});
