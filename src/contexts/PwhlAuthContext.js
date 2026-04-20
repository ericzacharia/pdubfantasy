import React, { createContext, useState, useContext, useEffect } from 'react';
import { pwhlAuthAPI, clearPwhlTokens } from '../services/pwhlAPI';

const PwhlAuthContext = createContext(null);

export const PwhlAuthProvider = ({ children }) => {
  const [pwhlUser, setPwhlUser] = useState(null);
  const [isPwhlAuthenticated, setIsPwhlAuthenticated] = useState(false);
  const [pwhlLoading, setPwhlLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('pwhlAccessToken') || sessionStorage.getItem('pwhlAccessToken');
      if (token) {
        try {
          const response = await pwhlAuthAPI.getMe();
          setPwhlUser(response.data);
          setIsPwhlAuthenticated(true);
        } catch (error) {
          clearPwhlTokens();
          setPwhlUser(null);
          setIsPwhlAuthenticated(false);
        }
      }
      setPwhlLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password, keepLoggedIn = true) => {
    try {
      const response = await pwhlAuthAPI.login(email, password);
      const { access_token, refresh_token } = response.data;

      const storage = keepLoggedIn ? localStorage : sessionStorage;
      storage.setItem('pwhlAccessToken', access_token);
      storage.setItem('pwhlRefreshToken', refresh_token);

      // Fetch full user profile
      const profileResponse = await pwhlAuthAPI.getMe();
      setPwhlUser(profileResponse.data);
      setIsPwhlAuthenticated(true);

      return { success: true, user: profileResponse.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed';
      return { success: false, error: message };
    }
  };

  const register = async (email, username, password) => {
    try {
      await pwhlAuthAPI.register(email, username, password);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed';
      return { success: false, error: message };
    }
  };

  const logout = () => {
    clearPwhlTokens();
    setPwhlUser(null);
    setIsPwhlAuthenticated(false);
  };

  return (
    <PwhlAuthContext.Provider value={{
      pwhlUser,
      isPwhlAuthenticated,
      pwhlLoading,
      login,
      register,
      logout,
    }}>
      {children}
    </PwhlAuthContext.Provider>
  );
};

export const usePwhlAuth = () => {
  const context = useContext(PwhlAuthContext);
  if (!context) {
    throw new Error('usePwhlAuth must be used within a PwhlAuthProvider');
  }
  return context;
};
