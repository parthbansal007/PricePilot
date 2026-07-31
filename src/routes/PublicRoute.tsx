import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/ui/Loader';

export function PublicRoute({ children, restricted = false }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  // If route is restricted (like Login/Register) and user is logged in, redirect to dashboard or home
  if (user && restricted) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
