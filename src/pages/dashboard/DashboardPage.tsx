import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/dashboardService';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  Target, 
  TrendingDown, 
  Wallet,
  Search,
  ArrowRight,
  Bot
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { trackingService } from '../../services/trackingService';

const spendingData = [
  { name: 'Jan', amount: 12000 },
  { name: 'Feb', amount: 8000 },
  { name: 'Mar', amount: 15000 },
  { name: 'Apr', amount: 9500 },
  { name: 'May', amount: 22000 },
  { name: 'Jun', amount: 10000 },
];

export function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    trackedCount: 0,
    wishlistCount: 0,
    budgetRemaining: 0,
    budgetTotal: 0
  });
  const [trackedProducts, setTrackedProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data = await dashboardService.getDashboardMetrics();
        setMetrics(data);
        const tracked = await trackingService.getTrackedProducts();
        setTrackedProducts(tracked.slice(0, 4)); // Show up to 4 on dashboard
      } catch (error) {
        console.error('Failed to load dashboard metrics', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const budgetRemaining = metrics?.budgetRemaining ?? 0;
  const budgetTotal = metrics?.budgetTotal ?? 0;
  const spent = budgetTotal - budgetRemaining;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-textPrimary">
            Good morning, {user?.name || 'User'}
          </h1>
          <p className="text-textSecondary mt-1">
            Track your purchases, discover better prices and make smarter buying decisions.
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/products" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 font-medium">
            <Search className="w-4 h-4" />
            Search Product
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-borderLight shadow-sm">
          <div className="flex items-center gap-3 text-textSecondary mb-2">
            <Heart className="w-5 h-5 text-accent" />
            <span className="font-medium">Wishlist Items</span>
          </div>
          <div className="text-3xl font-bold text-textPrimary">{isLoading ? '-' : (metrics?.wishlistCount ?? 0)}</div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-borderLight shadow-sm">
          <div className="flex items-center gap-3 text-textSecondary mb-2">
            <Target className="w-5 h-5 text-primary" />
            <span className="font-medium">Tracked Products</span>
          </div>
          <div className="text-3xl font-bold text-textPrimary">{isLoading ? '-' : (metrics?.trackedCount ?? 0)}</div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-borderLight shadow-sm">
          <div className="flex items-center gap-3 text-textSecondary mb-2">
            <TrendingDown className="w-5 h-5 text-accent" />
            <span className="font-medium">Budget Remaining</span>
          </div>
          <div className="text-3xl font-bold text-textPrimary">{isLoading ? '-' : `₹${budgetRemaining.toLocaleString()}`}</div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-borderLight shadow-sm">
          <div className="flex items-center gap-3 text-textSecondary mb-2">
            <Wallet className="w-5 h-5 text-danger" />
            <span className="font-medium">Monthly Spending</span>
          </div>
          <div className="text-3xl font-bold text-textPrimary">{isLoading ? '-' : `₹${spent.toLocaleString()}`}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tracked Products List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-borderLight shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-textPrimary">Your Tracked Products</h2>
            <Link to="/tracked-products" className="text-sm font-medium text-primary hover:underline">View All</Link>
          </div>
          
          {trackedProducts.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-textSecondary">
              <Target className="w-12 h-12 mb-2 opacity-20" />
              <p>No tracked products yet.</p>
              <p className="text-sm mt-1">Search for products and track them to get price drop alerts.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trackedProducts.map(tp => (
                <div key={tp.productId} className="flex items-center justify-between p-4 bg-secondaryBg rounded-lg border border-borderLight">
                  <div className="flex flex-col">
                    <span className="font-bold text-textPrimary text-sm">{tp.productName}</span>
                    <span className="text-xs text-textSecondary">Target: ₹{tp.targetPrice?.toLocaleString()}</span>
                  </div>
                  <Link to={`/products/${tp.productId}`} className="px-3 py-1.5 text-xs font-medium bg-white border border-borderLight text-primary rounded-md hover:bg-primary/5 transition-colors">
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Price Drops */}
        <div className="bg-white p-6 rounded-xl border border-borderLight shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-textPrimary">Recent Price Drops</h2>
            <Link to="/notifications" className="text-sm font-medium text-primary hover:underline">View All</Link>
          </div>
          
          <div className="space-y-4 flex-1 flex flex-col items-center justify-center text-textSecondary text-center">
            <Target className="w-12 h-12 mb-2 opacity-20" />
            <p>No price drops detected recently.</p>
            <p className="text-sm">Track products to get notified when prices fall.</p>
          </div>
          
          <Link to="/products" className="w-full mt-4 py-2 border border-borderLight rounded-lg text-center text-sm font-medium hover:bg-secondaryBg transition-colors flex items-center justify-center gap-2">
            Search Products
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
      
      {/* Smart Recommendations */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 rounded-xl border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Smart Insight
          </h3>
          <p className="text-textSecondary mt-1">
            Track products to unlock personalized AI insights and buying recommendations.
          </p>
        </div>
        <Link to="/advisor" className="px-4 py-2 bg-white border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors whitespace-nowrap font-medium">
          Ask AI Advisor
        </Link>
      </div>
    </div>
  );
}
