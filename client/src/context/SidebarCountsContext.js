import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const SidebarCountsContext = createContext();

export const SidebarCountsProvider = ({ children }) => {
  const { user } = useAuth();
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCounts = useCallback(async () => {
    if (!user || user.status === 'inactive' || user.status === 'disabled') {
      setCounts(null);
      return;
    }

    try {
      setLoading(true);
      const res = await axios.get('/api/dashboard/counts');
      setCounts(res.data);
    } catch (err) {
      console.error('Failed to fetch sidebar counts:', err);
      // Safe fallback - keep existing or empty object rather than crashing
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return (
    <SidebarCountsContext.Provider value={{ counts, loading, refreshCounts: fetchCounts }}>
      {children}
    </SidebarCountsContext.Provider>
  );
};

export const useSidebarCounts = () => {
  const context = useContext(SidebarCountsContext);
  if (!context) {
    throw new Error('useSidebarCounts must be used within a SidebarCountsProvider');
  }
  return context;
};
