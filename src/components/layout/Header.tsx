import React from 'react';
import { Menu, Search, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export function Header({ setMobileOpen }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-borderLight shadow-sm h-16 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-4">
        <button
          className="md:hidden p-2 text-textSecondary hover:bg-secondaryBg rounded-lg"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </button>


      </div>

      <div className="flex items-center gap-4">
        <Link to="/notifications" className="relative p-2 text-textSecondary hover:bg-secondaryBg rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full border-2 border-white"></span>
        </Link>
        
        <Link to="/profile" className="flex items-center gap-3 hover:bg-secondaryBg p-1.5 rounded-full md:rounded-lg transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold overflow-hidden">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0) || 'U'
            )}
          </div>
          <span className="hidden md:block text-sm font-medium text-textPrimary">
            {user?.name || 'User'}
          </span>
        </Link>
      </div>
    </header>
  );
}
