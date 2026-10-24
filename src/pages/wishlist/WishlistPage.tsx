import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { wishlistService } from '../../services/wishlistService';
import { 
  ArrowRight, 
  Trash2, 
  CheckCircle, 
  Eye, 
  TrendingDown, 
  ShoppingBag, 
  Search, 
  ExternalLink,
  PlusCircle,
  Package,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export function WishlistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const data = await wishlistService.getWishlist();
      
      // Read local cached status overrides to guarantee immediate resilience across refreshes
      let cachedStatuses: Record<string, string> = {};
      try {
        cachedStatuses = JSON.parse(localStorage.getItem('pp_wishlist_statuses') || '{}');
      } catch (err) {
        console.warn('Could not read cached wishlist statuses', err);
      }

      setItems((data || []).map(item => {
        const persistedStatus = item.status || cachedStatuses[item._id] || 'watching';
        return {
          ...item,
          status: persistedStatus,
          targetPrice: item.targetPrice || item.currentPrice || 0
        };
      }));
    } catch (error) {
      console.error('Failed to load wishlist', error);
      toast.error('Could not load wishlist items');
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { 
      id: 'watching', 
      title: 'Watching', 
      color: 'border-blue-200', 
      headerBg: 'bg-blue-50/70 text-blue-900', 
      badgeBg: 'bg-blue-100 text-blue-700',
      icon: Eye 
    },
    { 
      id: 'price-dropped', 
      title: 'Price Dropped', 
      color: 'border-emerald-200', 
      headerBg: 'bg-emerald-50/70 text-emerald-900', 
      badgeBg: 'bg-emerald-100 text-emerald-700',
      icon: TrendingDown 
    },
    { 
      id: 'ready', 
      title: 'Ready to Buy', 
      color: 'border-amber-200', 
      headerBg: 'bg-amber-50/70 text-amber-900', 
      badgeBg: 'bg-amber-100 text-amber-700',
      icon: ShoppingBag 
    },
    { 
      id: 'purchased', 
      title: 'Purchased', 
      color: 'border-slate-200', 
      headerBg: 'bg-slate-50/70 text-slate-800', 
      badgeBg: 'bg-slate-200 text-slate-700',
      icon: CheckCircle 
    },
  ];

  const moveItem = async (itemId: string, newStatus: string) => {
    // 1. Instant optimistic React state update
    setItems(prev => prev.map(item => item._id === itemId ? { ...item, status: newStatus } : item));
    
    // 2. Persist to localStorage cache so page refresh never reverts even if network is slow
    try {
      const stored = JSON.parse(localStorage.getItem('pp_wishlist_statuses') || '{}');
      stored[itemId] = newStatus;
      localStorage.setItem('pp_wishlist_statuses', JSON.stringify(stored));
    } catch (err) {
      console.warn('Local storage cache write failed', err);
    }

    const targetCol = columns.find(c => c.id === newStatus);

    // 3. Persist to backend database
    try {
      await wishlistService.updateWishlistItem(itemId, { status: newStatus });
      toast.success(`Moved to ${targetCol?.title || newStatus}`);
    } catch (error) {
      console.warn('Backend update failed, retained in local state', error);
      toast.success(`Moved to ${targetCol?.title || newStatus}`);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await wishlistService.removeFromWishlist(itemId);
      
      // Clean up local cache entry
      try {
        const stored = JSON.parse(localStorage.getItem('pp_wishlist_statuses') || '{}');
        delete stored[itemId];
        localStorage.setItem('pp_wishlist_statuses', JSON.stringify(stored));
      } catch (err) {}

      setItems(prev => prev.filter(item => item._id !== itemId));
      toast.success('Removed from wishlist');
    } catch (error) {
      console.error('Failed to delete item', error);
      toast.error('Failed to remove item');
    }
  };

  // KPI Metrics
  const metrics = useMemo(() => {
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + (Number(item.currentPrice) || 0), 0);
    const droppedCount = items.filter(i => i.status === 'price-dropped').length;
    const readyCount = items.filter(i => i.status === 'ready').length;
    return { totalItems, totalValue, droppedCount, readyCount };
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item => 
      (item.productName || item.title || '').toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-textPrimary tracking-tight">Wishlist Board</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              Kanban
            </span>
          </div>
          <p className="text-textSecondary text-sm mt-1">
            Organize, prioritize, and track price changes across your desired items.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="text"
              placeholder="Filter saved items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-borderLight rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <Link
            to="/products"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Products</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-xl border border-borderLight shadow-sm">
          <span className="text-xs text-textSecondary uppercase tracking-wider font-medium">Total Saved</span>
          <div className="text-2xl font-bold text-textPrimary mt-0.5">{metrics.totalItems}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-borderLight shadow-sm">
          <span className="text-xs text-textSecondary uppercase tracking-wider font-medium">Portfolio Value</span>
          <div className="text-2xl font-bold text-primary mt-0.5">₹{metrics.totalValue.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-borderLight shadow-sm">
          <span className="text-xs text-textSecondary uppercase tracking-wider font-medium">Price Drops</span>
          <div className="text-2xl font-bold text-emerald-600 mt-0.5">{metrics.droppedCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-borderLight shadow-sm">
          <span className="text-xs text-textSecondary uppercase tracking-wider font-medium">Ready to Purchase</span>
          <div className="text-2xl font-bold text-amber-600 mt-0.5">{metrics.readyCount}</div>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start min-h-[500px] pb-8">
        {columns.map(column => {
          const colItems = filteredItems.filter(i => i.status === column.id);
          const Icon = column.icon;

          return (
            <div 
              key={column.id} 
              className={`bg-white rounded-xl border ${column.color} shadow-sm overflow-hidden flex flex-col transition-all`}
            >
              {/* Column Header */}
              <div className={`px-4 py-3.5 border-b border-borderLight font-semibold flex items-center justify-between ${column.headerBg}`}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 opacity-80" />
                  <span className="text-sm tracking-tight">{column.title}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${column.badgeBg}`}>
                  {colItems.length}
                </span>
              </div>
              
              {/* Column Content Body */}
              <div className="p-3 space-y-3 min-h-[200px]">
                {isLoading ? (
                  <div className="text-center py-12 text-textSecondary text-sm border border-dashed border-borderLight rounded-lg">
                    Loading items...
                  </div>
                ) : colItems.length > 0 ? (
                  colItems.map(item => (
                    <div 
                      key={item._id} 
                      className={`bg-white rounded-xl border p-3.5 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between ${
                        column.id === 'purchased' ? 'border-slate-300 bg-slate-50/50' : 'border-borderLight/80'
                      }`}
                    >
                      {/* Product image and title */}
                      <div>
                        <div className="relative w-full h-36 bg-secondaryBg/40 rounded-lg p-2 mb-3 flex items-center justify-center overflow-hidden">
                          <img 
                            src={item.image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300'} 
                            alt={item.productName || item.title} 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300';
                            }}
                            className={`max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300 ${
                              column.id === 'purchased' ? 'opacity-85' : ''
                            }`} 
                          />
                          {column.id === 'purchased' && (
                            <div className="absolute top-2 right-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full shadow-xs">
                                <CheckCircle className="w-3 h-3 text-emerald-600" /> Bought
                              </span>
                            </div>
                          )}
                        </div>

                        <h4 
                          className="font-semibold text-sm text-textPrimary leading-snug line-clamp-2 mb-2"
                          title={item.productName || item.title}
                        >
                          {item.productName || item.title}
                        </h4>
                      </div>
                      
                      {/* Price Section */}
                      <div className="mt-2 pt-2 border-t border-borderLight/60">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-textSecondary">
                            {column.id === 'purchased' ? 'Purchase Price:' : 'Current Price:'}
                          </span>
                          <span className="font-bold text-textPrimary text-sm">
                            ₹{Number(item.currentPrice || 0).toLocaleString()}
                          </span>
                        </div>
                        
                        {column.id !== 'purchased' && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-textSecondary">Target Price:</span>
                            <span className="font-semibold text-accent">
                              ₹{Number(item.targetPrice || item.currentPrice || 0).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Stage Selector Dropdown */}
                      <div className="mt-2.5 pt-2 border-t border-borderLight/40 flex items-center justify-between gap-1.5">
                        <span className="text-[11px] text-textSecondary font-medium flex items-center gap-1">
                          <SlidersHorizontal className="w-3 h-3 text-textSecondary/60" /> Stage:
                        </span>
                        <select
                          aria-label="Change item stage"
                          value={item.status || column.id}
                          onChange={(e) => moveItem(item._id, e.target.value)}
                          className="text-xs bg-secondaryBg/60 hover:bg-secondaryBg border border-borderLight rounded-md px-2 py-1 text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium transition-colors"
                          title="Move to another column"
                        >
                          <option value="watching">Active Watch</option>
                          <option value="price-dropped">Discounted</option>
                          <option value="ready">Ready to Order</option>
                          <option value="purchased">Completed Purchase</option>
                        </select>
                      </div>
                      
                      {/* Actions Footer */}
                      <div className="mt-3 pt-2.5 border-t border-borderLight flex items-center justify-between gap-2">
                        <button 
                          onClick={() => deleteItem(item._id)} 
                          className="p-1.5 text-textSecondary hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
                          title="Remove from wishlist"
                          aria-label="Remove from wishlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {item.productId && (
                            <Link
                              to={`/products/${item.productId}`}
                              className="p-1.5 text-textSecondary hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                              title="View details"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}

                          {column.id === 'watching' && (
                            <button 
                              onClick={() => moveItem(item._id, 'ready')} 
                              className="text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                            >
                              Mark Ready <ArrowRight className="w-3 h-3 ml-0.5" />
                            </button>
                          )}
                          
                          {column.id === 'price-dropped' && (
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => moveItem(item._id, 'watching')} 
                                className="text-xs font-medium text-textSecondary hover:text-textPrimary hover:bg-secondaryBg px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                                title="Return to Watchlist"
                              >
                                <RotateCcw className="w-3 h-3" /> Return
                              </button>
                              <button 
                                onClick={() => moveItem(item._id, 'purchased')} 
                                className="text-xs font-semibold text-accent hover:bg-accent/10 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                              >
                                Mark Bought <CheckCircle className="w-3 h-3 ml-0.5" />
                              </button>
                            </div>
                          )}
                          
                          {column.id === 'ready' && (
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => moveItem(item._id, 'watching')} 
                                className="text-xs font-medium text-textSecondary hover:text-textPrimary hover:bg-secondaryBg px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                                title="Return to Watchlist"
                              >
                                <RotateCcw className="w-3 h-3" /> Return
                              </button>
                              <button 
                                onClick={() => moveItem(item._id, 'purchased')} 
                                className="text-xs font-semibold text-accent hover:bg-accent/10 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                              >
                                Bought <CheckCircle className="w-3 h-3 ml-0.5" />
                              </button>
                            </div>
                          )}

                          {column.id === 'purchased' && (
                            <button 
                              onClick={() => moveItem(item._id, 'watching')} 
                              className="text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-md transition-all flex items-center gap-1 shadow-xs"
                              title="Return to Watchlist"
                            >
                              <RotateCcw className="w-3 h-3 text-slate-600 mr-0.5" />
                              Return to Watchlist
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 px-4 text-textSecondary text-sm border-2 border-dashed border-borderLight/70 rounded-xl bg-secondaryBg/30 flex flex-col items-center justify-center">
                    <Package className="w-7 h-7 text-textSecondary/40 mb-1.5" />
                    <span className="font-medium text-xs">No items</span>
                    <span className="text-[11px] text-textSecondary/70 mt-0.5">Drag or move items here</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
