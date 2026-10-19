import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, AlertCircle, ArrowRight, ThumbsUp, Clock, HelpCircle, ShieldCheck, AlertTriangle, Database } from 'lucide-react';
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
        confidence: data.confidence || 'HIGH',
        insufficientHistory: data.insufficientHistory,
        dealHonesty: data.dealHonesty,
        breakdown: data.breakdown,
        dataSources: data.dataSources,
        percentiles: data.percentiles,
        factors: data.factors || [],
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

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'HIGH':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">High Confidence</span>;
      case 'MEDIUM':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Medium Confidence</span>;
      case 'LOW':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Low Confidence</span>;
      case 'INSUFFICIENT':
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">Insufficient History</span>;
    }
  };

  const getHonestyBadge = (honesty: any) => {
    if (!honesty) return null;
    if (honesty.level === 'HONEST') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
          <ShieldCheck className="w-3.5 h-3.5" /> Honest Pricing ({honesty.score}/100)
        </span>
      );
    }
    if (honesty.level === 'SUSPICIOUS') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5" /> Suspicious Discount ({honesty.score}/100)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
        <AlertCircle className="w-3.5 h-3.5" /> Deceptive / Fake Discount ({honesty.score}/100)
      </span>
    );
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
            AI Shopping Advisor (Smart Buy Score V2)
          </h1>
          <p className="text-textSecondary text-sm mt-1">Percentile price ranking, fake-discount detection, and transparent factor breakdown.</p>
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
            <div className={`p-6 rounded-xl border-2 ${
              recommendation.decision === 'BUY_NOW' ? 'border-accent bg-accent/5' : 
              recommendation.decision === 'WAIT' ? 'border-yellow-500 bg-yellow-500/5' : 
              recommendation.decision === 'BUY' ? 'border-emerald-500 bg-emerald-50/50' :
              'border-primary bg-primary/5'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-textSecondary uppercase tracking-wider">Smart Buy Verdict</span>
                    {getConfidenceBadge(recommendation.confidence)}
                  </div>
                  <div className={`text-4xl font-black mb-3 ${
                    recommendation.decision === 'BUY_NOW' ? 'text-accent' : 
                    recommendation.decision === 'WAIT' ? 'text-yellow-600' : 
                    recommendation.decision === 'BUY' ? 'text-emerald-600' :
                    'text-primary'
                  }`}>
                    {recommendation.decision.replace('_', ' ')}
                  </div>
                  <p className="text-textPrimary font-medium leading-relaxed">
                    {recommendation.reasoning}
                  </p>
                </div>
                <div className={`p-4 rounded-full ${
                  recommendation.decision === 'BUY_NOW' ? 'bg-accent/20 text-accent' : 
                  recommendation.decision === 'WAIT' ? 'bg-yellow-500/20 text-yellow-600' : 
                  recommendation.decision === 'BUY' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-primary/20 text-primary'
                }`}>
                  {recommendation.decision === 'BUY_NOW' ? <ThumbsUp className="w-8 h-8" /> : 
                   recommendation.decision === 'WAIT' ? <Clock className="w-8 h-8" /> : 
                   <HelpCircle className="w-8 h-8" />}
                </div>
              </div>

              {/* Stats Bar */}
              <div className="mt-6 pt-6 border-t border-borderLight/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-textSecondary mb-1">Current Price</p>
                  <p className="font-bold text-textPrimary">₹{recommendation.currentPrice.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-textSecondary mb-1">Historical Median</p>
                  <p className="font-bold text-textPrimary">₹{Number(recommendation.historicalAverage.toFixed(2)).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-textSecondary mb-1">Smart Buy Score</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-primary">{recommendation.score}</span>
                    <span className="text-xs text-textSecondary">/ 100</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-textSecondary mb-1">Deal Honesty</p>
                  <div>{getHonestyBadge(recommendation.dealHonesty)}</div>
                </div>
              </div>

              {/* Data Sources Footnote */}
              {recommendation.dataSources && (
                <div className="mt-4 pt-3 border-t border-borderLight/40 flex items-center justify-between text-xs text-textSecondary">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-primary" />
                    Based on {recommendation.dataSources.totalPoints} price points ({recommendation.dataSources.historySpanDays} days history)
                  </span>
                  <span>
                    {recommendation.dataSources.backfilledPoints} Keepa backfilled • {recommendation.dataSources.selfCollectedPoints} PricePilot tracked
                  </span>
                </div>
              )}
            </div>

            {/* Score Factor Breakdown */}
            {recommendation.breakdown && Object.keys(recommendation.breakdown).length > 0 && (
              <div className="bg-white p-6 rounded-xl border border-borderLight shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-textPrimary flex items-center justify-between">
                  <span>Transparent Factor Breakdown</span>
                  <span className="text-xs font-normal text-textSecondary">Smart Buy Score V2 Math</span>
                </h3>
                
                <div className="space-y-3">
                  {recommendation.breakdown.percentileFactor && (
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-textPrimary">Historical Price Percentile (40% Weight)</span>
                        <span className="text-primary">{recommendation.breakdown.percentileFactor.score}/100</span>
                      </div>
                      <div className="w-full bg-secondaryBg rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${recommendation.breakdown.percentileFactor.score}%` }}></div>
                      </div>
                      <p className="text-xs text-textSecondary mt-1">{recommendation.breakdown.percentileFactor.label}</p>
                    </div>
                  )}

                  {recommendation.breakdown.trendFactor && (
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-textPrimary">Price Trend & Volatility (20% Weight)</span>
                        <span className="text-primary">{recommendation.breakdown.trendFactor.score}/100</span>
                      </div>
                      <div className="w-full bg-secondaryBg rounded-full h-2">
                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${recommendation.breakdown.trendFactor.score}%` }}></div>
                      </div>
                      <p className="text-xs text-textSecondary mt-1">{recommendation.breakdown.trendFactor.label}</p>
                    </div>
                  )}

                  {recommendation.breakdown.dealHonestyFactor && (
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-textPrimary">Deal Honesty & Non-Deception (20% Weight)</span>
                        <span className={recommendation.dealHonesty?.level === 'HONEST' ? 'text-green-600' : 'text-amber-600'}>
                          {recommendation.breakdown.dealHonestyFactor.score}/100
                        </span>
                      </div>
                      <div className="w-full bg-secondaryBg rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${recommendation.dealHonesty?.level === 'HONEST' ? 'bg-green-500' : 'bg-amber-500'}`} 
                          style={{ width: `${recommendation.breakdown.dealHonestyFactor.score}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-textSecondary mt-1">{recommendation.breakdown.dealHonestyFactor.label}</p>
                    </div>
                  )}

                  {recommendation.breakdown.seasonalFactor && (
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-textPrimary">Sale Calendar & Festival Timing (10% Weight)</span>
                        <span className="text-primary">{recommendation.breakdown.seasonalFactor.score}/100</span>
                      </div>
                      <div className="w-full bg-secondaryBg rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${recommendation.breakdown.seasonalFactor.score}%` }}></div>
                      </div>
                      <p className="text-xs text-textSecondary mt-1">{recommendation.breakdown.seasonalFactor.label}</p>
                    </div>
                  )}

                  {recommendation.breakdown.budgetFactor && (
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-textPrimary">Personal Budget Affordability (10% Weight)</span>
                        <span className="text-primary">{recommendation.breakdown.budgetFactor.score}/100</span>
                      </div>
                      <div className="w-full bg-secondaryBg rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${recommendation.breakdown.budgetFactor.score}%` }}></div>
                      </div>
                      <p className="text-xs text-textSecondary mt-1">{recommendation.breakdown.budgetFactor.label}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Price Trend Chart */}
            <div className="bg-white p-6 rounded-xl border border-borderLight shadow-sm">
              <h3 className="text-sm font-bold text-textPrimary mb-4">Price Trend & Distribution</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { date: 'Historical High', price: recommendation.percentiles?.highest || Number((recommendation.historicalAverage * 1.15).toFixed(2)) },
                    { date: 'P75 Upper', price: recommendation.percentiles?.p75 || Number((recommendation.historicalAverage * 1.05).toFixed(2)) },
                    { date: 'Median', price: recommendation.percentiles?.p50 || Number((recommendation.historicalAverage).toFixed(2)) },
                    { date: 'Current Price', price: Number((recommendation.currentPrice).toFixed(2)) },
                    { date: 'Historical Low', price: recommendation.percentiles?.lowest || Number((recommendation.historicalAverage * 0.85).toFixed(2)) },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                    <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(val) => `₹${val/1000}k`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value) => [`₹${value}`, 'Price']}
                    />
                    <Line type="monotone" dataKey="price" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Assessment Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {recommendation.priceAssessment && (
                 <div className="bg-white p-4 rounded-xl border border-borderLight">
                   <h3 className="text-sm font-bold text-textPrimary mb-1">Price Assessment</h3>
                   <p className="text-sm text-textSecondary">{recommendation.priceAssessment}</p>
                 </div>
               )}
               {recommendation.trendAssessment && (
                 <div className="bg-white p-4 rounded-xl border border-borderLight">
                   <h3 className="text-sm font-bold text-textPrimary mb-1">Trend Assessment</h3>
                   <p className="text-sm text-textSecondary">{recommendation.trendAssessment}</p>
                 </div>
               )}
               {recommendation.budgetAssessment && (
                 <div className="bg-white p-4 rounded-xl border border-borderLight">
                   <h3 className="text-sm font-bold text-textPrimary mb-1">Budget Impact</h3>
                   <p className="text-sm text-textSecondary">{recommendation.budgetAssessment}</p>
                 </div>
               )}
               {recommendation.dealHonesty?.flags?.length > 0 && (
                 <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                   <h3 className="text-sm font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                     <AlertTriangle className="w-4 h-4 text-amber-600" />
                     Deal Honesty Warning
                   </h3>
                   <p className="text-xs text-amber-700">{recommendation.dealHonesty.flags.join(' ')}</p>
                 </div>
               )}
            </div>
            
            {(recommendation.caution || recommendation.decision === 'WAIT') && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-yellow-700 text-sm mb-1">Caution / Advisory</p>
                  <p className="text-sm text-yellow-700/80">
                    {recommendation.caution || "Prices are currently higher than historical benchmarks. Waiting for a scheduled sale event is advised."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Alternatives Sidebar */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-borderLight shadow-sm h-fit">
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
      )}

      {!recommendation && !isLoading && (
        <div className="text-center py-16 bg-white rounded-xl border border-borderLight">
          <Bot className="w-16 h-16 text-borderLight mx-auto mb-4" />
          <h3 className="text-lg font-bold text-textPrimary">Awaiting Product Selection</h3>
          <p className="text-textSecondary mt-1">Select a tracked product to run Smart Buy Score V2 analysis with percentile ranking and fake-discount checks.</p>
        </div>
      )}
    </div>
  );
}
