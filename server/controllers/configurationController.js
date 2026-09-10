import * as configurationService from '../services/configurationService.js';

// @desc    Get Better Configurations
// @route   GET /api/products/:id/better-configurations
// @access  Private
export const getBetterConfigurations = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const data = await configurationService.getBetterConfigurations(id, userId);
    res.json(data);
  } catch (error) {
    console.error('Better configurations error:', error.message);
    res.status(500).json({ message: 'Server error while finding configurations.' });
  }
};
