export const normalizeProductTitle = (title) => {
  if (!title) return '';
  // Convert to lowercase, remove punctuation except dashes, collapse whitespace
  return title.toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const extractProductInfo = (title) => {
  if (!title) return {};
  
  const normTitle = normalizeProductTitle(title);
  const info = {
    brand: null,
    productFamily: null,
    model: null,
    modelNumber: null,
    specifications: {}
  };

  // Common brands
  const brands = ['lenovo', 'apple', 'samsung', 'sony', 'asus', 'acer', 'hp', 'dell', 'msi', 'lg', 'oneplus', 'google'];
  for (const b of brands) {
    if (normTitle.includes(b)) {
      info.brand = b.charAt(0).toUpperCase() + b.slice(1);
      break;
    }
  }

  // Infer brand from product family if missing
  if (!info.brand) {
    if (normTitle.includes('iphone') || normTitle.includes('macbook') || normTitle.includes('ipad')) info.brand = 'Apple';
    else if (normTitle.includes('galaxy')) info.brand = 'Samsung';
    else if (normTitle.includes('legion') || normTitle.includes('thinkpad') || normTitle.includes('ideapad') || normTitle.includes('loq')) info.brand = 'Lenovo';
    else if (normTitle.includes('playstation')) info.brand = 'Sony';
  }

  // Extract specs (very basic heuristics)
  const ramMatch = normTitle.match(/\b(\d+)\s*(gb|tb)\s*ram\b/i) || normTitle.match(/\b(\d+)\s*(gb)\b/i);
  if (ramMatch && ramMatch[2].toLowerCase() === 'gb' && parseInt(ramMatch[1]) <= 64 && parseInt(ramMatch[1]) >= 4) {
     info.specifications.ram = ramMatch[1] + 'GB';
  }

  const storageMatch = normTitle.match(/\b(\d+)\s*(tb|gb)\s*(ssd|hdd|storage)\b/i);
  if (storageMatch) {
    info.specifications.storage = storageMatch[1] + storageMatch[2].toUpperCase();
  }

  // Model families and numbers
  if (info.brand === 'Lenovo') {
    if (normTitle.includes('legion')) info.productFamily = 'Legion';
    else if (normTitle.includes('loq')) info.productFamily = 'LOQ';
    else if (normTitle.includes('ideapad')) info.productFamily = 'IdeaPad';
    else if (normTitle.includes('yoga')) info.productFamily = 'Yoga';
    else if (normTitle.includes('thinkpad')) info.productFamily = 'ThinkPad';

    if (normTitle.includes('pro 5')) info.model = 'Pro 5';
    else if (normTitle.includes('pro 7')) info.model = 'Pro 7';
    else if (normTitle.includes('pro 9')) info.model = 'Pro 9';
    
    // Find potential model number (e.g. 16IRX9, 15APH8)
    const modelNumMatch = title.match(/\b(\d{2}[A-Z]{2,4}\d)\b/i);
    if (modelNumMatch) info.modelNumber = modelNumMatch[1].toUpperCase();
  }

  if (info.brand === 'Apple') {
    if (normTitle.includes('iphone')) {
      info.productFamily = 'iPhone';
      // Match "16 pro max", "16 pro", "16 plus", "16"
      const iphoneModelMatch = normTitle.match(/iphone\s+(\d+)\s*(pro max|pro|plus|mini)?/i);
      if (iphoneModelMatch) {
        info.model = iphoneModelMatch[1] + (iphoneModelMatch[2] ? ' ' + iphoneModelMatch[2].charAt(0).toUpperCase() + iphoneModelMatch[2].slice(1) : '');
      }
    }
    if (normTitle.includes('macbook')) {
      info.productFamily = 'MacBook';
      if (normTitle.includes('air')) info.model = 'Air';
      if (normTitle.includes('pro')) info.model = 'Pro';
      
      const mChipMatch = normTitle.match(/\b(m\d(?:\s*(?:pro|max))?)\b/i);
      if (mChipMatch) info.modelNumber = mChipMatch[1].toUpperCase();
    }
  }

  if (info.brand === 'Samsung') {
    if (normTitle.includes('galaxy')) info.productFamily = 'Galaxy';
    const sModelMatch = normTitle.match(/\b([sz]\d{2}(?:\s*fe)?)\s*(ultra|plus|\+)?\b/i);
    if (sModelMatch) {
      info.model = sModelMatch[1].toUpperCase() + (sModelMatch[2] ? ' ' + sModelMatch[2].charAt(0).toUpperCase() + sModelMatch[2].slice(1) : '');
    }
    // TV extraction
    if (normTitle.includes('qled') || normTitle.includes('oled')) {
      info.productFamily = 'TV';
      const tvSize = normTitle.match(/\b(\d{2})\s*(?:inch|")\b/i);
      if (tvSize) info.specifications.displaySize = tvSize[1] + ' inch';
    }
  }
  
  if (info.brand === 'Sony') {
    if (normTitle.includes('wh-1000xm')) {
      info.productFamily = 'Headphones';
      const xmMatch = normTitle.match(/wh-1000xm(\d)/i);
      if (xmMatch) info.model = 'WH-1000XM' + xmMatch[1];
    }
    if (normTitle.match(/\b(a7\s*(?:iv|iii|c|s|r))\b/i)) {
      info.productFamily = 'Camera';
      info.model = normTitle.match(/\b(a7\s*(?:iv|iii|c|s|r))\b/i)[1].toUpperCase();
    }
  }
  
  if (info.brand === 'Lg') {
    info.brand = 'LG';
    const monitorMatch = title.match(/\b(\d{2}[A-Z]{2}\d{2,4}[A-Z]{0,2})\b/i);
    if (monitorMatch) {
      info.modelNumber = monitorMatch[1].toUpperCase();
    }
  }

  return info;
};

export const hasConflict = (queryInfo, productInfo) => {
  // Brand conflict
  if (queryInfo.brand && productInfo.brand && queryInfo.brand !== productInfo.brand) return true;
  
  // Family conflict (e.g. Legion vs LOQ)
  if (queryInfo.productFamily && productInfo.productFamily && queryInfo.productFamily !== productInfo.productFamily) return true;
  
  // Model conflict (e.g. Pro 5 vs Pro 7)
  if (queryInfo.model && productInfo.model && queryInfo.model !== productInfo.model) return true;
  
  // Model number conflict (e.g. 16IRX9 vs 15APH8)
  if (queryInfo.modelNumber && productInfo.modelNumber && queryInfo.modelNumber !== productInfo.modelNumber) return true;

  return false;
};

export const calculateMatchScore = (queryTitle, productTitle) => {
  const queryInfo = extractProductInfo(queryTitle);
  const productInfo = extractProductInfo(productTitle);
  
  if (hasConflict(queryInfo, productInfo)) {
    return 0; // Immediate rejection due to conflict
  }

  let score = 0;
  const queryNorm = normalizeProductTitle(queryTitle);
  const productNorm = normalizeProductTitle(productTitle);

  // Strong exact phrase match
  if (productNorm.includes(queryNorm)) score += 50;

  // Information matching
  if (queryInfo.brand && queryInfo.brand === productInfo.brand) score += 20;
  if (queryInfo.productFamily && queryInfo.productFamily === productInfo.productFamily) score += 30;
  if (queryInfo.model && queryInfo.model === productInfo.model) score += 40;
  if (queryInfo.modelNumber && queryInfo.modelNumber === productInfo.modelNumber) score += 50;
  
  // Basic token overlap for everything else
  const queryTokens = queryNorm.split(' ');
  let tokenMatches = 0;
  queryTokens.forEach(token => {
    if (token.length > 2 && productNorm.includes(token)) tokenMatches++;
  });
  
  if (queryTokens.length > 0) {
    score += (tokenMatches / queryTokens.length) * 20;
  }
  
  return Math.min(100, Math.round(score));
};
