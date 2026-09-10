import Product from '../models/Product.js';
import User from '../models/User.js';
import Budget from '../models/Budget.js';
import Expense from '../models/Expense.js';
import { getProductDetails } from './productService.js';
import { getProductProvider } from '../providers/index.js';
import { explainBetterConfiguration } from './advisorService.js';

export const calculateConfigurationScore = (product, selectedProduct, preferences, budgetFit) => {
  let score = 50;

  // Preferences mapping
  const prefPrice = preferences?.price || 5;
  const prefPerformance = preferences?.performance || 5;

  // Price Value
  if (product.currentPrice < selectedProduct.currentPrice) {
    score += prefPrice * 2; // Cheaper is better for price preference
  } else if (product.currentPrice > selectedProduct.currentPrice) {
    score -= prefPrice * 2;
  }

  // Specification Value (Simplified deterministic check based on model/specs)
  // For GPUs
  if (product.specifications?.gpu && selectedProduct.specifications?.gpu) {
    const gpu1 = product.specifications.gpu.match(/\d{4}/);
    const gpu2 = selectedProduct.specifications.gpu.match(/\d{4}/);
    if (gpu1 && gpu2) {
       if (parseInt(gpu1[0]) > parseInt(gpu2[0])) score += prefPerformance * 3;
       if (parseInt(gpu1[0]) < parseInt(gpu2[0])) score -= prefPerformance * 3;
    }
  }

  // For RAM
  if (product.specifications?.ram && selectedProduct.specifications?.ram) {
    const ram1 = parseInt(product.specifications.ram);
    const ram2 = parseInt(selectedProduct.specifications.ram);
    if (!isNaN(ram1) && !isNaN(ram2)) {
      if (ram1 > ram2) score += prefPerformance * 2;
      if (ram1 < ram2) score -= prefPerformance * 2;
    }
  }

  // Budget Fit
  if (budgetFit) {
    score += 15;
  } else {
    score -= 30; // Exceeds budget is a heavy penalty
  }

  return Math.max(0, Math.min(100, score));
};

export const getBetterConfigurations = async (productId, userId) => {
  try {
    const selectedProduct = await getProductDetails(productId);
    if (!selectedProduct) throw new Error('Selected product not found');

    const user = await User.findById(userId);
    const preferences = user?.preferences || { price: 8, performance: 10 };

    const budget = await Budget.findOne({ userId });
    let remainingBudget = Infinity;
    if (budget) {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const expenses = await Expense.find({
        userId, date: { $gte: startOfMonth }, type: { $in: ['EXPENSE', 'PURCHASE'] }
      });
      const totalSpent = expenses.reduce((acc, exp) => acc + exp.amount, 0);
      remainingBudget = budget.monthlyLimit - totalSpent;
    }

    // Attempt to find similar products in MongoDB first based on brand/model
    // In a real scenario, we might use the provider to find similar models.
    const queryName = selectedProduct.brand ? selectedProduct.brand : selectedProduct.title.split(' ')[0];
    
    // We'll search DB for products with similar brand/model to avoid provider rate limits, 
    // or fetch from provider if DB is empty. Here we just fetch DB items.
    let candidates = await Product.find({
       _id: { $ne: productId },
       $text: { $search: selectedProduct.brand || queryName }
    }).limit(10);
    
    // If DB has no candidates, use provider
    if (candidates.length === 0) {
      const provider = getProductProvider();
      const rawResults = await provider.search(queryName);
      // We assume rawResults have similar structure.
      candidates = rawResults.filter(r => r.id !== productId && r.price).map(r => ({
         _id: r.id, title: r.title, currentPrice: r.price, image: r.image,
         specifications: r.specifications || {}, retailer: r.retailer
      }));
    }

    const recommendations = [];

    for (const candidate of candidates) {
      const isBudgetFit = candidate.currentPrice <= remainingBudget;
      const score = calculateConfigurationScore(candidate, selectedProduct, preferences, isBudgetFit);
      
      const priceDifference = candidate.currentPrice - selectedProduct.currentPrice;
      
      let reasons = [];
      if (priceDifference < 0) reasons.push(`Cheaper by ₹${Math.abs(priceDifference).toLocaleString()}`);
      else if (priceDifference > 0) reasons.push(`More expensive by ₹${Math.abs(priceDifference).toLocaleString()}`);
      else reasons.push('Same price');

      if (isBudgetFit) reasons.push('Fits within your remaining monthly budget');

      if (score > 60) {
        // Fetch AI explanation asynchronously or await it here. Awaiting for simplicity.
        const explanation = await explainBetterConfiguration(selectedProduct, candidate, score, reasons, remainingBudget);
        recommendations.push({
          product: candidate,
          score,
          priceDifference,
          reasons,
          explanation
        });
      }
    }

    // Sort by highest score
    recommendations.sort((a, b) => b.score - a.score);

    return {
      selectedProduct,
      remainingBudget,
      recommendations: recommendations.slice(0, 3)
    };
  } catch (error) {
    console.error('Configuration Finder error:', error);
    throw error;
  }
};
