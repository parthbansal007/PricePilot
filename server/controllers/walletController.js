import Wallet from '../models/Wallet.js';

// @desc    Get user's wallet cards, memberships, and EMI preferences
// @route   GET /api/wallet
// @access  Private
export const getWallet = async (req, res) => {
  try {
    const userId = req.user.uid;
    let wallet = await Wallet.findOne({ userId }).lean();

    if (!wallet) {
      wallet = {
        userId,
        cards: [],
        memberships: [],
        emiPreference: { preferredTenureMonths: 0, preferNoCostOnly: true }
      };
    }

    res.json(wallet);
  } catch (error) {
    console.error('Get wallet error:', error.message);
    res.status(500).json({ message: 'Failed to retrieve wallet information.' });
  }
};

// @desc    Update user's wallet cards, memberships, and EMI preferences
// @route   PUT /api/wallet
// @access  Private
export const updateWallet = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { cards = [], memberships = [], emiPreference = {} } = req.body;

    const wallet = await Wallet.findOneAndUpdate(
      { userId },
      {
        $set: {
          cards,
          memberships,
          emiPreference: {
            preferredTenureMonths: emiPreference.preferredTenureMonths || 0,
            preferNoCostOnly: emiPreference.preferNoCostOnly ?? true
          }
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(wallet);
  } catch (error) {
    console.error('Update wallet error:', error.message);
    res.status(500).json({ message: 'Failed to update wallet configuration.' });
  }
};

export default { getWallet, updateWallet };
