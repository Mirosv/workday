import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44, tokenStore } from '@/api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]                     = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth]   = useState(true);
  const [authError, setAuthError]           = useState(null);

  useEffect(() => {
    checkAuth();

    // Listen for 401 responses dispatched by the API client
    const onUnauth = () => {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: 'Session expired' });
    };
    window.addEventListener('wd:unauthenticated', onUnauth);
    return () => window.removeEventListener('wd:unauthenticated', onUnauth);
  }, []);

  const checkAuth = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);

    if (!tokenStore.get()) {
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      return;
    }

    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (err) {
      tokenStore.remove();
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: err.message });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (email, password) => {
    const u = await base44.auth.login(email, password);
    setUser(u);
    setIsAuthenticated(true);
    setAuthError(null);
    return u;
  };

  const register = async (email, password, full_name) => {
    const u = await base44.auth.register(email, password, full_name);
    setUser(u);
    setIsAuthenticated(true);
    setAuthError(null);
    return u;
  };

  const logout = () => {
    tokenStore.remove();
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  // Kept for compat with existing pages that call navigateToLogin
  const navigateToLogin = () => { window.location.href = '/login'; };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false, // no longer needed
      authError,
      appPublicSettings: null,        // no longer needed
      login,
      register,
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
