/**
 * PricePilot AI Content Script for Amazon.in, Flipkart.com, and Croma.com
 */

(function () {
  'use strict';

  function extractProductInfo() {
    const host = window.location.hostname;
    let title = '';
    let price = 0;
    let retailer = 'Online Store';

    if (host.includes('amazon.in')) {
      retailer = 'Amazon.in';
      const titleEl = document.getElementById('productTitle');
      if (titleEl) title = titleEl.innerText.trim();

      const priceEl = document.querySelector('.a-price-whole');
      if (priceEl) {
        price = parseFloat(priceEl.innerText.replace(/[^0-9.]/g, ''));
      }
    } else if (host.includes('flipkart.com')) {
      retailer = 'Flipkart';
      const titleEl = document.querySelector('.B_NuCI') || document.querySelector('h1 span') || document.querySelector('h1');
      if (titleEl) title = titleEl.innerText.trim();

      const priceEl = document.querySelector('._30jeq3') || document.querySelector('._16Jk6d');
      if (priceEl) {
        price = parseFloat(priceEl.innerText.replace(/[^0-9.]/g, ''));
      }
    } else if (host.includes('croma.com')) {
      retailer = 'Croma';
      const titleEl = document.querySelector('.pd-title') || document.querySelector('h1');
      if (titleEl) title = titleEl.innerText.trim();

      const priceEl = document.querySelector('.amount') || document.querySelector('.pdp-cp');
      if (priceEl) {
        price = parseFloat(priceEl.innerText.replace(/[^0-9.]/g, ''));
      }
    }

    return { title, price, retailer, url: window.location.href };
  }

  function injectPricePilotWidget(info) {
    if (document.getElementById('pricepilot-floating-badge')) return;

    const widget = document.createElement('div');
    widget.id = 'pricepilot-floating-badge';
    widget.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: #0f172a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 14px 18px;
      border-radius: 14px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      border: 1px solid #334155;
      font-size: 13px;
      min-width: 260px;
      backdrop-filter: blur(8px);
    `;

    widget.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: 700; color: #6366f1; letter-spacing: 0.5px;">✈️ PricePilot AI</span>
        <button id="pp-close-btn" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 14px;">✕</button>
      </div>
      <div id="pp-content">
        <div style="color: #cbd5e1; font-size: 11px;">Analyzing price history & bank card deals...</div>
      </div>
    `;

    document.body.appendChild(widget);

    document.getElementById('pp-close-btn').addEventListener('click', () => {
      widget.remove();
    });

    // Request decision from background worker
    chrome.runtime.sendMessage(
      { type: 'FETCH_DECISION', payload: info },
      (response) => {
        const content = document.getElementById('pp-content');
        if (!content) return;

        if (response && response.success && response.data) {
          const d = response.data;
          const score = d.smartBuyScore || 75;
          const verdict = d.verdict || 'BUY';
          const effPrice = d.effectivePrice?.effectivePrice || info.price;
          const cardName = d.effectivePrice?.bestOffer?.cardName || 'Eligible Credit Card';
          const savings = d.effectivePrice?.bestCardDiscount || 0;

          content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
              <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: bold;">Smart Buy Score</span>
              <span style="font-weight: 800; font-size: 15px; color: ${score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'};">${score}/100</span>
            </div>
            <div style="font-size: 12px; margin-bottom: 4px; color: #e2e8f0;">
              <strong>Verdict:</strong> <span style="color: #38bdf8;">${verdict.replace('_', ' ')}</span>
            </div>
            ${savings > 0 ? `
              <div style="background: #1e293b; padding: 6px 8px; border-radius: 6px; margin: 6px 0; border: 1px solid #334155;">
                <div style="font-size: 11px; color: #10b981; font-weight: 600;">₹${savings.toLocaleString('en-IN')} off with ${cardName}</div>
                <div style="font-size: 11px; color: #cbd5e1;">Effective Price: <strong>₹${effPrice.toLocaleString('en-IN')}</strong></div>
              </div>
            ` : ''}
            <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">
              ${d.affordability?.impactVerdict || 'Fits budget parameters'}
            </div>
            <div style="margin-top: 10px; border-top: 1px solid #334155; padding-top: 6px; display: flex; justify-content: space-between; align-items: center;">
              <a href="https://pricepilot-zr6n.onrender.com" target="_blank" style="color: #818cf8; text-decoration: none; font-size: 11px; font-weight: 600;">Open Full Analysis →</a>
              <button id="pp-consent-share" style="background: #334155; color: #f1f5f9; border: none; padding: 3px 6px; border-radius: 4px; font-size: 10px; cursor: pointer;">Share Price</button>
            </div>
          `;

          const shareBtn = document.getElementById('pp-consent-share');
          if (shareBtn) {
            shareBtn.addEventListener('click', () => {
              chrome.runtime.sendMessage({
                type: 'SUBMIT_PRICE',
                payload: {
                  url: info.url,
                  retailer: info.retailer,
                  price: info.price,
                  title: info.title
                }
              }, (submitRes) => {
                shareBtn.innerText = submitRes?.success ? '✓ Shared' : 'Shared';
                shareBtn.disabled = true;
              });
            });
          }
        }
      }
    );
  }

  // Initialize after DOM loads
  setTimeout(() => {
    const info = extractProductInfo();
    if (info.title && info.price > 0) {
      injectPricePilotWidget(info);
    }
  }, 1200);
})();
