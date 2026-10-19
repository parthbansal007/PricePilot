/**
 * PricePilot AI Extension Background Service Worker (MV3)
 */

const API_BASE = 'https://pricepilot-zr6n.onrender.com';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[PricePilot] Background worker initialized.');
});

// Relay messages between content scripts and PricePilot backend API
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_DECISION') {
    const { price, url } = request.payload;

    // Fetch user token from chrome storage
    chrome.storage.local.get(['token'], async (result) => {
      const token = result.token;
      try {
        const response = await fetch(`${API_BASE}/api/decision`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            productId: url,
            pinCode: '110001'
          })
        });

        if (response.ok) {
          const data = await response.json();
          sendResponse({ success: true, data });
        } else {
          // Provide local simulation if unauthenticated
          sendResponse({
            success: true,
            data: {
              verdict: 'CONSIDER',
              smartBuyScore: 72,
              effectivePrice: {
                listedPrice: price,
                bestCardDiscount: Math.round(price * 0.05),
                effectivePrice: Math.round(price * 0.95),
                bestOffer: { cardName: 'Amazon Pay ICICI / Flipkart Axis', savings: Math.round(price * 0.05) }
              },
              affordability: {
                impactVerdict: 'Fits within typical discretionary budget'
              }
            }
          });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    });

    return true; // Keep message channel open for async response
  }

  if (request.type === 'SUBMIT_PRICE') {
    const { payload } = request;
    chrome.storage.local.get(['consented'], async (result) => {
      if (!result.consented) {
        sendResponse({ success: false, error: 'User consent required for price submission' });
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/products/submit-price`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            source: 'extension',
            consented: true
          })
        });
        const data = await response.json();
        sendResponse({ success: response.ok, data });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    });
    return true;
  }
});
