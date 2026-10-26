import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Mail, Share2, Globe, Shield, FileText, Send, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

function GithubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export function Footer() {
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'contact' | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [isSending, setIsSending] = useState(false);

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    if (window.location.pathname === '/') {
      e.preventDefault();
      if (hash === '#top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.history.pushState(null, '', '/');
      } else {
        const id = hash.replace('#', '');
        const elem = document.getElementById(id);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth' });
          window.history.pushState(null, '', `/#${id}`);
        }
      }
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = window.location.origin;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('PricePilot link copied to clipboard!');
      } else {
        toast.success('PricePilot AI: ' + shareUrl);
      }
    } catch {
      toast.success('PricePilot link: ' + window.location.origin);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      toast.error('Please fill out all fields.');
      return;
    }
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      toast.success('Thank you! Your message has been sent to our support team.');
      setContactForm({ name: '', email: '', message: '' });
      setActiveModal(null);
    }, 600);
  };

  return (
    <footer className="bg-white border-t border-borderLight pt-16 pb-8 mt-auto">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-12">
          
          {/* Brand & Mission */}
          <div className="md:col-span-1">
            <Link 
              to="/" 
              onClick={(e) => handleScroll(e, '#top')}
              className="flex items-center gap-2 mb-4 group cursor-pointer"
            >
              <div className="bg-primary text-white p-1.5 rounded-lg group-hover:bg-secondary transition-colors">
                <ShoppingBag size={24} />
              </div>
              <span className="text-xl font-bold tracking-tight text-textPrimary">
                PricePilot <span className="text-primary">AI</span>
              </span>
            </Link>
            <p className="text-textSecondary text-sm mb-5 leading-relaxed">
              Shop smarter with AI. Compare prices, manage budgets, track price drops, and never overpay again.
            </p>
            
            {/* Live Status indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-xs font-semibold text-accent mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
              All Deal Engines Online
            </div>

            {/* Social & Share Actions */}
            <div className="flex items-center gap-3">
              <a 
                href="mailto:support@pricepilot.ai" 
                title="Email Support"
                className="w-9 h-9 rounded-lg border border-borderLight flex items-center justify-center text-textSecondary hover:text-primary hover:border-primary transition-colors"
              >
                <Mail size={18} />
              </a>
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                title="GitHub Repository"
                className="w-9 h-9 rounded-lg border border-borderLight flex items-center justify-center text-textSecondary hover:text-primary hover:border-primary transition-colors"
              >
                <GithubIcon size={18} />
              </a>
              <button 
                type="button"
                onClick={handleShare}
                title="Share PricePilot"
                className="w-9 h-9 rounded-lg border border-borderLight flex items-center justify-center text-textSecondary hover:text-primary hover:border-primary transition-colors cursor-pointer"
              >
                <Share2 size={18} />
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-textPrimary mb-4">Quick Navigation</h4>
            <ul className="flex flex-col gap-3">
              <li>
                <Link 
                  to="/" 
                  onClick={(e) => handleScroll(e, '#top')} 
                  className="text-sm text-textSecondary hover:text-primary transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  to="/#features" 
                  onClick={(e) => handleScroll(e, '#features')} 
                  className="text-sm text-textSecondary hover:text-primary transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link 
                  to="/#how-it-works" 
                  onClick={(e) => handleScroll(e, '#how-it-works')} 
                  className="text-sm text-textSecondary hover:text-primary transition-colors"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link 
                  to="/#pricing" 
                  onClick={(e) => handleScroll(e, '#pricing')} 
                  className="text-sm text-textSecondary hover:text-primary transition-colors"
                >
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link 
                  to="/#faq" 
                  onClick={(e) => handleScroll(e, '#faq')} 
                  className="text-sm text-textSecondary hover:text-primary transition-colors"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Core Tools */}
          <div>
            <h4 className="font-semibold text-textPrimary mb-4">Shopping Tools</h4>
            <ul className="flex flex-col gap-3">
              <li>
                <Link to="/products" className="text-sm text-textSecondary hover:text-primary transition-colors">
                  Price Search & Comparison
                </Link>
              </li>
              <li>
                <Link to="/advisor" className="text-sm text-textSecondary hover:text-primary transition-colors">
                  AI Shopping Advisor
                </Link>
              </li>
              <li>
                <Link to="/budget" className="text-sm text-textSecondary hover:text-primary transition-colors">
                  Budget Planner
                </Link>
              </li>
              <li>
                <Link to="/wishlist" className="text-sm text-textSecondary hover:text-primary transition-colors">
                  Universal Wishlist
                </Link>
              </li>
              <li>
                <Link to="/tracked-products" className="text-sm text-textSecondary hover:text-primary transition-colors">
                  Price Drop Tracker
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="font-semibold text-textPrimary mb-4">Support & Legal</h4>
            <ul className="flex flex-col gap-3">
              <li>
                <button 
                  type="button"
                  onClick={() => setActiveModal('contact')}
                  className="text-sm text-textSecondary hover:text-primary transition-colors text-left cursor-pointer"
                >
                  Contact Support
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => setActiveModal('privacy')}
                  className="text-sm text-textSecondary hover:text-primary transition-colors text-left cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => setActiveModal('terms')}
                  className="text-sm text-textSecondary hover:text-primary transition-colors text-left cursor-pointer"
                >
                  Terms of Service
                </button>
              </li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-borderLight flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-textSecondary">
            © {new Date().getFullYear()} PricePilot AI. All rights reserved.
          </p>
          <p className="text-xs text-textSecondary">
            Empowering smart shoppers with AI-driven price comparison and alerts.
          </p>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      <Modal
        isOpen={activeModal === 'privacy'}
        onClose={() => setActiveModal(null)}
        title="Privacy Policy"
        className="max-w-xl max-h-[85vh] overflow-y-auto"
      >
        <div className="space-y-4 text-sm text-textSecondary leading-relaxed pt-2">
          <div className="p-3 bg-primary/10 rounded-xl text-primary text-xs font-semibold flex items-center gap-2">
            <Shield size={16} /> Last updated: October 2026
          </div>
          <div>
            <h5 className="font-semibold text-textPrimary mb-1">1. Information We Collect</h5>
            <p>We collect search queries, tracked product target prices, and wishlist preferences to deliver real-time deal alerts and personalized AI recommendations. We never sell your personal contact details.</p>
          </div>
          <div>
            <h5 className="font-semibold text-textPrimary mb-1">2. Price Monitoring & Retailer Data</h5>
            <p>Our platform aggregates publicly available product pricing from external merchants including Amazon, Walmart, Best Buy, and Flipkart. Price comparisons are refreshed regularly to ensure timely accuracy.</p>
          </div>
          <div>
            <h5 className="font-semibold text-textPrimary mb-1">3. Data Security & Storage</h5>
            <p>Your authentication tokens and user settings are protected using industry-standard encryption protocols. You may delete your account and tracked items at any time through Settings.</p>
          </div>
          <div className="pt-4 flex justify-end">
            <Button onClick={() => setActiveModal(null)}>I Understand</Button>
          </div>
        </div>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal
        isOpen={activeModal === 'terms'}
        onClose={() => setActiveModal(null)}
        title="Terms of Service"
        className="max-w-xl max-h-[85vh] overflow-y-auto"
      >
        <div className="space-y-4 text-sm text-textSecondary leading-relaxed pt-2">
          <div className="p-3 bg-surface rounded-xl text-textPrimary text-xs font-semibold flex items-center gap-2">
            <FileText size={16} /> PricePilot User Terms
          </div>
          <div>
            <h5 className="font-semibold text-textPrimary mb-1">1. Acceptable Use</h5>
            <p>PricePilot is intended for personal shopping assistance and price monitoring. Automated scraping or unauthorized abuse of our API discovery feeds is prohibited.</p>
          </div>
          <div>
            <h5 className="font-semibold text-textPrimary mb-1">2. Merchant Pricing Disclaimer</h5>
            <p>While PricePilot strives to reflect exact live prices, final transaction pricing, shipping fees, taxes, and promotional coupons are determined solely by the destination retailer at checkout.</p>
          </div>
          <div>
            <h5 className="font-semibold text-textPrimary mb-1">3. AI Advisory Recommendations</h5>
            <p>Our Smart Buy scores and AI Advisor insights provide automated guidance based on historical market trends. They do not constitute financial advice or price guarantees.</p>
          </div>
          <div className="pt-4 flex justify-end">
            <Button onClick={() => setActiveModal(null)}>Close</Button>
          </div>
        </div>
      </Modal>

      {/* Contact Support Modal */}
      <Modal
        isOpen={activeModal === 'contact'}
        onClose={() => setActiveModal(null)}
        title="Contact Support"
        className="max-w-lg"
      >
        <form onSubmit={handleContactSubmit} className="space-y-4 pt-2">
          <p className="text-sm text-textSecondary">
            Have a question or feedback? Send our support team a message and we will respond promptly.
          </p>
          <Input 
            label="Your Name" 
            placeholder="Jane Doe" 
            value={contactForm.name}
            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
            required 
          />
          <Input 
            label="Email Address" 
            type="email" 
            placeholder="jane@example.com" 
            value={contactForm.email}
            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
            required 
          />
          <div>
            <label className="block text-sm font-medium text-textPrimary mb-1.5">
              Message
            </label>
            <textarea
              className="w-full rounded-lg border border-borderLight bg-white px-3 py-2 text-sm text-textPrimary shadow-sm placeholder:text-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 resize-none h-24"
              placeholder="How can we help you today?"
              value={contactForm.message}
              onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSending}>
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </form>
      </Modal>
    </footer>
  );
}
