import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchProducts, getProductDetails } from './productService.js';
import { calculatePersonalDecision } from '../controllers/decisionController.js';
import TrackedProduct from '../models/TrackedProduct.js';
import Expense from '../models/Expense.js';
import logger from '../utils/logger.js';

// Tool definitions for Gemini Function Calling
const agentToolDeclarations = [
  {
    name: 'search_products',
    description: 'Search for products across supported Indian retailers and get prices, ratings, and sellers.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Product name or search keywords (e.g. iPhone 16, Sony WH-1000XM5)' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_personal_decision',
    description: 'Get personalized buy recommendation, card optimization, and affordability assessment for a specific product ID.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productId: { type: 'STRING', description: 'Canonical product ID' },
        pinCode: { type: 'STRING', description: 'Optional 6-digit Indian PIN code' }
      },
      required: ['productId']
    }
  },
  {
    name: 'track_product',
    description: 'WRITE ACTION: Track a product and set a target price alert. Requires user confirmation before execution.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productId: { type: 'STRING', description: 'Product ID or Canonical Product ID to track' },
        productName: { type: 'STRING', description: 'Product title / name' },
        targetPrice: { type: 'NUMBER', description: 'Target price to trigger alert in INR' }
      },
      required: ['productId', 'targetPrice']
    }
  },
  {
    name: 'log_expense',
    description: 'WRITE ACTION: Record an expense or shopping purchase in the user budget. Requires user confirmation before execution.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Expense title or product name' },
        amount: { type: 'NUMBER', description: 'Expense amount in INR' },
        category: { type: 'STRING', description: 'Category e.g. Electronics, Shopping, Essentials' }
      },
      required: ['title', 'amount']
    }
  }
];

/**
 * Handle conversational assistant requests with function calling and strict write confirmation
 */
export async function handleConversation({
  userId,
  message,
  history = [],
  confirmedAction = null
}) {
  try {
    // 1. If user previously received a confirmation request and responded with approval:
    if (confirmedAction && confirmedAction.confirmed) {
      if (confirmedAction.action === 'track_product') {
        const { productId, productName, targetPrice } = confirmedAction.payload;
        let pName = productName;
        if (!pName) {
          try {
            const prod = await getProductDetails(productId);
            pName = prod.title || 'Product';
          } catch (_e) {
            pName = 'Product';
          }
        }

        let tracked = null;
        if (mongoose.connection && mongoose.connection.readyState === 1) {
          tracked = await TrackedProduct.findOneAndUpdate(
            { userId, productId },
            { productName: pName, targetPrice, active: true },
            { upsert: true, returnDocument: 'after' }
          );
        } else {
          tracked = { userId, productId, productName: pName, targetPrice, active: true };
        }

        return {
          status: 'SUCCESS',
          reply: `Confirmed! I am now tracking "${pName}" for you. You'll receive an alert when the price drops to or below ₹${Number(targetPrice).toLocaleString('en-IN')}.`,
          executedAction: { action: 'track_product', result: tracked }
        };
      }

      if (confirmedAction.action === 'log_expense') {
        const { title, amount, category = 'Shopping' } = confirmedAction.payload;
        let expense = null;
        if (mongoose.connection && mongoose.connection.readyState === 1) {
          expense = await Expense.create({
            userId,
            title,
            amount,
            category,
            date: new Date(),
            type: 'PURCHASE'
          });
        } else {
          expense = { userId, title, amount, category, date: new Date(), type: 'PURCHASE' };
        }

        return {
          status: 'SUCCESS',
          reply: `Done! I've logged the purchase of "${title}" (₹${Number(amount).toLocaleString('en-IN')}) under "${category}" in your monthly budget.`,
          executedAction: { action: 'log_expense', result: expense }
        };
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      // Deterministic conversational fallback
      return {
        status: 'SUCCESS',
        reply: `PricePilot AI Agent is operating in offline mode. You can search products, compare prices across Indian stores, and calculate personalized card decisions directly via the Search and Decision tabs.`
      };
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [{ functionDeclarations: agentToolDeclarations }]
    });

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{
            text: `You are PricePilot AI, a personalized shopping assistant for Indian shoppers.
You have access to tools for searching products, computing buy decisions, tracking price drops, and logging expenses.
IMPORTANT RULES:
1. Always be concise, helpful, and transparent.
2. For read actions (search_products, get_personal_decision), use tools proactively.
3. For write actions (track_product, log_expense), NEVER assume confirmation. Explain what you want to do and invite the user to confirm.
4. Current currency is Indian Rupee (₹).
`
          }]
        },
        {
          role: 'model',
          parts: [{ text: 'Understood. I am PricePilot AI, ready to assist Indian shoppers with real-time price comparisons, card-optimized decisions, and smart budget advice.' }]
        },
        ...history.slice(-6).map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.text || h.content || '' }]
        }))
      ]
    });

    // Send user message
    const result = await chat.sendMessage(message);
    const response = result.response;
    const functionCalls = response.functionCalls();

    if (!functionCalls || functionCalls.length === 0) {
      return {
        status: 'SUCCESS',
        reply: response.text()
      };
    }

    const call = functionCalls[0];
    const { name, args } = call;

    // Check if the model called a WRITE ACTION
    if (name === 'track_product') {
      return {
        status: 'REQUIRES_CONFIRMATION',
        action: 'track_product',
        payload: args,
        confirmationPrompt: `Would you like me to track "${args.productName || 'this item'}" and notify you when it drops below ₹${Number(args.targetPrice || 0).toLocaleString('en-IN')}?`,
        reply: `I can set up a price alert for "${args.productName || 'this item'}" at ₹${Number(args.targetPrice || 0).toLocaleString('en-IN')}. Please confirm below to proceed.`
      };
    }

    if (name === 'log_expense') {
      return {
        status: 'REQUIRES_CONFIRMATION',
        action: 'log_expense',
        payload: args,
        confirmationPrompt: `Would you like me to record an expense of ₹${Number(args.amount || 0).toLocaleString('en-IN')} for "${args.title}" under ${args.category || 'Shopping'}?`,
        reply: `I can record this ₹${Number(args.amount || 0).toLocaleString('en-IN')} expense in your budget. Please confirm below to proceed.`
      };
    }

    // READ ACTION: search_products
    if (name === 'search_products') {
      let searchData = [];
      try {
        const searchResults = await searchProducts(args.query);
        searchData = (searchResults.products || searchResults || []).slice(0, 4).map(p => ({
          id: p.id || p._id,
          title: p.title,
          price: p.price,
          retailer: p.retailer,
          rating: p.rating
        }));
      } catch (err) {
        logger.warn({ err: err.message }, 'Agent search tool failed');
        searchData = [{ error: 'Could not fetch live search results.' }];
      }

      // Return function response to model
      const secondResponse = await chat.sendMessage([
        {
          functionResponse: {
            name: 'search_products',
            response: { products: searchData }
          }
        }
      ]);

      return {
        status: 'SUCCESS',
        reply: secondResponse.response.text(),
        toolResults: searchData
      };
    }

    // READ ACTION: get_personal_decision
    if (name === 'get_personal_decision') {
      let decisionData = {};
      try {
        decisionData = await calculatePersonalDecision(userId, args.productId, args.pinCode);
      } catch (err) {
        logger.warn({ err: err.message }, 'Agent decision tool failed');
        decisionData = { error: 'Could not compute decision.' };
      }

      const secondResponse = await chat.sendMessage([
        {
          functionResponse: {
            name: 'get_personal_decision',
            response: { decision: decisionData }
          }
        }
      ]);

      return {
        status: 'SUCCESS',
        reply: secondResponse.response.text(),
        decision: decisionData
      };
    }

    return {
      status: 'SUCCESS',
      reply: response.text()
    };
  } catch (error) {
    logger.error({ error: error.message }, 'Error in handleConversation');
    return {
      status: 'ERROR',
      reply: 'I encountered an error processing your request. Please try again.',
      error: error.message
    };
  }
}

export default {
  handleConversation
};
