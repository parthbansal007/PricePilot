import User from '../models/User.js';
import { storageService } from '../services/storageService.js';

// @desc    Get user profile
// @route   GET /api/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.uid;
    const user = await User.findOne({ firebaseUid: userId });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error while fetching profile.' });
  }
};

// @desc    Update user profile
// @route   PUT /api/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { name, preferredCurrency, profilePicture, monthlyBudget, notificationPreferences, preferences } = req.body;

    const user = await User.findOneAndUpdate(
      { firebaseUid: userId },
      { name, preferredCurrency, profilePicture, monthlyBudget, notificationPreferences, preferences },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error while updating profile.' });
  }
};

// @desc    Upload profile picture
// @route   POST /api/profile/picture
// @access  Private
export const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = await storageService.uploadFile(req.file);

    const user = await User.findOneAndUpdate(
      { firebaseUid: userId },
      { profilePicture: fileUrl },
      { new: true }
    );

    res.json({ message: 'Profile picture updated', profilePicture: fileUrl });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ message: 'Server error while uploading profile picture.' });
  }
};
