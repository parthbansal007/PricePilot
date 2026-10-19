/**
 * server/migrations/split-product-model.js
 * 
 * Migration Script: Splits legacy monolithic Product documents into:
 * 1. CanonicalProduct (identity, brand, specs, images)
 * 2. Offer (retailer pricing, URLs, availability, trustLevel)
 * 3. PriceHistory (keyed by offerId and canonicalProductId)
 * 
 * Safety:
 * - Runs in DRY-RUN mode by default.
 * - Requires explicit --execute flag to write changes to MongoDB.
 * - Non-destructive: leaves original Product collection intact for safety.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(ROOT_DIR, '.env') });
dotenv.config({ path: path.join(ROOT_DIR, 'server', '.env'), override: true });

import Product from '../models/Product.js';
import CanonicalProduct from '../models/CanonicalProduct.js';
import Offer from '../models/Offer.js';
import PriceHistory from '../models/PriceHistory.js';
import TrackedProduct from '../models/TrackedProduct.js';
import Wishlist from '../models/Wishlist.js';

const isExecute = process.argv.includes('--execute');

async function runMigration() {
  console.log('========================================================');
  console.log('  PricePilot AI: Data Model Split Migration Script       ');
  console.log('========================================================');
  console.log(`Mode: ${isExecute ? 'LIVE EXECUTION (--execute active)' : 'DRY RUN (simulation only, no writes)'}\n`);

  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI is not configured.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  console.log('Connected to MongoDB.\n');

  try {
    const products = await Product.find({});
    console.log(`Found ${products.length} legacy products to migrate.\n`);

    let canonicalCreated = 0;
    let offersCreated = 0;
    let historiesUpdated = 0;

    for (const legacy of products) {
      console.log(`Processing: "${legacy.title}" (ID: ${legacy._id})`);

      // 1. Prepare CanonicalProduct data
      const canonicalData = {
        title: legacy.title,
        normalizedTitle: legacy.normalizedTitle || legacy.title.toLowerCase().trim(),
        brand: legacy.brand,
        model: legacy.model,
        modelNumber: legacy.modelNumber,
        productFamily: legacy.productFamily,
        normalizedSpecs: legacy.specifications || {},
        primaryImage: legacy.image,
        images: legacy.image ? [legacy.image] : [],
        rating: legacy.rating,
        matchConfidence: legacy.matchScore
      };

      let canonicalId = null;

      if (isExecute) {
        // Upsert CanonicalProduct by brand & modelNumber (or normalizedTitle)
        const filter = legacy.modelNumber
          ? { brand: legacy.brand, modelNumber: legacy.modelNumber }
          : { normalizedTitle: canonicalData.normalizedTitle };

        const canonical = await CanonicalProduct.findOneAndUpdate(
          filter,
          { $setOnInsert: canonicalData },
          { upsert: true, new: true }
        );
        canonicalId = canonical._id;
        canonicalCreated++;

        // 2. Create Offer linked to CanonicalProduct
        const offerData = {
          canonicalProductId: canonicalId,
          retailer: legacy.retailer || 'Unknown Retailer',
          price: legacy.currentPrice || 0,
          currency: legacy.currency || 'INR',
          url: legacy.productUrl || legacy.sourceUrl || '',
          sourceUrl: legacy.sourceUrl,
          isDirectRetailerUrl: legacy.isDirectRetailerUrl || false,
          availability: legacy.availability || 'In Stock',
          source: 'provider',
          trustLevel: 'standard',
          provider: legacy.provider || 'serpapi',
          providerProductId: legacy.providerProductId
        };

        const offer = await Offer.findOneAndUpdate(
          { canonicalProductId: canonicalId, retailer: offerData.retailer },
          offerData,
          { upsert: true, new: true }
        );
        offersCreated++;

        // 3. Update PriceHistory rows associated with this product
        const historyUpdate = await PriceHistory.updateMany(
          { productId: legacy._id, offerId: { $exists: false } },
          { $set: { offerId: offer._id, productId: canonicalId } }
        );
        historiesUpdated += historyUpdate.modifiedCount;

        // 4. Update references in TrackedProduct and Wishlist
        await TrackedProduct.updateMany(
          { productId: legacy._id },
          { $set: { canonicalProductId: canonicalId } }
        );
        await Wishlist.updateMany(
          { productId: legacy._id },
          { $set: { canonicalProductId: canonicalId } }
        );
      } else {
        console.log(`  [DRY RUN] Would create/update CanonicalProduct: ${canonicalData.title}`);
        console.log(`  [DRY RUN] Would create Offer for retailer: ${legacy.retailer || 'Unknown'} at ₹${legacy.currentPrice || 0}`);
      }
    }

    console.log('\n========================================================');
    console.log('Migration Summary:');
    console.log(`  - Legacy Products Scanned : ${products.length}`);
    console.log(`  - Canonical Products      : ${isExecute ? canonicalCreated : 'Simulated'}`);
    console.log(`  - Offers Created          : ${isExecute ? offersCreated : 'Simulated'}`);
    console.log(`  - Price History Rows Linked: ${isExecute ? historiesUpdated : 'Simulated'}`);
    console.log('========================================================\n');

    if (!isExecute) {
      console.log('Dry run complete. No modifications were written to the database.');
      console.log('To execute this migration against MongoDB, run:');
      console.log('  node server/migrations/split-product-model.js --execute');
    }
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

runMigration().catch(console.error);
