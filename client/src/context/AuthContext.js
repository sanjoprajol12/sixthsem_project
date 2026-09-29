import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Interceptor to immediately log out disabled or unauthenticated users on any API failure
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (
          error.response &&
          (error.response.status === 401 ||
            (error.response.status === 403 &&
              (error.response.data?.account_disabled ||
                error.response.data?.account_pending ||
                error.response.data?.error?.toLowerCase().includes('deactivated') ||
                error.response.data?.error?.toLowerCase().includes('disabled'))))
        ) {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
          if (
            window.location.pathname !== '/login' &&
            window.location.pathname !== '/register'
          ) {
            toast.error(
              error.response.data?.error ||
                'Session expired or account is disabled. Please log in.'
            );
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );

    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('/api/auth/me')
        .then(res => {
          if (res.data.user && (res.data.user.status === 'disabled' || res.data.user.status === 'inactive')) {
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
          } else {
            setUser(res.data.user);
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (username, password) => {
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      setUser(res.data.user);
      toast.success('Login successful');
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed');
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const res = await axios.post('/api/auth/register', userData);
      toast.success(res.data?.message || 'Registration successful. Please log in.');
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Registration failed');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

