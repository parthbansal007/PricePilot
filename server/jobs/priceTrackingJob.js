import TrackedProduct from '../models/TrackedProduct.js';
import PriceHistory from '../models/PriceHistory.js';
import Notification from '../models/Notification.js';
import { getProductDetails } from '../services/productService.js';

export const runPriceCheckJob = async () => {
  console.log('Running triggered price check job...');
  try {
    const activeProducts = await TrackedProduct.find({ active: true });
    if (activeProducts.length === 0) {
      console.log('No active tracked products.');
      return { success: true, message: 'No active tracked products.' };
    }
    
    const uniqueProductIds = [...new Set(activeProducts.map(p => p.productId))];
    let processedCount = 0;

    for (const productId of uniqueProductIds) {
      try {
        if (!process.env.PRODUCT_SEARCH_API_KEY && process.env.USE_MOCK_DATA !== 'true') {
          console.log(`Mock mode: skipping real price fetch for ${productId}`);
          continue; 
        }

        // Get previous price history BEFORE we fetch the new details 
        // (because getProductDetails will insert a new PriceHistory record)
        const previousHistory = await PriceHistory.find({ productId }).sort({ timestamp: -1 }).limit(1);
        const previousPrice = previousHistory.length > 0 ? previousHistory[0].price : null;

        // Fetch new details (this will automatically save the new PriceHistory)
        const product = await getProductDetails(productId.toString());
        
        if (!product || product.price === undefined || product.price === null || product.price === 0) {
           continue;
        }

        processedCount++;
        const currentPrice = product.price;

        // Find all users tracking this product
        const trackingUsers = activeProducts.filter(p => p.productId.toString() === productId.toString());

        for (const tracker of trackingUsers) {
          // Check target price
          const user = await import('../models/User.js').then(m => m.default.findOne({ firebaseUid: tracker.userId }));
          const threshold = user?.notificationPreferences?.priceDropThreshold || 0;
          const emailAlertsEnabled = user?.notificationPreferences?.emailAlerts ?? true;

          if (tracker.targetPrice && currentPrice <= tracker.targetPrice) {
            await Notification.create({
              userId: tracker.userId,
              type: 'TARGET_PRICE',
              title: 'Target Price Reached!',
              message: `${tracker.productName} has reached your target price of ₹${tracker.targetPrice}. Current price is ₹${currentPrice}.`,
              productId
            });
            
            if (emailAlertsEnabled && currentPrice <= (tracker.targetPrice - threshold)) {
              console.log(`[EMAIL ALERT] To: ${user.email} - ${tracker.productName} has reached your target price of ₹${tracker.targetPrice}. Current price is ₹${currentPrice}.`);
            }
          } else if (previousPrice !== null && currentPrice < previousPrice) {
            // Check for normal price drop
            const dropAmount = previousPrice - currentPrice;
            await Notification.create({
              userId: tracker.userId,
              type: 'PRICE_DROP',
              title: 'Price Drop Alert',
              message: `${tracker.productName} has dropped by ₹${dropAmount.toFixed(2)}! New price: ₹${currentPrice}.`,
              productId
            });
            
            if (emailAlertsEnabled && dropAmount >= threshold) {
              console.log(`[EMAIL ALERT] To: ${user.email} - ${tracker.productName} has dropped by ₹${dropAmount.toFixed(2)}! New price: ₹${currentPrice}.`);
            }
          }
        }
        
      } catch (err) {
        console.error(`Error fetching price for product ${productId}:`, err.message);
      }
    }
    
    return { success: true, message: `Successfully processed ${processedCount} products.` };
  } catch (error) {
    console.error('Price tracking job error:', error);
    throw error;
  }
};
