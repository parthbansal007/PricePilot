# Provider Benchmark Report

**Generated:** 2026-10-18T19:01:29.860Z

**Mode:** DRY RUN (no provider requests sent)

**Sample Queries Count:** 20

## Summary Comparison

| Provider | Status | Queries Executed | Latency (median / p95) | Result Count (avg) | Price Accuracy (avg |Δ|) | Direct-Link Rate | Trusted-Retailer Rate | Cost/Query |
| --- | --- | ---: | --- | ---: | --- | --- | --- | --- |
| serpapi | READY (configured, dry run) | 0/20 | N/A / N/A | N/A | Fixture loaded | N/A | N/A | $0.01 |
| serper | DISABLED (no credentials) | 0/20 | N/A | N/A | N/A | N/A | N/A | N/A |
| searchapi | DISABLED (no credentials) | 0/20 | N/A | N/A | N/A | N/A | N/A | N/A |
| dataforseo | DISABLED (no credentials) | 0/20 | N/A | N/A | N/A | N/A | N/A | N/A |

## Per-Query Details

## Methodology & Evaluation Criteria

- **Queries**: 20 standard Indian e-commerce search queries across Laptops, Smartphones, Audio/Headphones, and Monitors (editable via `scripts/benchmark-queries.json`).
- **Direct-Link Rate**: Measured by parsing links through `server/utils/urlUtils.js` (`extractRetailerUrl`, `isDirectRetailerUrl`) to verify whether destination URLs lead directly to store product pages rather than intermediate search or Google redirect links.
- **Trusted-Retailer Rate**: Evaluates whether returned merchants match the PricePilot trusted retailer allow-list (Amazon.in, Flipkart, Croma, Reliance Digital, Vijay Sales, Tata CLiQ, etc.).
- **Price Accuracy**: Computed against timestamped manual reference prices in `scripts/benchmark-queries.json`. Shows percentage variance from verified retailer pricing.
- **Cost Tracking**: Estimated using standard published plan pricing tiers or custom configured values via `PROVIDER_BENCHMARK_COSTS`. No secrets or credential keys are written to this report.
- **Paid Usage Protection**: Live calls require the `--confirm-paid-usage` CLI flag. Dry run mode prevents unintended billing.

