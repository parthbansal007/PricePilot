import React, { useState } from 'react';
import { Search, MapPin, Tag, ExternalLink, ShieldCheck } from 'lucide-react';
import { productService } from '../../services/productService';
import { Button } from '../../components/ui/Button';

export function ComparePricesPage() {
  const [query, setQuery] = useState('');
  const [comparison, setComparison] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    
    setIsLoading(true);
    try {
      const data = await productService.compareProducts(query);
      setComparison(data);
    } catch (error) {
      console.error("Error comparing products", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Compare Prices</h1>
          <p className="text-textSecondary text-sm mt-1">Find the absolute best deal across top retailers instantly.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-borderLight shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textSecondary" />
            <input 
              type="text" 
              placeholder="Enter product name (e.g. Sony WH-1000XM5)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-borderLight rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-textPrimary"
            />
          </div>
          <Button type="submit" className="shrink-0" isLoading={isLoading} disabled={!query}>
            Compare Now
          </Button>
        </form>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-borderLight shadow-sm">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-textPrimary font-bold">Scanning retailers...</p>
          <p className="text-textSecondary text-sm">Searching for the best prices across the web.</p>
        </div>
      )}

      {!isLoading && comparison && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-gradient-to-r from-accent/10 to-transparent p-6 rounded-xl border border-accent/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-textSecondary uppercase tracking-wider mb-1">Best Price Found</h2>
              <div className="text-4xl font-black text-accent mb-1">
                {comparison.bestPrice ? `₹${comparison.bestPrice.toLocaleString()}` : 'N/A'}
              </div>
              <p className="text-textPrimary text-sm font-medium flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-accent" /> Verified PricePilot Deal
              </p>
            </div>
            {comparison.results && comparison.results.length > 0 && comparison.results[0].url && (
              <a 
                href={comparison.results[0].url} 
                target="_blank" 
                rel="noreferrer" 
                className="px-6 py-3 bg-accent text-white rounded-lg font-bold hover:bg-accent/90 transition-colors flex items-center gap-2 shadow-lg shadow-accent/20"
              >
                Grab Best Deal <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          <div className="bg-white rounded-xl border border-borderLight shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-borderLight flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-textPrimary">Retailer Offers</h3>
            </div>
            
            <div className="divide-y divide-borderLight">
              {comparison.results && comparison.results.length > 0 ? (
                comparison.results.map((offer: any, idx: number) => (
                  <div key={idx} className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-secondaryBg ${idx === 0 ? 'bg-primary/5' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-white border border-borderLight flex items-center justify-center font-bold text-primary shadow-sm">
                        {offer.retailer.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-textPrimary text-lg">{offer.retailer}</h4>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${offer.availability.includes('In Stock') ? 'bg-green-100 text-green-700' : 'bg-secondaryBg text-textSecondary border border-borderLight'}`}>
                          {offer.availability}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 sm:text-right">
                      <div>
                        <div className="text-2xl font-bold text-textPrimary">₹{offer.price.toLocaleString()}</div>
                        {idx === 0 && (
                          <div className="text-xs font-bold text-accent">Lowest Price</div>
                        )}
                      </div>
                      <a 
                        href={offer.url || '#'} 
                        target="_blank" 
                        rel="noreferrer" 
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${idx === 0 ? 'bg-primary text-white hover:bg-primary/90' : 'bg-white border border-borderLight text-textPrimary hover:bg-secondaryBg'}`}
                      >
                        Visit Store <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-textSecondary">
                  No retailer offers found for this product.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!isLoading && !comparison && (
        <div className="text-center py-20 bg-white rounded-xl border border-borderLight shadow-sm">
          <Tag className="w-16 h-16 text-borderLight mx-auto mb-4" />
          <h3 className="text-xl font-bold text-textPrimary mb-2">Compare Across Retailers</h3>
          <p className="text-textSecondary max-w-md mx-auto">
            Search for a product above to instantly compare prices from Amazon, Flipkart, Croma, and more.
          </p>
        </div>
      )}
    </div>
  );
}
