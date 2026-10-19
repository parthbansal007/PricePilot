import api from './api';

export interface WalletCard {
  id: string;
  bank: string;
  network: 'Visa' | 'Mastercard' | 'RuPay' | 'Amex' | 'Other';
  type: 'Credit' | 'Debit';
  name: string;
  last4?: string;
}

export interface WalletMembership {
  id: string;
  program: string;
  active: boolean;
}

export interface WalletData {
  userId?: string;
  cards: WalletCard[];
  memberships: WalletMembership[];
  emiPreference: {
    preferredTenureMonths: number;
    preferNoCostOnly: boolean;
  };
}

export const walletService = {
  getWallet: async (): Promise<WalletData> => {
    const response = await api.get('/wallet');
    return response.data;
  },

  updateWallet: async (data: Partial<WalletData>): Promise<WalletData> => {
    const response = await api.put('/wallet', data);
    return response.data;
  }
};

export default walletService;
