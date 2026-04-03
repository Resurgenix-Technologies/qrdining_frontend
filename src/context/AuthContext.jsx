import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const toSessionUser = useCallback((user, overrides = {}) => ({
    id: user.id || user._id || null,
    name: user.name || user.email,
    email: user.email,
    slug: user.slug || null,
    role: user.role === 'restaurant' ? 'owner' : user.role,
    hasRestaurant: user.role === 'restaurant' ? user.setupComplete !== false : true,
    ...overrides,
  }), []);

  // Restore session on mount by calling /api/auth/me
  useEffect(() => {
    setLoading(true);
    authApi.me()
      .then(({ user }) => {
        setCurrentUser(toSessionUser(user));
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => setLoading(false));
  }, [toSessionUser]);

  // Step 1: Initiate registration (sends OTP to email)
  const initiateSignup = useCallback(async (ownerName, email, password, restaurantName) => {
    // This just sends the OTP; does NOT create an account yet
    return authApi.initiateRegister(ownerName, email, password, restaurantName);
  }, []);

  // Step 2: Verify OTP and create account
  const verifySignup = useCallback(async (email, otp) => {
    const { user } = await authApi.verifyRegister(email, otp);
    const sessionUser = toSessionUser(user, { hasRestaurant: false });
    setCurrentUser(sessionUser);
    return sessionUser;
  }, [toSessionUser]);

  // Login for both restaurant owners and admins
  const login = useCallback(async (email, password, isAdmin = false) => {
    let user;
    if (isAdmin) {
      const result = await authApi.adminLogin(email, password);
      user = result.user;
    } else {
      const result = await authApi.login(email, password);
      user = result.user;
    }

    const sessionUser = toSessionUser(user);
    setCurrentUser(sessionUser);
    return sessionUser;
  }, [toSessionUser]);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    setCurrentUser(null);
  }, []);

  // Called after restaurant setup is complete to move user to dashboard
  const markRestaurantReady = useCallback((slug) => {
    setCurrentUser(prev => {
      if (!prev) return prev;
      return { ...prev, hasRestaurant: true, slug };
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
