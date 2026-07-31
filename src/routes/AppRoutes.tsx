import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';

import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';

// Placeholder for Dashboard
const Dashboard = () => (
  <div className="container mx-auto p-12">
    <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
    <p>Welcome to your intelligent shopping dashboard.</p>
  </div>
);

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<LandingPage />} />
        
        {/* Protected Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
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
