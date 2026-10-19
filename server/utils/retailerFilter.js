import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, '../config/retailers.json');

let config = {
  general: ['amazon', 'flipkart', 'croma', 'reliance digital', 'vijay sales'],
  categories: {},
  accessoryKeywords: [],
  outlierFilter: { minFractionOfMedian: 0.2, maxMultipleOfMedian: 4.0 }
};

try {
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  // Fallback defaults
}

/**
 * Check if a retailer is trusted for a given category (or generally)
 */
export const isTrustedRetailer = (retailerName, category = null) => {
  if (!retailerName) return false;
  const cleanName = retailerName.toLowerCase().trim();

  // Category specific list if available
  if (category && config.categories && config.categories[category]) {
    const categoryList = config.categories[category];
    if (categoryList.some(r => cleanName.includes(r))) {
      return true;
    }
  }

  // General list
  return config.general.some(r => cleanName.includes(r));
};

/**
 * Detect if title represents an accessory rather than primary product
 */
export const isAccessoryTitle = (title) => {
  if (!title) return false;
  const lower = title.toLowerCase();
  return config.accessoryKeywords.some(kw => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(lower);
  });
};

/**
 * Filter out accessory and price outliers from search results
 */
export const filterValidOffers = (items, options = {}) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  const { category = null, queryWantsAccessory = false } = options;

  // 1. Filter by accessory keywords if query is not seeking an accessory
  let filtered = items.filter(item => {
    if (!item.title) return false;
    if (!queryWantsAccessory && isAccessoryTitle(item.title)) {
      return false;
    }
    return true;
  });

  if (filtered.length === 0) return items;

  // 2. Compute price median for outlier rejection
  const validPrices = filtered
    .map(i => i.price)
    .filter(p => typeof p === 'number' && p > 0)
    .sort((a, b) => a - b);

  if (validPrices.length >= 3) {
    const mid = Math.floor(validPrices.length / 2);
    const median = validPrices.length % 2 !== 0 ? validPrices[mid] : (validPrices[mid - 1] + validPrices[mid]) / 2;
    const minAllowed = median * (config.outlierFilter.minFractionOfMedian || 0.2);
    const maxAllowed = median * (config.outlierFilter.maxMultipleOfMedian || 4.0);

    filtered = filtered.filter(item => {
      if (!item.price) return true;
      return item.price >= minAllowed && item.price <= maxAllowed;
    });
  }

  return filtered;
};
