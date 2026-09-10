import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';

import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProductSearchPage } from '../pages/products/ProductSearchPage';
import { ProductDetailsPage } from '../pages/products/ProductDetailsPage';
import { ComparePricesPage } from '../pages/products/ComparePricesPage';
import { WishlistPage } from '../pages/wishlist/WishlistPage';
import { BudgetPlannerPage } from '../pages/budget/BudgetPlannerPage';
import { AIAdvisorPage } from '../pages/advisor/AIAdvisorPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { ProfilePage } from '../pages/ProfilePage';
import { TrackedProductsPage } from '../pages/tracked/TrackedProductsPage';
import { SettingsPage } from '../pages/SettingsPage';

// Placeholders for other pages
const Placeholder = ({ title }) => (
  <div className="p-8 bg-white rounded-xl border border-borderLight h-full">
    <h1 className="text-2xl font-bold text-textPrimary mb-4">{title}</h1>
    <p className="text-textSecondary">This page is under construction.</p>
  </div>
);

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>

      {/* Protected App Routes */}
      <Route 
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProductSearchPage />} />
        <Route path="/products/:id" element={<ProductDetailsPage />} />
        <Route path="/compare" element={<ComparePricesPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/budget" element={<BudgetPlannerPage />} />
        <Route path="/advisor" element={<AIAdvisorPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/tracked-products" element={<TrackedProductsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Auth Pages */}
      <Route element={<AuthLayout />}>
        <Route 
          path="/login" 
          element={
            <PublicRoute restricted>
              <LoginPage />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute restricted>
              <RegisterPage />
            </PublicRoute>
          } 
        />
        <Route 
          path="/forgot-password" 
          element={
            <PublicRoute restricted>
              <ForgotPasswordPage />
            </PublicRoute>
          } 
        />
        <Route 
          path="/reset-password/:token" 
          element={
            <PublicRoute restricted>
              <ResetPasswordPage />
            </PublicRoute>
          } 
        />
      </Route>

      {/* 404 */}
      <Route path="*" element={<div className="p-12 text-center text-2xl font-bold">404 Not Found</div>} />
    </Routes>
  );
}
