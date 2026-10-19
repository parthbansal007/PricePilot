# PricePilot API Documentation

> **Note:** The complete, in-depth API reference documentation with payload schemas and query options is maintained at [docs/API.md](file:///c:/Users/Parth/Documents/AI%20Shopping%20Assistant/docs/API.md).

## Authentication
Firebase ID Token required in `Authorization: Bearer <token>` header for all authenticated routes.

## Summary of Core Endpoints

### System & Health
- `GET /api/health` - Server health, cache backend, quota usage, and active integrations
- `POST /api/cron/check-prices` - Scheduled background price checker (secured by `CRON_SECRET`)

### Products & Comparison
- `GET /api/products/search?q=&category=&provider=` - Universal multi-provider product discovery
- `GET /api/products/compare?q=` - Cross-retailer price comparison
- `GET /api/products/:id` - Product details & Smart Buy Score V2
- `GET /api/products/:id/history` - Historical price points & Keepa backfill
- `GET /api/products/:id/reviews` - Synthesized review intelligence & fake review detection
- `GET /api/products/:id/configurations` - Refurbished and same-price better-spec alternatives

### Personal Buy Decision Engine
- `POST /api/decision` - Net effective price, card discounts, EMI breakdown, affordability check & wait forecast

### Wallet & Cards
- `GET /api/wallet` - List user saved cards
- `POST /api/wallet` - Add card (issuer & tier only, zero card numbers)
- `DELETE /api/wallet/:id` - Remove card
- `POST /api/wallet/scan-statement` - Extract card benefits via Gemini Vision

### AI Conversational Advisor
- `POST /api/advisor` - Multi-turn conversational shopping assistant with Gemini 2.5 Flash
- `POST /api/advisor/execute-action` - Execute confirmed agent write action

### Tracking & Price Protection
- `GET /api/tracking` - View tracked products
- `POST /api/tracking` - Track product target price
- `DELETE /api/tracking/:id` - Untrack product
- `POST /api/tracking/price-protection` - Register purchase for post-purchase price drop protection
- `POST /api/tracking/scan-invoice` - Parse receipt/invoice with Gemini Vision

### Budget & Expenses
- `GET /api/budget` - Monthly limit and expenses breakdown
- `PUT /api/budget` - Set monthly budget limit
- `POST /api/budget/expenses` - Record expense
- `DELETE /api/budget/expenses/:id` - Delete expense

### Notifications & Alerts
- `GET /api/notifications` - In-app notification center
- `PATCH /api/notifications/read-all` - Mark all notifications read
- `POST /api/notifications/test-channel` - Dispatch test alert (Resend, Telegram, FCM)

### Profile & Dashboard
- `GET /api/profile` - User profile
- `PUT /api/profile` - Update profile preferences
- `POST /api/profile/picture` - Upload avatar image
- `GET /api/dashboard` - Dashboard metrics & savings analytics
