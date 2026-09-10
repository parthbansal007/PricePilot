import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    firebaseUid: {
      type: String,
      required: false,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    preferredCurrency: {
      type: String,
      default: 'INR',
    },
    monthlyBudget: {
      type: Number,
      default: 0,
    },
    preferences: {
      price: { type: Number, default: 5 },
      performance: { type: Number, default: 5 },
      battery: { type: Number, default: 5 },
      portability: { type: Number, default: 5 },
      storage: { type: Number, default: 5 },
    },
    notificationPreferences: {
      emailAlerts: { type: Boolean, default: true },
      priceDropThreshold: { type: Number, default: 0 }, // 0 means alert on any drop below target
    }
  },
  {
    timestamps: true,
  }
);

// We won't hash password in schema pre-save for simplicity since we might be using mock or just direct comparison for now,
// but for a real app we'd use bcrypt here. The user didn't request bcrypt specifically, but I'll add simple logic in controller.

const User = mongoose.model('User', userSchema);

export default User;
