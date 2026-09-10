require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
const prompt = `
    You are an AI Shopping Assistant named PricePilot.
    User asks: "Can you analyze this product and tell me if I should buy it now?"
    
    Context:
    User has a monthly budget of 10000. They have spent 0 and have 10000 remaining.
    Product: Mock Product. Current price: 500.
    Price history available. Lowest: 400, Highest: 600, Average: 500.00. Trend: STABLE. Price Drop: 0.
    Calculated Smart Buy Score: 50/100
    Calculated Recommendation: CONSIDER
    
    Based ONLY on the provided price history facts and budget, provide a structured shopping advice response.
    DO NOT invent prices or historical data. You are advising the user based on the context above.

    Return a JSON object strictly matching this schema:
    {
      "recommendation": "BUY_NOW",
      "smartBuyScore": 50,
      "explanation": "Brief advice overview...",
      "priceAssessment": "Evaluation of current price vs history...",
      "trendAssessment": "Evaluation of recent trend...",
      "budgetAssessment": "Evaluation of affordability...",
      "caution": "Any risks or reasons to wait...",
      "alternatives": [
        {
          "name": "Alternative Product Name",
          "reason": "Why consider this over the original",
          "price": 0
        }
      ]
    }
`;

model.generateContent({
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  generationConfig: {
    responseMimeType: 'application/json',
  }
}).then(res => console.log(res.response.text())).catch(err => console.error(err));
