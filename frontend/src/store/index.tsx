import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { api } from '../utils/api';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  apiKey: string;
}

interface Account {
  _id: string;
  robloxUsername: string;
  level: number;
  beli: number;
  fragments: number;
  sea: number;
  race: string;
  equipped: {
    fruit: string;
    fruitMastery: number;
    sword: string;
    gun: string;
    fightingStyle: string;
  };
  status: 'offline' | 'idle' | 'grinding' | 'bossing' | 'sea_event' | 'trading';
  location: string;
  playtime: number;
  lastSeen: string;
}

interface Inventory {
  fruits: string[];
  weapons: string[];
  guns: string[];
  styles: string[];
  materials: { name: string; quantity: number }[];
  accessories: string[];
}

interface Session {
  _id: string;
  startTime: string;
  endTime?: string;
  duration: number;
  online: boolean;
}

interface Log {
  _id: string;
  type: string;
  description: string;
  timestamp: string;
}

interface Analytics {
  summary: {
    totalAccounts: number;
    onlineAccounts: number;
    totalBeli: number;
    totalFragments: number;
    totalPlaytime: number;
    totalFruitsCount: number;
  };
  fruitsDistribution: { name: string; value: number }[];
  levelProgress: { name: string; level: number; beli: number; fragments: number }[];
  materialsDistribution: { name: string; quantity: number }[];
  sessionMetrics: { totalSessionsCount: number; avgSessionDuration: number; longestSessionDuration: number };
  hourlyActivity: { hour: string; count: number }[];
}

interface AppContextType {
  user: User | null;
  token: string | null;
  accounts: Account[];
  analytics: Analytics | null;
  selectedAccountDetails: {
    account: Account;
    inventory: Inventory;
    activeSession: Session | null;
    logs: Log[];
  } | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  fetchAccounts: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;
  fetchAccountDetails: (accountId: string) => Promise<void>;
  regenerateApiKey: () => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [selectedAccountDetails, setSelectedAccountDetails] = useState<AppContextType['selectedAccountDetails']>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize Auth State from LocalStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.success) {
            setUser(res.user);
          } else {
            logout();
          }
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, [token]);

  // Setup Socket Connection for Realtime Tracking
  useEffect(() => {
    if (user && token) {
      const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const newSocket = io(socketUrl, {
        auth: {
          token
        }
      });

      newSocket.on('connect', () => {
        console.log('Socket connected to backend');
        newSocket.emit('join_room', user.id);
      });

      newSocket.on('account_update', (data: { account: Account; inventory: Inventory; activeSession: Session | null; logs?: Log[] }) => {
        console.log('Realtime Account Update:', data);
        
        // 1. Update accounts list dynamically
        setAccounts((prev) => {
          const index = prev.findIndex((acc) => acc._id === data.account._id);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = data.account;
            return updated.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
          }
          return [data.account, ...prev];
        });

        // 2. Update active detail view if open
        setSelectedAccountDetails((prev) => {
          if (prev && prev.account._id === data.account._id) {
            return {
              account: data.account,
              inventory: data.inventory,
              activeSession: data.activeSession,
              logs: data.logs ? [...data.logs, ...prev.logs].slice(0, 30) : prev.logs,
            };
          }
          return prev;
        });

        // 3. Increment analytics dashboard metrics
        setAnalytics((prev) => {
          if (!prev) return null;
          // Dynamically adjust count of online accounts
          const wasOnline = accounts.find((a) => a._id === data.account._id)?.status !== 'offline';
          const isOnline = data.account.status !== 'offline';
          const onlineDiff = isOnline && !wasOnline ? 1 : !isOnline && wasOnline ? -1 : 0;

          return {
            ...prev,
            summary: {
              ...prev.summary,
              onlineAccounts: Math.max(0, prev.summary.onlineAccounts + onlineDiff),
              totalBeli: prev.summary.totalBeli + (data.account.beli - (accounts.find((a) => a._id === data.account._id)?.beli || 0)),
              totalFragments: prev.summary.totalFragments + (data.account.fragments - (accounts.find((a) => a._id === data.account._id)?.fragments || 0)),
            }
          };
        });
      });



      return () => {
        newSocket.disconnect();
      };
    }
  }, [user, token]);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.success) {
        localStorage.setItem('token', res.token);
        setToken(res.token);
        setUser(res.user);
        return { success: true };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Login error occurred' };
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const res = await api.post('/auth/register', { username, email, password });
      if (res.success) {
        localStorage.setItem('token', res.token);
        setToken(res.token);
        setUser(res.user);
        return { success: true };
      }
      return { success: false, message: res.message || 'Registration failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Registration error occurred' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setAccounts([]);
    setAnalytics(null);
    setSelectedAccountDetails(null);
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      if (res.success) {
        setAccounts(res.data);
      }
    } catch (err) {
      console.error('Error fetching accounts', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/analytics/overview');
      if (res.success) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error('Error fetching analytics', err);
    }
  };

  const fetchAccountDetails = async (accountId: string) => {
    try {
      const res = await api.get(`/accounts/${accountId}`);
      if (res.success) {
        setSelectedAccountDetails(res.data);
      }
    } catch (err) {
      console.error('Error fetching account details', err);
    }
  };

  const regenerateApiKey = async () => {
    try {
      const res = await api.post('/auth/regenerate-key', {});
      if (res.success && user) {
        setUser({ ...user, apiKey: res.apiKey });
      }
    } catch (err) {
      console.error('Error regenerating API key', err);
    }
  };

  const deleteAccount = async (accountId: string) => {
    try {
      const res = await api.delete(`/accounts/${accountId}`);
      if (res.success) {
        setAccounts((prev) => prev.filter((acc) => acc._id !== accountId));
        if (selectedAccountDetails?.account._id === accountId) {
          setSelectedAccountDetails(null);
        }
      }
    } catch (err) {
      console.error('Error deleting account', err);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        accounts,
        analytics,
        selectedAccountDetails,
        loading,
        login,
        register,
        logout,
        fetchAccounts,
        fetchAnalytics,
        fetchAccountDetails,
        regenerateApiKey,
        deleteAccount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
