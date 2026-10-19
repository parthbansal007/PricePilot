import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEnv } from '../config/env.js';
import logger from '../utils/logger.js';
import Product from '../models/Product.js';
import CanonicalProduct from '../models/CanonicalProduct.js';
import Offer from '../models/Offer.js';
import cacheService from './cacheService.js';
import discoveryRouter from './discoveryRouter.js';
import { understandQuery } from './queryUnderstandingService.js';
import { filterValidOffers, isAccessoryTitle } from '../utils/retailerFilter.js';
import { extractProductInfo, calculateMatchScore, normalizeProductTitle } from '../utils/productMatcher.js';
import IcecatIdentityProvider from '../providers/adapters/IcecatIdentityProvider.js';
import SerpApiReviewAdapter from '../providers/adapters/SerpApiReviewAdapter.js';
import MockReviewProvider from '../providers/adapters/MockReviewProvider.js';
import { backfillProductHistory } from '../jobs/keepaBackfillJob.js';

const icecatProvider = new IcecatIdentityProvider();
const serpApiReviewAdapter = new SerpApiReviewAdapter();
const mockReviewProvider = new MockReviewProvider();

/**
 * Extract Amazon ASIN from product URL if present
 */
function extractAsinFromUrl(url) {
  if (!url) return null;
  const match = url.match(/(?:\/dp\/|\/gp\/product\/|\/ASIN\/)([A-Z0-9]{10})/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Disambiguation with Gemini when heuristic similarity is borderline (50-80%)
 */
async function disambiguateWithGemini(titleA, titleB) {
  const env = getEnv();
  if (!env.GEMINI_API_KEY || env.USE_MOCK_DATA === 'true') {
    return false;
  }

  try {
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json', temperature: 0.0 }
    });

    const prompt = `Are these two e-commerce product listings describing the exact same physical product model and variant (same specs/generation/variant, ignoring seller bundles/freebies)?
Item 1: "${titleA}"
Item 2: "${titleB}"
Return strictly JSON:
{ "sameProduct": boolean, "confidence": number }`;

    const res = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Disambiguation timeout')), 2000))
    ]);

    const parsed = JSON.parse(res.response.text());
    return parsed.sameProduct === true && parsed.confidence >= 0.8;
  } catch (err) {
    logger.debug({ error: err.message }, 'Gemini disambiguation skipped');
    return false;
  }
}

/**
 * Canonical product matching pipeline:
 * 1. ASIN / GTIN / MPN identity
 * 2. Icecat specs lookup
 * 3. Heuristic similarity score
 * 4. Gemini disambiguation fallback
 */
async function matchOrCreateCanonicalProduct(item) {
  const asin = extractAsinFromUrl(item.productUrl) || extractAsinFromUrl(item.sourceUrl);
  const info = extractProductInfo(item.title);
  const normTitle = normalizeProductTitle(item.title);

  // 1. Exact match by ASIN
  if (asin) {
    const byAsin = await CanonicalProduct.findOne({ asin });
    if (byAsin) return { canonical: byAsin, asin, confidence: 100 };
  }

  // 2. Exact match by Model Number if brand and modelNumber present
  if (info.brand && info.modelNumber) {
    const byModelNum = await CanonicalProduct.findOne({
      brand: new RegExp(`^${info.brand}$`, 'i'),
      modelNumber: info.modelNumber
    });
    if (byModelNum) return { canonical: byModelNum, asin, confidence: 95 };
  }

  // 3. Heuristic match among candidates with the same brand
  if (info.brand) {
    const candidates = await CanonicalProduct.find({
      brand: new RegExp(`^${info.brand}$`, 'i')
    }).limit(10).lean();

    for (const cand of candidates) {
      const score = calculateMatchScore(item.title, cand.title);
      if (score >= 80) {
        return { canonical: cand, asin, confidence: score };
      }
      if (score >= 50) {
        const isSame = await disambiguateWithGemini(item.title, cand.title);
        if (isSame) {
          return { canonical: cand, asin, confidence: 85 };
        }
      }
    }
  }

  // 4. Enrich specs via Open Icecat if available
  let icecatData = null;
  if (icecatProvider.isAvailable() && info.brand && (info.modelNumber || item.mpn)) {
    try {
      icecatData = await icecatProvider.lookupProduct({
        brand: info.brand,
        mpn: info.modelNumber || item.mpn,
        gtin: item.gtin
      });
    } catch (e) {
      // Non-fatal
    }
  }

  // 5. Create new CanonicalProduct
  const newCanonical = await CanonicalProduct.create({
    title: icecatData?.title || item.title,
    normalizedTitle: normTitle,
    brand: info.brand || icecatData?.brand || 'Unknown',
    model: info.model || icecatData?.model,
    modelNumber: info.modelNumber || icecatData?.mpn,
    gtin: icecatData?.gtin || item.gtin,
    mpn: icecatData?.mpn || item.mpn,
    asin,
    category: info.productFamily || 'electronics',
    productFamily: info.productFamily,
    normalizedSpecs: {
      cpu: info.specifications?.cpu || icecatData?.specs?.processor,
      gpu: info.specifications?.gpu || icecatData?.specs?.graphics,
      ram: info.specifications?.ram || icecatData?.specs?.memory,
      storage: info.specifications?.storage || icecatData?.specs?.storage,
      displaySize: info.specifications?.displaySize || icecatData?.specs?.display,
      resolution: icecatData?.specs?.resolution,
      refreshRate: icecatData?.specs?.refreshRate,
      color: icecatData?.specs?.color
    },
    images: icecatData?.images || (item.image ? [item.image] : []),
    primaryImage: icecatData?.primaryImage || item.image || '',
    aliases: [item.title],
    icecatId: icecatData?.icecatId,
    rating: item.rating,
    reviewCount: item.reviewCount,
    matchConfidence: 100
  });

  return { canonical: newCanonical, asin, confidence: 100 };
}

/**
 * Search products:
 * Search Order: Cache -> Database -> Discovery Router (on miss or stale)
 * Returns clean listings only
 */
export const searchProducts = async (query) => {
  if (!query || typeof query !== 'string') return [];

  const rawQuery = query.trim();
  const cacheKey = `search_listings:${rawQuery.toLowerCase()}`;

  // 1. Cache Check
  const cached = await cacheService.get(cacheKey);
  if (cached && !cached.isStale && Array.isArray(cached.value) && cached.value.length > 0) {
    logger.debug({ query: rawQuery }, 'Search served from fresh cache');
    return cached.value;
  }

  // 2. Query Understanding (brand, specs, clean query, category)
  const understood = await understandQuery(rawQuery);
  const cleanQuery = understood.cleanSearchQuery || rawQuery;

  // 3. Database Check: look for recent CanonicalProducts (< 24h old offers)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dbCanonicals = await CanonicalProduct.find({
    $text: { $search: cleanQuery }
  }).limit(10).lean();

  if (dbCanonicals.length > 0) {
    const canonicalIds = dbCanonicals.map(c => c._id);
    const freshOffers = await Offer.find({
      canonicalProductId: { $in: canonicalIds },
      lastCheckedAt: { $gte: oneDayAgo }
    }).sort({ price: 1 }).lean();

    if (freshOffers.length > 0) {
      const results = dbCanonicals.map(canonical => {
        const offers = freshOffers.filter(o => o.canonicalProductId.toString() === canonical._id.toString());
        const bestOffer = offers[0];
        if (!bestOffer) return null;

        return {
          id: canonical._id.toString(),
          _id: canonical._id.toString(),
          title: canonical.title,
          brand: canonical.brand,
          model: canonical.model,
          price: bestOffer.price,
          currency: bestOffer.currency || 'INR',
          retailer: bestOffer.retailer,
          image: canonical.primaryImage || '',
          rating: canonical.rating,
          reviewCount: canonical.reviewCount,
          productUrl: bestOffer.url,
          isDirectRetailerUrl: bestOffer.isDirectRetailerUrl,
          availability: bestOffer.availability,
          matchScore: 90,
          offersCount: offers.length
        };
      }).filter(Boolean);

      if (results.length > 0) {
        await cacheService.set(cacheKey, results);
        return results;
      }
    }
  }

  // 4. Router Fetch on Miss or Stale
  const { results: rawResults } = await discoveryRouter.search(cleanQuery);

  // 5. Filter out accessory pollution & price outliers
  const filtered = filterValidOffers(rawResults, {
    category: understood.category,
    queryWantsAccessory: understood.intent === 'accessory'
  });

  // 6. Cluster into CanonicalProduct & Offer
  const listings = [];
  for (const item of filtered) {
    try {
      const { canonical, asin } = await matchOrCreateCanonicalProduct(item);

      // Upsert Offer
      await Offer.findOneAndUpdate(
        { canonicalProductId: canonical._id, retailer: item.retailer },
        {
          price: item.price,
          currency: item.currency || 'INR',
          url: item.productUrl || item.sourceUrl,
          sourceUrl: item.sourceUrl,
          isDirectRetailerUrl: Boolean(item.isDirectRetailerUrl),
          availability: 'In Stock',
          lastCheckedAt: new Date(),
          provider: item.provider || 'serpapi',
          providerProductId: item.id
        },
        { upsert: true, new: true }
      );

      // Upsert legacy Product for 100% backward compatibility
      await saveOrUpdateProduct({
        ...item,
        providerProductId: item.id,
        price: item.price
      });

      // Background Keepa History Backfill if ASIN present
      if (asin && getEnv().KEEPA_KEY) {
        backfillProductHistory(canonical._id, asin).catch(err => {
          logger.debug({ asin, error: err.message }, 'Background Keepa backfill task failed');
        });
      }

      listings.push({
        id: canonical._id.toString(),
        _id: canonical._id.toString(),
        title: canonical.title,
        brand: canonical.brand,
        model: canonical.model,
        price: item.price,
        currency: item.currency || 'INR',
        retailer: item.retailer,
        image: canonical.primaryImage || item.image || '',
        rating: canonical.rating || item.rating,
        reviewCount: canonical.reviewCount || item.reviewCount,
        productUrl: item.productUrl,
        isDirectRetailerUrl: item.isDirectRetailerUrl,
        availability: 'In Stock',
        matchScore: item.matchScore || 85,
        offersCount: 1
      });
    } catch (saveErr) {
      logger.warn({ error: saveErr.message, title: item.title }, 'Error processing product match');
    }
  }

  // Cache results
  await cacheService.set(cacheKey, listings);
  return listings;
};

/**
 * Get Product Details (Side-Effect-Free GET)
 * Fetches Canonical Product + all associated Offers + Reviews
 */
export const getProductDetails = async (id) => {
  if (!id) throw new Error('Invalid product ID');

  let canonical = null;
  let legacyProduct = null;

  // 1. Try to find as CanonicalProduct ObjectId
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    canonical = await CanonicalProduct.findById(id).lean();
    if (!canonical) {
      legacyProduct = await Product.findById(id).lean();
      if (legacyProduct) {
        canonical = await CanonicalProduct.findOne({
          title: legacyProduct.title
        }).lean();
      }
    }
  }

  // 2. Try to find by providerProductId or title
  if (!canonical) {
    legacyProduct = await Product.findOne({
      $or: [{ providerProductId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    }).lean();
  }

  if (!canonical && !legacyProduct) {
    // Graceful fallback for mock/unknown IDs
    return {
      id,
      _id: id,
      title: 'Product Details Unavailable',
      image: 'https://via.placeholder.com/400',
      price: 0,
      currency: 'INR',
      retailer: 'Unknown',
      rating: null,
      availability: 'Unknown',
      productUrl: '',
      description: 'The product details could not be found.',
      offers: []
    };
  }

  const primaryObj = canonical || legacyProduct;
  const canonicalId = canonical ? canonical._id : legacyProduct._id;

  // 3. Fetch all associated offers sorted by price
  const offers = await Offer.find({ canonicalProductId: canonicalId })
    .sort({ price: 1 })
    .lean();

  const bestOffer = offers[0] || {
    price: primaryObj.currentPrice || primaryObj.price || 0,
    retailer: primaryObj.retailer || 'Unknown',
    url: primaryObj.productUrl || '',
    isDirectRetailerUrl: primaryObj.isDirectRetailerUrl || false
  };

  // 4. Fetch Reviews (SerpApi reviews if available, else Mock/default reviews)
  let reviews = { source: 'Verified Buyers', rating: primaryObj.rating, count: primaryObj.reviewCount || 0, snippets: [] };
  if (serpApiReviewAdapter.isAvailable() && primaryObj.providerProductId) {
    try {
      reviews = await serpApiReviewAdapter.getReviews(primaryObj.providerProductId);
    } catch (e) {
      // Fallback to mock reviews
      reviews = await mockReviewProvider.getReviews(id);
    }
  } else {
    reviews = await mockReviewProvider.getReviews(id);
  }

  return {
    id: canonicalId.toString(),
    _id: canonicalId.toString(),
    title: primaryObj.title,
    brand: primaryObj.brand || 'Unknown',
    model: primaryObj.model,
    modelNumber: primaryObj.modelNumber,
    specifications: primaryObj.normalizedSpecs || primaryObj.specifications || {},
    price: bestOffer.price,
    currency: bestOffer.currency || 'INR',
    retailer: bestOffer.retailer,
    productUrl: bestOffer.url,
    isDirectRetailerUrl: bestOffer.isDirectRetailerUrl,
    image: primaryObj.primaryImage || primaryObj.image,
    images: primaryObj.images || [primaryObj.image].filter(Boolean),
    rating: reviews.rating || primaryObj.rating,
    reviewCount: reviews.count || primaryObj.reviewCount,
    availability: bestOffer.availability || 'In Stock',
    description: primaryObj.description || `${primaryObj.title} with verified multi-retailer price tracking.`,
    bestOffer,
    offers: offers.map(o => ({
      retailer: o.retailer,
      price: o.price,
      mrp: o.mrp,
      currency: o.currency,
      url: o.url,
      isDirectRetailerUrl: o.isDirectRetailerUrl,
      availability: o.availability,
      lastCheckedAt: o.lastCheckedAt
    })),
    reviews
  };
};

/**
 * Compare prices across retailers for a query
 */
export const comparePrices = async (query) => {
  const listings = await searchProducts(query);
  if (!listings || listings.length === 0) {
    return { bestPrice: 0, currency: 'INR', results: [] };
  }

  const firstItem = listings[0];
  const details = await getProductDetails(firstItem.id);

  const results = (details.offers && details.offers.length > 0)
    ? details.offers
    : [{ retailer: firstItem.retailer, price: firstItem.price, url: firstItem.productUrl, availability: 'In Stock' }];

  return {
    bestPrice: details.price || firstItem.price,
    currency: 'INR',
    title: details.title,
    results
  };
};

/**
 * Save or update legacy product document (maintained for 100% backward compatibility)
 */
export const saveOrUpdateProduct = async (productDetails) => {
  try {
    const productData = {
      title: productDetails.title,
      normalizedTitle: productDetails.title.toLowerCase().trim(),
      brand: productDetails.brand,
      productFamily: productDetails.productFamily,
      model: productDetails.model,
      modelNumber: productDetails.modelNumber,
      specifications: productDetails.specifications,
      image: productDetails.image,
      retailer: productDetails.retailer,
      productUrl: productDetails.productUrl,
      sourceUrl: productDetails.sourceUrl,
      isDirectRetailerUrl: productDetails.isDirectRetailerUrl,
      currentPrice: productDetails.price,
      currency: productDetails.currency || 'INR',
      rating: productDetails.rating,
      availability: productDetails.availability || 'In Stock',
      providerProductId: productDetails.providerProductId || productDetails.id
    };

    const savedProduct = await Product.findOneAndUpdate(
      { providerProductId: productData.providerProductId },
      productData,
      { upsert: true, new: true }
    );
    return savedProduct;
  } catch (error) {
    logger.warn({ error: error.message }, 'Error saving legacy product');
    return null;
  }
};

export default {
  searchProducts,
  getProductDetails,
  comparePrices,
  saveOrUpdateProduct
};
