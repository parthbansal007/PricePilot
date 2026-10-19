# PricePilot AI - API Reference Documentation

**Version:** 2.0 (Phase 6 Final)  
**Base URL:** `/api`  
**Authentication:** Firebase ID Token in `Authorization: Bearer <token>` header for all authenticated routes.

---

## 1. System & Operations

### `GET /api/health`
System operational status, active integrations, cache tier, and circuit breaker metrics.
* **Auth:** None
* **Response `200 OK`:**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-19T10:15:00.000Z",
    "uptime": 12450.5,
    "environment": "production",
    "cacheBackend": "mongodb",
    "enabledIntegrations": ["serpapi", "serper", "gemini", "resend"],
    "activeFallbackMode": false,
    "quotaUsage": {
      "serpapi": { "callsThisMonth": 42, "quota": 100, "tokensRemaining": 58, "circuitState": "CLOSED" }
    }
  }
  ```

### `POST /api/cron/check-prices`
Scheduled cron webhook triggered to check tracked product drops and price protection claims.
* **Auth:** Bearer Token via `Authorization: Bearer <CRON_SECRET>`
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Cron check completed",
    "summary": { "trackedChecked": 15, "dropsAlerted": 2, "priceProtectionsChecked": 5, "claimsDetected": 1 }
  }
  ```

---

## 2. Authentication & Profiles

### `POST /api/auth/sync`
Synchronizes Firebase authenticated user into MongoDB.
* **Auth:** Required
* **Body:** None (extracts UID, email, name from verified JWT)
* **Response `200 OK`:** `{ "user": { "id": "...", "email": "...", "name": "...", "monthlyBudget": 50000 } }`

### `GET /api/profile`
* **Auth:** Required
* **Response `200 OK`:** User profile with preferences and default settings.

### `PUT /api/profile`
* **Auth:** Required
* **Body:** `{ "name": "string", "preferredCurrency": "INR", "monthlyBudget": 60000 }`
* **Response `200 OK`:** Updated profile object.

### `POST /api/profile/picture`
* **Auth:** Required
* **Content-Type:** `multipart/form-data` (field: `picture`)
* **Response `200 OK`:** `{ "profilePicture": "https://..." }`

---

## 3. Product Discovery & Comparison

### `GET /api/products/search`
Queries multi-provider discovery layer (SerpApi, Serper, SearchApi, DataForSEO) with deduplication, brand/model extraction, and accessory filtering.
* **Auth:** Optional
* **Query Parameters:**
  * `q` (required): Product search text (e.g., `MacBook Air M3`)
  * `category` (optional): `laptops` | `phones` | `headphones` | `monitors`
  * `minPrice`, `maxPrice` (optional): Numeric price bounds
  * `provider` (optional): `serpapi` | `serper` | `searchapi` | `dataforseo` | `mock`
* **Response `200 OK`:**
  ```json
  {
    "query": "macbook air m3",
    "count": 6,
    "products": [
      {
        "id": "serp_abc123",
        "title": "Apple MacBook Air 13-inch M3 (8GB, 256GB SSD) - Space Grey",
        "brand": "Apple",
        "model": "MacBook Air",
        "price": 104900,
        "currency": "INR",
        "retailer": "Amazon.in",
        "productUrl": "https://www.amazon.in/dp/B0CX23V25K",
        "isDirectRetailerUrl": true,
        "rating": 4.8,
        "matchScore": 95
      }
    ],
    "cacheHit": false,
    "providerUsed": "serpapi"
  }
  ```

### `GET /api/products/compare`
Cross-retailer price comparison for a specific product query.
* **Auth:** Optional
* **Query Parameters:** `q` (required)
* **Response `200 OK`:**
  ```json
  {
    "canonicalProduct": { "title": "Apple iPhone 16 128GB Teal", "brand": "Apple" },
    "offers": [
      { "retailer": "Amazon.in", "price": 79900, "inStock": true, "productUrl": "..." },
      { "retailer": "Flipkart", "price": 78990, "inStock": true, "productUrl": "..." },
      { "retailer": "Croma", "price": 79900, "inStock": true, "productUrl": "..." }
    ],
    "bestOffer": { "retailer": "Flipkart", "price": 78990, "savingsAgainstMRP": 3000 }
  }
  ```

### `GET /api/products/:id`
Retrieves product details, normalized Icecat specifications, and Smart Buy Score V2.
* **Auth:** Optional
* **Response `200 OK`:** Product detail with `smartBuyScore` breakdown (0-100, verdict `BUY_NOW` | `BUY` | `WAIT` | `DO_NOT_BUY`).

### `GET /api/products/:id/history`
Historical price series combining real-time observations and Keepa 90-day backfill.
* **Auth:** Optional
* **Query Parameters:** `days` (default 90)
* **Response `200 OK`:** Array of `{ timestamp, price, currency, retailer, sourceType }`.

### `GET /api/products/:id/reviews`
Synthesized review intelligence, fake review detection score, and aspect sentiments.
* **Auth:** Optional
* **Response `200 OK`:**
  ```json
  {
    "overallRating": 4.6,
    "reviewCount": 1420,
    "authenticityScore": 92,
    "fakeReviewVerdict": "HIGH_CONFIDENCE_GENUINE",
    "pros": ["Outstanding battery endurance", "Crisp Liquid Retina display"],
    "cons": ["Base 8GB RAM memory bottleneck"],
    "aspectScores": { "battery": 94, "performance": 91, "display": 96, "value": 82 }
  }
  ```

### `GET /api/products/:id/configurations`
Alternative configuration suggestions: Refurbished / Open-Box and Same-Price Better-Spec options.
* **Auth:** Optional
* **Response `200 OK`:**
  ```json
  {
    "refurbishedOptions": [
      { "title": "Apple MacBook Air M3 (Renewed Excellent)", "price": 89900, "savings": 15000, "condition": "Refurbished - Grade A" }
    ],
    "betterSpecAlternatives": [
      { "title": "Lenovo Legion Slim 5 16\" Ryzen 7 7840HS 16GB 1TB RTX 4060", "price": 105990, "upgradeReason": "2x RAM and dedicated RTX 4060 GPU at same price point" }
    ]
  }
  ```

---

## 4. Personal Buy Decision Engine

### `POST /api/decision`
Deterministic calculation of personalized affordability, card-specific discounts, EMI breakdown, festival calendar awareness, and drop probability wait forecast.
* **Auth:** Required
* **Body:**
  ```json
  {
    "productId": "string",
    "price": 64999,
    "retailer": "Amazon.in",
    "category": "phones",
    "tenureMonths": 6,
    "urgency": "medium"
  }
  ```
* **Response `200 OK`:**
  ```json
  {
    "verdict": "BUY_WITH_CARD",
    "headline": "Prime Card drops this to ₹61,749 — Best time to purchase",
    "effectivePrice": {
      "basePrice": 64999,
      "bestCardApplied": "Amazon Pay ICICI Credit Card",
      "discountAmount": 3250,
      "netPrice": 61749,
      "emiOption": { "monthlyInstallment": 10291, "tenureMonths": 6, "noCostEmi": true }
    },
    "affordability": {
      "isAffordable": true,
      "budgetImpactPercent": 35.2,
      "remainingMonthlyDisposable": 42000
    },
    "waitForecaster": {
      "recommendation": "BUY",
      "pDropNext7Days": 0.12,
      "pDropNext14Days": 0.22,
      "upcomingFestival": { "name": "Diwali Great Indian Festival", "daysAway": 24, "historicalAvgDiscount": 14 }
    }
  }
  ```

---

## 5. Wallet & Payment Method Optimization

### `GET /api/wallet`
Lists user's saved payment methods (cards, UPI, netbanking).
* **Auth:** Required
* **Response `200 OK`:** Array of cards (stores only issuer, card name, network, and rewards variant).

### `POST /api/wallet`
Add a payment card to user's wallet.
* **Auth:** Required
* **Body:**
  ```json
  {
    "bank": "HDFC",
    "cardName": "Millennia",
    "cardType": "credit",
    "network": "Visa"
  }
  ```
* **Response `201 Created`:** Created wallet card object.

### `DELETE /api/wallet/:id`
* **Auth:** Required
* **Response `200 OK`:** `{ "success": true }`

### `POST /api/wallet/scan-statement`
Uploads card statement (image/PDF) for Gemini Vision card-benefit extraction.
* **Auth:** Required
* **Content-Type:** `multipart/form-data` (field: `statement`)
* **Response `200 OK`:** `{ "detectedCards": [{ "bank": "SBI", "cardName": "Cashback", "network": "Visa" }] }`

---

## 6. Conversational AI Advisor

### `POST /api/advisor`
Interactive dialogue with Gemini 2.5 Flash agent equipped with tool calling and safe write boundaries.
* **Auth:** Required
* **Body:**
  ```json
  {
    "message": "Track iPhone 16 when it falls under 60000",
    "productId": "optional_id",
    "conversationHistory": []
  }
  ```
* **Response `200 OK` (when requiring confirmation):**
  ```json
  {
    "response": "I can set a price alert for Apple iPhone 16 at ₹60,000. Would you like me to confirm this action?",
    "pendingAction": {
      "actionId": "act_8841",
      "tool": "create_price_alert",
      "parameters": { "productId": "p_123", "targetPrice": 60000 },
      "requiresConfirmation": true
    }
  }
  ```

### `POST /api/advisor/execute-action`
Executes an explicit, user-approved action generated by the Conversational AI agent.
* **Auth:** Required
* **Body:** `{ "actionId": "act_8841", "confirmed": true }`
* **Response `200 OK`:** `{ "success": true, "result": { "trackedId": "trk_456" } }`

---

## 7. Price Tracking & Price Protection

### `GET /api/tracking`
* **Auth:** Required
* **Response `200 OK`:** Active and historical tracked products.

### `POST /api/tracking`
* **Auth:** Required
* **Body:** `{ "productId": "string", "productName": "string", "targetPrice": 45000 }`
* **Response `201 Created`:** TrackedProduct record.

### `DELETE /api/tracking/:id`
* **Auth:** Required
* **Response `200 OK`:** `{ "success": true }`

### `POST /api/tracking/price-protection`
Registers past purchases to monitor for post-purchase price drop claims.
* **Auth:** Required
* **Body:** `{ "productName": "string", "purchasePrice": 54999, "purchaseDate": "2026-10-01", "retailer": "Amazon.in", "policyWindowDays": 14 }`
* **Response `201 Created`:** PriceProtection record.

### `POST /api/tracking/scan-invoice`
Scans merchant invoice or receipt using Gemini Vision to auto-populate Price Protection claim.
* **Auth:** Required
* **Content-Type:** `multipart/form-data` (field: `invoice`)
* **Response `200 OK`:** Extracted invoice metadata `{ "productName": "...", "purchasePrice": 54999, "purchaseDate": "...", "retailer": "..." }`.

---

## 8. Budget & Expenses

### `GET /api/budget`
* **Auth:** Required
* **Response `200 OK`:** `{ "monthlyLimit": 50000, "totalSpent": 18400, "expenses": [...] }`

### `PUT /api/budget`
* **Auth:** Required
* **Body:** `{ "monthlyLimit": 60000 }`
* **Response `200 OK`:** Updated budget.

### `POST /api/budget/expenses`
* **Auth:** Required
* **Body:** `{ "amount": 2400, "category": "Electronics", "description": "USB-C Hub" }`
* **Response `201 Created`:** Created expense.

### `DELETE /api/budget/expenses/:id`
* **Auth:** Required
* **Response `200 OK`:** `{ "success": true }`

---

## 9. Notifications

### `GET /api/notifications`
* **Auth:** Required
* **Response `200 OK`:** Array of in-app notification events.

### `PATCH /api/notifications/read-all`
* **Auth:** Required
* **Response `200 OK`:** `{ "success": true }`

### `PATCH /api/notifications/:id/read`
* **Auth:** Required
* **Response `200 OK`:** `{ "success": true }`

### `POST /api/notifications/test-channel`
Sends a test alert across Resend (Email), Telegram, or FCM.
* **Auth:** Required
* **Body:** `{ "channel": "email" | "telegram" | "fcm", "target": "string" }`
* **Response `200 OK`:** `{ "success": true, "dispatchStatus": "DELIVERED" }`

---

## 10. Dashboard

### `GET /api/dashboard`
Aggregated overview containing total savings, tracked items, active notifications, and recent budget utilization.
* **Auth:** Required
* **Response `200 OK`:** `{ "stats": { "totalSaved": 8450, "trackedCount": 4, "alertsCount": 2 }, "recentActivities": [...] }`
