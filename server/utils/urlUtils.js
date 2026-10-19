export const extractRetailerUrl = (rawUrl) => {
  if (!rawUrl) return null;

  try {
    const urlObj = new URL(rawUrl);
    
    // If it's a google redirect URL
    if (urlObj.hostname.includes('google.com') && urlObj.pathname.includes('/url')) {
      const actualUrl = urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
      if (actualUrl) {
        return actualUrl;
      }
    }
    
    // Return original if it's already a direct link or couldn't be parsed
    return rawUrl;
  } catch (error) {
    // Fallback for invalid URLs
    return rawUrl;
  }
};

export const stripTrackingParams = (url) => {
  if (!url) return url;
  try {
    const urlObj = new URL(url);
    const trackingParams = new Set([
      'gclid', 'gclsrc', 'fbclid', 'msclkid', 'dclid',
      'tag', 'ascsubtag', 'ref', 'affid', 'aff_id', 'aff_sub', 'aff_sub2'
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

export const unwrapDirectUrl = (rawUrl) => {
  const unwrapped = extractRetailerUrl(rawUrl);
  return stripTrackingParams(unwrapped);
};

export const isDirectRetailerUrl = (url) => {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    // If it's still pointing to google shopping, it's not direct
    if (urlObj.hostname.includes('google.com') && 
        (urlObj.pathname.includes('/shopping') || urlObj.pathname.includes('/search') || urlObj.pathname.includes('/product'))) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
};

