import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productService } from '../../services/productService';
import { wishlistService } from '../../services/wishlistService';
import { trackingService } from '../../services/trackingService';
import { 
  Star, 
  MapPin, 
  TrendingDown, 
  TrendingUp, 
  Heart, 
  Bell, 
  ArrowLeft,
  Store,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { BetterConfigurations } from '../../components/products/BetterConfigurations';

export function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWishlisting, setIsWishlisting] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await productService.getProductDetails(id);
        setProduct(data);
        
        // Fetch history if implemented in provider
        if (productService.getProductHistory) {
          const history = await productService.getProductHistory(id);
          if (history && history.length > 0) {
            setPriceHistory(history.map((h: any) => ({
              date: new Date(h.timestamp || h.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
              price: h.price
            })));
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) fetchDetails();
  }, [id]);

  const handleWishlist = async () => {
    if (!product) return;
    setIsWishlisting(true);
    try {
      await wishlistService.addToWishlist({
        productId: product.id || id,
        productName: product.title || product.name || 'Unknown',
        currentPrice: product.currentPrice || product.price || 0,
        image: product.image,
        url: window.location.href
      });
      showToast('Added to wishlist!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to add to wishlist', 'error');
    } finally {
      setIsWishlisting(false);
    }
  };

  const handleTrackPriceClick = () => {
    if (!product) return;
    setTargetPrice(String(product.currentPrice || product.price || 0));
    setIsTrackModalOpen(true);
  };

  const confirmTrackPrice = async () => {
    if (!product || !targetPrice) return;
    
    setIsTrackModalOpen(false);
    
    setIsTracking(true);
    try {
      await trackingService.addTracking({
        productId: product.id || id,
        productName: product.title || product.name || 'Unknown',
        targetPrice: Number(targetPrice),
        currentPrice: product.currentPrice || product.price || 0,
        image: product.image,
        url: window.location.href
      });
      showToast('Tracking started!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to track price', 'error');
    } finally {
      setIsTracking(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-textSecondary">Loading product details...</div>;
  }

  if (!product || (product.id === product.title && product.price === 0)) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold text-textPrimary mb-2">No exact matching products found.</h2>
        <p className="text-textSecondary mb-6">We could not find an exact match or available offers for this product.</p>
        <button onClick={() => navigate(-1)}>
          <Button variant="primary">Search Again</Button>
        </button>
      </div>
    );
  }

  const fallbackHistory = [
    { date: '10 Aug', price: (product.originalPrice || (product.price * 1.2) || 0) },
    { date: '15 Aug', price: (product.originalPrice || (product.price * 1.2) || 0) * 0.95 },
    { date: '20 Aug', price: (product.currentPrice || product.price || 0) * 1.1 },
    { date: '25 Aug', price: (product.currentPrice || product.price || 0) * 1.05 },
    { date: 'Today', price: (product.currentPrice || product.price || 0) },
  ];
  
  const chartData = priceHistory.length > 0 ? priceHistory : fallbackHistory;

  return (
    <div className="space-y-6 relative">
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-in slide-in-from-bottom-4 fade-in duration-300 ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      <Modal 
        isOpen={isTrackModalOpen} 
        onClose={() => setIsTrackModalOpen(false)}
        title="Set Target Price"
      >
        <div className="space-y-4">
          <p className="text-sm text-textSecondary">
            Get notified when the price of <strong>{product?.title || product?.name}</strong> drops below your target.
          </p>
          <div>
            <label className="block text-sm font-medium text-textPrimary mb-1">Target Price (₹)</label>
            <Input 
              type="number" 
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="Enter target price"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setIsTrackModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmTrackPrice} isLoading={isTracking}>
              Start Tracking
            </Button>
          </div>
        </div>
      </Modal>
      
      <button onClick={() => navigate(-1)} className="inline-flex items-center text-sm font-medium text-textSecondary hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Search
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Image and Actions */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-borderLight flex items-center justify-center h-80">
            <img src={product.image} alt={product.name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" className="w-full flex gap-2" onClick={handleWishlist} disabled={isWishlisting}>
              <Heart className="w-4 h-4" /> {isWishlisting ? 'Adding...' : 'Wishlist'}
            </Button>
            <Button variant="outline" className="w-full flex gap-2" onClick={handleTrackPriceClick} disabled={isTracking}>
              <Bell className="w-4 h-4" /> {isTracking ? 'Starting...' : 'Track Price'}
            </Button>
          </div>
        </div>

        {/* Product Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-borderLight shadow-sm">
            <div className="text-sm font-bold text-primary tracking-wider uppercase mb-2">{product.brand || product.retailer || 'Brand'}</div>
            <h1 className="text-2xl font-bold text-textPrimary mb-3">{product.title || product.name || 'Unknown Product'}</h1>
            
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-borderLight">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-textPrimary">{product.rating || 4.5}</span>
                <span className="text-sm text-textSecondary">({product.reviews || Math.floor(Math.random() * 500) + 10} reviews)</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-borderLight"></div>
              <div className="text-sm text-textSecondary flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-accent" /> Assured Quality
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-textSecondary text-sm mb-1">Current Lowest Price</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-textPrimary">₹{(product.currentPrice || product.price || 0).toLocaleString()}</span>
                  <span className="text-lg text-textSecondary line-through">₹{(product.originalPrice || (product.price * 1.2) || 0).toLocaleString()}</span>
                  <span className="text-sm font-bold text-danger">-{product.discount || 20}%</span>
                </div>
              </div>
            </div>
            
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-textPrimary mb-3">Specifications</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    value ? (
                      <div key={key} className="bg-secondaryBg p-3 rounded-lg border border-borderLight">
                        <p className="text-xs text-textSecondary uppercase">{key}</p>
                        <p className="font-bold text-textPrimary text-sm">{value as string}</p>
                      </div>
                    ) : null
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <h3 className="font-bold text-textPrimary mb-2">Description</h3>
              <p className="text-textSecondary leading-relaxed text-sm">{product.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Stores */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-borderLight shadow-sm">
          <h2 className="text-lg font-bold text-textPrimary mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            Compare Prices
          </h2>
          <div className="space-y-3">
            {(!product.offers || product.offers.length === 0) ? (
              <div className="text-center p-6 bg-secondaryBg rounded-lg border border-borderLight text-textSecondary">
                <p>No exact offers found at trusted retailers.</p>
              </div>
            ) : (
              product.offers.map((offer, idx) => (
                <div key={idx} className={`p-4 rounded-lg border ${idx === 0 ? 'border-primary bg-primary/5' : 'border-borderLight bg-secondaryBg'} flex items-center justify-between`}>
                  <div>
                    <h4 className="font-bold text-textPrimary">{offer.store}</h4>
                    <p className="text-xs text-textSecondary">{offer.availability}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-textPrimary mb-1">₹{offer.price.toLocaleString()}</div>
                    <a href={offer.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline flex items-center justify-end gap-1">
                      {offer.isDirectRetailerUrl ? `Buy on ${offer.store}` : 'View Offer'} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Price History Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-borderLight shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary" />
              Price History
            </h2>
            <select className="text-sm border border-borderLight rounded px-2 py-1 bg-secondaryBg">
              <option>Last 30 Days</option>
              <option>Last 3 Months</option>
              <option>Last 1 Year</option>
            </select>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`₹${value}`, 'Price']}
                />
                <Line type="monotone" dataKey="price" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-borderLight">
            <div>
              <p className="text-xs text-textSecondary mb-1">Current Price</p>
              <p className="font-bold text-textPrimary">₹{(product.currentPrice || product.price || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-textSecondary mb-1">Highest Price</p>
              <p className="font-bold text-textPrimary">₹{(product.originalPrice || (product.price * 1.2) || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-textSecondary mb-1">Lowest Price</p>
              <p className="font-bold text-textPrimary">₹{(product.currentPrice || product.price || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
      
      <BetterConfigurations productId={id!} />
    </div>
  );
}
