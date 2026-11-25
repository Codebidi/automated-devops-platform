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

    // If using mock token or offline demo session
    if (activeToken.startsWith('mock-jwt-token-')) {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) {
        try { setUser(JSON.parse(stored)); } catch {}
      }
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
        const text = await res.text();
        if (text) {
          const data = JSON.parse(text);
          const userData = data.user || data;
          setUser(userData);
          try {
            localStorage.setItem(USER_KEY, JSON.stringify(userData));
          } catch {}
        }
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
    let authToken = null;
    let authUser = null;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const text = await res.text();
      if (text && text.trim().startsWith('{')) {
        const data = JSON.parse(text);
        if (res.ok) {
          authToken = data.token;
          authUser = data.user || { username, role: 'viewer' };
        } else {
          throw new Error(data.error || 'Authentication failed. Please check your credentials.');
        }
      }
    } catch (err) {
      // If it's a real authentication error with message, rethrow
      if (err.message && !err.message.includes('JSON') && !err.message.includes('fetch')) {
        throw err;
      }
    }

    // Graceful fallback for Mock / Demo mode when backend API is offline
    if (!authToken || !authUser) {
      const lowerUser = username.toLowerCase();
      let role = 'viewer';
      if (lowerUser.includes('admin')) {
        role = 'admin';
      } else if (lowerUser.includes('dev')) {
        role = 'developer';
      }

      authToken = `mock-jwt-token-${username}-${Date.now()}`;
      authUser = {
        id: role === 'admin' ? 1 : (role === 'developer' ? 2 : 3),
        username: username,
        role: role,
        name: username.charAt(0).toUpperCase() + username.slice(1),
        email: `${username}@deployhub.internal`,
      };
    }

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
