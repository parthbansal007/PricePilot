# AWS Secrets Manager Setup

1. Open AWS Console and go to **Secrets Manager**.
2. Click **Store a new secret**.
3. Choose **Other type of secret**.
4. Add Key/Value pairs:
   - `MONGODB_URI`
   - `PRODUCT_SEARCH_API_KEY`
   - `GEMINI_API_KEY`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
5. Name it `pricepilot-prod-secrets`.
6. In App Runner, you can configure environment variables to pull directly from this Secret ARN.
