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
