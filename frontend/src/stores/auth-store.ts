import { create } from 'zustand';
import api, { setAccessToken } from '../lib/api';
import {
  clearDevDashboardPreviewSession,
  DEV_MOCK_USER,
  isDevDashboardPreviewSession,
} from '../lib/dev-dashboard-preview';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    setAccessToken(data.data.accessToken);
    set({ user: data.data.user, isAuthenticated: true });
  },

  register: async (email, password, name) => {
    const { data } = await api.post('/api/auth/register', { email, password, name });
    clearDevDashboardPreviewSession();
    setAccessToken(data.data.accessToken);
    set({ user: data.data.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      // Ignore errors
    }
    clearDevDashboardPreviewSession();
    setAccessToken(null);
    set({ user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    if (isDevDashboardPreviewSession()) {
      set((s) => ({
        user: s.user ?? DEV_MOCK_USER,
        isAuthenticated: true,
        isLoading: false,
      }));
      return;
    }
    try {
      const { data } = await api.get('/api/auth/me');
      set({ user: data.data.user, isAuthenticated: true, isLoading: false });
    } catch (e) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
