import api from './api';

export interface DecisionPayload {
  productId: string;
  pincode?: string;
}

export interface DecisionResponse {
  product: {
    id: string;
    title: string;
    brand: string;
    model?: string;
    image?: string;
    specifications?: Record<string, any>;
  };
  verdict: {
    decision: 'BUY_NOW' | 'BUY' | 'WAIT' | 'CONSIDER';
    headline: string;
    summary: string;
  };
  bestSeller: {
    retailer: string;
    listedPrice: number;
    effectivePrice: number;
    totalSavings: number;
    appliedRule?: {
      bank: string;
      cardName: string;
      discountType: string;
      savings: number;
      description: string;
      status: string;
      guaranteed: boolean;
      verificationNote: string;
    } | null;
    emiOption?: {
      tenureMonths: number;
      isNoCost: boolean;
      monthlyEmi: number;
      totalInterest: number;
    } | null;
    explanation: string;
    productUrl: string;
    isDirectRetailerUrl: boolean;
  };
  sellers: Array<{
    retailer: string;
    listedPrice: number;
    effectivePrice: number;
    totalSavings: number;
    appliedRule?: any;
    emiOption?: any;
    explanation: string;
    productUrl: string;
    isDirectRetailerUrl: boolean;
    availability: string;
  }>;
  affordability: {
    hasBudget: boolean;
    affordableNow: boolean;
    monthlyBudget: number;
    remainingBudget: number;
    effectivePrice: number;
    budgetImpactPercent: number;
    deficitAmount: number;
    earliestSafeDate: string;
    weeksToAfford: number;
    advice: string;
  };
  waitForecast: {
    dropProbability7Days: number;
    dropProbability14Days: number;
    dropProbability30Days: number;
    expectedPriceRange: { min: number; max: number };
    potentialSavings: number;
    recommendedAction: string;
    reason: string;
    confidence: string;
    backtestDataDays: number;
  };
  smartBuyScore: any;
  delivery?: {
    pincode: string;
    serviceable: boolean;
    estimatedDays?: string;
    error?: string;
  } | null;
  dataSources: any;
}

export const decisionService = {
  getDecision: async (payload: DecisionPayload): Promise<DecisionResponse> => {
    const response = await api.post('/decision', payload);
    return response.data;
  }
};

export default decisionService;
