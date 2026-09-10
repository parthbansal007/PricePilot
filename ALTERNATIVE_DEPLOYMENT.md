# Alternative Deployment Guide

PricePilot is cloud-independent. You can easily deploy it outside of AWS.

## Architecture
- **Frontend**: Vercel or Netlify
- **Backend**: Render or Railway
- **Database**: MongoDB Atlas
- **Storage**: Local Disk (using `LocalStorageProvider`) or a 3rd party like Cloudinary.

## Steps
1. **Database**: Host MongoDB on Atlas.
2. **Backend (Render/Railway)**: 
   - Connect your GitHub repo.
   - Set Build Command: `npm install`
   - Set Start Command: `npm start` (make sure it points to `server.js`)
   - Set Environment Variables: `MONGODB_URI`, `PRODUCT_SEARCH_API_KEY`, `GEMINI_API_KEY`, `STORAGE_PROVIDER=local`.
3. **Frontend (Vercel/Netlify)**:
   - Connect your GitHub repo.
   - Set Build Command: `npm run build`
   - Set Environment Variables: `VITE_API_BASE_URL` (pointing to your Render/Railway backend URL) and `VITE_FIREBASE_*` variables.
