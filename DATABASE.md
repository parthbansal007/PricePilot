# PricePilot Database Documentation

> **Note:** The full architectural specification with index definitions and caching strategies is maintained in [docs/DATABASE.md](file:///c:/Users/Parth/Documents/AI%20Shopping%20Assistant/docs/DATABASE.md).

**Database:** MongoDB Atlas  
**ODM:** Mongoose  
**Distributed Caching:** Redis (`REDIS_URL`) or MongoDB TTL Collections (`cacheentries`) with In-Memory fallback

## Core Collections Summary
1. `users` - Firebase authenticated profiles, budget preferences & notification settings
2. `canonicalproducts` - Brand & model normalized master catalog across Indian retailers
3. `products` - Real-time discovered merchant items and enriched specs
4. `pricehistories` - Historical price series combining crawler observations and Keepa 90-day backfill
5. `trackedproducts` - User price drop targets and active alerts
6. `priceprotections` - Post-purchase price drop claims and invoice records
7. `wallets` - User saved payment methods (bank issuer & tier only, no card numbers)
8. `offerrules` - Bank card instant discounts, cashback, and EMI rules
9. `budgets` & `expenses` - Personal finance tracking and impulse expense tagging
10. `notifications` - Multi-channel alert logs (In-App, Resend, Telegram, FCM)
11. `cacheentries` - TTL-indexed document cache (TTL: 6–24 hours)
12. `joblocks` - Distributed locks for horizontal cron execution safety
