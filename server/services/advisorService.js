import { GoogleGenerativeAI } from '@google/generative-ai';
import PriceHistory from '../models/PriceHistory.js';
import Budget from '../models/Budget.js';
import Expense from '../models/Expense.js';
import { getProductDetails } from './productService.js';

export const calculatePriceStatistics = async (productId, currentPrice, budget, remainingBudget) => {
  let smartBuyScore = 50;
  let recommendation = 'CONSIDER';
  let factors = [];
  let priceContext = '';
  let average = 0;
  let lowest = currentPrice;
  let highest = currentPrice;
  let trend = 'STABLE';
  let priceDrop = 0;

  const history = await PriceHistory.find({ productId }).sort({ timestamp: 1 });

  if (history.length > 0) {
    const prices = history.map(h => h.price);
    lowest = Math.min(...prices);
    highest = Math.max(...prices);
    average = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    if (history.length >= 2) {
      const firstPrice = prices[0];
      const lastPrice = prices[prices.length - 1];
      if (lastPrice < firstPrice) {
        trend = 'DOWN';
        priceDrop = firstPrice - lastPrice;
      } else if (lastPrice > firstPrice) {
        trend = 'UP';
      }
    }
    
    priceContext = `Price history available. Lowest: ₹${lowest}, Highest: ₹${highest}, Average: ₹${average.toFixed(2)}. Trend: ${trend}. Price Drop: ₹${priceDrop}.`;
    
    if (currentPrice > 0) {
       let score = 50;
       
       if (currentPrice <= lowest) {
         score += 30;
         factors.push('At or below historical lowest price');
       } else if (currentPrice < average) {
         score += 15;
         factors.push('Below historical average');
       } else {
         score -= 20;
         factors.push('Above historical average');
       }

       if (budget) {
          if (currentPrice > remainingBudget) {
            score -= 30;
            factors.push('Exceeds remaining budget');
          } else {
            score += 10;
            factors.push('Fits within remaining budget');
          }
       }

       smartBuyScore = Math.min(Math.max(score, 0), 100);
       
       if (smartBuyScore <= 30) recommendation = 'WAIT';
       else if (smartBuyScore <= 60) recommendation = 'CONSIDER';
       else if (smartBuyScore <= 80) recommendation = 'BUY';
       else recommendation = 'BUY_NOW';
    }
  } else {
    priceContext = 'Not enough price history available yet.';
    factors.push('Insufficient historical data');
  }

  return { smartBuyScore, recommendation, factors, priceContext, historicalAverage: average, lowest, highest, trend, priceDrop };
};

export const getAIAdvice = async (message, productId, userId) => {
  let productContext = '';
  let budgetContext = '';
  let currentPrice = 0;

  const budget = await Budget.findOne({ userId });
  let remainingBudget = 0;
  let totalSpent = 0;
  if (budget) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const expenses = await Expense.find({
        userId, date: { $gte: startOfMonth }, type: { $in: ['EXPENSE', 'PURCHASE'] }
    });
    totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    remainingBudget = budget.monthlyLimit - totalSpent;
    budgetContext = `User has a monthly budget of ₹${budget.monthlyLimit}. They have spent ₹${totalSpent} and have ₹${remainingBudget} remaining.`;
  }

  let stats = {
    smartBuyScore: 50, recommendation: 'CONSIDER', factors: [], priceContext: '',
    historicalAverage: 0, lowest: 0, highest: 0, trend: 'STABLE', priceDrop: 0
  };

  if (productId) {
    try {
      const details = await getProductDetails(productId);
      currentPrice = details.price || 0;
      productContext = `Product: ${details.title}. Current price: ₹${currentPrice}.`;
    } catch (e) {
      productContext = `Product ID: ${productId}. (Details unavailable).`;
    }
    stats = await calculatePriceStatistics(productId, currentPrice, budget, remainingBudget);
  }

  if (!process.env.GEMINI_API_KEY) {
    return {
      recommendation: stats.recommendation, smartBuyScore: stats.smartBuyScore,
      explanation: "AI advisor is temporarily unavailable (Missing API Key). Displaying statistical analysis only.",
      factors: stats.factors, currentPrice, historicalAverage: stats.historicalAverage,
      priceAssessment: stats.priceContext, trendAssessment: stats.trend,
      budgetAssessment: budget ? (currentPrice <= remainingBudget ? "Within budget" : "Exceeds budget") : "No budget set",
      caution: "Recommendations based purely on historical algorithms, AI analysis unavailable."
    };
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    You are an AI Shopping Assistant named PricePilot. User asks: "${message}"
    Context: ${budgetContext} ${productContext} ${stats.priceContext}
    Calculated Smart Buy Score: ${stats.smartBuyScore}/100
    Calculated Recommendation: ${stats.recommendation}
    
    Based ONLY on the provided price history facts and budget, provide a structured shopping advice response.
    DO NOT invent prices or historical data.
    
    Return JSON strictly matching this schema:
    {
      "recommendation": "BUY_NOW", // BUY_NOW, BUY, WAIT, or CONSIDER
      "smartBuyScore": ${stats.smartBuyScore},
      "explanation": "Brief advice overview...",
      "priceAssessment": "Evaluation of current price vs history...",
      "trendAssessment": "Evaluation of recent trend...",
      "budgetAssessment": "Evaluation of affordability...",
      "caution": "Any risks or reasons to wait...",
      "alternatives": []
    }
  `;

  try {
    const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } });
    let textResponse = result.response.text();
    if (textResponse.startsWith('\`\`\`json')) textResponse = textResponse.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    const parsedResponse = JSON.parse(textResponse);
    return { ...parsedResponse, factors: stats.factors, currentPrice, historicalAverage: stats.historicalAverage };
  } catch (error) {
    return { recommendation: stats.recommendation, smartBuyScore: stats.smartBuyScore, explanation: "AI analysis failed.", factors: stats.factors, currentPrice, historicalAverage: stats.historicalAverage, priceAssessment: stats.priceContext, trendAssessment: stats.trend, budgetAssessment: "Unknown", caution: "AI generation failed.", alternatives: [] };
  }
};

export const explainBetterConfiguration = async (selectedProduct, alternativeProduct, score, reasons, remainingBudget) => {
  if (!process.env.GEMINI_API_KEY) {
    return "This alternative is recommended based on deterministic scoring of price, specifications, and budget fit.";
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    You are PricePilot AI. Explain why the alternative configuration is recommended over the user's selected product.
    Do NOT invent specifications or prices. Use ONLY the provided deterministic facts.
    
    Selected Product: ${selectedProduct.title} (Price: ₹${selectedProduct.currentPrice})
    Alternative Product: ${alternativeProduct.title} (Price: ₹${alternativeProduct.currentPrice})
    Value Score: ${score}/100
    Remaining Budget: ₹${remainingBudget}
    Reasons computed by backend: ${reasons.join(', ')}

    Provide a concise (2-3 sentences) explanation suitable for the UI under the "Why we recommend it" section.
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    return "Recommended due to a higher value score considering price and specs.";
  }
};
