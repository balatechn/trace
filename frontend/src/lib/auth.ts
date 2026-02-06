import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from './api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'it_admin' | 'viewer';
  department?: string;
  is_active: boolean;
  consent_given: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          const { access_token, refresh_token } = response.data;
          
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          
          // Fetch user data
          const userResponse = await authApi.getMe();
          set({
            user: userResponse.data,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (error: any) {
          set({
            error: error.response?.data?.detail || 'Login failed',
            isLoading: false,
          });
          return false;
        }
      },
      
      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          // Ignore errors during logout
        }
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, isAuthenticated: false });
      },
      
      checkAuth: async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }
        
        try {
          const response = await authApi.getMe();
          set({
            user: response.data,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          set({ isLoading: false, isAuthenticated: false, user: null });
        }
      },
      
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Role checks
export const useIsAdmin = () => {
  const user = useAuthStore((state) => state.user);
  return user?.role === 'super_admin' || user?.role === 'it_admin';
};

export const useIsSuperAdmin = () => {
  const user = useAuthStore((state) => state.user);
  return user?.role === 'super_admin';
};

export const useCanEdit = () => {
  return useIsAdmin();
};
