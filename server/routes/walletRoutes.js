import express from 'express';
import { getWallet, updateWallet } from '../controllers/walletController.js';
import { protect } from '../middleware/authMiddleware.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { z } from 'zod';

const router = express.Router();

const updateWalletSchema = {
  body: z.object({
    cards: z.array(
      z.object({
        id: z.string().min(1),
        bank: z.string().min(1),
        network: z.enum(['Visa', 'Mastercard', 'RuPay', 'Amex', 'Other']).default('Visa'),
        type: z.enum(['Credit', 'Debit']),
        name: z.string().min(1),
        last4: z.string().optional()
      })
    ).optional(),
    memberships: z.array(
      z.object({
        id: z.string().min(1),
        program: z.string().min(1),
        active: z.boolean().default(true)
      })
    ).optional(),
    emiPreference: z.object({
      preferredTenureMonths: z.number().min(0).max(36).default(0),
      preferNoCostOnly: z.boolean().default(true)
    }).optional()
  })
};

router.use(apiLimiter);
router.use(protect);

router.route('/')
  .get(getWallet)
  .put(validateRequest(updateWalletSchema), updateWallet);

export default router;
