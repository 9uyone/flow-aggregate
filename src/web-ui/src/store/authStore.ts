import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../types/auth';

// User data is cached for UX only.
// Do not use for authorization decisions.

const ACCESS_TOKEN_STORAGE_KEY = 'auth.accessToken';

/**
 * Reads the access token from sessionStorage.
 *
 * Why: sessionStorage survives F5 but is cleared on browser close,
 * which avoids long-lived access tokens while preventing unnecessary refresh calls.
 */
const readSessionAccessToken = (): string | null => {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }
    return window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

/**
 * Persists or clears the access token in sessionStorage.
 *
 * Why: this keeps the access token across page reloads
 * but still clears it when the browser is closed.
 */
const persistSessionAccessToken = (token: string | null) => {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    if (token) {
      window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors (e.g., Safari private mode)
  }
};

interface AuthState {
  // Persisted state (localStorage)
  user: User | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // In-memory only (not persisted)
  accessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  hydrateAccessToken: () => string | null;
  setInitialized: (value: boolean) => void;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      refreshToken: null,
      isAuthenticated: false,
      accessToken: readSessionAccessToken(),
      isLoading: false,
      isInitialized: false,

      /**
       * Updates the user profile in memory and localStorage.
       * Why: keeps avatar/name in sync after /auth/me refresh.
       * Also keeps isAuthenticated in sync with whether a user is present.
       */
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      /**
       * Updates tokens after refresh or login.
       * Why: accessToken goes to sessionStorage, refreshToken stays in localStorage.
       */
      setTokens: (accessToken, refreshToken) => {
        persistSessionAccessToken(accessToken);
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      /**
       * Hydrates the access token from sessionStorage into memory.
       * Why: prevents a refresh-token call on F5 if the access token still exists.
       */
      hydrateAccessToken: () => {
        const token = readSessionAccessToken();
        if (token) {
          set({ accessToken: token });
        }
        return token;
      },

      /**
       * Marks whether initial auth bootstrap has completed.
       * Why: keeps UI from rendering before tokens/profile are resolved.
       */
      setInitialized: (isInitialized) => set({ isInitialized }),

      /**
       * Stores user and tokens after successful login.
       * Why: user + refreshToken are persisted; accessToken stays in sessionStorage.
       */
      login: (user, accessToken, refreshToken) => {
        persistSessionAccessToken(accessToken);
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isInitialized: true,
        });
      },

      /**
       * Clears all authentication state.
       * Why: guarantees tokens and user profile are fully removed on logout.
       */
      logout: () => {
        persistSessionAccessToken(null);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isInitialized: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Persist: user, refreshToken, isAuthenticated
      // NOT persisted: accessToken, isLoading, isInitialized
      partialize: (state) => ({
        user: state.user,
        refreshToken: state.refreshToken,
        isAuthenticated: !!state.refreshToken,
      }),
    }
  )
);
