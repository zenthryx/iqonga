import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthState } from '@/types';
import { authService } from '@/services/authService';
import toast from 'react-hot-toast';

interface AuthStore extends AuthState {
  isWhitelisted: boolean | null;
  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginWithWallet: (walletAddress: string, signature: string) => Promise<void>;
  logout: () => void;
  register: (userData: {
    email: string;
    username?: string;
    password: string;
    walletAddress?: string;
  }) => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  refreshToken: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  checkWhitelist: (walletAddress: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isWhitelisted: null,

      // Actions
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true });
          
          const response = await authService.login({ email, password });
          
          if (response.success && response.data) {
            const { user, token } = response.data;
            
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
            
            // Store token in localStorage for API calls
            localStorage.setItem('authToken', token);
            
            toast.success(`Welcome back, ${user.username}!`);
          } else {
            throw new Error(response.message || 'Login failed');
          }
        } catch (error: any) {
          set({ isLoading: false });
          toast.error(error.message || 'Login failed');
          throw error;
        }
      },

      loginWithWallet: async (_walletAddress: string, _signature: string) => {
        set({ isLoading: false });
        toast.error('Wallet login is not available. Please sign in with email.');
        throw new Error('Wallet login is not available in this version.');
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          isWhitelisted: null,
        });
        localStorage.removeItem('authToken');
        localStorage.removeItem('auth-store');
        authService.logout().catch(console.error);
        toast.success('Logged out successfully');
      },

      register: async (userData) => {
        try {
          set({ isLoading: true });
          
          const response = await authService.register(userData);
          
          if (response.success && response.data) {
            const { user, token } = response.data;
            
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
            
            localStorage.setItem('authToken', token);
            toast.success(`Welcome to SocialAI, ${user.username}!`);
          } else {
            throw new Error(response.message || 'Registration failed');
          }
        } catch (error: any) {
          set({ isLoading: false });
          toast.error(error.message || 'Registration failed');
          throw error;
        }
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },

      refreshToken: async () => {
        try {
          const response = await authService.refreshToken();
          
          if (response.success && response.data) {
            const { token, user } = response.data;
            
            set({
              token,
              user,
              isAuthenticated: true,
            });
            
            localStorage.setItem('authToken', token);
          } else {
            // If refresh fails, logout user
            get().logout();
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          get().logout();
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      checkWhitelist: async (_walletAddress: string) => {
        set({ isWhitelisted: false });
        return false;
      }
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        isWhitelisted: state.isWhitelisted,
      }),
      onRehydrateStorage: () => (state) => {
        // Verify token validity on app load
        if (state?.token && state?.isAuthenticated) {
          // Set token in localStorage for immediate API calls
          localStorage.setItem('authToken', state.token);
          
          // Optionally verify token with server
          state.refreshToken?.().catch(() => {
            console.log('Token refresh failed on rehydration');
          });
        }
      },
    }
  )
); 