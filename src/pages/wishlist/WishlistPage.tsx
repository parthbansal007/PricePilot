import React, { useState, useEffect } from 'react';
import { wishlistService } from '../../services/wishlistService';
import { MoreHorizontal, ArrowRight, Trash2, Tag, CheckCircle } from 'lucide-react';

export function WishlistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const data = await wishlistService.getWishlist();
      setItems(data.map(item => ({
        ...item,
        status: 'watching', // Map everything to watching for now as our basic model doesn't store kanban status
        targetPrice: item.currentPrice // Just a fallback, real target is in tracking not wishlist
      })));
    } catch (error) {
      console.error('Failed to load wishlist', error);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { id: 'watching', title: 'Watching', color: 'border-primary', bg: 'bg-primary/5' },
    { id: 'price-dropped', title: 'Price Dropped', color: 'border-accent', bg: 'bg-accent/5' },
    { id: 'ready', title: 'Ready to Buy', color: 'border-yellow-500', bg: 'bg-yellow-500/5' },
    { id: 'purchased', title: 'Purchased', color: 'border-textSecondary', bg: 'bg-secondaryBg' },
  ];

  const moveItem = (itemId, newStatus) => {
    setItems(items.map(item => item._id === itemId ? { ...item, status: newStatus } : item));
  };

  const deleteItem = async (itemId) => {
    try {
      await wishlistService.removeFromWishlist(itemId);
      setItems(items.filter(item => item._id !== itemId));
    } catch (error) {
      console.error('Failed to delete item', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Wishlist Board</h1>
          <p className="text-textSecondary text-sm mt-1">Organize and track your saved items.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start h-[calc(100vh-12rem)] overflow-y-auto pb-8">
        {columns.map(column => (
          <div key={column.id} className={`bg-white rounded-xl border ${column.color} shadow-sm overflow-hidden flex flex-col h-full max-h-full`}>
            <div className={`px-4 py-3 border-b border-borderLight font-bold text-textPrimary flex items-center justify-between ${column.bg}`}>
              {column.title}
              <span className="bg-white px-2 py-0.5 rounded-full text-xs border border-borderLight">
                {items.filter(i => i.status === column.id).length}
              </span>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {isLoading ? (
                <div className="text-center py-8 text-textSecondary text-sm border-2 border-dashed border-borderLight rounded-lg">
                  Loading...
                </div>
              ) : items.filter(i => i.status === column.id).map(item => {
                return (
                  <div key={item._id} className="bg-white rounded-lg border border-borderLight p-3 shadow-sm hover:shadow-md transition-shadow relative group">
                    <img src={item.image || 'https://via.placeholder.com/150'} alt={item.productName} className="w-full h-32 object-contain mix-blend-multiply mb-3" />
                    <h4 className="font-bold text-sm text-textPrimary leading-tight mb-1 line-clamp-2">{item.productName}</h4>
                    
                    <div className="flex items-center justify-between mt-3 mb-1 text-sm">
                      <span className="text-textSecondary text-xs">Current:</span>
                      <span className="font-bold text-textPrimary">₹{item.currentPrice?.toLocaleString() || '-'}</span>
                    </div>
                    
                    {column.id !== 'purchased' && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-textSecondary text-xs">Target:</span>
                        <span className="font-bold text-accent">₹{item.targetPrice.toLocaleString()}</span>
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-borderLight flex gap-2 justify-between">
                      <button onClick={() => deleteItem(item._id)} className="text-textSecondary hover:text-danger p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      {column.id === 'watching' && (
                        <button onClick={() => moveItem(item._id, 'ready')} className="text-xs font-medium text-primary hover:underline flex items-center">
                          Mark Ready <ArrowRight className="w-3 h-3 ml-1" />
                        </button>
                      )}
                      
                      {column.id === 'price-dropped' && (
                        <button onClick={() => moveItem(item._id, 'purchased')} className="text-xs font-medium text-accent hover:underline flex items-center">
                          Mark Bought <CheckCircle className="w-3 h-3 ml-1" />
                        </button>
                      )}
                      
                      {column.id === 'ready' && (
                        <button onClick={() => moveItem(item._id, 'purchased')} className="text-xs font-medium text-accent hover:underline flex items-center">
                          Bought <CheckCircle className="w-3 h-3 ml-1" />
                        </button>
                      )}
                      
                    </div>
                  </div>
                );
              })}
              
              {items.filter(i => i.status === column.id).length === 0 && (
                <div className="text-center py-8 text-textSecondary text-sm border-2 border-dashed border-borderLight rounded-lg">
                  No items
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
