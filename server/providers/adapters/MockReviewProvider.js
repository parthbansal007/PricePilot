import ReviewProvider from '../ReviewProvider.js';

export default class MockReviewProvider extends ReviewProvider {
  constructor() {
    super('mock-reviews');
  }

  isAvailable() {
    return true;
  }

  async getReviews(_identifier, _options = {}) {
    return {
      source: 'Verified Buyers',
      rating: 4.6,
      count: 1420,
      snippets: [
        'Outstanding battery life, easily lasts through a full workday of coding.',
        'Display is vivid and bright enough for outdoor usage under sunlight.',
        'Runs whisper quiet with minimal thermal throttling under sustained load.',
        'Speakers are surprisingly punchy and clear with good stereo separation.',
        'Key travel feels crisp and comfortable for long typing sessions.'
      ]
    };
  }
}
