import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left Side - Illustration/Branding */}
      <div className="hidden md:flex md:w-1/2 bg-primary flex-col justify-between p-12 text-white">
        <Link to="/" className="flex items-center gap-2 group w-fit">
          <div className="bg-white text-primary p-1.5 rounded-lg">
            <ShoppingBag size={24} />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            PricePilot <span className="text-white/80">AI</span>
          </span>
        </Link>
        
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold mb-4">Shop Smarter with AI</h1>
          <p className="text-primary-100 text-lg opacity-90">
            Compare prices, manage budgets, receive AI recommendations, and never overpay again.
          </p>
        </div>
        
        <div className="text-sm opacity-80">
          © {new Date().getFullYear()} PricePilot AI. All rights reserved.
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12">
        {/* Mobile Header */}
        <div className="md:hidden flex w-full max-w-[400px] mb-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-primary text-white p-1.5 rounded-lg">
              <ShoppingBag size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight text-textPrimary">
              PricePilot <span className="text-primary">AI</span>
            </span>
          </Link>
        </div>
        
        <div className="w-full max-w-[400px]">
          <Outlet />
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
