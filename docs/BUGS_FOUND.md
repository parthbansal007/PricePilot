# PricePilot AI: Bugs Identified and Resolved (Phase 1)

This document catalogs security vulnerabilities, correctness bugs, and reliability issues identified and fixed during **Phase 1: Security and Correctness**.

---

### Bug 1: Silent Default User Bypass in `authMiddleware`
* **Severity:** Critical (Authentication Bypass)
* **File:** `server/middleware/authMiddleware.js`
* **Description:** Whenever `FIREBASE_PROJECT_ID` or `adminAuth` was not present, the authentication middleware silently authenticated all requests as `{ uid: 'mock-uid-123', email: 'mock@example.com' }` without requiring any credentials.
* **Resolution:** Removed the silent fallback. Development bypass is now only permitted if `NODE_ENV === 'development'` **and** `ALLOW_DEV_AUTH_BYPASS === 'true'`. In all other cases, valid Firebase ID tokens are strictly required. Missing Firebase credentials in production will abort startup.

---

### Bug 2: Cron Webhook Timing Vulnerability and Query String Secret Leak
* **Severity:** High (Security & Access Control)
* **File:** `server/controllers/trackingController.js`
* **Description:** The price check cron trigger allowed the secret to be passed as a URL query parameter (`?secret=...`), which exposes credentials in web server logs, proxy caches, and browser histories. Furthermore, secret comparison used standard equality (`!==`), creating a potential timing side-channel.
* **Resolution:** Restricted secret delivery strictly to the `Authorization: Bearer <CRON_SECRET>` header. Implemented constant-time comparison using `crypto.timingSafeEqual` with SHA-256 digest buffers.

---

### Bug 3: GET Endpoint Mutation (Side Effect on `/api/products/:id`)
* **Severity:** High (Data Integrity & Architecture)
* **File:** `server/services/productService.js`
* **Description:** Calling `GET /api/products/:id` triggered `PriceHistory.create(...)` on every view. A product viewed 100 times in an hour produced 100 identical history records, distorting price tracking charts, averages, and database size.
* **Resolution:** Removed `PriceHistory.create` from `getProductDetails`. Price history is now recorded strictly during background ingestion runs.

---

### Bug 4: Non-Idempotent Price Tracking and Concurrent Job Overlap
* **Severity:** Medium (Resource Contention & Redundant Data)
* **File:** `server/jobs/priceTrackingJob.js`
* **Description:** Concurrent runs of `runPriceCheckJob()` could execute simultaneously if an external scheduler triggered multiple runs. History records were also added even when prices had not changed.
* **Resolution:** Created a MongoDB distributed lock (`JobLock`) with TTL to guarantee mutual exclusion. Ingestion was made idempotent: price history entries are only created if the price has changed from the previous entry or if more than 24 hours have elapsed since the last recorded offer.

---

### Bug 5: Unconditional Global DNS Override
* **Severity:** Medium (Networking & Compatibility)
* **File:** `server/server.js`
* **Description:** `dns.setServers(['8.8.8.8', '8.8.4.4'])` was executed unconditionally on startup. This broke internal DNS resolution in corporate proxies, Docker networks, and cloud VPCs.
* **Resolution:** Conditioned DNS override strictly on the environment variable `DNS_OVERRIDE === 'true'`.

---

### Bug 6: Unrestricted File Uploads (No Size Limits or MIME Validation)
* **Severity:** High (Denial of Service / Unrestricted File Upload)
* **File:** `server/routes/profileRoutes.js`
* **Description:** Multer was initialized with `storage: multer.memoryStorage()` without file size limits or MIME-type filtering. An attacker could upload arbitrary files of any size, exhausting server memory.
* **Resolution:** Implemented a strict 5MB file size limit (`limits: { fileSize: 5 * 1024 * 1024 }`) and a MIME-type filter permitting only image formats (`image/jpeg`, `image/png`, `image/webp`, `image/gif`).

---

### Bug 7: Silent Failures and Mock Fallbacks in Production
* **Severity:** High (Configuration & Operational Safety)
* **File:** `server/server.js`, `server/config/env.js`, `server/services/storageService.js`
* **Description:** The server previously fell back to mock data, local storage, or ran without a database connection when services were missing in production without throwing fatal errors.
* **Resolution:** Introduced a Zod-validated environment manager (`server/config/env.js`). Production mode now crashes immediately if Firebase credentials are missing, if `USE_MOCK_DATA === 'true'`, or if local storage is used without `ALLOW_LOCAL_STORAGE_IN_PROD === 'true'`. Exposes detailed fallback status on `/api/health`.

---

### Bug 8: Unvalidated Gemini Output and Score Invariant Violation
* **Severity:** High (AI Safety & Robustness)
* **File:** `server/services/advisorService.js`
* **Description:** Gemini responses were parsed with unstructured `JSON.parse` with no Zod schema validation, no automatic retry on syntax failure, and no programmatic guarantee that Gemini could not alter calculated Smart Buy Scores or verdicts.
* **Resolution:** Added a strict Zod schema (`adviceOutputSchema`) for Gemini responses, automatic single-retry with error logging, and graceful fallback to deterministic statistical analysis. Enforced that calculated scores and recommendations computed by the server engine overwrite any hallucinations.

---

### Bug 9: Broken Budget and Expense Totals in Dashboard Controller
* **Severity:** Medium (Business Logic & UI Correctness)
* **File:** `server/controllers/dashboardController.js`
* **Description:** `getDashboardMetrics` referenced `user?.monthlyBudget` rather than the `Budget` model's `monthlyLimit`. It also contained dead code attempting to reduce an absent `budget.expenses` array.
* **Resolution:** Unified budget calculation to inspect `Budget.monthlyLimit` (falling back to user profile), and queried the `Expense` collection for current month expenditures to compute accurate remaining budget balances.

---

### Bug 10: Inconsistent Search / Compare Query Parameters
* **Severity:** Low (API Consistency)
* **File:** `server/controllers/productController.js`, `server/routes/productRoutes.js`
* **Description:** The comparison route was checking `req.query.q` in the controller while other components and schemas expected `req.query.query`.
* **Resolution:** Updated `compareProducts` and the Zod validation schema to accept either `q` or `query` seamlessly.
