import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { trackingService } from '../../services/trackingService';
import { Target, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export function TrackedProductsPage() {
  const [trackedProducts, setTrackedProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTracked();
  }, []);

  const loadTracked = async () => {
    try {
      const data = await trackingService.getTrackedProducts();
      setTrackedProducts(data);
    } catch (error) {
      console.error('Error fetching tracked products', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTracking = async (id: string) => {
    try {
      await trackingService.removeTracking(id);
      loadTracked();
    } catch (error) {
      console.error('Error stopping tracking', error);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-textSecondary">Loading tracked products...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary">Tracked Products</h1>
          <p className="text-textSecondary mt-1">Manage your price alerts and tracking.</p>
        </div>
      </div>

      {trackedProducts.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-borderLight shadow-sm">
          <Target className="w-16 h-16 mx-auto text-textSecondary opacity-30 mb-4" />
          <h3 className="text-lg font-bold text-textPrimary mb-2">No products tracked yet</h3>
          <p className="text-textSecondary mb-6">Search for products and track them to receive alerts when prices drop.</p>
          <Link to="/products" className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90">
            Search Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trackedProducts.map(tp => (
            <div key={tp._id} className="bg-white rounded-xl border border-borderLight shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <h3 className="font-bold text-textPrimary text-lg mb-2 line-clamp-2" title={tp.productName}>{tp.productName}</h3>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-textSecondary text-sm">Target Price:</span>
                  <span className="font-semibold text-primary">₹{tp.targetPrice?.toLocaleString() || 'Not set'}</span>
                </div>
                
                <div className="h-40 w-full mt-4 bg-secondaryBg/50 rounded-lg p-2 border border-borderLight/50">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tp.priceHistory && tp.priceHistory.length > 0 ? tp.priceHistory.map(h => ({
                      date: new Date(h.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                      price: h.price
                    })) : [{ date: 'Today', price: tp.currentPrice || 0 }]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                      <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} tickFormatter={(val) => `₹${val/1000}k`} width={40} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                        formatter={(value) => [`₹${value}`, 'Price']}
                      />
                      <Line type="monotone" dataKey="price" stroke="#2563EB" strokeWidth={2} dot={{ r: 3, strokeWidth: 1 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="p-4 bg-secondaryBg border-t border-borderLight flex gap-3">
                <Link to={`/products/${tp.productId}`} className="flex-1 text-center py-2 bg-white border border-primary text-primary font-medium rounded-lg hover:bg-primary/5 transition-colors">
                  View Details
                </Link>
                <button 
                  onClick={() => handleStopTracking(tp._id)}
                  className="px-4 py-2 bg-white border border-danger text-danger font-medium rounded-lg hover:bg-danger/5 transition-colors"
                >
                  Stop
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
