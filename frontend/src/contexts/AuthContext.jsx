import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';
const AUTH_STORAGE_KEY = 'safety_auth_session';
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

const readStoredSession = () => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (!parsed?.user || !parsed?.expiresAt) return null;
    if (Number(parsed.expiresAt) <= Date.now()) return null;

    return {
      user: parsed.user,
      expiresAt: Number(parsed.expiresAt)
    };
  } catch (err) {
    console.error('Failed to read stored auth session:', err);
    return null;
  }
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({
  children
}) => {
  const storedSession = readStoredSession();
  const [user, setUser] = useState(storedSession?.user || null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(storedSession?.expiresAt || null);

  const logout = useCallback(() => {
    setUser(null);
    setSessionExpiresAt(null);
  }, []);

  useEffect(() => {
    if (user && sessionExpiresAt) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        user,
        expiresAt: sessionExpiresAt
      }));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user, sessionExpiresAt]);

  useEffect(() => {
    if (!user || !sessionExpiresAt) return;

    const remaining = sessionExpiresAt - Date.now();
    if (remaining <= 0) {
      logout();
      return;
    }

    const timer = window.setTimeout(() => {
      logout();
    }, remaining);

    return () => {
      window.clearTimeout(timer);
    };
  }, [user, sessionExpiresAt, logout]);

  const sendEmailOTP = useCallback(async (email) => {
    try {
      const res = await axios.post(`${API_URL}/register`, { email });
      return { success: true, data: res.data };
    } catch (err) {
      console.error(err);
      return {
        success: false,
        error: err?.response?.data?.message || 'Failed to send OTP'
      };
    }
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      setUser(res.data);
      setSessionExpiresAt(Date.now() + SESSION_TTL_MS);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }, []);

  const signup = useCallback(async (data) => {
    try {
      const res = await axios.post(`${API_URL}/verify`, data);
      setUser(res.data);
      setSessionExpiresAt(Date.now() + SESSION_TTL_MS);
      return { success: true, data: res.data };
    } catch (err) {
      console.error(err);
      return {
        success: false,
        error: err?.response?.data?.message || 'Signup failed'
      };
    }
  }, []);

  const addEmergencyContact = useCallback(async (contact) => {
    if (!user) return;
    try {
      const res = await axios.post(`${API_URL}/user/${user._id}/contacts`, contact);
      setUser(prev => ({ ...prev, emergencyContacts: res.data }));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }, [user]);

  const removeEmergencyContact = useCallback(async (contactId) => {
    if (!user) return;
    try {
      const res = await axios.delete(`${API_URL}/user/${user._id}/contacts/${contactId}`);
      setUser(prev => ({ ...prev, emergencyContacts: res.data }));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }, [user]);

  return <AuthContext.Provider value={{
    user,
    isAuthenticated: !!user,
    sessionExpiresAt,
    sendEmailOTP,
    login,
    signup,
    logout,
    addEmergencyContact,
    removeEmergencyContact
  }}>
      {children}
    </AuthContext.Provider>;
};