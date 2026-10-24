import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Filter, Star, MapPin, Bell, X, Loader2 } from 'lucide-react';
import { productService } from '../../services/productService';
import { trackingService } from '../../services/trackingService';
import { Button } from '../../components/ui/Button';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

export function ProductSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(Boolean(initialQuery || initialCategory));
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());

  // Refs for race-condition prevention and high-performance caching
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchIdRef = useRef<number>(0);
  const debounceTimerRef = useRef<any>(null);
  const searchCacheRef = useRef<Map<string, any[]>>(new Map());
  const isMountedRef = useRef(false);

  /**
   * Main search executor:
   * - Cancels previous in-flight requests immediately
   * - Clears old products immediately to avoid showing stale items
   * - Checks fast client-side query cache for 0ms instant response
   * - Guards against out-of-order responses with monotonic searchId
   */
  const executeSearch = useCallback(async (searchQuery: string, categoryFilter: string) => {
    const cleanQuery = searchQuery.trim();
    const cleanCategory = categoryFilter.trim();

    // If both query and category are empty, reset to initial landing state
    if (!cleanQuery && !cleanCategory) {
      setProducts([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    const cacheKey = `${cleanQuery.toLowerCase()}::${cleanCategory.toLowerCase()}`;
    const searchId = ++searchIdRef.current;

    // Abort previous pending network request immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Check instant in-memory cache
    if (searchCacheRef.current.has(cacheKey)) {
      const cached = searchCacheRef.current.get(cacheKey)!;
      setProducts(cached);
      setIsLoading(false);
      return;
    }

    // Immediately remove old products from the screen so they don't linger
    setProducts([]);
    setIsLoading(true);

    try {
      const results = await productService.searchProducts(
        cleanQuery,
        { category: cleanCategory },
        { signal: abortControllerRef.current.signal }
      );

      // Discard response if a newer search was initiated in the meantime
      if (searchIdRef.current !== searchId) {
        return;
      }

      const validResults = Array.isArray(results) ? results : [];
      searchCacheRef.current.set(cacheKey, validResults);
      setProducts(validResults);
    } catch (error: any) {
      // Ignore user-initiated aborts
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
        return;
      }
      if (searchIdRef.current !== searchId) {
        return;
      }
      console.error("Error fetching products", error);
      // Ensure old products are completely cleared on error
      setProducts([]);
      toast.error('Unable to fetch products. Please try another search.');
    } finally {
      if (searchIdRef.current === searchId) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initial load: Only execute search if initial query or category is provided in URL
  useEffect(() => {
    if (initialQuery || initialCategory) {
      executeSearch(initialQuery, initialCategory);
    }
    isMountedRef.current = true;
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Debounced search when user types in the input
  useEffect(() => {
    if (!isMountedRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const currentUrlQ = searchParams.get('q') || '';
    if (query === currentUrlQ) {
      return;
    }

    // Clear search state when input is emptied
    if (!query.trim()) {
      setSearchParams(category ? { category } : {});
      executeSearch('', category);
      return;
    }

    // Responsive 300ms debounce for typing
    debounceTimerRef.current = setTimeout(() => {
      const params: Record<string, string> = { q: query };
      if (category) params.category = category;
      setSearchParams(params);
      executeSearch(query, category);
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query, category, searchParams, setSearchParams, executeSearch]);

  // Immediate search on form submit (Enter key or button click)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const params: Record<string, string> = {};
    if (query.trim()) params.q = query.trim();
    if (category) params.category = category;
    setSearchParams(params);
    executeSearch(query, category);
  };

  // Immediate category filter change
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setCategory(newCategory);
    const params: Record<string, string> = {};
    if (query.trim()) params.q = query.trim();
    if (newCategory) params.category = newCategory;
    setSearchParams(params);
    executeSearch(query, newCategory);
  };

  // Immediate clear search
  const handleClearSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setQuery('');
    setCategory('');
    setSearchParams({});
    setProducts([]);
    setHasSearched(false);
  };

  const handleQuickSearch = (term: string) => {
    setQuery(term);
    const params: Record<string, string> = { q: term };
    if (category) params.category = category;
    setSearchParams(params);
    executeSearch(term, category);
  };

  // Optimistic tracking toggle
  const handleOptimisticTrack = async (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    const pid = product.id || product._id;
    const isCurrentlyTracked = trackedIds.has(pid);

    // Optimistically update UI
    setTrackedIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyTracked) next.delete(pid);
      else next.add(pid);
      return next;
    });

    toast.success(isCurrentlyTracked ? 'Removed from tracked products' : `Price alert enabled for ${product.title || product.name}!`);

    try {
      if (!isCurrentlyTracked) {
        await trackingService.addTracking(pid, product.currentPrice || product.price);
      }
    } catch (_err) {
      // Rollback on failure
      setTrackedIds(prev => {
        const next = new Set(prev);
        if (isCurrentlyTracked) next.add(pid);
        else next.delete(pid);
        return next;
      });
      toast.error('Could not update tracking alert. Please try again.');
    }
  };

  const popularSearches = [
    'iPhone 16',
    'Samsung Galaxy S24',
    'MacBook Air M3',
    'Sony WH-1000XM5',
    'Nike Running Shoes',
    'Noise Smartwatch'
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Search Products</h1>
          <p className="text-textSecondary text-sm mt-1">Real-time price discovery and live store comparisons across India.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-borderLight shadow-sm flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textSecondary" />
            <input 
              type="text" 
              placeholder="Search for a product (e.g. Samsung Galaxy, Nike Shoes)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-background border border-borderLight rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-textPrimary"
            />
            {isLoading ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
            ) : query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  if (category) {
                    setSearchParams({ category });
                    executeSearch('', category);
                  } else {
                    handleClearSearch();
                  }
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary p-0.5 rounded-full hover:bg-secondaryBg transition-colors"
                aria-label="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
          <Button type="submit" className="shrink-0" isLoading={isLoading}>
            Search
          </Button>
        </form>

        <div className="flex gap-2">
          <select 
            value={category}
            onChange={handleCategoryChange}
            className="px-4 py-2.5 bg-background border border-borderLight rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-textPrimary text-sm font-medium"
          >
            <option value="">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Clothing">Clothing</option>
            <option value="Home">Home</option>
          </select>
          <Button 
            variant="secondary" 
            className="px-3"
            onClick={() => {
              if (category) {
                setCategory('');
                const params: Record<string, string> = {};
                if (query.trim()) params.q = query.trim();
                setSearchParams(params);
                executeSearch(query, '');
              }
            }}
            title={category ? `Clear filter: ${category}` : 'Filter'}
          >
            <Filter className={`w-5 h-5 ${category ? 'text-primary' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Query status header if search was performed */}
      {!isLoading && hasSearched && (query.trim() || category) && (
        <div className="flex items-center justify-between text-sm text-textSecondary px-1">
          <span>
            {products.length > 0 ? (
              <>Showing <strong>{products.length}</strong> {products.length === 1 ? 'product' : 'distinct products'}{query ? <> for "<strong>{query}</strong>"</> : ''}{category ? <> in <strong>{category}</strong></> : ''}</>
            ) : (
              <>No results{query ? <> for "<strong>{query}</strong>"</> : ''}{category ? <> in <strong>{category}</strong></> : ''}</>
            )}
          </span>
          <button 
            type="button" 
            onClick={handleClearSearch}
            className="text-xs text-primary hover:underline font-medium"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-borderLight p-4 animate-pulse">
              <div className="w-full h-48 bg-secondaryBg rounded-lg mb-4"></div>
              <div className="h-4 bg-secondaryBg rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-secondaryBg rounded w-1/2 mb-4"></div>
              <div className="h-6 bg-secondaryBg rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : !hasSearched ? (
        /* Engaging Landing State before user searches */
        <div className="bg-white rounded-2xl border border-borderLight p-8 md:p-12 text-center shadow-sm space-y-6">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Search className="w-8 h-8" />
          </div>
          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="text-xl md:text-2xl font-bold text-textPrimary">Search Millions of Live Products</h2>
            <p className="text-textSecondary text-sm leading-relaxed">
              Find guaranteed lowest prices with live multi-store comparison across Flipkart, Amazon, Croma, Vijay Sales, Reliance Digital and more.
            </p>
          </div>

          <div className="pt-2">
            <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">Popular Searches</p>
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
              {popularSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => handleQuickSearch(term)}
                  className="px-3.5 py-1.5 bg-secondaryBg hover:bg-primary/10 hover:text-primary text-textPrimary text-xs font-medium rounded-full border border-borderLight transition-all cursor-pointer"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-borderLight max-w-3xl mx-auto text-left">
            <div className="p-4 bg-background rounded-xl border border-borderLight/60">
              <div className="text-primary font-bold text-sm mb-1">⚡ Live Multi-Store Deals</div>
              <p className="text-textSecondary text-xs">Accurately aggregates live prices directly from top authorized retailers.</p>
            </div>
            <div className="p-4 bg-background rounded-xl border border-borderLight/60">
              <div className="text-primary font-bold text-sm mb-1">🛡️ No Duplicate Clutter</div>
              <p className="text-textSecondary text-xs">Combines offers per product so you compare stores seamlessly.</p>
            </div>
            <div className="p-4 bg-background rounded-xl border border-borderLight/60">
              <div className="text-primary font-bold text-sm mb-1">🔔 Free Price Tracking</div>
              <p className="text-textSecondary text-xs">Set target price alerts and get notified whenever a price drops.</p>
            </div>
          </div>
        </div>
      ) : products.length === 0 ? (
        /* Empty Results State */
        <div className="text-center py-20 bg-white rounded-xl border border-borderLight">
          <Search className="w-12 h-12 text-borderLight mx-auto mb-4" />
          <h3 className="text-lg font-bold text-textPrimary">No products found</h3>
          <p className="text-textSecondary mt-1">Try a different search term or clear filters.</p>
          <Button 
            variant="secondary" 
            className="mt-4" 
            onClick={handleClearSearch}
          >
            Clear Search
          </Button>
        </div>
      ) : (
        /* Product Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            const pid = product.id || product._id || product.title;
            const currentPrice = product.currentPrice || product.price || 0;
            const originalPrice = product.originalPrice || Math.round(currentPrice * 1.15);
            const discount = product.discount || (originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 10);
            const storeCount = product.stores || product.offersCount || 1;
            const storeName = product.lowestStore || product.retailer || 'Retailer';

            return (
              <Link 
                to={`/products/${pid}`} 
                key={pid} 
                className="bg-white rounded-xl border border-borderLight overflow-hidden hover:shadow-md transition-shadow group flex flex-col cursor-pointer"
              >
                <div className="relative h-48 bg-secondaryBg overflow-hidden p-4 flex items-center justify-center group-hover:bg-white transition-colors">
                  <img 
                    src={product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400'} 
                    alt={product.title || product.name || 'Product'} 
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400';
                    }}
                  />
                  {discount > 0 && (
                    <div className="absolute top-2 left-2 bg-danger text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                      {discount}% OFF
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label="Track price alerts"
                    onClick={(e) => handleOptimisticTrack(e, product)}
                    className={`absolute top-2 right-2 p-1.5 rounded-full shadow-sm transition-colors ${
                      trackedIds.has(pid)
                        ? 'bg-primary text-white shadow'
                        : 'bg-white/90 hover:bg-white text-textSecondary hover:text-primary'
                    }`}
                  >
                    <Bell className={`w-3.5 h-3.5 ${trackedIds.has(pid) ? 'fill-white' : ''}`} />
                  </button>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <div className="text-xs text-primary font-bold tracking-wide uppercase mb-1">
                    {product.brand || storeName}
                  </div>
                  <h3 className="font-bold text-textPrimary leading-tight mb-2 line-clamp-2">
                    {product.title || product.name || 'Unknown Product'}
                  </h3>
                  
                  <div className="flex items-center gap-1 mb-3">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium text-textPrimary">{product.rating || 4.5}</span>
                    <span className="text-xs text-textSecondary">({product.reviews || product.reviewCount || 100})</span>
                  </div>

                  <div className="mt-auto pt-4 border-t border-borderLight flex items-end justify-between">
                    <div>
                      {originalPrice > currentPrice && (
                        <p className="text-xs text-textSecondary line-through">₹{originalPrice.toLocaleString('en-IN')}</p>
                      )}
                      <p className="text-lg font-bold text-textPrimary">₹{currentPrice.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-textSecondary flex items-center gap-1 justify-end">
                        <MapPin className="w-3 h-3" /> {storeCount} {storeCount === 1 ? 'store' : 'stores'}
                      </p>
                      <p className="text-xs font-medium text-accent">from {storeName}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
