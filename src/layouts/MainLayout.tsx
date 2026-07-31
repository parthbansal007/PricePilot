import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Toaster } from 'react-hot-toast';

export function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-textPrimary">
      <Navbar />
      <main className="flex-grow pt-20"> {/* pt-20 to account for sticky navbar */}
        <Outlet />
      </main>
      <Footer />
      <Toaster position="top-right" />
    </div>
  );
}
