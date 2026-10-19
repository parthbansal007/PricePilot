# External Integrations Registry

This document records the official documentation, authentication methods, rate limits, pricing, and India regional support for all external services used or planned in **PricePilot AI**.

> [!IMPORTANT]
> **Operating Rule:** Every external integration in PricePilot AI must be:
> 1. **Optional** (enabled only if its env key exists).
> 2. **Behind an adapter interface** (`server/providers/` or `server/integrations/`).
> 3. **Time-limited** with timeouts and abort signals.
> 4. **Retried with exponential backoff**.
> 5. **Quota-tracked** against monthly allowances.
> 6. **Covered by a mock adapter** for offline and deterministic test suites.
> 7. **Never invent endpoints or response shapes**; record verified documentation URLs and dates checked. Any ambiguous interface is marked `UNVERIFIED`.

---

## Table of Contents
1. [Discovery Providers (SERP / Google Shopping)](#1-discovery-providers)
2. [Retailer-Direct Data](#2-retailer-direct-data)
3. [Price History Seed](#3-price-history-seed)
4. [Product Identity and Specs](#4-product-identity-and-specs)
5. [Affiliate Links and Coupons](#5-affiliate-links-and-coupons)
6. [Reviews and Ratings](#6-reviews-and-ratings)
7. [Gap Filling (Scraping)](#7-gap-filling-scraping)
8. [Artificial Intelligence (Gemini)](#8-artificial-intelligence-gemini)
9. [Alerts & Notifications](#9-alerts--notifications)
10. [Delivery & Logistics](#10-delivery--logistics)
11. [Infrastructure & Observability](#11-infrastructure--observability)

---

## 1. Discovery Providers

### 1.1 SerpApi Google Shopping
* **Status:** `VERIFIED`
* **Category:** Discovery
* **Documentation URL:** https://serpapi.com/google-shopping-api
* **Date Checked:** 2026-10-19
* **Authentication Method:** Query parameter `api_key` or HTTP Header `Authorization: Bearer <SERPAPI_KEY>`.
* **Primary Endpoints:**
  * Search: `GET https://serpapi.com/search.json?engine=google_shopping`
  * Immersive Product: `GET https://serpapi.com/search.json?engine=google_immersive_product&page_token=<TOKEN>`
  * Product Specs/Reviews: `GET https://serpapi.com/search.json?engine=google_product&product_id=<ID>`
* **Parameters for India:**
  * `gl`: `in`
  * `hl`: `en`
  * `google_domain`: `google.co.in`
  * `location`: e.g. `India` or city name
* **Rate Limits & Quota:**
  * Free tier: 100 searches/month.
  * Developer plan: 5,000 searches/month for $50 (~$0.01/search).
  * Rate limit: Up to 20 concurrent requests on standard plans.
* **Response Normalization Notes:**
  * `shopping_results[]`: contains `title`, `price`, `extracted_price`, `link`, `product_link`, `source`/`merchant`, `rating`, `thumbnail`.
  * `serpapi_immersive_product_api`: URL containing `page_token` for full merchant seller list.
* **Env Keys:** `SERPAPI_KEY` (alias: `PRODUCT_SEARCH_API_KEY`).

---

### 1.2 Serper.dev (Google Shopping)
* **Status:** `VERIFIED`
* **Category:** Discovery (Backup SERP)
* **Documentation URL:** https://serper.dev/playground (and https://google.serper.dev/shopping)
* **Date Checked:** 2026-10-19
* **Authentication Method:** Header `X-API-KEY: <SERPER_KEY>`.
* **Primary Endpoint:**
  * `POST https://google.serper.dev/shopping`
* **Request Payload:**
  ```json
  {
    "q": "iPhone 16 128GB",
    "gl": "in",
    "hl": "en"
  }
  ```
* **Parameters for India:**
  * `gl`: `in` (sets country to India).
  * `hl`: `en` (language English).
* **Rate Limits & Quota:**
  * Free credit: 2,500 queries upon signup.
  * Pricing: $50 for 50,000 queries (~$0.001/search).
  * Rate limit: ~50 requests per second.
* **Response Normalization Notes:**
  * Returns `{ shopping: [ { title, source, price, link, delivery, imageUrl, rating, ratingCount, productId, position } ] }`.
  * `price`: String formatted (e.g. `"₹79,900"` or `"$104.97"`), requires numeric extraction.
  * `link`: Direct or Google redirect link; requires unwrapping via `urlUtils`.
* **Env Keys:** `SERPER_KEY`.

---

### 1.3 SearchAPI.io (Google Shopping)
* **Status:** `VERIFIED`
* **Category:** Discovery (Backup SERP)
* **Documentation URL:** https://www.searchapi.io/docs/google-shopping
* **Date Checked:** 2026-10-19
* **Authentication Method:** Query parameter `api_key` or Header `Authorization: Bearer <SEARCHAPI_KEY>`.
* **Primary Endpoint:**
  * `GET https://www.searchapi.io/api/v1/search?engine=google_shopping`
* **Parameters for India:**
  * `q`: Search query string.
  * `gl`: `in`.
  * `hl`: `en`.
  * `location`: `India`.
  * `link`: `resolved` (Note: Setting `link=resolved` instructs SearchAPI to resolve merchant landing URLs automatically).
* **Rate Limits & Quota:**
  * Free tier: 100 searches on registration.
  * Starter plan: 10,000 searches for $49 (~$0.0049/search).
  * Concurrency: 10–25 concurrent requests.
* **Response Normalization Notes:**
  * Returns `{ shopping_results: [ { title, product_link, source, price, extracted_price, old_price, rating, reviews, thumbnail, merchant: { name, link } } ] }`.
* **Env Keys:** `SEARCHAPI_KEY`.

---

### 1.4 DataForSEO Merchant API (Google Shopping)
* **Status:** `VERIFIED`
* **Category:** Discovery (Third Source)
* **Documentation URL:** https://docs.dataforseo.com/v3/merchant/google/products/live/advanced/
* **Date Checked:** 2026-10-19
* **Authentication Method:** HTTP Basic Authentication (`Authorization: Basic base64(login:password)`).
* **Primary Endpoints:**
  * Live (Synchronous): `POST https://api.dataforseo.com/v3/merchant/google/products/live/advanced`
  * Standard (Asynchronous Queue): `POST https://api.dataforseo.com/v3/merchant/google/products/task_post` -> `GET https://api.dataforseo.com/v3/merchant/google/products/task_get/advanced/$id`
* **Request Payload (Live):**
  ```json
  [
    {
      "keyword": "iPhone 16",
      "location_code": 2356,
      "language_code": "en"
    }
  ]
  ```
  *(Location code 2356 represents India).*
* **Rate Limits & Quota:**
  * Pay-as-you-go: ~$0.002 to $0.004 per live search task.
  * Rate limit: Up to 2,000 calls per minute depending on balance.
* **Response Normalization Notes:**
  * Returns `tasks[].result[].items[]` with fields: `title`, `seller`, `price`, `currency`, `url`, `rating`.
* **Env Keys:** `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`.

---

## 2. Retailer-Direct Data

### 2.1 Flipkart Affiliate API
* **Status:** `VERIFIED (LEGACY)`
* **Category:** Retailer Direct
* **Documentation URL:** https://affiliate.flipkart.com/api-document (Mirror: `affiliate.flipkart.net`)
* **Date Checked:** 2026-10-19
* **Authentication Method:** HTTP Headers:
  * `Fk-Affiliate-Id: <FLIPKART_AFFILIATE_ID>`
  * `Fk-Affiliate-Token: <FLIPKART_AFFILIATE_TOKEN>`
* **Primary Endpoints:**
  * Category / Product Feed: `GET https://affiliate-api.flipkart.net/affiliate/1.0/product/{version}.json`
  * Item Lookup by ID: `GET https://affiliate-api.flipkart.net/affiliate/1.0/product.json?id={productId}`
  * Deals of the Day / Offers: `GET https://affiliate-api.flipkart.net/affiliate/offers/v1/dotd/json`
  * Order Report: `GET https://affiliate-api.flipkart.net/affiliate/report/orders/detail/json`
* **Operational Notes:**
  * Direct onboarding for new Flipkart affiliate API tokens is frequently paused or restricted by Flipkart India.
  * When direct token is not approved, fallback or alternative routing via affiliate aggregators (Cuelinks / EarnKaro) is standard practice.
* **Env Keys:** `FLIPKART_AFFILIATE_ID`, `FLIPKART_AFFILIATE_TOKEN`.

---

### 2.2 Amazon India Affiliate API (Amazon Creators API)
* **Status:** `VERIFIED (MIGRATION REQUIRED: PA-API 5.0 DEPRECATED)`
* **Category:** Retailer Direct
* **Documentation URL:** https://affiliate-program.amazon.in/creatorsapi (and Associates Central Tools)
* **Date Checked:** 2026-10-19
* **Authentication Method:** OAuth 2.0 (Login with Amazon / LwA):
  * Exchange `AMAZON_CREDENTIAL_ID` and `AMAZON_CREDENTIAL_SECRET` for a temporary Bearer token (`access_token`, 1-hour validity).
  * Requests include header: `Authorization: Bearer <access_token>`.
* **Migration Alert:**
  * **Amazon PA-API 5.0 is officially deprecated** for Amazon.in and returns `403 AccessDeniedException`.
  * Replaced by the **Amazon Creators API**.
  * Parameter naming changed from PascalCase (`ItemIds`, `PartnerTag`) to lowerCamelCase (`itemIds`, `partnerTag`).
  * AWS SigV4 request signing is replaced by OAuth 2.0 Bearer tokens.
* **India Support:**
  * Marketplace `www.amazon.in`.
  * Partner tag configured in Amazon.in Associates Central (e.g. `pricepilot-21`).
* **Operational Requirement:** User must confirm whether their Amazon Associates India account has active Creators API credentials approved before enabling direct queries.
* **Env Keys:** `AMAZON_CREDENTIAL_ID`, `AMAZON_CREDENTIAL_SECRET`, `AMAZON_ASSOCIATE_TAG`.

---

## 3. Price History Seed

### 3.1 Keepa API (Amazon.in)
* **Status:** `VERIFIED`
* **Category:** Price History Backfill
* **Documentation URL:** https://keepa.com/#!discuss/t/product-request/110
* **Date Checked:** 2026-10-19
* **Authentication Method:** Query parameter `key=<KEEPA_KEY>`.
* **Primary Endpoint:**
  * `GET https://api.keepa.com/product?key=<KEY>&domain=10&asin=<ASIN>&history=1`
* **Domain Parameter for India:**
  * **`domain=10`** corresponds strictly to `amazon.in` (1: com, 2: uk, 3: de, ..., 10: in).
* **Keepa Timestamp Conversion Formula:**
  * Keepa records timestamps as elapsed minutes since the **Keepa Epoch (2011-01-01T00:00:00 UTC)**.
  * Offset from Unix epoch (1970) = `21,564,000` minutes.
  * **Conversion to Unix Milliseconds:**
    $$\text{timestampMs} = (\text{keepaTime} + 21564000) \times 60000$$
* **Price Value Conversion:**
  * Prices in Keepa CSV arrays are integers. In INR (domain 10), price values are in standard Rupees (or paise depending on category; verified by positive integer value). Missing prices are `-1`.
* **Rate Limits & Token Bucket:**
  * Keepa operates on a token bucket refill system (typically 5% token refill per minute for paid plans; each product call consumes 1 token).
  * Adapter must track remaining tokens returned in Keepa response headers (`tokens-left`).
* **Env Keys:** `KEEPA_KEY`.

---

## 4. Product Identity and Specs

### 4.1 Open Icecat Catalog
* **Status:** `VERIFIED`
* **Category:** Identity & Specs
* **Documentation URL:** https://live.icecat.biz/
* **Date Checked:** 2026-10-19
* **Authentication Method:**
  * Registered Open Icecat username passed via parameter `shopname=<ICECAT_USER>`.
  * HTTP Header: `api-token: <ICECAT_API_TOKEN>` and `content-token: <ICECAT_CONTENT_TOKEN>`.
* **Primary Endpoints:**
  * Lookup by GTIN / EAN / UPC:
    `GET https://live.icecat.biz/api?lang=en&shopname=<USER>&GTIN=<BARCODE>`
  * Lookup by MPN + Brand:
    `GET https://live.icecat.biz/api?lang=en&shopname=<USER>&Brand=<BRAND>&ProductCode=<MPN>`
* **Data Provided:**
  * Normalized specifications (CPU, RAM, storage, display, dimensions, weight).
  * High-resolution product image gallery.
  * Standardized category taxonomy and bullet points.
* **Licensing & Attribution:**
  * Open Icecat data is licensed under the Open Content License (OPL). Attribution to Icecat must be maintained where Open Icecat data is rendered.
* **Env Keys:** `ICECAT_USER`, `ICECAT_API_TOKEN`, `ICECAT_CONTENT_TOKEN`.

---

## 5. Affiliate Links and Coupons

### 5.1 Cuelinks API
* **Status:** `VERIFIED`
* **Category:** Affiliate & Coupons
* **Documentation URL:** https://cuelinks.docs.apiary.io/ (and https://developers.cuelinks.com/)
* **Date Checked:** 2026-10-19
* **Authentication Method:** HTTP Header `Authorization: Token token="<CUELINKS_KEY>"`.
* **Primary Endpoints:**
  * Link Conversion (Deeplinking):
    `POST https://api.cuelinks.com/v2/links.json`
    Payload: `{"url": "https://www.croma.com/p/123", "subid": "user123"}`
  * Offers & Coupons Feed:
    `GET https://api.cuelinks.com/v2/offers.json`
  * Merchant Campaigns List:
    `GET https://api.cuelinks.com/v2/campaigns.json`
* **Regulatory Compliance:**
  * Affiliated links must never modify product ranking, effective price calculation, or buy score.
  * UI must present an explicit affiliate disclosure.
* **Env Keys:** `CUELINKS_KEY`, `AFFILIATE_ENABLED` (boolean, default: `false`).

---

### 5.2 EarnKaro / vCommission
* **Status:** `VERIFIED (ADAPTER INTERFACE DEFINED)`
* **Category:** Affiliate & Coupons
* **Documentation URL:** https://earnkaro.com/ (and https://www.vcommission.com/)
* **Date Checked:** 2026-10-19
* **Authentication Method:** API Key / Partner Token.
* **Role:** Secondary fallback affiliate networks for Indian retailers where direct affiliate accounts or Cuelinks coverage has gaps.
* **Env Keys:** `EARNKARO_KEY`, `VCOMMISSION_KEY`.

---

## 6. Reviews and Ratings

### 6.1 SerpApi Google Product Reviews
* **Status:** `VERIFIED`
* **Category:** Reviews
* **Documentation URL:** https://serpapi.com/google-product-api
* **Date Checked:** 2026-10-19
* **Authentication:** `api_key=<SERPAPI_KEY>`.
* **Endpoint:** `GET https://serpapi.com/search.json?engine=google_product_reviews&product_id=<ID>&gl=in&hl=en`.
* **Output:** Normalized array of reviews, star ratings, reviewer snippets, verified purchases.

---

### 6.2 Rainforest API (Amazon.in Reviews)
* **Status:** `VERIFIED`
* **Category:** Reviews
* **Documentation URL:** https://rainforestapi.com/docs/product-data-api/parameters/reviews
* **Date Checked:** 2026-10-19
* **Authentication Method:** Query parameter `api_key=<RAINFOREST_API_KEY>`.
* **Primary Endpoint:**
  * `GET https://api.rainforestapi.com/request?api_key=<KEY>&type=reviews&amazon_domain=amazon.in&asin=<ASIN>`
* **Parameters for India:**
  * `amazon_domain`: `amazon.in`.
  * `asin`: Amazon ASIN.
  * `review_stars`: e.g. `all_positive`, `all_critical`, `five_star`, etc.
* **Output Normalized To:**
  `{ source: "Amazon.in", rating: number, count: number, snippets: string[] }`.
* **Env Keys:** `RAINFOREST_API_KEY` (or `RAPIDAPI_KEY` for OpenWeb Ninja).

---

### 6.3 OpenWeb Ninja (via RapidAPI)
* **Status:** `VERIFIED`
* **Category:** Reviews (Alternative Amazon Data Scraper)
* **Documentation URL:** https://rapidapi.com/openwebninja/api/real-time-amazon-data
* **Date Checked:** 2026-10-19
* **Authentication Method:** Headers `X-RapidAPI-Key: <RAPIDAPI_KEY>`, `X-RapidAPI-Host: real-time-amazon-data.p.rapidapi.com`.
* **Endpoint:** `GET https://real-time-amazon-data.p.rapidapi.com/product-reviews?asin=<ASIN>&country=IN`.
* **Env Keys:** `RAPIDAPI_KEY`.

---

## 7. Gap Filling (Scraping)

> [!CAUTION]
> Gap filling scrapers are off by default (`SCRAPING_ENABLED=false`). They are invoked strictly as a last resort for retailers without discovery feeds or affiliate APIs (e.g. Croma, Reliance Digital, Vijay Sales). See `docs/LEGAL.md` for terms of service compliance.

### 7.1 Zyte API
* **Status:** `VERIFIED`
* **Category:** Gap Filling
* **Documentation URL:** https://docs.zyte.com/zyte-api/usage/overview.html
* **Date Checked:** 2026-10-19
* **Authentication:** HTTP Basic Auth with API key as username and empty password.
* **Endpoint:** `POST https://api.zyte.com/v1/extract`
* **Request:** `{"url": "https://www.croma.com/p/...", "product": true}`
* **Env Keys:** `ZYTE_KEY`, `SCRAPING_ENABLED=false`.

---

### 7.2 Apify Actors
* **Status:** `VERIFIED`
* **Category:** Gap Filling
* **Documentation URL:** https://docs.apify.com/api/v2
* **Date Checked:** 2026-10-19
* **Authentication:** Bearer token `APIFY_TOKEN`.
* **Endpoint:** `POST https://api.apify.com/v2/acts/{actorId}/runs?token={token}`
* **Env Keys:** `APIFY_TOKEN`.

---

## 8. Artificial Intelligence (Gemini)

### 8.1 Google Gemini 2.5 Flash
* **Status:** `VERIFIED`
* **Category:** AI Intelligence
* **Documentation URL:** https://ai.google.dev/gemini-api/docs
* **Date Checked:** 2026-10-19
* **Authentication Method:** API Key passed to Google Generative AI SDK (`@google/generative-ai` or REST header `x-goog-api-key`).
* **Roles in PricePilot AI:**
  1. **Query Understanding:** Extract brand, model, category, specifications, budget hints.
  2. **Product Disambiguation:** Resolve ambiguous canonical product matches.
  3. **Offer Rule Extraction:** Extract discounts, card offers, and terms from raw text (tagged as `unverified`).
  4. **Verdict Summaries:** Natural-language synthesis of deterministic buy scores.
  5. **Function Calling:** Conversational shopping assistant with read/confirm tools.
  6. **Vision Processing:** Multimodal extraction for invoice / receipt scanner.
* **Strict Safety Invariant:** Gemini must **NEVER** calculate, override, or invent prices, Smart Buy Scores, or recommendation verdicts. All numerical computation is performed deterministically by server services.
* **Env Keys:** `GEMINI_API_KEY`.

---

## 9. Alerts & Notifications

### 9.1 Resend (Email)
* **Status:** `VERIFIED`
* **Category:** Alerts
* **Documentation URL:** https://resend.com/docs/api-reference/emails/send-email
* **Date Checked:** 2026-10-19
* **Authentication Method:** Header `Authorization: Bearer <RESEND_API_KEY>`.
* **Primary Endpoint:** `POST https://api.resend.com/emails`
* **Free Tier:** 3,000 emails/month, 100 emails/day.
* **Env Keys:** `RESEND_API_KEY`.

---

### 9.2 Amazon Simple Email Service (SES)
* **Status:** `VERIFIED`
* **Category:** Alerts (Alternative Email)
* **Documentation URL:** https://docs.aws.amazon.com/ses/latest/APIReference/Welcome.html
* **Date Checked:** 2026-10-19
* **Authentication:** AWS IAM SigV4 via `@aws-sdk/client-ses`.
* **Env Keys:** `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`, `SES_REGION`.

---

### 9.3 Telegram Bot API
* **Status:** `VERIFIED`
* **Category:** Alerts (Free instant notifications)
* **Documentation URL:** https://core.telegram.org/bots/api#sendmessage
* **Date Checked:** 2026-10-19
* **Authentication Method:** Bot token in URL: `https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/sendMessage`.
* **Payload:** `{"chat_id": "<USER_CHAT_ID>", "text": "...", "parse_mode": "Markdown"}`.
* **Cost:** 100% Free.
* **Env Keys:** `TELEGRAM_BOT_TOKEN`.

---

### 9.4 Firebase Cloud Messaging (FCM)
* **Status:** `VERIFIED`
* **Category:** Alerts (Web Push)
* **Documentation URL:** https://firebase.google.com/docs/cloud-messaging
* **Date Checked:** 2026-10-19
* **Authentication Method:** HTTP v1 API via `firebase-admin.messaging()`.
* **Cost:** Free.
* **Env Keys:** `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

---

### 9.5 MSG91 (India SMS)
* **Status:** `VERIFIED (REGULATORY REQUIREMENT: DLT)`
* **Category:** Alerts (SMS)
* **Documentation URL:** https://docs.msg91.com/p/tf9Ens/t/7h4Q9b/Flow
* **Date Checked:** 2026-10-19
* **Authentication Method:** Header `authkey: <MSG91_KEY>`.
* **Endpoint:** `POST https://control.msg91.com/api/v5/flow/`
* **India Regulatory Requirement:** Indian TRAI (Telecom Regulatory Authority of India) mandates **DLT (Distributed Ledger Technology)** entity registration, sender ID (header) approval, and approved SMS template registration.
* **Env Keys:** `MSG91_KEY`, `MSG91_SENDER_ID`.

---

### 9.6 WhatsApp Cloud API
* **Status:** `VERIFIED (REQUIRES BUSINESS VERIFICATION)`
* **Category:** Alerts (WhatsApp)
* **Documentation URL:** https://developers.facebook.com/docs/whatsapp/cloud-api
* **Date Checked:** 2026-10-19
* **Authentication Method:** Bearer token `Authorization: Bearer <WHATSAPP_TOKEN>`.
* **Endpoint:** `POST https://graph.facebook.com/v20.0/<WHATSAPP_PHONE_NUMBER_ID>/messages`
* **Requirements:** Meta Business Verification, registered WhatsApp Phone Number, and pre-approved template messages.
* **Env Keys:** `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`.

---

## 10. Delivery & Logistics

### 10.1 India Post Postal PIN Code API
* **Status:** `VERIFIED`
* **Category:** Delivery
* **Documentation URL:** https://postalpincode.in/Api-Details
* **Date Checked:** 2026-10-19
* **Authentication Method:** None required (Public API).
* **Primary Endpoint:**
  * `GET https://api.postalpincode.in/pincode/{PINCODE}`
* **Response Schema:**
  ```json
  [
    {
      "Message": "Number of Post office(s) found: 1",
      "Status": "Success",
      "PostOffice": [
        {
          "Name": "New Delhi G.P.O.",
          "BranchType": "Head Post Office",
          "DeliveryStatus": "Delivery",
          "District": "Central Delhi",
          "State": "Delhi",
          "Country": "India"
        }
      ]
    }
  ]
  ```
* **Cost:** Free for commercial and non-commercial usage.

---

## 11. Infrastructure & Observability

### 11.1 Upstash Redis
* **Status:** `VERIFIED`
* **Category:** Infrastructure (Caching, Rate Limiting, Distributed Locks)
* **Documentation URL:** https://upstash.com/docs/redis/overall/getstarted
* **Date Checked:** 2026-10-19
* **Connection Protocol:** Standard Redis `rediss://...` or REST API (`@upstash/redis`).
* **Fallback:** When `REDIS_URL` is absent, server falls back safely to MongoDB TTL indexes.
* **Env Keys:** `REDIS_URL`.

---

### 11.2 BullMQ
* **Status:** `VERIFIED`
* **Category:** Infrastructure (Background Job Queue)
* **Documentation URL:** https://docs.bullmq.io/
* **Date Checked:** 2026-10-19
* **Role:** Manages scheduled price tracking checks, Keepa backfill jobs, and price-protection scans.
* **Fallback:** `node-cron` in development when Redis/BullMQ is absent.

---

### 11.3 Cloudinary / AWS S3
* **Status:** `VERIFIED`
* **Category:** Infrastructure (Media & Uploads)
* **Documentation URL:**
  * Cloudinary: https://cloudinary.com/documentation/node_integration
  * AWS S3: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/
* **Date Checked:** 2026-10-19
* **Production Policy:** Production startup rejects local filesystem storage unless explicitly overridden (`STORAGE_PROVIDER=s3` or `cloudinary`). Uploads validate MIME types and byte sizes.
* **Env Keys:** `STORAGE_PROVIDER`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `AWS_REGION`, `S3_BUCKET_NAME`.

---

### 11.4 Sentry & Pino
* **Status:** `VERIFIED`
* **Category:** Observability
* **Documentation URLs:**
  * Sentry Node: https://docs.sentry.io/platforms/javascript/guides/node/
  * Pino: https://getpino.io/
* **Date Checked:** 2026-10-19
* **Role:**
  * `pino`: Fast, structured JSON logging with request IDs (`req.id`).
  * `Sentry`: Production error tracing and exception monitoring.
* **Env Keys:** `SENTRY_DSN`, `LOG_LEVEL` (default: `info`).
