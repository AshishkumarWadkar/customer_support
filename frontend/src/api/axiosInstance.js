import axios from 'axios';
import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // sends the HttpOnly refresh token cookie automatically
  timeout: 15000,
});

// ── Request Interceptor: inject access token ──────────────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Token-refresh state ───────────────────────────────────────────────────
//
// isRefreshing  — true while a /auth/refresh call is in-flight.
// failedQueue   — requests that arrived while refresh was in-flight;
//                 each entry is a { resolve, reject } pair.
//                 On refresh success  → resolve(newToken)  → request retried.
//                 On refresh failure  → reject(err)        → request rejected.

let isRefreshing = false;
let failedQueue = [];

const drainQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

const clearSession = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
};

// ── Response Interceptor ──────────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // ── 401 handling: attempt a single token refresh ──────────────────────
    //
    // Guard conditions that skip refresh:
    //   • No response at all (network error)          → status is undefined
    //   • Already retried this request (_retry flag)  → avoid infinite loop
    //   • The failing request IS /auth/refresh itself → refreshing the
    //     refresh endpoint would loop; treat as hard logout instead
    const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh');

    if (status === 401 && !originalRequest._retry && !isRefreshEndpoint) {
      // Another refresh is already in-flight — queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        });
        // Note: no .catch here — if drainQueue rejects, the error propagates
        // naturally to the original caller.
      }

      // We are the first 401 — kick off a refresh
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Use a plain axios call (not axiosInstance) so this request is NOT
        // intercepted again — avoids an interceptor loop.
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = data.data.accessToken;
        localStorage.setItem('accessToken', newToken);

        // Unblock every queued request with the new token
        drainQueue(null, newToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed (expired cookie, revoked token, server error, etc.)
        // Flush the queue with the error so queued callers are rejected cleanly
        drainQueue(refreshError, null);
        clearSession();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        // Always reset the flag — even if the retry throws, the next
        // independent 401 should be able to start a fresh refresh cycle.
        isRefreshing = false;
      }
    }

    // ── 5xx: show a toast (once per error, not for retried originals) ─────
    if (status >= 500) {
      toast.error('Server error. Please try again.');
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
