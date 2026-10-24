# PricePilot AI

> Universal, India-focused price comparison and personal buy decision engine.

PricePilot AI combines multi-provider e-commerce indexing, Keepa price history backfilling, bank card discount math, and Google Gemini 2.5 Flash intelligence to help Indian shoppers make mathematically sound buying decisions.

---

## 🌟 Key Features

### 1. Universal Product Discovery & Price Comparison
- **Resilient Multi-Provider Engine:** Queries SerpApi, Serper, SearchApi, and DataForSEO with automatic failover and circuit breaker protection.
- **Accurate Merchant Links:** Google redirect unwrapping with tracking/affiliate parameter stripping to ensure direct retailer destinations.
- **Accessory & Outlier Elimination:** Rejects phone cases, cables, and screen guards when searching for flagship phones or laptops.
- **Cuelinks Affiliate Monetization:** Dynamic affiliate link redirection supporting India's top retailers (Amazon, Flipkart, Croma, Reliance Digital, Vijay Sales).

### 2. Smart Buy Score V2 & Deal Honesty
- **Deterministic 0–100 Score:** Evaluates historical discount depth, volatility, and trend momentum on the server (never hallucinated).
- **Deal Honesty Engine:** Detects artificial pre-sale price hikes ("wash discounts") and inflated MRPs.
- **Indian Festival Sales Awareness:** Tracks upcoming major Indian sales (Diwali, Great Indian Festival, Big Billion Days, Republic Day) with drop probabilities.
- **Confidence Guardrails:** Transparent factor breakdown and insufficient-history warnings; low-confidence scores never emit an unqualified `BUY_NOW`.

### 3. Personal Buy Decision Engine & Card Optimizer
- **Net Effective Price Calculation:** Automatically checks user's saved payment methods (e.g. Amazon Pay ICICI 5% cashback, HDFC Millennia 5%, SBI Cashback) against active offer rules.
- **No-Cost EMI Breakdown:** Computes monthly installments and interest subvention across 3, 6, 9, and 12-month tenures.
- **Affordability Analysis:** Evaluates budget impact against monthly disposable income and warns of impulse purchases.
- **Wait Forecaster:** Calculates 7, 14, and 30-day historical price drop probabilities.

### 4. Financial Privacy & Safety
- **Zero Card Numbers:** PricePilot only records card issuer (e.g. HDFC) and tier (e.g. Millennia). CVVs, expiration dates, and 16-digit card numbers are never requested or stored.
- **Gemini Vision Document Parsing:** In-memory extraction of card benefits from statements and purchase details from invoices.

### 5. Conversational AI Shopping Advisor
- **Gemini 2.5 Flash Agent:** Multi-turn conversational interface for natural language shopping assistance.
- **Strict Write Confirmation Guardrails:** Agent requests explicit user confirmation before executing persistent actions (setting price alerts, recording expenses, tracking items).

### 6. Review Intelligence & Price Protection
- **Fake Review Detection:** Flags repetitive boilerplate reviews and calculates an Authenticity Score.
- **Price Protection Tracker:** Monitors post-purchase price drops during merchant return windows (7–14 days) to claim refunds.
- **Better Configurations:** Surfaces verified refurbished/renewed options and same-price higher-spec alternatives.

### 7. Multi-Channel Alert Dispatch
- Instant notification delivery via **In-App**, **Resend (Email)**, **Telegram Bot**, and **FCM (Web Push)** with automatic deduplication.

### 8. MV3 Browser Extension
- Manifest V3 browser extension located in `packages/extension/` providing instant price checks, Smart Buy Scores, and coupon injection directly on Amazon.in and Flipkart.com.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion, Lucide Icons, Recharts |
| **Backend** | Node.js (ES modules), Express 5, Mongoose |
| **Database** | MongoDB Atlas with TTL caching index, optional Redis cluster |
| **Authentication** | Firebase Authentication (Client SDK + Server Admin SDK) |
| **AI / Vision** | Google Gemini 2.5 Flash (`@google/genai`) |
| **Search Providers** | SerpApi, Serper, SearchApi, DataForSEO, Keepa (Amazon API) |
| **Testing & CI** | Node Test Runner (`node:test`), Playwright E2E, Oxlint, GitHub Actions |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ (recommended Node.js 22 LTS)
- MongoDB Atlas cluster URI or local MongoDB instance
- Firebase project credentials

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/parthbansal007/AI-Shopping-Assistant.git
cd "AI Shopping Assistant"
npm install
cd server && npm install && cd ..
```

### 2. Configure Environment Variables
Copy `.env.example` to both root and `server/`:
```bash
cp .env.example .env
cp .env.example server/.env
```
Fill in your credentials (see [.env.example](.env.example) for detailed parameter descriptions). For development without external API keys, set `USE_MOCK_DATA=true`.

### 3. Start Development Servers
**Backend:**
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

**Frontend:**
```bash
npm run dev
# Vite runs on http://localhost:5173
```

---

## 🚀 Production & Cloud Deployment

```bash
# Build frontend production bundle
npm run build

# Start full-stack production server (serves frontend bundle + backend APIs)
npm start

# Run code linter
npm run lint
```

---

## 📖 Detailed Documentation

- [API Reference](docs/API.md) - Endpoints, payload schemas, and response examples
- [Database Architecture](docs/DATABASE.md) - Mongoose schemas, collections, and indexes
- [Integrations & Providers](docs/INTEGRATIONS.md) - Discovery adapters, Keepa, Icecat, and Cuelinks docs
- [Legal & Compliance](docs/LEGAL.md) - ASCI affiliate disclosure, scraping compliance, and data privacy
- [Provider Benchmark Report](docs/reports/provider-benchmark.md) - Real-world benchmark of search indexers

---

## 📄 License
This project is licensed under the MIT License. Technical specifications powered by [Open Icecat](https://icecat.biz) under the Open Product License.
