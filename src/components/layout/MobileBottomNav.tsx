import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  Heart, 
  PieChart, 
  Bot 
} from 'lucide-react';

export function MobileBottomNav() {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Search Products', path: '/products', icon: Search },
    { name: 'Wishlist', path: '/wishlist', icon: Heart },
    { name: 'Budget Planner', path: '/budget', icon: PieChart },
    { name: 'AI Advisor', path: '/advisor', icon: Bot },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-borderLight flex items-center justify-around py-1.5 px-2 shadow-lg"
    >
      {navItems.map((item) => (
        <NavLink
          key={item.name}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-lg text-[11px] font-medium transition-all ${
              isActive
                ? 'text-primary font-semibold'
                : 'text-textSecondary hover:text-textPrimary'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-primary' : 'text-textSecondary'}`} />
              <span className="truncate max-w-[64px]">{item.name}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
