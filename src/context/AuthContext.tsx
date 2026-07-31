import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for a dummy session
    const storedUser = localStorage.getItem('pricepilot_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('pricepilot_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    // Mock API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email && password) {
          const mockUser = { id: 1, name: 'Demo User', email };
          setUser(mockUser);
          localStorage.setItem('pricepilot_user', JSON.stringify(mockUser));
          resolve(mockUser);
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 1000);
    });
  };

  const register = async (name, email, password) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser = { id: 2, name, email };
        setUser(mockUser);
        localStorage.setItem('pricepilot_user', JSON.stringify(mockUser));
        resolve(mockUser);
      }, 1000);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pricepilot_user');
  };

  const loginWithGoogle = async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser = { id: 3, name: 'Google User', email: 'google@example.com' };
        setUser(mockUser);
        localStorage.setItem('pricepilot_user', JSON.stringify(mockUser));
        resolve(mockUser);
      }, 1000);
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, loginWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
