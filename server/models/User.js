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
      telegramAlerts: { type: Boolean, default: false },
      pushAlerts: { type: Boolean, default: false },
      smsAlerts: { type: Boolean, default: false },
      whatsappAlerts: { type: Boolean, default: false },
      telegramChatId: { type: String, default: '' },
      fcmTokens: [{ type: String }],
      phoneNumber: { type: String, default: '' },
      priceDropThreshold: { type: Number, default: 0 }, // 0 means alert on any drop below target
      unsubscribed: { type: Boolean, default: false },
      unsubscribeToken: { type: String, default: () => Math.random().toString(36).substring(2) + Date.now().toString(36) }
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
