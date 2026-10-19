import IdentityProvider from '../IdentityProvider.js';
import { logger } from '../../utils/logger.js';

export default class IcecatIdentityProvider extends IdentityProvider {
  constructor() {
    super('icecat');
    this.shopname = process.env.ICECAT_USER;
    this.apiToken = process.env.ICECAT_API_TOKEN;
    this.contentToken = process.env.ICECAT_CONTENT_TOKEN;
    this.baseUrl = 'https://live.icecat.biz/api';
  }

  isAvailable() {
    return Boolean(this.shopname && this.apiToken);
  }

  async lookupProduct(query, options = {}) {
    if (!this.isAvailable()) {
      return null;
    }

    const { gtin, mpn, brand } = query;
    if (!gtin && (!mpn || !brand)) {
      return null;
    }

    const { timeoutMs = 8000 } = options;
    const url = new URL(this.baseUrl);
    url.searchParams.set('lang', 'en');
    url.searchParams.set('shopname', this.shopname);

    if (gtin) {
      url.searchParams.set('GTIN', gtin);
    } else {
      url.searchParams.set('Brand', brand);
      url.searchParams.set('ProductCode', mpn);
    }

    try {
      const headers = { 'Accept': 'application/json' };
      if (this.apiToken) headers['api-token'] = this.apiToken;
      if (this.contentToken) headers['content-token'] = this.contentToken;

      const response = await fetch(url.toString(), {
        headers,
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const productData = data.data;
      if (!productData) return null;

      const general = productData.GeneralInfo || {};
      const gallery = (productData.Gallery || []).map(img => img.Pic).filter(Boolean);
      const specs = {};

      for (const featGroup of productData.FeaturesGroups || []) {
        for (const feat of featGroup.Features || []) {
          const featName = feat.Feature?.Name?.Value;
          const featVal = feat.PresentationValue;
          if (featName && featVal) {
            specs[featName.toLowerCase()] = featVal;
          }
        }
      }

      return {
        icecatId: String(general.IcecatId || ''),
        title: general.Title,
        brand: general.Brand,
        model: general.ProductName,
        gtin: general.GTIN?.[0] || gtin,
        mpn: general.BrandPartCode || mpn,
        description: general.Description?.LongDesc || general.Description?.ShortDesc || '',
        images: gallery,
        primaryImage: general.Image?.Pic || gallery[0] || null,
        specs,
        attribution: 'Product specifications provided by Open Icecat (OPL License)'
      };
    } catch (err) {
      logger.warn({ error: err.message }, 'Icecat product lookup failed');
      return null;
    }
  }
}
