import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/', hash: '#top' },
    { name: 'Features', path: '/#features', hash: '#features' },
    { name: 'How It Works', path: '/#how-it-works', hash: '#how-it-works' },
    { name: 'Pricing', path: '/#pricing', hash: '#pricing' },
    { name: 'FAQ', path: '/#faq', hash: '#faq' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string, hash: string) => {
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

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-40 transition-all duration-300 bg-white/95 backdrop-blur-md',
        isScrolled ? 'shadow-soft py-3 border-b border-borderLight' : 'py-5'
      )}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between gap-2">
        <Link 
          to="/" 
          onClick={(e) => handleNavClick(e, '/', '#top')}
          className="flex items-center gap-2 group cursor-pointer shrink-0"
        >
          <div className="bg-primary text-white p-1.5 rounded-lg group-hover:bg-secondary transition-colors">
            <ShoppingBag size={22} />
          </div>
          <span className="text-lg md:text-xl font-bold tracking-tight text-textPrimary">
            PricePilot <span className="text-primary">AI</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav aria-label="Main Navigation" className="flex items-center gap-3 sm:gap-5 md:gap-8 overflow-hidden">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={(e) => handleNavClick(e, link.path, link.hash)}
              className={cn(
                "text-xs sm:text-sm font-medium text-textSecondary hover:text-primary transition-colors cursor-pointer whitespace-nowrap",
                (link.name === 'Home' || link.name === 'FAQ') && "hidden lg:inline-block"
              )}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-sm font-medium text-textSecondary hidden xl:inline-block">Hi, {user.name}</span>
              <Link to="/dashboard">
                <Button size="sm">Dashboard</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={logout} className="hidden sm:inline-flex">
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="px-2 sm:px-3 text-xs sm:text-sm">Log In</Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="px-2.5 sm:px-3 text-xs sm:text-sm">Sign Up</Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            aria-label="Toggle navigation menu"
            className="md:hidden p-1.5 text-textSecondary hover:text-textPrimary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-borderLight shadow-lg py-4 px-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className="text-base font-medium text-textSecondary hover:text-primary py-1"
              onClick={(e) => {
                handleNavClick(e, link.path, link.hash);
                setMobileMenuOpen(false);
              }}
            >
              {link.name}
            </Link>
          ))}
          <div className="h-px bg-borderLight my-1" />
          {user ? (
            <div className="flex flex-col gap-2">
              <div className="text-sm text-textSecondary px-1">Signed in as <strong>{user.name}</strong></div>
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full">Go to Dashboard</Button>
              </Link>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => { logout(); setMobileMenuOpen(false); }}
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">Log In</Button>
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full">Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
