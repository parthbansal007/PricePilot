import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
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
  CheckCircle2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { cn } from '../utils/cn';

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
  return (
    <div className="w-full">
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
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                AI-Powered Shopping Assistant
              </motion.div>
              
              <motion.h1 variants={fadeIn} className="text-5xl lg:text-7xl font-bold tracking-tight text-textPrimary mb-6 leading-tight">
                Shop Smarter <br/>with <span className="text-primary">AI</span>
              </motion.h1>
              
              <motion.p variants={fadeIn} className="text-xl text-textSecondary mb-8 max-w-xl leading-relaxed">
                Compare prices, manage budgets, receive AI recommendations, and never overpay again with PricePilot AI.
              </motion.p>
              
              <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto text-base">
                    Get Started Free
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="#features">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto text-base">
                    Learn More
                  </Button>
                </Link>
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
                  className="absolute -top-4 -right-12 z-20"
                >
                  <Card className="p-4 flex items-center gap-4 shadow-xl border-primary/20">
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
                  className="absolute -bottom-12 -left-8 z-20"
                >
                  <Card className="p-4 flex items-center gap-4 shadow-xl border-accent/20">
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
            {[
              {
                icon: <Search className="w-6 h-6" />,
                title: 'Price Comparison',
                description: 'Instantly compare prices across thousands of retailers to ensure you get the best deal.',
                color: 'text-blue-500 bg-blue-50'
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: 'Budget Planner',
                description: 'Set smart budgets and track your spending habits across different product categories.',
                color: 'text-green-500 bg-green-50'
              },
              {
                icon: <Heart className="w-6 h-6" />,
                title: 'Universal Wishlist',
                description: 'Save items from any store into one organized, easily accessible wishlist.',
                color: 'text-red-500 bg-red-50'
              },
              {
                icon: <Bell className="w-6 h-6" />,
                title: 'Price Alerts',
                description: 'Get instant notifications when the products you want drop to your target price.',
                color: 'text-yellow-500 bg-yellow-50'
              },
              {
                icon: <Brain className="w-6 h-6" />,
                title: 'AI Shopping Advisor',
                description: 'Receive personalized recommendations and reviews summarized by our advanced AI.',
                color: 'text-purple-500 bg-purple-50'
              },
              {
                icon: <TrendingDown className="w-6 h-6" />,
                title: 'Price History',
                description: 'View detailed price history charts to know if it\'s the right time to buy.',
                color: 'text-indigo-500 bg-indigo-50'
              }
            ].map((feature, index) => (
              <Card key={index} className="group hover:border-primary/50 transition-colors duration-300">
                <CardContent className="p-8">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-6", feature.color)}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-textPrimary mb-3">{feature.title}</h3>
                  <p className="text-textSecondary leading-relaxed">
                    {feature.description}
                  </p>
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
              { step: 1, title: 'Search Product', desc: 'Enter any product URL or search term.' },
              { step: 2, title: 'Compare Prices', desc: 'We scan thousands of stores instantly.' },
              { step: 3, title: 'Receive AI Advice', desc: 'Get insights on whether to buy or wait.' },
              { step: 4, title: 'Purchase Smartly', desc: 'Save money and stay within budget.' }
            ].map((item, index) => (
              <div key={index} className="flex flex-col items-center text-center relative z-10 bg-white pt-4">
                <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold mb-6 shadow-soft ring-4 ring-white">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-textPrimary mb-2">{item.title}</h3>
                <p className="text-textSecondary px-4">{item.desc}</p>
              </div>
            ))}
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
            <Link to="/register">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto text-primary bg-white hover:bg-surface">
                Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
