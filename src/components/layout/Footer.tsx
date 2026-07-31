import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, MessageCircle, Share2, Globe } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white border-t border-borderLight pt-16 pb-8 mt-auto">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-12">
          
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4 group">
              <div className="bg-primary text-white p-1.5 rounded-lg">
                <ShoppingBag size={24} />
              </div>
              <span className="text-xl font-bold tracking-tight text-textPrimary">
                PricePilot <span className="text-primary">AI</span>
              </span>
            </Link>
            <p className="text-textSecondary text-sm mb-6">
              Shop smarter with AI. Compare prices, manage budgets, and never overpay again.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-textSecondary hover:text-primary transition-colors">
                <MessageCircle size={20} />
              </a>
              <a href="#" className="text-textSecondary hover:text-primary transition-colors">
                <Globe size={20} />
              </a>
              <a href="#" className="text-textSecondary hover:text-primary transition-colors">
                <Share2 size={20} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-textPrimary mb-4">Company</h4>
            <ul className="flex flex-col gap-3">
              <li><Link to="/about" className="text-sm text-textSecondary hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/careers" className="text-sm text-textSecondary hover:text-primary transition-colors">Careers</Link></li>
              <li><Link to="/contact" className="text-sm text-textSecondary hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-textPrimary mb-4">Support</h4>
            <ul className="flex flex-col gap-3">
              <li><Link to="/help" className="text-sm text-textSecondary hover:text-primary transition-colors">Help Center</Link></li>
              <li><Link to="/faq" className="text-sm text-textSecondary hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link to="/status" className="text-sm text-textSecondary hover:text-primary transition-colors">Status</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-textPrimary mb-4">Legal</h4>
            <ul className="flex flex-col gap-3">
              <li><Link to="/privacy" className="text-sm text-textSecondary hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-sm text-textSecondary hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link to="/cookies" className="text-sm text-textSecondary hover:text-primary transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-borderLight flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-textSecondary">
            © {new Date().getFullYear()} PricePilot AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
