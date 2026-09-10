import React, { useState, useEffect } from 'react';
import { Star, TrendingDown, TrendingUp, CheckCircle, SlidersHorizontal, ArrowRight, Minus } from 'lucide-react';
import { Button } from '../ui/Button';

export function BetterConfigurations({ productId }: { productId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const [comparing, setComparing] = useState<any>(null);

  useEffect(() => {
    fetchConfigurations();
  }, [productId]);

  const fetchConfigurations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/better-configurations`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-textSecondary animate-pulse">Finding better configurations...</div>;
  }

  if (!data || !data.recommendations || data.recommendations.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-borderLight shadow-sm mt-8 text-center">
        <h2 className="text-xl font-bold text-textPrimary mb-2">✨ Better Configuration Finder</h2>
        <p className="text-textSecondary">Your selected configuration currently appears to be the best match for your budget and preferences.</p>
      </div>
    );
  }

  const selected = data.selectedProduct;

  return (
    <div className="mt-12 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-borderLight pb-4">
        <div>
          <h2 className="text-2xl font-bold text-textPrimary flex items-center gap-2">
            ✨ Better Configuration Finder
          </h2>
          <p className="text-textSecondary mt-1">Find a better value configuration based on your budget, preferences, and current market prices.</p>
        </div>
        <Button variant="outline" size="sm" className="mt-4 md:mt-0 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" /> Customize Preferences
        </Button>
      </div>

      <div className="bg-secondaryBg/50 p-6 rounded-xl border border-borderLight flex flex-col md:flex-row gap-6 items-center">
        <div className="text-center md:text-left w-full md:w-auto">
           <p className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Your Current Selection</p>
           {selected.image ? <img src={selected.image} alt={selected.title} className="w-32 h-32 object-contain mx-auto md:mx-0 bg-white rounded-lg p-2 border border-borderLight" /> : <div className="w-32 h-32 bg-borderLight rounded-lg mx-auto md:mx-0"></div>}
        </div>
        <div className="flex-1 text-center md:text-left">
           <h3 className="font-bold text-lg text-textPrimary">{selected.title}</h3>
           <p className="text-2xl font-bold text-primary mt-1">₹{selected.currentPrice?.toLocaleString()}</p>
           <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-3">
             {selected.specifications && Object.values(selected.specifications).filter(Boolean).map((spec: any, i) => (
                <span key={i} className="px-2 py-1 bg-white border border-borderLight rounded text-xs text-textSecondary">{spec}</span>
             ))}
           </div>
        </div>
      </div>

      <div>
        <p className="text-textSecondary mb-6 font-medium">PricePilot found {data.recommendations.length} configurations worth considering.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.recommendations.map((rec: any, idx: number) => (
            <div key={idx} className="bg-white rounded-xl border border-borderLight shadow-sm overflow-hidden flex flex-col">
              {idx === 0 && (
                <div className="bg-accent text-white text-xs font-bold text-center py-1.5 uppercase tracking-wider flex justify-center items-center gap-1">
                  <Star className="w-3 h-3 fill-white" /> Top Recommendation
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-textPrimary text-sm line-clamp-2">{rec.product.title}</h3>
                </div>
                
                <div className="mb-4">
                  <p className="text-2xl font-bold text-textPrimary">₹{rec.product.currentPrice?.toLocaleString()}</p>
                  <p className={`text-sm font-medium flex items-center gap-1 ${rec.priceDifference < 0 ? 'text-accent' : rec.priceDifference > 0 ? 'text-danger' : 'text-textSecondary'}`}>
                    {rec.priceDifference < 0 ? <TrendingDown className="w-4 h-4" /> : rec.priceDifference > 0 ? <TrendingUp className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    {rec.priceDifference < 0 ? `₹${Math.abs(rec.priceDifference).toLocaleString()} cheaper` : rec.priceDifference > 0 ? `+₹${rec.priceDifference.toLocaleString()} vs selected` : 'Same price'}
                  </p>
                </div>

                <div className="mb-5 bg-secondaryBg rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-textSecondary">VALUE SCORE</span>
                    <span className="text-sm font-bold text-primary">{rec.score} / 100</span>
                  </div>
                  <div className="w-full bg-borderLight h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${rec.score}%` }}></div>
                  </div>
                </div>

                <div className="flex-1">
                  <p className="text-xs font-bold text-textSecondary uppercase mb-2">Why this is better</p>
                  <ul className="space-y-1.5">
                    {rec.reasons.map((r: string, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <span className="text-textPrimary">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {rec.explanation && (
                  <div className="mt-4 p-3 bg-primary/5 border border-primary/10 rounded-lg text-sm text-textSecondary italic">
                    " {rec.explanation} "
                  </div>
                )}
                
                <div className="mt-6 pt-4 border-t border-borderLight grid grid-cols-2 gap-3">
                  <Button variant="outline" size="sm" onClick={() => setComparing(rec)}>Compare</Button>
                  <Button size="sm" onClick={() => window.open(rec.product.productUrl || '#', '_blank')}>View Deal</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {comparing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-borderLight flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold">Compare Configurations</h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={showDifferencesOnly} onChange={(e) => setShowDifferencesOnly(e.target.checked)} className="rounded text-primary" />
                  Show differences only
                </label>
                <button onClick={() => setComparing(null)} className="p-2 hover:bg-secondaryBg rounded-full"><Minus className="w-5 h-5 rotate-45" /></button>
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-3 gap-6 bg-secondaryBg/30">
               <div></div>
               <div className="text-center">
                 <p className="text-xs font-bold text-textSecondary uppercase mb-2">Your Product</p>
                 <img src={selected.image} className="w-24 h-24 object-contain mx-auto mix-blend-multiply" alt="" />
                 <p className="font-bold mt-2 text-sm line-clamp-2">{selected.title}</p>
                 <p className="text-lg font-bold text-primary mt-1">₹{selected.currentPrice?.toLocaleString()}</p>
               </div>
               <div className="text-center relative">
                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">BETTER OPTION</div>
                 <p className="text-xs font-bold text-accent uppercase mb-2">Recommended</p>
                 <img src={comparing.product.image} className="w-24 h-24 object-contain mx-auto mix-blend-multiply" alt="" />
                 <p className="font-bold mt-2 text-sm line-clamp-2">{comparing.product.title}</p>
                 <p className="text-lg font-bold text-primary mt-1">₹{comparing.product.currentPrice?.toLocaleString()}</p>
               </div>
            </div>

            <div className="p-6">
               <table className="w-full text-sm">
                 <tbody>
                    <tr className="border-b border-borderLight">
                      <td className="py-3 font-bold text-textSecondary w-1/3">Value Score</td>
                      <td className="py-3 text-center w-1/3">N/A</td>
                      <td className="py-3 text-center w-1/3 font-bold text-accent">{comparing.score} / 100</td>
                    </tr>
                    {Object.keys({ ...(selected.specifications || {}), ...(comparing.product.specifications || {}) }).map((key) => {
                       const val1 = selected.specifications?.[key] || '-';
                       const val2 = comparing.product.specifications?.[key] || '-';
                       const isDiff = val1 !== val2;
                       
                       if (showDifferencesOnly && !isDiff) return null;
                       
                       return (
                         <tr key={key} className={`border-b border-borderLight ${isDiff ? 'bg-primary/5' : ''}`}>
                           <td className="py-3 font-medium text-textSecondary capitalize">{key}</td>
                           <td className="py-3 text-center">{val1}</td>
                           <td className={`py-3 text-center font-medium ${isDiff ? 'text-primary' : ''}`}>{val2}</td>
                         </tr>
                       );
                    })}
                 </tbody>
               </table>

               <div className="mt-8 flex justify-end gap-4">
                  <Button variant="outline" onClick={() => setComparing(null)}>Close</Button>
                  <Button onClick={() => window.open(comparing.product.productUrl || '#', '_blank')}>Buy Recommended</Button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
