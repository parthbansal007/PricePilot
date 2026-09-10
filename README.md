# AI Shopping Assistant / PricePilot AI

PricePilot is an intelligent shopping assistant that tracks product prices, manages your budget, provides personalized AI purchasing advice, and helps you save money.

## Features
- **Product Search & Comparison**: Uses Google Shopping API (via SerpApi) to search for products and find the best deals across retailers.
- **Price Tracking**: Periodically checks prices in the background.
- **Price History**: Visualizes the price trend over time.
- **Budget Planner**: Track expenses and manage your shopping budget.
- **AI Advisor (Smart Buy Score)**: Integrates Google Gemini API to give personalized buying recommendations based on price history and budget.
- **AWS-Ready**: Designed for deployment on AWS App Runner and Amplify with S3 storage and CloudWatch monitoring.

## Technology Stack
- **Frontend**: React, Vite, Tailwind CSS, Recharts
- **Backend**: Node.js, Express
- **Database**: MongoDB Atlas (Mongoose)
- **Authentication**: Firebase Authentication
- **External APIs**: SerpApi, Google Gemini

## Architecture
See `AWS_DEPLOYMENT.md` and `ALTERNATIVE_DEPLOYMENT.md` for detailed architecture flows.

## Environment Variables
Copy `.env.example` to `.env` (in the root for frontend, and in `server/` for backend) and fill in your keys.

## Quick Start (Local Development)

### Frontend
```bash
npm install
npm run dev
```

### Backend
```bash
cd server
npm install
npm run dev
```
By default, the backend will run on `http://localhost:5000`. Ensure `VITE_API_BASE_URL=http://localhost:5000/api` is set for the frontend.

## Documentation
- [API Documentation](API.md)
- [Database Schema](DATABASE.md)
- [AWS Deployment Guide](AWS_DEPLOYMENT.md)
- [Alternative Deployment](ALTERNATIVE_DEPLOYMENT.md)
