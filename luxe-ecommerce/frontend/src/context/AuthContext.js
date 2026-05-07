import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('luxe_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('luxe_token');
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => { localStorage.removeItem('luxe_token'); localStorage.removeItem('luxe_user'); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const saveAuth = (token, userData) => {
    localStorage.setItem('luxe_token', token);
    localStorage.setItem('luxe_user', JSON.stringify(userData));
    setUser(userData);
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    saveAuth(res.data.token, res.data.user);
    toast.success(res.data.message || 'Account created!');
    return res.data;
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    saveAuth(res.data.token, res.data.user);
    toast.success(`Welcome back, ${res.data.user.name.split(' ')[0]}!`);
    return res.data;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('luxe_token');
    localStorage.removeItem('luxe_user');
    setUser(null);
    toast.success('Logged out.');
  };

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('luxe_user', JSON.stringify(updatedUser));
  }, []);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateUser, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
