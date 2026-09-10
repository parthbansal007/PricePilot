import { getAIAdvice as getAIAdviceService } from '../services/advisorService.js';

// @desc    Get AI advice and Smart Buy Score
// @route   POST /api/advisor
// @access  Private
export const getAIAdvice = async (req, res) => {
  try {
    const { message, productId } = req.body;
    const userId = req.user.uid;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const advice = await getAIAdviceService(message, productId, userId);
    res.json(advice);

  } catch (error) {
    console.error('AI Advisor error:', error.message);
    res.status(503).json({ message: error.message || 'AI advisor is temporarily unavailable.' });
  }
};
