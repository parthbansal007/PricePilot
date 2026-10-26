import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Bell, 
  Brain, 
  Heart, 
  Search, 
  ShoppingBag, 
  ShoppingCart,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { cn } from '../utils/cn';
import { useAuth } from '../context/AuthContext';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Smooth scroll if URL contains hash on mount or hash change
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }
  }, []);

  const scrollToFeatures = () => {
    const elem = document.getElementById('features');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState(null, '', '/#features');
    }
  };

  const featureCards = [
    {
      icon: <Search className="w-6 h-6" />,
      title: 'Price Comparison',
      badge: 'Multi-Store',
      description: 'Instantly compare live prices across Amazon, Walmart, Best Buy, and Flipkart to snag the best available deal.',
      color: 'text-blue-500 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white',
      link: '/products',
      ctaText: 'Search & Compare'
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Budget Planner',
      badge: 'Smart Tracker',
      description: 'Set custom category limits, track spending trends, and prevent impulse purchases with automated budget insights.',
      color: 'text-green-500 bg-green-50 group-hover:bg-green-600 group-hover:text-white',
      link: '/budget',
      ctaText: 'Plan Your Budget'
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: 'Universal Wishlist',
      badge: 'All-In-One',
      description: 'Aggregate items from multiple retail stores into one organized wishlist with priority and target price tags.',
      color: 'text-red-500 bg-red-50 group-hover:bg-red-600 group-hover:text-white',
      link: '/wishlist',
      ctaText: 'View Universal Wishlist'
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: 'Price Alerts',
      badge: 'Instant Notify',
      description: 'Set your target price and receive instant in-app and email alerts whenever prices drop.',
      color: 'text-yellow-500 bg-yellow-50 group-hover:bg-yellow-600 group-hover:text-white',
      link: '/tracked-products',
      ctaText: 'Track Price Drops'
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: 'AI Shopping Advisor',
      badge: 'AI Smart Score',
      description: 'Chat with our AI advisor to get synthesized review summaries, deal recommendations, and buy vs. wait predictions.',
      color: 'text-purple-500 bg-purple-50 group-hover:bg-purple-600 group-hover:text-white',
      link: '/advisor',
      ctaText: 'Consult AI Advisor'
    },
    {
      icon: <TrendingDown className="w-6 h-6" />,
      title: 'Price History',
      badge: 'Historical Data',
      description: 'Inspect price history charts to identify fake sales, seasonal discounts, and the best time to purchase.',
      color: 'text-indigo-500 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white',
      link: '/products',
      ctaText: 'Explore Price Trends'
    }
  ];

  const faqs = [
    {
      question: 'How does PricePilot track prices across different retailers?',
      answer: 'PricePilot queries live product listings across supported merchants like Amazon, Walmart, Best Buy, and Flipkart. It keeps your tracked items updated and flags real discounts and historic price drops.'
    },
    {
      question: 'Is PricePilot completely free to use?',
      answer: 'Yes! The core platform is 100% free. You can search products, track prices, set shopping budgets, save wishlist items, and consult the AI shopping advisor without paying anything.'
    },
    {
      question: 'How does the AI Shopping Advisor calculate the Smart Buy score?',
      answer: 'Our AI model analyzes historical price volatility, retailer reputation, current coupon availability, and product review sentiment to recommend whether you should buy immediately or wait for a price cut.'
    },
    {
      question: 'How do Price Drop Alerts notify me?',
      answer: 'When a tracked product falls to or below your desired target price, PricePilot sends an immediate in-app notification and alerts you on your dashboard with direct retailer purchase links.'
    },
    {
      question: 'Can I organize items into separate budgets and categories?',
      answer: 'Yes! The Budget Planner allows you to set customized spending allowances across Electronics, Groceries, Fashion, and Home, complete with visual progress indicators.'
    }
  ];

  return (
    <div id="top" className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background pt-16 pb-24 lg:pt-32 lg:pb-40">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            <motion.div 
              className="max-w-2xl"
              initial="initial"
              animate="animate"
              variants={stagger}
            >
              <motion.div variants={fadeIn} className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6">
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                AI-Powered Shopping Assistant
              </motion.div>
              
              <motion.h1 variants={fadeIn} className="text-5xl lg:text-7xl font-bold tracking-tight text-textPrimary mb-6 leading-tight">
                Shop Smarter <br/>with <span className="text-primary">AI</span>
              </motion.h1>
              
              <motion.p variants={fadeIn} className="text-xl text-textSecondary mb-8 max-w-xl leading-relaxed">
                Compare prices, manage budgets, receive AI recommendations, and never overpay again with PricePilot AI.
              </motion.p>
              
              <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4">
                {user ? (
                  <Link to="/dashboard">
                    <Button size="lg" className="w-full sm:w-auto text-base">
                      Go to Dashboard
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/register">
                    <Button size="lg" className="w-full sm:w-auto text-base">
                      Get Started Free
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
                <Button 
                  size="lg" 
                  variant="secondary" 
                  className="w-full sm:w-auto text-base cursor-pointer"
                  onClick={scrollToFeatures}
                >
                  Learn More
                </Button>
              </motion.div>
            </motion.div>

            {/* Hero Illustration */}
            <motion.div 
              className="relative hidden lg:block"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="relative w-full aspect-square max-w-lg mx-auto">
                <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl"></div>
                
                {/* Main Dashboard Mockup */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-white rounded-2xl shadow-xl border border-borderLight overflow-hidden z-10">
                  <div className="h-10 border-b border-borderLight bg-surface flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-danger"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-accent"></div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div className="w-32 h-4 bg-borderLight rounded-full"></div>
                      <div className="w-16 h-4 bg-primary/20 rounded-full"></div>
                    </div>
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-surface rounded-xl"></div>
                          <div className="flex-1 space-y-2">
                            <div className="w-3/4 h-3 bg-textSecondary/20 rounded-full"></div>
                            <div className="w-1/2 h-3 bg-textSecondary/10 rounded-full"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating Cards */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-4 -right-12 z-20 cursor-pointer"
                  onClick={() => navigate(user ? '/tracked-products' : '/login')}
                >
                  <Card className="p-4 flex items-center gap-4 shadow-xl border-primary/20 hover:border-primary transition-colors">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <TrendingDown size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-textPrimary">Price Drop Alert</p>
                      <p className="text-xs text-textSecondary">Save $45 on Headphones</p>
                    </div>
                  </Card>
                </motion.div>

                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -bottom-12 -left-8 z-20 cursor-pointer"
                  onClick={() => navigate(user ? '/advisor' : '/login')}
                >
                  <Card className="p-4 flex items-center gap-4 shadow-xl border-accent/20 hover:border-accent transition-colors">
                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                      <Brain size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-textPrimary">AI Recommendation</p>
                      <p className="text-xs text-textSecondary">Better alternative found</p>
                    </div>
                  </Card>
                </motion.div>

              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-surface">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-textPrimary sm:text-4xl mb-4">
              Everything you need to shop smarter
            </h2>
            <p className="text-lg text-textSecondary">
              Our AI-powered platform provides you with all the tools necessary to make informed purchasing decisions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featureCards.map((feature, index) => (
              <Card 
                key={index} 
                className="group hover:border-primary hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer"
                onClick={() => navigate(user ? feature.link : '/register')}
              >
                <CardContent className="p-8 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300", feature.color)}>
                        {feature.icon}
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-borderLight/60 text-textSecondary">
                        {feature.badge}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-textPrimary mb-3 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-textSecondary leading-relaxed text-sm mb-6">
                      {feature.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-borderLight/60 flex items-center justify-between text-primary font-medium text-sm">
                    <span>{feature.ctaText}</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-textPrimary sm:text-4xl mb-4">
              How PricePilot Works
            </h2>
            <p className="text-lg text-textSecondary">
              Your intelligent shopping journey in four simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-[2px] bg-borderLight -z-10"></div>
            
            {[
              { step: 1, title: 'Search Product', desc: 'Enter any product URL or search term.', link: '/products' },
              { step: 2, title: 'Compare Prices', desc: 'We scan thousands of stores instantly.', link: '/products' },
              { step: 3, title: 'Receive AI Advice', desc: 'Get insights on whether to buy or wait.', link: '/advisor' },
              { step: 4, title: 'Purchase Smartly', desc: 'Save money and stay within budget.', link: '/budget' }
            ].map((item, index) => (
              <div 
                key={index} 
                className="flex flex-col items-center text-center relative z-10 bg-white pt-4 group cursor-pointer"
                onClick={() => navigate(user ? item.link : '/register')}
              >
                <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold mb-6 shadow-soft ring-4 ring-white group-hover:bg-secondary group-hover:scale-105 transition-all">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-textPrimary mb-2 group-hover:text-primary transition-colors">{item.title}</h3>
                <p className="text-textSecondary px-4 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-surface border-t border-borderLight">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              <Sparkles size={16} /> Transparent Plans
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-textPrimary sm:text-4xl mb-4">
              Simple, Predictable Pricing
            </h2>
            <p className="text-lg text-textSecondary mb-8">
              Start with our free core assistant or supercharge your shopping with Pro features.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center bg-white p-1.5 rounded-xl border border-borderLight shadow-sm">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                  !isAnnual ? "bg-primary text-white shadow-sm" : "text-textSecondary hover:text-textPrimary"
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2",
                  isAnnual ? "bg-primary text-white shadow-sm" : "text-textSecondary hover:text-textPrimary"
                )}
              >
                <span>Annual</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-bold",
                  isAnnual ? "bg-white text-primary" : "bg-accent/15 text-accent"
                )}>
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {/* Free Tier */}
            <Card className="flex flex-col justify-between p-8 bg-white border-borderLight">
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-textPrimary">Smart Shopper</h3>
                  <p className="text-sm text-textSecondary mt-1">Essential tools for individual bargain hunters.</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-textPrimary">$0</span>
                  <span className="text-textSecondary text-sm ml-2">forever free</span>
                </div>
                <ul className="space-y-3 mb-8 text-sm text-textSecondary">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Multi-store price search & comparison</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Track up to 10 products simultaneously</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Universal wishlist & priority tags</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Basic AI shopping recommendations</span>
                  </li>
                </ul>
              </div>
              <Link to={user ? "/dashboard" : "/register"}>
                <Button variant="outline" className="w-full">
                  {user ? "Current Active Plan" : "Choose Free Plan"}
                </Button>
              </Link>
            </Card>

            {/* Pro Tier (Featured) */}
            <Card className="flex flex-col justify-between p-8 bg-white border-primary relative shadow-lg ring-2 ring-primary/20">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </div>
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-textPrimary">Pro Deal Hunter</h3>
                  <p className="text-sm text-textSecondary mt-1">For regular online shoppers who want maximum savings.</p>
                </div>
                <div className="mb-6 flex items-baseline">
                  <span className="text-4xl font-extrabold text-textPrimary">
                    {isAnnual ? "$7" : "$9"}
                  </span>
                  <span className="text-textSecondary text-sm ml-2">/ month {isAnnual && '(billed annually)'}</span>
                </div>
                <ul className="space-y-3 mb-8 text-sm text-textPrimary">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <strong>Unlimited</strong> tracked product alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>Real-time instant price drop notifications</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>Full AI Shopping Advisor chat & deal score</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>Predictive price history trend charts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>Category budget breakdown & alerts</span>
                  </li>
                </ul>
              </div>
              <Link to={user ? "/dashboard" : "/register"}>
                <Button className="w-full">
                  {user ? "Go to Dashboard" : "Start 14-Day Free Trial"}
                </Button>
              </Link>
            </Card>

            {/* Family / Power Tier */}
            <Card className="flex flex-col justify-between p-8 bg-white border-borderLight">
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-textPrimary">Household Power</h3>
                  <p className="text-sm text-textSecondary mt-1">Shared shopping intelligence for households & teams.</p>
                </div>
                <div className="mb-6 flex items-baseline">
                  <span className="text-4xl font-extrabold text-textPrimary">
                    {isAnnual ? "$15" : "$19"}
                  </span>
                  <span className="text-textSecondary text-sm ml-2">/ month</span>
                </div>
                <ul className="space-y-3 mb-8 text-sm text-textSecondary">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Everything in Pro Plan included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Collaborative family wishlists</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Multi-category household budget pooling</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Exportable reports (CSV & PDF)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span>Priority retailer indexing frequency</span>
                  </li>
                </ul>
              </div>
              <Link to={user ? "/dashboard" : "/register"}>
                <Button variant="outline" className="w-full">
                  {user ? "Explore Power Tools" : "Join Household Plan"}
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-white border-t border-borderLight">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-textPrimary sm:text-4xl mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-textSecondary">
              Got questions? Here are the most common things people ask about PricePilot AI.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index} 
                  className="border border-borderLight rounded-xl overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 bg-white hover:bg-surface/50 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="font-semibold text-textPrimary text-base md:text-lg">
                      {faq.question}
                    </span>
                    <span className={cn("p-1 rounded-full text-textSecondary transition-transform duration-200", isOpen && "rotate-180")}>
                      <ChevronDown size={20} />
                    </span>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-6 pb-6 pt-2 text-textSecondary text-sm md:text-base leading-relaxed border-t border-borderLight/60 bg-surface/20">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-white">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
            Ready to transform how you shop?
          </h2>
          <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto opacity-90">
            Join thousands of smart shoppers who are already saving money and time with PricePilot AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto text-primary bg-white hover:bg-surface">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/register">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto text-primary bg-white hover:bg-surface">
                  Create Free Account
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
