import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config({ override: true });
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import advisorRoutes from './routes/advisorRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import profileRoutes from './routes/profileRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public/uploads for LocalStorageProvider
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Serve static files from the React frontend build
app.use(express.static(path.join(__dirname, '../dist')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/advisor', advisorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile', profileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'PricePilot API is running' });
});

// Catch-all route to serve React app for non-API requests (fixes 404 on refresh)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    // Do not exit process to allow fallback in dev if DB is missing
    console.log("Running without database (mock mode)");
  }
};

connectDB().then(() => {

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT} (0.0.0.0)`);
  });
});
