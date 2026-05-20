import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]                     = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth]   = useState(true);
  const [authError, setAuthError]           = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (err) {
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: err.message });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    base44.auth.logout('/login');
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.pathname);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      appPublicSettings: null,
      logout,
      navigateToLogin,
      checkAppState: checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};