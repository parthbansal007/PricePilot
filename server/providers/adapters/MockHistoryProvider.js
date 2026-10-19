import HistoryProvider from '../HistoryProvider.js';

export default class MockHistoryProvider extends HistoryProvider {
  constructor() {
    super('mock-history');
  }

  isAvailable() {
    return true;
  }

  async getHistory(identifier, options = {}) {
    const points = [];
    const now = Date.now();
    const basePrice = 69990;

    for (let day = 90; day >= 0; day -= 3) {
      const timestamp = new Date(now - day * 24 * 60 * 60 * 1000);
      const variance = Math.sin(day / 10) * 3000;
      points.push({
        timestamp,
        price: Math.round(basePrice + variance),
        currency: 'INR',
        retailer: 'Amazon',
        source: 'mock-history',
        sourceType: 'backfill'
      });
    }

    return points;
  }
}
