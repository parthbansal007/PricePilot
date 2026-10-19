#!/usr/bin/env node
/**
 * scripts/provider-benchmark.js
 * 
 * Runs a list of sample queries across discovery providers (SerpApi, Serper, SearchAPI, DataForSEO)
 * and generates a benchmark report in markdown format (docs/reports/provider-benchmark.md).
 * 
 * Safety:
 * - Does NOT execute paid requests unless --confirm-paid-usage is explicitly passed.
 * - Without --confirm-paid-usage, runs in safe dry-run mode reporting provider readiness.
 * - Never prints or outputs secrets or credentials to console or reports.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractRetailerUrl, isDirectRetailerUrl } from '../server/utils/urlUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Load environment variables from both root .env and server/.env
const rootEnvPath = path.join(ROOT_DIR, '.env');
const serverEnvPath = path.join(ROOT_DIR, 'server', '.env');

if (fs.existsSync(rootEnvPath) && typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile(rootEnvPath); } catch (e) {}
}
if (fs.existsSync(serverEnvPath) && typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile(serverEnvPath); } catch (e) {}
}

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const confirmPaidUsage = hasFlag('--confirm-paid-usage');
const isMock = hasFlag('--mock');
const isDryRun = (!isMock && !confirmPaidUsage) || hasFlag('--dry-run');
const queriesPath = path.resolve(ROOT_DIR, getArg('--queries') || 'scripts/benchmark-queries.json');
const outputPath = path.resolve(ROOT_DIR, getArg('--output') || 'docs/reports/provider-benchmark.md');
const filterProvider = getArg('--provider');
const queryLimit = getArg('--limit') ? parseInt(getArg('--limit'), 10) : null;

// Retailer list
const TRUSTED_RETAILERS = [
  'amazon', 'flipkart', 'croma', 'reliance digital', 'vijay sales',
  'myntra', 'tata cliq', 'samsung', 'apple', 'nykaa', 'ajio', 'jiomart'
];

// Default estimated costs per query (USD)
const DEFAULT_COSTS = {
  serpapi: 0.01,
  serper: 0.001,
  searchapi: 0.0049,
  dataforseo: 0.002
};

let customCosts = {};
try {
  if (process.env.PROVIDER_BENCHMARK_COSTS) {
    customCosts = JSON.parse(process.env.PROVIDER_BENCHMARK_COSTS);
  }
} catch (e) {
  // Ignore malformed JSON
}
const COSTS = { ...DEFAULT_COSTS, ...customCosts };

const extractPrice = (priceVal) => {
  if (typeof priceVal === 'number') return priceVal;
  if (!priceVal) return null;
  const num = parseFloat(String(priceVal).replace(/[^0-9.]/g, ''));
  return isNaN(num) ? null : num;
};

const isTrusted = (sourceName) => {
  if (!sourceName) return false;
  const lower = sourceName.toLowerCase();
  return TRUSTED_RETAILERS.some(tr => lower.includes(tr));
};

// Provider Definitions
const PROVIDERS = [
  {
    id: 'serpapi',
    name: 'SerpApi Google Shopping',
    isConfigured: () => Boolean(process.env.SERPAPI_KEY || process.env.PRODUCT_SEARCH_API_KEY),
    getKey: () => process.env.SERPAPI_KEY || process.env.PRODUCT_SEARCH_API_KEY,
    execute: async (query, apiKey) => {
      const url = new URL('https://serpapi.com/search.json');
      url.searchParams.set('engine', 'google_shopping');
      url.searchParams.set('q', query);
      url.searchParams.set('gl', 'in');
      url.searchParams.set('hl', 'en');
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('num', '20');

      const res = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(20000)
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      const rawResults = data.shopping_results || [];

      return rawResults.map(item => {
        const rawLink = item.link || item.product_link || '';
        const resolvedLink = extractRetailerUrl(rawLink);
        return {
          title: item.title,
          source: item.source || item.merchant || '',
          price: item.extracted_price || extractPrice(item.price),
          rawLink,
          resolvedLink,
          isDirect: isDirectRetailerUrl(resolvedLink),
          isTrusted: isTrusted(item.source || item.merchant)
        };
      });
    }
  },
  {
    id: 'serper',
    name: 'Serper Google Shopping',
    isConfigured: () => Boolean(process.env.SERPER_KEY),
    getKey: () => process.env.SERPER_KEY,
    execute: async (query, apiKey) => {
      const res = await fetch('https://google.serper.dev/shopping', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: query,
          gl: 'in',
          hl: 'en'
        }),
        signal: AbortSignal.timeout(20000)
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      const rawResults = data.shopping || [];

      return rawResults.map(item => {
        const rawLink = item.link || '';
        const resolvedLink = extractRetailerUrl(rawLink);
        return {
          title: item.title,
          source: item.source || '',
          price: extractPrice(item.price),
          rawLink,
          resolvedLink,
          isDirect: isDirectRetailerUrl(resolvedLink),
          isTrusted: isTrusted(item.source)
        };
      });
    }
  },
  {
    id: 'searchapi',
    name: 'SearchAPI.io Google Shopping',
    isConfigured: () => Boolean(process.env.SEARCHAPI_KEY),
    getKey: () => process.env.SEARCHAPI_KEY,
    execute: async (query, apiKey) => {
      const url = new URL('https://www.searchapi.io/api/v1/search');
      url.searchParams.set('engine', 'google_shopping');
      url.searchParams.set('q', query);
      url.searchParams.set('gl', 'in');
      url.searchParams.set('hl', 'en');
      url.searchParams.set('link', 'resolved');
      url.searchParams.set('api_key', apiKey);

      const res = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(20000)
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      const rawResults = data.shopping_results || [];

      return rawResults.map(item => {
        const rawLink = item.product_link || item.merchant?.link || item.link || '';
        const resolvedLink = extractRetailerUrl(rawLink);
        return {
          title: item.title,
          source: item.source || item.merchant?.name || '',
          price: item.extracted_price || extractPrice(item.price),
          rawLink,
          resolvedLink,
          isDirect: isDirectRetailerUrl(resolvedLink),
          isTrusted: isTrusted(item.source || item.merchant?.name)
        };
      });
    }
  },
  {
    id: 'dataforseo',
    name: 'DataForSEO Google Shopping',
    isConfigured: () => Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD),
    getKey: () => `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`,
    execute: async (query, creds) => {
      const [login, password] = creds.split(':');
      const authHeader = 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');
      
      const res = await fetch('https://api.dataforseo.com/v3/merchant/google/products/live/advanced', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          {
            keyword: query,
            location_code: 2356, // India
            language_code: 'en'
          }
        ]),
        signal: AbortSignal.timeout(25000)
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      const task = data.tasks?.[0];
      if (task?.status_code >= 40000) {
        throw new Error(`DataForSEO error: ${task.status_message}`);
      }
      const items = task?.result?.[0]?.items || [];

      return items.map(item => {
        const rawLink = item.url || '';
        const resolvedLink = extractRetailerUrl(rawLink);
        return {
          title: item.title,
          source: item.seller || item.source || '',
          price: item.price,
          rawLink,
          resolvedLink,
          isDirect: isDirectRetailerUrl(resolvedLink),
          isTrusted: isTrusted(item.seller || item.source)
        };
      });
    }
  }
];

// Helper calculations
const computeMedian = (arr) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const computeP95 = (arr) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1);
  return sorted[idx];
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runBenchmark() {
  console.log('====================================================');
  console.log('         PricePilot AI: Provider Benchmark          ');
  console.log('====================================================');

  if (!fs.existsSync(queriesPath)) {
    console.error(`Queries file not found at: ${queriesPath}`);
    process.exit(1);
  }

  const queriesData = JSON.parse(fs.readFileSync(queriesPath, 'utf8'));
  let sampleQueries = queriesData;
  if (queryLimit && queryLimit > 0) {
    sampleQueries = sampleQueries.slice(0, queryLimit);
  }

  console.log(`Loaded ${sampleQueries.length} sample queries from ${path.basename(queriesPath)}`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no live provider API calls)' : 'LIVE EXECUTION (--confirm-paid-usage active)'}`);

  const activeProviders = PROVIDERS.filter(p => !filterProvider || p.id === filterProvider);

  const reportData = {
    timestamp: new Date().toISOString(),
    isDryRun,
    queryCount: sampleQueries.length,
    providers: []
  };

  for (const provider of activeProviders) {
    const isConfigured = isMock ? true : provider.isConfigured();
    const providerReport = {
      id: provider.id,
      name: provider.name,
      configured: isConfigured,
      status: !isConfigured ? 'DISABLED (no credentials)' : (isDryRun ? 'READY (dry run, not executed)' : (isMock ? 'MOCK / SIMULATED' : 'COMPLETED')),
      queriesAttempted: 0,
      queriesSucceeded: 0,
      latencies: [],
      resultCounts: [],
      directLinkRatios: [],
      trustedRetailerRatios: [],
      priceDeltas: [],
      costPerQuery: COSTS[provider.id] || 'N/A',
      estimatedTotalCost: 0,
      queryDetails: []
    };

    if (isConfigured && (!isDryRun || isMock)) {
      console.log(`\nBenchmarking ${provider.name}${isMock ? ' [MOCK MODE]' : ''}...`);
      const key = isMock ? 'mock-key' : provider.getKey();

      for (let i = 0; i < sampleQueries.length; i++) {
        const item = sampleQueries[i];
        const queryText = item.query;
        process.stdout.write(`  [${i + 1}/${sampleQueries.length}] "${queryText}"... `);

        const startTime = performance.now();
        let attempts = 0;
        let success = false;
        let results = [];
        let errorMsg = null;

        while (attempts < 2 && !success) {
          attempts++;
          try {
            if (isMock) {
              // Simulated mock results based on query
              await sleep(150 + Math.random() * 200);
              const refPrice = item.manualCheck?.referencePrice || 50000;
              const variance = (Math.random() - 0.4) * 0.15; // -6% to +9%
              const mockPrice = Math.round(refPrice * (1 + variance));
              results = [
                {
                  title: `${queryText} - Official Store`,
                  source: 'Amazon',
                  price: mockPrice,
                  rawLink: `https://www.amazon.in/dp/B0EXAMPLE?tag=pricepilot`,
                  resolvedLink: `https://www.amazon.in/dp/B0EXAMPLE`,
                  isDirect: true,
                  isTrusted: true
                },
                {
                  title: `${queryText} - Electronics Deal`,
                  source: 'Flipkart',
                  price: Math.round(mockPrice * 1.02),
                  rawLink: `https://www.flipkart.com/item/p/itm12345`,
                  resolvedLink: `https://www.flipkart.com/item/p/itm12345`,
                  isDirect: true,
                  isTrusted: true
                },
                {
                  title: `${queryText} Special Offer`,
                  source: 'Croma',
                  price: Math.round(mockPrice * 1.05),
                  rawLink: `https://www.google.com/url?url=https://www.croma.com/p/123`,
                  resolvedLink: `https://www.croma.com/p/123`,
                  isDirect: true,
                  isTrusted: true
                }
              ];
              success = true;
            } else {
              results = await provider.execute(queryText, key);
              success = true;
            }
          } catch (err) {
            errorMsg = err.message;
            if (attempts < 2) await sleep(1500);
          }
        }

        const elapsed = Math.round(performance.now() - startTime);

        if (success) {
          providerReport.queriesSucceeded++;
          providerReport.latencies.push(elapsed);
          providerReport.resultCounts.push(results.length);

          const directCount = results.filter(r => r.isDirect).length;
          const directRatio = results.length > 0 ? (directCount / results.length) * 100 : 0;
          providerReport.directLinkRatios.push(directRatio);

          const trustedCount = results.filter(r => r.isTrusted).length;
          const trustedRatio = results.length > 0 ? (trustedCount / results.length) * 100 : 0;
          providerReport.trustedRetailerRatios.push(trustedRatio);

          // Price accuracy comparison with manual check fixture
          let priceDelta = 'N/A';
          if (item.manualCheck?.referencePrice && results.length > 0) {
            const validPrices = results.map(r => r.price).filter(p => p && p > 0);
            if (validPrices.length > 0) {
              const bestFoundPrice = Math.min(...validPrices);
              const refPrice = item.manualCheck.referencePrice;
              const deltaPct = ((bestFoundPrice - refPrice) / refPrice) * 100;
              priceDelta = `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}% (found ₹${bestFoundPrice} vs ref ₹${refPrice})`;
              providerReport.priceDeltas.push(Math.abs(deltaPct));
            }
          }

          providerReport.queryDetails.push({
            query: queryText,
            status: 'SUCCESS',
            latency: `${elapsed}ms`,
            resultCount: results.length,
            directRatio: `${directRatio.toFixed(0)}%`,
            trustedRatio: `${trustedRatio.toFixed(0)}%`,
            priceDelta,
            attempts
          });

          console.log(`OK (${elapsed}ms, ${results.length} results)`);
        } else {
          providerReport.queryDetails.push({
            query: queryText,
            status: `FAILED (${errorMsg})`,
            latency: `${elapsed}ms`,
            resultCount: 0,
            directRatio: '0%',
            trustedRatio: '0%',
            priceDelta: 'N/A',
            attempts
          });
          console.log(`FAILED (${errorMsg})`);
        }

        providerReport.queriesAttempted++;
        // Respectful pacing between calls
        await sleep(500);
      }

      const queryCost = COSTS[provider.id] || 0;
      providerReport.estimatedTotalCost = (providerReport.queriesAttempted * queryCost).toFixed(3);
    }

    reportData.providers.push(providerReport);
  }

  // Generate Markdown report
  const markdown = generateMarkdownReport(reportData);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown, 'utf8');

  console.log('\n====================================================');
  console.log(`Report generated successfully at:`);
  console.log(outputPath);
  console.log('====================================================\n');

  if (isDryRun) {
    console.log('NOTE: To execute live benchmark calls against configured providers, run:');
    console.log('  node scripts/provider-benchmark.js --confirm-paid-usage');
  }
}

function generateMarkdownReport(data) {
  let md = `# Provider Benchmark Report\n\n`;
  md += `**Generated:** ${data.timestamp}\n\n`;
  md += `**Mode:** ${data.isDryRun ? 'DRY RUN (no provider requests sent)' : 'LIVE BENCHMARK RUN'}\n\n`;
  md += `**Sample Queries Count:** ${data.queryCount}\n\n`;

  md += `## Summary Comparison\n\n`;
  md += `| Provider | Status | Queries Executed | Latency (median / p95) | Result Count (avg) | Price Accuracy (avg |Δ|) | Direct-Link Rate | Trusted-Retailer Rate | Cost/Query |\n`;
  md += `| --- | --- | ---: | --- | ---: | --- | --- | --- | --- |\n`;

  for (const p of data.providers) {
    if (!p.configured) {
      md += `| ${p.id} | DISABLED (no credentials) | 0/${data.queryCount} | N/A | N/A | N/A | N/A | N/A | N/A |\n`;
    } else if (data.isDryRun) {
      md += `| ${p.id} | READY (configured, dry run) | 0/${data.queryCount} | N/A / N/A | N/A | Fixture loaded | N/A | N/A | $${p.costPerQuery} |\n`;
    } else {
      const medLatency = p.latencies.length ? `${computeMedian(p.latencies)}ms` : 'N/A';
      const p95Latency = p.latencies.length ? `${computeP95(p.latencies)}ms` : 'N/A';
      const avgResults = p.resultCounts.length ? (p.resultCounts.reduce((a, b) => a + b, 0) / p.resultCounts.length).toFixed(1) : 'N/A';
      const avgDirect = p.directLinkRatios.length ? `${(p.directLinkRatios.reduce((a, b) => a + b, 0) / p.directLinkRatios.length).toFixed(1)}%` : 'N/A';
      const avgTrusted = p.trustedRetailerRatios.length ? `${(p.trustedRetailerRatios.reduce((a, b) => a + b, 0) / p.trustedRetailerRatios.length).toFixed(1)}%` : 'N/A';
      const avgDelta = p.priceDeltas.length ? `±${(p.priceDeltas.reduce((a, b) => a + b, 0) / p.priceDeltas.length).toFixed(1)}%` : 'N/A';

      md += `| ${p.id} | ${p.status} | ${p.queriesSucceeded}/${p.queriesAttempted} | ${medLatency} / ${p95Latency} | ${avgResults} | ${avgDelta} | ${avgDirect} | ${avgTrusted} | $${p.costPerQuery} |\n`;
    }
  }

  md += `\n## Per-Query Details\n\n`;

  for (const p of data.providers) {
    if (p.queryDetails.length > 0) {
      md += `### Provider: ${p.name} (${p.id})\n\n`;
      md += `| Query | Status | Latency | Results Count | Direct Links | Trusted Retailers | Price Delta vs Manual Check | Attempts |\n`;
      md += `| --- | --- | ---: | ---: | ---: | ---: | --- | ---: |\n`;
      for (const q of p.queryDetails) {
        md += `| ${q.query} | ${q.status} | ${q.latency} | ${q.resultCount} | ${q.directRatio} | ${q.trustedRatio} | ${q.priceDelta} | ${q.attempts} |\n`;
      }
      md += `\n`;
    }
  }

  md += `## Methodology & Evaluation Criteria\n\n`;
  md += `- **Queries**: 20 standard Indian e-commerce search queries across Laptops, Smartphones, Audio/Headphones, and Monitors (editable via \`scripts/benchmark-queries.json\`).\n`;
  md += `- **Direct-Link Rate**: Measured by parsing links through \`server/utils/urlUtils.js\` (\`extractRetailerUrl\`, \`isDirectRetailerUrl\`) to verify whether destination URLs lead directly to store product pages rather than intermediate search or Google redirect links.\n`;
  md += `- **Trusted-Retailer Rate**: Evaluates whether returned merchants match the PricePilot trusted retailer allow-list (Amazon.in, Flipkart, Croma, Reliance Digital, Vijay Sales, Tata CLiQ, etc.).\n`;
  md += `- **Price Accuracy**: Computed against timestamped manual reference prices in \`scripts/benchmark-queries.json\`. Shows percentage variance from verified retailer pricing.\n`;
  md += `- **Cost Tracking**: Estimated using standard published plan pricing tiers or custom configured values via \`PROVIDER_BENCHMARK_COSTS\`. No secrets or credential keys are written to this report.\n`;
  md += `- **Paid Usage Protection**: Live calls require the \`--confirm-paid-usage\` CLI flag. Dry run mode prevents unintended billing.\n\n`;

  return md;
}

runBenchmark().catch(err => {
  console.error('Fatal benchmark error:', err);
  process.exit(1);
});
