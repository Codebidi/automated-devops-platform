import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const ROLE_RANKS = {
  viewer: 1,
  developer: 2,
  admin: 3,
};

const TOKEN_KEY = 'deployhub_auth_token';
const USER_KEY = 'deployhub_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Validate session on app launch
  const verifySession = useCallback(async (activeToken) => {
    if (!activeToken) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${activeToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const userData = data.user || data;
        setUser(userData);
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(userData));
        } catch {}
      } else if (res.status === 401) {
        // Token expired or invalid
        setSessionExpired(true);
        logout(false);
      }
    } catch (err) {
      console.warn('Network error during session verification:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      verifySession(token);
    } else {
      setLoading(false);
    }
  }, [token, verifySession]);

  const login = async (username, password) => {
    setSessionExpired(false);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed. Please check your credentials.');
    }

    const authToken = data.token;
    const authUser = data.user || { username, role: 'viewer' };

    setToken(authToken);
    setUser(authUser);

    try {
      localStorage.setItem(TOKEN_KEY, authToken);
      localStorage.setItem(USER_KEY, JSON.stringify(authUser));
      localStorage.setItem('deployhub_last_username', username);
    } catch {}

    return authUser;
  };

  const logout = (voluntary = true) => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
    if (!voluntary) {
      setSessionExpired(true);
    }
  };

  const hasRole = (requiredRole) => {
    if (!user || !user.role) return false;
    const userRank = ROLE_RANKS[user.role.toLowerCase()] || 0;
    const reqRank = ROLE_RANKS[requiredRole.toLowerCase()] || 1;
    return userRank >= reqRank;
  };

  const isViewer = user?.role === 'viewer';
  const isDeveloper = user?.role === 'developer';
  const isAdmin = user?.role === 'admin';

  const value = {
    user,
    token,
    loading,
    sessionExpired,
    setSessionExpired,
    login,
    logout,
    hasRole,
    isViewer,
    isDeveloper,
    isAdmin,
    isAuthenticated: Boolean(token && user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
