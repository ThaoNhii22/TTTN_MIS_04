import { createContext, useContext, useEffect, useState } from 'react';
import {
  getMeApi,
  getStoredUser,
  getToken,
  loginApi,
  logoutApi,
  removeStoredUser,
  removeToken,
  setStoredUser,
  setToken,
} from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setAuthToken] = useState(() => getToken());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const storedToken = getToken();
      if (storedToken) {
        try {
          const userData = await getMeApi();
          setUser(userData);
          setStoredUser(userData);
        } catch (err) {
          console.warn('Session expired or invalid token:', err);
          removeToken();
          removeStoredUser();
          setUser(null);
          setAuthToken(null);
        }
      }
      setIsLoading(false);
    }
    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await loginApi(email, password);
    setToken(data.access_token);
    setStoredUser(data.user);
    setAuthToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await logoutApi();
    setUser(null);
    setAuthToken(null);
  };

  const value = {
    user,
    role: user?.role || null,
    token,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    logout,
    setUser,
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
