import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, authTokenStore } from '../utils/api';

const AuthContext = createContext(null);
const AUTH_USER_KEY = 'qr_dining_auth_user';

const authUserStore = {
  get() {
    if (typeof window === 'undefined') return null;

    try {
      const rawUser = window.localStorage.getItem(AUTH_USER_KEY);
      return rawUser ? JSON.parse(rawUser) : null;
    } catch {
      window.localStorage.removeItem(AUTH_USER_KEY);
      return null;
    }
  },
  set(user) {
    if (typeof window === 'undefined') return;
    if (user) {
      window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(AUTH_USER_KEY);
    }
  },
  clear() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(AUTH_USER_KEY);
  },
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => authUserStore.get());
  const [loading, setLoading] = useState(() => Boolean(authTokenStore.get()));

  const toSessionUser = useCallback((user, overrides = {}) => ({
    id: user.id || user._id || null,
    name: user.name || user.email,
    email: user.email,
    slug: user.slug || null,
    role: user.role === 'restaurant' ? 'owner' : user.role,
    hasRestaurant: user.role === 'restaurant' ? user.setupComplete !== false : true,
    ...overrides,
  }), []);

  const updateCurrentUser = useCallback((user) => {
    setCurrentUser(user);
    authUserStore.set(user);
  }, []);

  // Restore session on mount by calling /api/auth/me
  useEffect(() => {
    const token = authTokenStore.get();
    if (!token) {
      authUserStore.clear();
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    authApi.me()
      .then(({ user }) => {
        updateCurrentUser(toSessionUser(user));
      })
      .catch(() => {
        authTokenStore.clear();
        authUserStore.clear();
        setCurrentUser(null);
      })
      .finally(() => setLoading(false));
  }, [toSessionUser, updateCurrentUser]);

  // Step 1: Initiate registration (sends OTP to email)
  const initiateSignup = useCallback(async (ownerName, email, password, restaurantName) => {
    // This just sends the OTP; does NOT create an account yet
    return authApi.initiateRegister(ownerName, email, password, restaurantName);
  }, []);

  // Step 2: Verify OTP and create account
  const verifySignup = useCallback(async (email, otp) => {
    const { user, token } = await authApi.verifyRegister(email, otp);
    authTokenStore.set(token);
    const sessionUser = toSessionUser(user, { hasRestaurant: false });
    updateCurrentUser(sessionUser);
    return sessionUser;
  }, [toSessionUser, updateCurrentUser]);

  // Login for both restaurant owners and admins
  const login = useCallback(async (email, password, isAdmin = false) => {
    let user;
    let token;
    if (isAdmin) {
      const result = await authApi.adminLogin(email, password);
      user = result.user;
      token = result.token;
    } else {
      const result = await authApi.login(email, password);
      user = result.user;
      token = result.token;
    }

    authTokenStore.set(token);
    const sessionUser = toSessionUser(user);
    updateCurrentUser(sessionUser);
    return sessionUser;
  }, [toSessionUser, updateCurrentUser]);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    authTokenStore.clear();
    authUserStore.clear();
    setCurrentUser(null);
  }, []);

  // Called after restaurant setup is complete to move user to dashboard
  const markRestaurantReady = useCallback((slug) => {
    setCurrentUser(prev => {
      if (!prev) return prev;
      const updatedUser = { ...prev, hasRestaurant: true, slug };
      authUserStore.set(updatedUser);
      return updatedUser;
    });
  }, []);

  const value = {
    currentUser,
    loading,
    initiateSignup,
    verifySignup,
    login,
    logout,
    markRestaurantReady,
    isOwner: currentUser?.role === 'owner',
    isAdmin: currentUser?.role === 'admin' || currentUser?.role === 'superadmin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
