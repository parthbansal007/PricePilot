import React, { useState, useEffect } from 'react';
import { Search, Filter, Star, MapPin, Tag } from 'lucide-react';
import { productService } from '../../services/productService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Link, useSearchParams } from 'react-router-dom';

export function ProductSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProducts = async (searchQuery, categoryFilter) => {
    setIsLoading(true);
    try {
      const results = await productService.searchProducts(searchQuery, { category: categoryFilter });
      setProducts(results);
    } catch (error) {
      console.error("Error fetching products", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch based on URL params
    fetchProducts(initialQuery, initialCategory);
  }, []); // Run only once on mount

  useEffect(() => {
    // Update local state when URL params change (e.g. going back)
    setQuery(searchParams.get('q') || '');
    setCategory(searchParams.get('category') || '');
    fetchProducts(searchParams.get('q') || '', searchParams.get('category') || '');
  }, [searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams({ q: query, category });
  };

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setCategory(newCategory);
    setSearchParams({ q: query, category: newCategory });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Search Products</h1>
          <p className="text-textSecondary text-sm mt-1">Find the best deals across multiple stores.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-borderLight shadow-sm flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textSecondary" />
            <input 
              type="text" 
              placeholder="Search for a product (e.g. Samsung Galaxy)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-borderLight rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-textPrimary"
            />
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
          <Button variant="secondary" className="px-3">
            <Filter className="w-5 h-5" />
          </Button>
        </div>
      </div>

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
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-borderLight">
          <Search className="w-12 h-12 text-borderLight mx-auto mb-4" />
          <h3 className="text-lg font-bold text-textPrimary">No products found</h3>
          <p className="text-textSecondary mt-1">Try a different search term or clear filters.</p>
          <Button 
            variant="secondary" 
            className="mt-4" 
            onClick={() => { setSearchParams({}); setQuery(''); setCategory(''); }}
          >
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <Link to={`/products/${product.id}`} key={product.id} className="bg-white rounded-xl border border-borderLight overflow-hidden hover:shadow-md transition-shadow group flex flex-col cursor-pointer">
              <div className="relative h-48 bg-secondaryBg overflow-hidden p-4 flex items-center justify-center group-hover:bg-white transition-colors">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 bg-danger text-white text-xs font-bold px-2 py-1 rounded">
                  {product.discount || 20}% OFF
                </div>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <div className="text-xs text-primary font-bold tracking-wide uppercase mb-1">{product.brand || product.retailer || 'Brand'}</div>
                <h3 className="font-bold text-textPrimary leading-tight mb-2 line-clamp-2">{product.title || product.name || 'Unknown Product'}</h3>
                
                <div className="flex items-center gap-1 mb-3">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium text-textPrimary">{product.rating || 4.5}</span>
                  <span className="text-xs text-textSecondary">({product.reviews || Math.floor(Math.random() * 500) + 10})</span>
                </div>

                <div className="mt-auto pt-4 border-t border-borderLight flex items-end justify-between">
                  <div>
                    <p className="text-xs text-textSecondary line-through">₹{((product.originalPrice || (product.price * 1.2) || 0)).toLocaleString()}</p>
                    <p className="text-lg font-bold text-textPrimary">₹{(product.currentPrice || product.price || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-textSecondary flex items-center gap-1 justify-end">
                      <MapPin className="w-3 h-3" /> {product.stores || 1} stores
                    </p>
                    <p className="text-xs font-medium text-accent">from {product.lowestStore || product.retailer || 'Retailer'}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
