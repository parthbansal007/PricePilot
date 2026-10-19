import { getEnv } from '../config/env.js';
import logger from '../utils/logger.js';
import SerpApiDiscoveryAdapter from '../providers/adapters/SerpApiDiscoveryAdapter.js';
import SerperDiscoveryAdapter from '../providers/adapters/SerperDiscoveryAdapter.js';
import SearchApiDiscoveryAdapter from '../providers/adapters/SearchApiDiscoveryAdapter.js';
import DataForSeoDiscoveryAdapter from '../providers/adapters/DataForSeoDiscoveryAdapter.js';
import MockDiscoveryProvider from '../providers/adapters/MockDiscoveryProvider.js';

// Provider costs per query in USD (from docs/INTEGRATIONS.md)
const PROVIDER_COSTS = {
  serpapi: 0.01,
  serper: 0.001,
  searchapi: 0.007,
  dataforseo: 0.002,
  mock: 0.0
};

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeoutMs = options.resetTimeoutMs || 60000; // 1 minute
    this.state = 'CLOSED'; // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.halfOpenProbeInFlight = false;
  }

  isOpen() {
    const now = Date.now();
    if (this.state === 'OPEN') {
      if (now - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenProbeInFlight = false;
        logger.info({ provider: this.name }, 'Circuit breaker transitioned to HALF_OPEN');
        return false;
      }
      return true;
    }
    if (this.state === 'HALF_OPEN' && this.halfOpenProbeInFlight) {
      return true; // Already probing
    }
    return false;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.halfOpenProbeInFlight = false;
  }

  recordFailure() {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();
    this.halfOpenProbeInFlight = false;

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(
        { provider: this.name, failures: this.failureCount, resetInMs: this.resetTimeoutMs },
        'Circuit breaker OPENED: provider temporarily paused'
      );
    }
  }
}

export class DiscoveryRouter {
  constructor() {
    this.providers = new Map();
    this.breakers = new Map();
    this.monthlyQuotas = new Map();
    this.monthlyUsage = new Map();
    this.currentMonthKey = this.getMonthKey();
    this.inFlightRequests = new Map(); // Singleflight coalescing

    this.initProviders();
  }

  getMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  checkMonthReset() {
    const currentKey = this.getMonthKey();
    if (currentKey !== this.currentMonthKey) {
      this.currentMonthKey = currentKey;
      this.monthlyUsage.clear();
      logger.info({ month: currentKey }, 'Monthly quota usage counters reset');
    }
  }

  initProviders() {
    const env = getEnv();

    // Register adapters
    this.registerProvider('serpapi', new SerpApiDiscoveryAdapter());
    this.registerProvider('serper', new SerperDiscoveryAdapter());
    this.registerProvider('searchapi', new SearchApiDiscoveryAdapter());
    this.registerProvider('dataforseo', new DataForSeoDiscoveryAdapter());
    this.registerProvider('mock', new MockDiscoveryProvider());

    // Parse quotas e.g. "serpapi:100,serper:2500,searchapi:100,dataforseo:1000"
    if (env.PROVIDER_MONTHLY_QUOTAS) {
      const parts = env.PROVIDER_MONTHLY_QUOTAS.split(',');
      for (const part of parts) {
        const [name, quotaStr] = part.split(':');
        if (name && quotaStr) {
          const quota = parseInt(quotaStr.trim(), 10);
          if (!isNaN(quota)) {
            this.monthlyQuotas.set(name.trim().toLowerCase(), quota);
          }
        }
      }
    }
  }

  registerProvider(name, instance) {
    this.providers.set(name, instance);
    this.breakers.set(name, new CircuitBreaker(name));
  }

  getProviderPriority() {
    const env = getEnv();
    if (env.USE_MOCK_DATA === 'true' || env.NODE_ENV === 'test') {
      return ['mock'];
    }

    const priorityStr = env.PROVIDER_PRIORITY || 'serpapi,serper,searchapi,dataforseo';
    const list = priorityStr.split(',').map(s => s.trim().toLowerCase());
    return list;
  }

  isQuotaExhausted(providerName) {
    this.checkMonthReset();
    const quota = this.monthlyQuotas.get(providerName);
    if (!quota) return false;
    const usage = this.monthlyUsage.get(providerName) || 0;
    return usage >= quota;
  }

  incrementUsage(providerName) {
    this.checkMonthReset();
    const current = this.monthlyUsage.get(providerName) || 0;
    this.monthlyUsage.set(providerName, current + 1);
  }

  getQuotaReport() {
    this.checkMonthReset();
    const report = {};
    for (const [name, breaker] of this.breakers.entries()) {
      report[name] = {
        monthlyCalls: this.monthlyUsage.get(name) || 0,
        monthlyLimit: this.monthlyQuotas.get(name) || null,
        circuitBreaker: breaker.state,
        costPerQueryUsd: PROVIDER_COSTS[name] || 0
      };
    }
    return report;
  }

  /**
   * Search across discovery providers with fallback and request coalescing
   * @param {string} query
   * @param {Object} options
   * @returns {Promise<{ results: Array, metrics: Object }>}
   */
  async search(query, options = {}) {
    if (!query || typeof query !== 'string') {
      return { results: [], metrics: { providersCalled: [], latencyMs: 0, costEstimate: 0 } };
    }

    const coalescingKey = query.trim().toLowerCase();

    // Request coalescing (singleflight)
    if (this.inFlightRequests.has(coalescingKey)) {
      logger.debug({ query }, 'Joining in-flight coalesced search request');
      return this.inFlightRequests.get(coalescingKey);
    }

    const searchPromise = this._executeSearch(query, options);
    this.inFlightRequests.set(coalescingKey, searchPromise);

    try {
      return await searchPromise;
    } finally {
      this.inFlightRequests.delete(coalescingKey);
    }
  }

  async _executeSearch(query, options = {}) {
    const startTime = Date.now();
    const providersCalled = [];
    let totalCost = 0;
    let results = [];

    const priorityList = this.getProviderPriority();

    for (const providerName of priorityList) {
      const provider = this.providers.get(providerName);
      if (!provider || !provider.isAvailable()) {
        continue;
      }

      const breaker = this.breakers.get(providerName);
      if (breaker.isOpen()) {
        logger.debug({ provider: providerName }, 'Skipping provider: circuit breaker is OPEN');
        continue;
      }

      if (this.isQuotaExhausted(providerName)) {
        logger.warn({ provider: providerName }, 'Skipping provider: monthly quota exhausted');
        continue;
      }

      try {
        providersCalled.push(providerName);
        this.incrementUsage(providerName);
        totalCost += PROVIDER_COSTS[providerName] || 0;

        const providerTimeout = options.timeoutMs || 10000;
        results = await provider.search(query, { ...options, timeoutMs: providerTimeout });

        breaker.recordSuccess();

        if (results && results.length > 0) {
          logger.info(
            { provider: providerName, count: results.length, query },
            'Discovery provider returned results'
          );
          break; // Successfully got results from preferred provider
        }
      } catch (err) {
        breaker.recordFailure();
        logger.warn(
          { provider: providerName, error: err.message, query },
          'Discovery provider failed, attempting fallback'
        );
      }
    }

    // Ultimate fallback to mock if no results and development/test allows it
    if ((!results || results.length === 0) && (getEnv().NODE_ENV !== 'production')) {
      const mock = this.providers.get('mock');
      if (mock && !providersCalled.includes('mock')) {
        logger.info({ query }, 'Falling back to mock discovery provider');
        providersCalled.push('mock');
        results = await mock.search(query, options);
      }
    }

    const latencyMs = Date.now() - startTime;
    return {
      results: results || [],
      metrics: {
        providersCalled,
        latencyMs,
        costEstimate: parseFloat(totalCost.toFixed(4)),
        cacheHit: false
      }
    };
  }
}

export const discoveryRouter = new DiscoveryRouter();
export default discoveryRouter;
