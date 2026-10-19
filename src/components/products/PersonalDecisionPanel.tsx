import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  CreditCard, 
  TrendingDown, 
  MapPin, 
  ExternalLink, 
  AlertTriangle, 
  Calendar,
  Wallet as WalletIcon
} from 'lucide-react';
import { decisionService, DecisionResponse } from '../../services/decisionService';
import { Button } from '../ui/Button';

interface PersonalDecisionPanelProps {
  productId: string;
}

export function PersonalDecisionPanel({ productId }: PersonalDecisionPanelProps) {
  const [decision, setDecision] = useState<DecisionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pincode, setPincode] = useState('');
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDecision() {
      setLoading(true);
      setError(null);
      try {
        const data = await decisionService.getDecision({ productId });
        if (isMounted) {
          setDecision(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.response?.data?.message || 'Could not load personal buy decision.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (productId) {
      loadDecision();
    }

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const handlePincodeCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincode || pincode.length !== 6) return;

    setIsPincodeLoading(true);
    try {
      const data = await decisionService.getDecision({ productId, pincode });
      setDecision(data);
    } catch (err: any) {
      console.error('Failed to check pincode delivery', err);
    } finally {
      setIsPincodeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-borderLight p-6 shadow-sm animate-pulse space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200"></div>
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
        </div>
        <div className="h-24 bg-slate-100 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-40 bg-slate-100 rounded-lg"></div>
          <div className="h-40 bg-slate-100 rounded-lg"></div>
          <div className="h-40 bg-slate-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error || !decision) {
    return null; // Fallback gracefully if endpoint fails
  }

  const { verdict, bestSeller, sellers, affordability, waitForecast, delivery } = decision;

  const getVerdictStyles = (decisionType: string) => {
    switch (decisionType) {
      case 'BUY_NOW':
        return {
          border: 'border-emerald-500 bg-emerald-50/70',
          badge: 'bg-emerald-600 text-white',
          text: 'text-emerald-800',
          icon: <CheckCircle2 className="w-7 h-7 text-emerald-600" />
        };
      case 'BUY':
        return {
          border: 'border-primary bg-primary/5',
          badge: 'bg-primary text-white',
          text: 'text-primary',
          icon: <CheckCircle2 className="w-7 h-7 text-primary" />
        };
      case 'WAIT':
        return {
          border: 'border-amber-400 bg-amber-50/70',
          badge: 'bg-amber-500 text-white',
          text: 'text-amber-800',
          icon: <Clock className="w-7 h-7 text-amber-600" />
        };
      case 'CONSIDER':
      default:
        return {
          border: 'border-slate-300 bg-slate-50',
          badge: 'bg-slate-700 text-white',
          text: 'text-slate-800',
          icon: <HelpCircle className="w-7 h-7 text-slate-600" />
        };
    }
  };

  const vStyles = getVerdictStyles(verdict.decision);

  return (
    <div className="bg-white rounded-xl border border-borderLight shadow-sm overflow-hidden space-y-6 p-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-borderLight pb-4">
        <div>
          <h2 className="text-xl font-bold text-textPrimary flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Personal Buy Decision
          </h2>
          <p className="text-xs text-textSecondary mt-0.5">
            Personalized to your wallet cards, budget capacity, and price drop forecasts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-textSecondary flex items-center gap-1 bg-secondaryBg px-2.5 py-1 rounded-md border border-borderLight">
            <WalletIcon className="w-3.5 h-3.5 text-primary" />
            Wallet Optimized
          </span>
        </div>
      </div>

      {/* Primary Verdict Hero */}
      <div className={`p-5 rounded-xl border-2 ${vStyles.border} transition-all`}>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-0.5 rounded-full text-xs font-black tracking-wider uppercase ${vStyles.badge}`}>
                {verdict.decision.replace('_', ' ')}
              </span>
              {bestSeller.totalSavings > 0 && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  Save ₹{bestSeller.totalSavings.toLocaleString()}
                </span>
              )}
            </div>
            <h3 className={`text-lg font-bold ${vStyles.text}`}>
              {verdict.headline}
            </h3>
            <p className="text-sm text-textPrimary leading-relaxed">
              {verdict.summary}
            </p>
          </div>
          <div className="hidden sm:flex shrink-0 p-3 bg-white/80 rounded-full shadow-sm">
            {vStyles.icon}
          </div>
        </div>
      </div>

      {/* Grid of Decision Dimensions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dimension 1: Effective Price & Sellers Table */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-bold text-textPrimary flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-primary" />
              Sellers by Effective Price (Wallet Applied)
            </span>
            <span className="text-xs font-normal text-textSecondary">
              Ranked lowest effective cost
            </span>
          </h3>

          <div className="space-y-2.5">
            {sellers.map((seller, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-xl border transition-all ${
                  idx === 0 
                    ? 'border-emerald-500 bg-emerald-50/30 shadow-sm' 
                    : 'border-borderLight bg-secondaryBg'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-textPrimary text-base">{seller.retailer}</span>
                      {idx === 0 && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-600 text-white rounded">
                          Best Offer
                        </span>
                      )}
                      <span className="text-xs text-textSecondary">{seller.availability}</span>
                    </div>

                    {seller.appliedRule ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{seller.appliedRule.description}</span>
                        <span className="text-[10px] text-textSecondary">({seller.appliedRule.verificationNote})</span>
                      </div>
                    ) : (
                      <p className="text-xs text-textSecondary">{seller.explanation}</p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-textPrimary">
                          ₹{seller.effectivePrice.toLocaleString()}
                        </span>
                        {seller.totalSavings > 0 && (
                          <span className="text-xs text-textSecondary line-through">
                            ₹{seller.listedPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <a 
                      href={seller.productUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline bg-white px-3 py-1.5 rounded-lg border border-borderLight shadow-sm hover:border-primary transition-all"
                    >
                      {seller.isDirectRetailerUrl ? `Buy on ${seller.retailer}` : 'View Deal'}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dimension 2 & 3: Affordability & Wait Forecaster */}
        <div className="space-y-4">
          {/* Affordability Meter */}
          <div className="bg-secondaryBg p-4 rounded-xl border border-borderLight space-y-3">
            <h3 className="text-sm font-bold text-textPrimary flex items-center justify-between">
              <span>Personal Affordability</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                affordability.affordableNow 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {affordability.affordableNow ? 'Fits in Budget' : 'Breaches Limit'}
              </span>
            </h3>

            {affordability.hasBudget ? (
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-textSecondary mb-1">
                    <span>Budget Impact</span>
                    <span className="font-bold text-textPrimary">{affordability.budgetImpactPercent}% of Monthly Limit</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${affordability.affordableNow ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, affordability.budgetImpactPercent)}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-xs text-textSecondary leading-relaxed">
                  {affordability.advice}
                </p>
                {!affordability.affordableNow && (
                  <div className="text-xs font-semibold text-amber-800 flex items-center gap-1 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Earliest safe purchase: {new Date(affordability.earliestSafeDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-textSecondary">
                Set a monthly budget in the Budget tab to enable real-time affordability analysis.
              </p>
            )}
          </div>

          {/* Wait Forecaster Card */}
          <div className="bg-secondaryBg p-4 rounded-xl border border-borderLight space-y-3">
            <h3 className="text-sm font-bold text-textPrimary flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-primary" />
                Price Drop Forecast
              </span>
              <span className="text-[10px] text-textSecondary">
                {waitForecast.backtestDataDays}d backtest
              </span>
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-lg border border-borderLight">
                <p className="text-[10px] text-textSecondary">In 7 Days</p>
                <p className="font-bold text-sm text-textPrimary">{waitForecast.dropProbability7Days}%</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-borderLight">
                <p className="text-[10px] text-textSecondary">In 14 Days</p>
                <p className={`font-bold text-sm ${waitForecast.dropProbability14Days >= 60 ? 'text-amber-600' : 'text-textPrimary'}`}>
                  {waitForecast.dropProbability14Days}%
                </p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-borderLight">
                <p className="text-[10px] text-textSecondary">In 30 Days</p>
                <p className="font-bold text-sm text-textPrimary">{waitForecast.dropProbability30Days}%</p>
              </div>
            </div>

            <p className="text-xs text-textSecondary leading-relaxed">
              {waitForecast.reason}
            </p>
          </div>

          {/* Delivery Pincode Lookup */}
          <div className="bg-secondaryBg p-4 rounded-xl border border-borderLight space-y-2">
            <h4 className="text-xs font-bold text-textPrimary flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              Check Delivery to Pincode
            </h4>
            <form onSubmit={handlePincodeCheck} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Enter 6-digit PIN"
                className="flex-1 bg-white border border-borderLight rounded-lg px-3 py-1.5 text-xs text-textPrimary focus:outline-none focus:border-primary"
              />
              <Button type="submit" size="sm" isLoading={isPincodeLoading} disabled={pincode.length !== 6}>
                Check
              </Button>
            </form>

            {delivery && (
              <div className="text-xs mt-1">
                {delivery.serviceable ? (
                  <span className="text-emerald-700 font-medium">
                    ✓ Available for delivery to {delivery.pincode} ({delivery.estimatedDays})
                  </span>
                ) : (
                  <span className="text-danger font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {delivery.error || 'Non-serviceable PIN code'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Affiliate Transparency Disclosure */}
      <div className="pt-3 border-t border-borderLight/60 text-[11px] text-textSecondary text-center">
        Honest Shopping Guarantee: Product prices and bank discounts are verified. Retailer links may generate affiliate revenue at zero additional cost to you.
      </div>
    </div>
  );
}

export default PersonalDecisionPanel;
