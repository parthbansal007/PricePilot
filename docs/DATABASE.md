# PricePilot AI - Database & Schema Architecture

**Database Engine:** MongoDB (via Mongoose ORM)  
**Caching Strategy:** Dual-tier Hybrid (Redis when `REDIS_URL` is set, otherwise MongoDB `cacheentries` with TTL index, backed by in-memory LRU)

---

## Collections & Schemas

### 1. `users` (Model: `User`)
Stores synchronized Firebase authentication profiles and multi-channel notification preferences.
* `firebaseUid` (String, unique, indexed) - Firebase Auth identifier
* `email` (String, required, lowercase, indexed)
* `name` (String)
* `profilePicture` (String)
* `preferredCurrency` (String, default: 'INR')
* `monthlyBudget` (Number, default: 50000)
* `notificationPreferences`:
  * `email` (Boolean, default: true)
  * `telegram` (Boolean, default: false)
  * `telegramChatId` (String)
  * `push` (Boolean, default: true)
  * `fcmToken` (String)
  * `sms` (Boolean, default: false)
  * `phoneNumber` (String)
* `timestamps` (createdAt, updatedAt)

---

### 2. `canonicalproducts` (Model: `CanonicalProduct`)
Stores normalized product master records across fragmented Indian retailers.
* `canonicalTitle` (String, required, indexed)
* `brand` (String, indexed)
* `model` (String)
* `category` (String, enum: `laptops`, `phones`, `headphones`, `monitors`, `other`)
* `aliases` ([String]) - Common merchant title variations
* `matchedOffers` [Subdocument]:
  * `retailer` (String)
  * `url` (String)
  * `price` (Number)
  * `lastSeen` (Date)
* `lowestHistoricalPrice` (Number)
* `highestHistoricalPrice` (Number)
* `medianHistoricalPrice` (Number)

---

### 3. `products` (Model: `Product`)
Stores individual product listings discovered via external providers.
* `externalId` (String, indexed)
* `title` (String, required)
* `brand` (String)
* `model` (String)
* `category` (String)
* `image` (String)
* `retailer` (String, indexed)
* `currentPrice` (Number, required)
* `mrp` (Number)
* `rating` (Number)
* `reviewCount` (Number)
* `productUrl` (String)
* `specs` (Map / Object) - Enriched via Icecat / scraper
* `lastUpdated` (Date, default: Date.now)

---

### 4. `pricehistories` (Model: `PriceHistory`)
Stores historical price observations for trend forecasting and Smart Buy Score.
* `productId` (String, required, indexed)
* `price` (Number, required)
* `currency` (String, default: 'INR')
* `retailer` (String)
* `timestamp` (Date, default: Date.now)
* `sourceType` (String, enum: `realtime`, `keepa`, `manual`, default: `realtime`)
* **Compound Index:** `{ productId: 1, timestamp: -1 }`

---

### 5. `trackedproducts` (Model: `TrackedProduct`)
User-configured price drop alerts.
* `userId` (String, required, indexed)
* `productId` (String, required)
* `productName` (String, required)
* `targetPrice` (Number, required)
* `currentPrice` (Number)
* `active` (Boolean, default: true)
* `createdAt` (Date, default: Date.now)
* **Compound Index:** `{ userId: 1, active: 1 }`

---

### 6. `priceprotections` (Model: `PriceProtection`)
Tracks post-purchase price drops within merchant return/protection windows.
* `userId` (String, required, indexed)
* `productName` (String, required)
* `purchasePrice` (Number, required)
* `purchaseDate` (Date, required)
* `retailer` (String, required)
* `currentPrice` (Number)
* `potentialRefund` (Number, default: 0)
* `policyWindowDays` (Number, default: 14)
* `claimed` (Boolean, default: false)
* `createdAt` (Date, default: Date.now)

---

### 7. `wallets` (Model: `Wallet`)
Payment methods and cards for automatic card-discount calculations (zero card numbers stored).
* `userId` (String, required, indexed)
* `bank` (String, required) - e.g., 'HDFC', 'ICICI', 'SBI', 'Axis'
* `cardName` (String, required) - e.g., 'Millennia', 'Amazon Pay', 'Flipkart Axis'
* `cardType` (String, enum: `credit`, `debit`, default: `credit`)
* `network` (String, enum: `Visa`, `Mastercard`, `RuPay`, `Amex`, `Diners`)
* `isPrimary` (Boolean, default: false)
* `createdAt` (Date, default: Date.now)

---

### 8. `offerrules` (Model: `OfferRule`)
Pre-seeded and dynamic bank card instant discounts, cashback, and EMI rules.
* `bank` (String, required, indexed)
* `cardType` (String, enum: `credit`, `debit`, `all`)
* `retailer` (String, indexed) - e.g., 'amazon', 'flipkart', 'all'
* `discountPercent` (Number)
* `flatDiscount` (Number)
* `maxDiscount` (Number)
* `minSpend` (Number)
* `noCostEmiTenures` ([Number]) - e.g., [3, 6, 9]
* `isVerified` (Boolean, default: true)
* `validUntil` (Date)

---

### 9. `budgets` & `expenses` (Models: `Budget`, `Expense`)
* `Budget`: User monthly spending target.
  * `userId` (String, required, indexed)
  * `monthlyLimit` (Number, required)
* `Expense`: Individual categorized expense.
  * `userId` (String, required, indexed)
  * `amount` (Number, required)
  * `category` (String, required)
  * `description` (String)
  * `date` (Date, default: Date.now)
  * `isImpulse` (Boolean, default: false)

---

### 10. `notifications` (Model: `Notification`)
In-app and multi-channel dispatched notification records.
* `userId` (String, required, indexed)
* `type` (String, enum: `PRICE_DROP`, `TARGET_PRICE`, `PRICE_PROTECTION`, `SYSTEM`, `ADVISOR`)
* `title` (String, required)
* `message` (String, required)
* `read` (Boolean, default: false)
* `channelsDispatched` ([String]) - e.g., `['in_app', 'resend', 'telegram']`
* `createdAt` (Date, default: Date.now)
* **Compound Index:** `{ userId: 1, read: 1, createdAt: -1 }`

---

### 11. `cacheentries` (Model: `CacheEntry`)
MongoDB TTL-backed distributed cache fallback when Redis is absent.
* `key` (String, required, unique, indexed)
* `value` (Mixed / Object)
* `expiresAt` (Date, required, indexed with `{ expireAfterSeconds: 0 }`)
* `accessCount` (Number, default: 1)
* `lastAccessedAt` (Date, default: Date.now)

---

### 12. `joblocks` (Model: `JobLock`)
Distributed lock ensuring cron executions and price checking don't overlap across horizontal instances.
* `jobName` (String, required, unique, indexed)
* `lockedAt` (Date, required)
* `expiresAt` (Date, required)
* `lockedBy` (String, required)
