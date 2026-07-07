import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api/client';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('litmus_user');
    const token = localStorage.getItem('litmus_token');
    if (stored && token) {
      setUser(JSON.parse(stored));
      // Refresh from server in background to catch permission updates
      refreshUserFromServer();
    }
    setLoading(false);
  }, []);

  async function refreshUserFromServer() {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      localStorage.setItem('litmus_user', JSON.stringify(data));
    } catch {
      // Token may be expired — silently ignore, user stays logged in from localStorage
    }
  }

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('litmus_token', data.token);
    localStorage.setItem('litmus_user', JSON.stringify(data.user));
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem('litmus_token');
    localStorage.removeItem('litmus_user');
    setUser(null);
  }

  async function refreshUser() {
    await refreshUserFromServer();
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
