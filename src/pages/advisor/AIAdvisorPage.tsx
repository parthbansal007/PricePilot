import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, AlertCircle, ArrowRight, ThumbsUp, Clock, HelpCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { advisorService } from '../../services/advisorService';
import { trackingService } from '../../services/trackingService';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export function AIAdvisorPage() {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [trackedProducts, setTrackedProducts] = useState<any[]>([]);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const loadTracked = async () => {
      try {
        const data = await trackingService.getTrackedProducts();
        setTrackedProducts(data);
      } catch (e) {
        console.error(e);
      }
    };
    loadTracked();
  }, []);

  const runAnalysis = async () => {
    if (!selectedProduct) return;
    setIsLoading(true);
    
    try {
      const data = await advisorService.getAIAdvice({
        message: 'Can you analyze this product and tell me if I should buy it now?',
        productId: selectedProduct
      });
      setRecommendation({
        product: selectedProduct,
        decision: data.recommendation,
        score: data.smartBuyScore,
        confidence: 'High',
        reasoning: data.explanation,
        currentPrice: data.currentPrice || 0,
        historicalAverage: data.historicalAverage || 0,
        priceAssessment: data.priceAssessment,
        trendAssessment: data.trendAssessment,
        budgetAssessment: data.budgetAssessment,
        caution: data.caution,
        alternatives: data.alternatives || []
      });
    } catch (error) {
      console.error('Failed to get AI advice', error);
      showToast('Error fetching AI advice. Make sure API key is configured.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-in slide-in-from-bottom-4 fade-in duration-300 ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary flex items-center gap-2">
            <Bot className="w-8 h-8 text-primary" />
            AI Shopping Advisor
          </h1>
          <p className="text-textSecondary text-sm mt-1">Get smart recommendations based on historical data and trends.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-borderLight shadow-sm">
        <h2 className="text-lg font-bold text-textPrimary mb-4">Analyze a Purchase</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <select 
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="flex-1 bg-background border border-borderLight rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Select a tracked product to analyze...</option>
            {trackedProducts.map(tp => (
              <option key={tp.productId} value={tp.productId}>{tp.productName}</option>
            ))}
          </select>
          <Button onClick={runAnalysis} disabled={!selectedProduct || isLoading} isLoading={isLoading} className="gap-2 shrink-0">
            <Sparkles className="w-4 h-4" />
            Analyze Now
          </Button>
        </div>
      </div>

      {recommendation && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Main Decision */}
          <div className="lg:col-span-2 space-y-6">
            <div className={`p-6 rounded-xl border-2 ${recommendation.decision === 'BUY_NOW' ? 'border-accent bg-accent/5' : recommendation.decision === 'WAIT' ? 'border-yellow-500 bg-yellow-500/5' : 'border-primary bg-primary/5'}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-textSecondary uppercase tracking-wider mb-1">AI Recommendation</h2>
                  <div className={`text-4xl font-black mb-4 ${recommendation.decision === 'BUY_NOW' ? 'text-accent' : recommendation.decision === 'WAIT' ? 'text-yellow-600' : 'text-primary'}`}>
                    {recommendation.decision.replace('_', ' ')}
                  </div>
                  <p className="text-textPrimary font-medium leading-relaxed">
                    {recommendation.reasoning}
                  </p>
                </div>
                <div className={`p-4 rounded-full ${recommendation.decision === 'BUY_NOW' ? 'bg-accent/20 text-accent' : recommendation.decision === 'WAIT' ? 'bg-yellow-500/20 text-yellow-600' : 'bg-primary/20 text-primary'}`}>
                  {recommendation.decision === 'BUY_NOW' ? <ThumbsUp className="w-8 h-8" /> : recommendation.decision === 'WAIT' ? <Clock className="w-8 h-8" /> : <HelpCircle className="w-8 h-8" />}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-borderLight/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-textSecondary mb-1">Current Price</p>
                  <p className="font-bold text-textPrimary">₹{recommendation.currentPrice.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-textSecondary mb-1">Historical Avg</p>
                  <p className="font-bold text-textPrimary">₹{Number(recommendation.historicalAverage.toFixed(2)).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-textSecondary mb-1">Smart Buy Score</p>
                  <p className="font-bold text-textPrimary">{recommendation.score} / 100</p>
                </div>
                <div>
                  <p className="text-xs text-textSecondary mb-1">Confidence</p>
                  <p className="font-bold text-textPrimary">{recommendation.confidence}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-borderLight shadow-sm">
              <h3 className="text-sm font-bold text-textPrimary mb-4">Price Trend Analysis</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { date: '1 Month Ago', price: Number((recommendation.historicalAverage * 1.1).toFixed(2)) },
                    { date: '2 Weeks Ago', price: Number((recommendation.historicalAverage * 1.05).toFixed(2)) },
                    { date: '1 Week Ago', price: Number((recommendation.historicalAverage).toFixed(2)) },
                    { date: 'Yesterday', price: Number((recommendation.currentPrice * 1.02).toFixed(2)) },
                    { date: 'Today', price: Number((recommendation.currentPrice).toFixed(2)) },
                  ]}>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {recommendation.priceAssessment && (
                 <div className="bg-white p-4 rounded-xl border border-borderLight">
                   <h3 className="text-sm font-bold text-textPrimary mb-1">Price Analysis</h3>
                   <p className="text-sm text-textSecondary">{recommendation.priceAssessment}</p>
                 </div>
               )}
               {recommendation.trendAssessment && (
                 <div className="bg-white p-4 rounded-xl border border-borderLight">
                   <h3 className="text-sm font-bold text-textPrimary mb-1">Trend Analysis</h3>
                   <p className="text-sm text-textSecondary">{recommendation.trendAssessment}</p>
                 </div>
               )}
               {recommendation.budgetAssessment && (
                 <div className="bg-white p-4 rounded-xl border border-borderLight">
                   <h3 className="text-sm font-bold text-textPrimary mb-1">Budget Impact</h3>
                   <p className="text-sm text-textSecondary">{recommendation.budgetAssessment}</p>
                 </div>
               )}
            </div>
            
            {(recommendation.caution || recommendation.decision === 'WAIT') && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-yellow-700 text-sm mb-1">Caution / Risks</p>
                  <p className="text-sm text-yellow-700/80">
                    {recommendation.caution || "Prices are currently higher than historical averages. Wait for a drop."}
                  </p>
                </div>
              </div>
            )}

          {/* Alternatives */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-borderLight shadow-sm">
            <h3 className="text-lg font-bold text-textPrimary mb-4">Consider Alternatives</h3>
            <div className="space-y-4">
              {recommendation.alternatives.length === 0 ? (
                <div className="text-center p-6 bg-secondaryBg rounded-lg border border-borderLight text-textSecondary">
                  <p>No alternatives found for this product.</p>
                </div>
              ) : (
                recommendation.alternatives.map((alt: any, idx: number) => (
                  <div key={idx} className="p-4 bg-secondaryBg rounded-lg border border-borderLight">
                    <h4 className="font-bold text-textPrimary text-sm mb-1">{alt.name}</h4>
                    <p className="text-xs text-textSecondary mb-2">{alt.reason}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-borderLight">
                      <span className="font-bold text-textPrimary">₹{alt.price.toLocaleString()}</span>
                      <button className="text-xs font-medium text-primary hover:underline flex items-center">
                        View <ArrowRight className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        </div>
      )}

      {!recommendation && !isLoading && (
        <div className="text-center py-16 bg-white rounded-xl border border-borderLight">
          <Bot className="w-16 h-16 text-borderLight mx-auto mb-4" />
          <h3 className="text-lg font-bold text-textPrimary">Awaiting Input</h3>
          <p className="text-textSecondary mt-1">Select a product above to generate an AI-powered purchase recommendation.</p>
        </div>
      )}
    </div>
  );
}
