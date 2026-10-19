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

// @desc    Conversational AI Shopping Agent with tool use and safety confirmations
// @route   POST /api/advisor/chat
// @access  Private
export const chatWithAgent = async (req, res) => {
  try {
    const { message, history, confirmedAction } = req.body;
    const userId = req.user.uid;

    if (!message && !confirmedAction) {
      return res.status(400).json({ message: 'Message or confirmedAction is required' });
    }

    const { handleConversation } = await import('../services/conversationalAgentService.js');
    const result = await handleConversation({
      userId,
      message,
      history: history || [],
      confirmedAction: confirmedAction || null
    });

    res.json(result);
  } catch (error) {
    console.error('Conversational Agent error:', error.message);
    res.status(500).json({ message: error.message || 'Conversational agent error' });
  }
};

