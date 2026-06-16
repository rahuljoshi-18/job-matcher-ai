import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Clerk token.
// Skips silently on SSR (no window / no Clerk session) so hydration never crashes.
apiClient.interceptors.request.use(
  async (config) => {
    if (typeof window === 'undefined') {
      // SSR context — return config without a token; server-side route handlers
      // authenticate via Clerk's server SDK, not via this client.
      return config;
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    delete config.headers.Authorization;

    if (window.Clerk?.session) {
      try {
        const token = await window.Clerk.session.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Token fetch failed — proceed without auth header; the server will 401.
        console.warn('[apiClient] Failed to fetch Clerk token.');
      }
    }

    return config;
  },
  (err) => Promise.reject(err)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/sign-in';
    }

    if (error.response?.status === 500) {
      console.error('[apiClient] Server error:', error.response.data);
      return Promise.reject(new Error('An unexpected error occurred. Please try again.'));
    }

    return Promise.reject(error);
  }
);
