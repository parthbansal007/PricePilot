const isGoogleHost = (hostname) => {
  if (!hostname) return false;
  return /(^|\.)google\.[a-z.]+$/i.test(hostname) || hostname.includes('google.');
};

export const isDirectRetailerUrl = (url) => {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    if (isGoogleHost(urlObj.hostname)) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
};

export const stripTrackingParams = (url) => {
  if (!url) return url;
  try {
    const urlObj = new URL(url);
    const trackingParams = new Set([
      'gclid', 'gclsrc', 'fbclid', 'msclkid', 'dclid',
      'tag', 'ascsubtag', 'ref', 'affid', 'aff_id', 'aff_sub', 'aff_sub2',
      'srsltid'
    ]);
    const keysToDelete = [];
    for (const key of urlObj.searchParams.keys()) {
      if (key.startsWith('utm_') || trackingParams.has(key.toLowerCase())) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      urlObj.searchParams.delete(key);
    }
    return urlObj.toString();
  } catch {
    return url;
  }
};

export const getDirectMerchantUrl = (retailer, title, fallbackUrl = '') => {
  const cleanTitle = (title || '')
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanTitle && !fallbackUrl) return '';
  const queryStr = cleanTitle || title || '';
  const encodedQuery = encodeURIComponent(queryStr);
  const r = (retailer || '').toLowerCase();

  if (r.includes('amazon')) {
    return `https://www.amazon.in/s?k=${encodedQuery}`;
  }
  if (r.includes('flipkart') || r.includes('flipshope')) {
    return `https://www.flipkart.com/search?q=${encodedQuery}`;
  }
  if (r.includes('croma')) {
    return `https://www.croma.com/searchB?q=${encodedQuery}`;
  }
  if (r.includes('reliance')) {
    return `https://www.reliancedigital.in/search?q=${encodedQuery}`;
  }
  if (r.includes('vijay')) {
    return `https://www.vijaysales.com/search/${encodedQuery}`;
  }
  if (r.includes('tata') || r.includes('cliq')) {
    return `https://www.tatacliq.com/search/?searchCategory=all&text=${encodedQuery}`;
  }
  if (r.includes('jiomart')) {
    return `https://www.jiomart.com/search/${encodedQuery}`;
  }
  if (r.includes('samsung')) {
    return `https://www.samsung.com/in/search/?searchvalue=${encodedQuery}`;
  }
  if (r.includes('apple')) {
    return `https://www.apple.com/in/search/${encodedQuery}`;
  }
  if (r.includes('poorvika')) {
    return `https://www.poorvika.com/s?q=${encodedQuery}`;
  }
  if (r.includes('sangeetha')) {
    return `https://www.sangeethamobiles.com/search?q=${encodedQuery}`;
  }
  if (r.includes('zepto')) {
    return `https://www.zeptonow.com/search?q=${encodedQuery}`;
  }
  if (r.includes('blinkit')) {
    return `https://blinkit.com/s/?q=${encodedQuery}`;
  }
  if (r.includes('bigbasket')) {
    return `https://www.bigbasket.com/ps/?q=${encodedQuery}`;
  }
  if (r.includes('triveni')) {
    return `https://www.triveniworld.com/search?q=${encodedQuery}`;
  }
  if (r.includes('lotus')) {
    return `https://www.lotuselectronics.com/search?q=${encodedQuery}`;
  }

  // If fallbackUrl is a valid direct non-google URL, return it
  if (fallbackUrl && isDirectRetailerUrl(fallbackUrl)) {
    return stripTrackingParams(fallbackUrl);
  }

  // Fallback to Flipkart search for the product query if non-google fallback is unavailable
  return `https://www.flipkart.com/search?q=${encodedQuery}`;
};

export const extractRetailerUrl = (rawUrl, retailer = null, title = null) => {
  if (!rawUrl) {
    return getDirectMerchantUrl(retailer, title, '');
  }

  try {
    const urlObj = new URL(rawUrl);

    // If it's a google redirect URL (/url?url=... or /url?q=...)
    if (isGoogleHost(urlObj.hostname) && urlObj.pathname.includes('/url')) {
      const actualUrl = urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
      if (actualUrl && isDirectRetailerUrl(actualUrl)) {
        return stripTrackingParams(actualUrl);
      }
    }

    // If it's ANY google link (ibp=oshop, /search, /shopping, /product, etc.)
    if (isGoogleHost(urlObj.hostname)) {
      const queryFromUrl = urlObj.searchParams.get('q') || '';
      const effectiveTitle = title || queryFromUrl;
      return getDirectMerchantUrl(retailer, effectiveTitle, '');
    }

    return stripTrackingParams(rawUrl);
  } catch {
    return getDirectMerchantUrl(retailer, title, rawUrl);
  }
};

export const unwrapDirectUrl = (rawUrl, retailer = null, title = null) => {
  return extractRetailerUrl(rawUrl, retailer, title);
};

export default {
  isDirectRetailerUrl,
  stripTrackingParams,
  getDirectMerchantUrl,
  extractRetailerUrl,
  unwrapDirectUrl
};
