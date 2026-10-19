import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';

/**
 * Scan receipt/invoice using Gemini Vision and extract draft expense and warranty details
 */
export async function scanInvoiceImage({ buffer, base64, mimeType = 'image/jpeg' }) {
  let imgBase64 = base64;
  if (!imgBase64 && buffer) {
    imgBase64 = buffer.toString('base64');
  }

  if (!imgBase64) {
    throw new Error('Image data is required (buffer or base64)');
  }

  // Fallback if no Gemini API key configured
  if (!process.env.GEMINI_API_KEY) {
    logger.warn('GEMINI_API_KEY missing; returning mock invoice scan draft');
    const now = new Date();
    const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    return {
      status: 'PENDING_CONFIRMATION',
      draft: {
        retailer: 'Amazon India',
        invoiceNumber: 'INV-' + Math.floor(100000 + Math.random() * 900000),
        title: 'Electronics Purchase',
        amount: 24999,
        category: 'Electronics',
        purchaseDate: now.toISOString().split('T')[0],
        warrantyPeriodMonths: 12,
        warrantyExpiryDate: oneYearLater.toISOString().split('T')[0],
        items: [
          { name: 'Electronics Device', quantity: 1, unitPrice: 24999, totalPrice: 24999 }
        ],
        notes: 'Simulated scan result (Gemini offline fallback)'
      }
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `
      You are an expert invoice, receipt, and tax invoice scanner for Indian shoppers and retailers.
      Analyze this invoice/receipt image and extract structured expense and warranty information.
      
      Extract:
      1. retailer: Name of the merchant or store (e.g., "Amazon", "Flipkart", "Croma", "Reliance Digital", "Apple Store").
      2. invoiceNumber: Invoice, order, or receipt ID.
      3. title: Concise summary title for this expense (e.g. "Apple iPad 10th Gen", "Sony Headphones").
      4. amount: Total net payable amount in INR as a clean positive number.
      5. category: One of ["Electronics", "Appliances", "Shopping", "Essentials", "Groceries", "Home", "Other"].
      6. purchaseDate: Purchase or invoice date in YYYY-MM-DD format. Default to today if unreadable.
      7. warrantyPeriodMonths: Standard warranty duration in months (e.g. 12, 24, or 0 if none indicated).
      8. warrantyExpiryDate: Computed expiry date (purchaseDate + warrantyPeriodMonths) in YYYY-MM-DD format.
      9. items: Array of items [{ name, quantity, unitPrice, totalPrice }].
      10. notes: Any warranty terms or return policy mentioned on receipt.

      Return JSON strictly matching this schema:
      {
        "retailer": "string",
        "invoiceNumber": "string",
        "title": "string",
        "amount": 0,
        "category": "string",
        "purchaseDate": "YYYY-MM-DD",
        "warrantyPeriodMonths": 12,
        "warrantyExpiryDate": "YYYY-MM-DD",
        "items": [],
        "notes": "string"
      }
    `;

    const imagePart = {
      inlineData: {
        data: imgBase64,
        mimeType
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    let text = result.response.text().trim();
    if (text.startsWith('```json')) {
      text = text.replace(/^```json/, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(text);

    return {
      status: 'PENDING_CONFIRMATION',
      draft: {
        retailer: parsed.retailer || 'Retailer',
        invoiceNumber: parsed.invoiceNumber || '',
        title: parsed.title || 'Scanned Purchase',
        amount: Number(parsed.amount) || 0,
        category: parsed.category || 'Shopping',
        purchaseDate: parsed.purchaseDate || new Date().toISOString().split('T')[0],
        warrantyPeriodMonths: Number(parsed.warrantyPeriodMonths) || 0,
        warrantyExpiryDate: parsed.warrantyExpiryDate || null,
        items: Array.isArray(parsed.items) ? parsed.items : [],
        notes: parsed.notes || ''
      }
    };
  } catch (error) {
    logger.error({ error: error.message }, 'Gemini invoice scan error');
    throw new Error(`Failed to parse invoice: ${error.message}`);
  }
}

export default {
  scanInvoiceImage
};
