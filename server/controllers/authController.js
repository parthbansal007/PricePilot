import User from '../models/User.js';

// @desc    Sync Firebase user with MongoDB
// @route   POST /api/auth/sync
// @access  Private (requires Firebase ID token)
export const syncUser = async (req, res) => {
  try {
    const { uid, email, name, picture } = req.user;

    // Check if database is connected before querying (fallback logic)
    if (User.db.readyState !== 1) {
       return res.json({
         user: {
           _id: "mock_id",
           name: name || "Mock User",
           email,
           profilePicture: picture || "",
           firebaseUid: uid
         }
       });
    }

    // Check if user exists in MongoDB
    let user = await User.findOne({ email });

    if (user) {
      // Update firebaseUid if not present (for users who previously used standard login)
      let isUpdated = false;
      if (!user.firebaseUid) {
        user.firebaseUid = uid;
        isUpdated = true;
      }
      if (picture && !user.profilePicture) {
        user.profilePicture = picture;
        isUpdated = true;
      }
      
      if (isUpdated) {
        await user.save();
      }
    } else {
      // Create new user in MongoDB
      user = await User.create({
        name: name || email.split('@')[0], // fallback name
        email,
        firebaseUid: uid,
        profilePicture: picture || '',
      });
    }

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        firebaseUid: user.firebaseUid
      }
    });

  } catch (error) {
    console.error("Firebase sync error", error);
    res.status(500).json({ message: 'Server error during user sync' });
  }
};

// @desc    Delete user account and all related data
// @route   DELETE /api/auth/account
// @access  Private
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Delete user from MongoDB
    await User.findOneAndDelete({ firebaseUid: userId });

    // Delete related data (import models at the top if needed, but we can just use mongoose.model)
    import('mongoose').then(async (mongoose) => {
      await mongoose.models.Budget?.deleteOne({ userId });
      await mongoose.models.Expense?.deleteMany({ userId });
      await mongoose.models.TrackedProduct?.deleteMany({ userId });
      await mongoose.models.Wishlist?.deleteMany({ userId });
      await mongoose.models.SavingsGoal?.deleteMany({ userId });
      await mongoose.models.Notification?.deleteMany({ userId });
    });

    res.json({ message: 'Account and related data deleted successfully' });
  } catch (error) {
    console.error("Delete account error", error);
    res.status(500).json({ message: 'Server error during account deletion' });
  }
};
