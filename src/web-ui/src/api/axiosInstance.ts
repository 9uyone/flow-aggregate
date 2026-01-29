import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'; 

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Flag to prevent multiple refresh token requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

/**
 * Resolves or rejects all queued requests waiting for a token refresh.
 *
 * Why: when multiple requests fail with 401 at once, we refresh only once.
 * Other requests wait here and retry once the new token is available.
 */
const processQueue = (error: unknown | null, token?: string) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error || !token) {
      reject(error ?? new Error('Token refresh failed'));
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Redirects to /login after a failed refresh attempt.
 *
 * Why: only a failed refresh should force a full logout flow.
 */
const redirectToLogin = () => {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.history.pushState(null, '', '/login');
  }
};

/**
 * Attaches auth header and correlation ID to outgoing requests.
 *
 * Why: ensures authenticated calls include Bearer token, and collector calls
 * carry correlation IDs for traceability across microservices.
 */
const attachAuthAndCorrelationId = (config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const trackedEndpoints = ['/collector/run', '/collector/ingest'];
  if (trackedEndpoints.some((ep) => config.url?.includes(ep))) {
    const correlationId = crypto.randomUUID();
    config.params = { ...config.params, correlationId };
    config.headers['X-Correlation-ID'] = correlationId;
  }

  return config;
};

/**
 * Handles 401 responses by refreshing the access token.
 *
 * Why: multiple concurrent 401s should trigger only one refresh request.
 * The failedQueue allows other requests to wait and retry with the new token.
 */
const handleAuthError = async (error: AxiosError) => {
  const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

  if (error.response?.status !== 401 && error.response?.status !== 403) {
    return Promise.reject(error);
  }

  console.log('[Auth Debug] Interceptor caught auth error', {
    status: error.response?.status,
    url: originalRequest.url,
  });

  console.error('[Axios Error Trace]', error.response?.status, error.config?.url);

  if (error.response?.status === 401) {
    console.warn(`[Axios] 401 detected on: ${originalRequest.url}`);
  }

  if (originalRequest._retry) {
    return Promise.reject(error);
  }

  const { refreshToken, logout, setTokens } = useAuthStore.getState();

  if (originalRequest.url?.includes('/auth/refresh')) {
    console.log('[Auth Debug] Refresh request failed', {
      status: error.response?.status,
    });
    processQueue(error, undefined);
    if (error.response?.status === 401 || error.response?.status === 403) {
      logout();
      redirectToLogin();
    }
    return Promise.reject(error);
  }

  if (isRefreshing) {
    console.log('[Auth Debug] Refresh in progress, queueing request');
    return new Promise<string>((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    }).then((newToken) => {
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      return axiosInstance(originalRequest);
    });
  }

  if (!refreshToken) {
    processQueue(new Error('Missing refresh token'), undefined);
    return Promise.reject(error);
  }

  originalRequest._retry = true;
  isRefreshing = true;

  try {
    console.log('[Auth Debug] Calling /auth/refresh', { refreshToken });
    console.warn(`[Axios] Attempting refresh with: ${refreshToken}`);
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

    setTokens(newAccessToken, newRefreshToken);
    processQueue(null, newAccessToken);
    console.log('[Auth Debug] Refresh result: OK');
    console.warn('[Axios] Refresh result: OK');

    originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
    return axiosInstance(originalRequest);
  } catch (refreshError) {
    processQueue(refreshError, undefined);
    console.log('[Auth Debug] Refresh result: FAILED');
    console.warn('[Axios] Refresh result: FAILED');
    const refreshStatus = (refreshError as AxiosError).response?.status;
    if (refreshStatus === 401 || refreshStatus === 403) {
      logout();
      redirectToLogin();
    }
    return Promise.reject(refreshError);
  } finally {
    isRefreshing = false;
  }
};

axiosInstance.interceptors.request.use(attachAuthAndCorrelationId);
axiosInstance.interceptors.response.use((response) => response, handleAuthError);

export default axiosInstance;
