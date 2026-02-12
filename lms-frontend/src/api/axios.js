import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://server.carequbics.com/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect on 401 for authentication endpoints or critical auth failures
    // Don't redirect for permission errors on specific resources
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      const token = localStorage.getItem('token');
      const isAuthEndpoint = error.config?.url?.includes('/auth/');
      const isVerifyEndpoint = error.config?.url?.includes('/verify');
      
      // Only logout and redirect if:
      // 1. It's an auth endpoint (login, verify, etc.)
      // 2. OR the error message indicates token is invalid/expired
      const errorMessage = error.response?.data?.error || '';
      const isTokenInvalid = errorMessage.toLowerCase().includes('token') || 
                            errorMessage.toLowerCase().includes('unauthorized') ||
                            errorMessage.toLowerCase().includes('expired');
      
      if (token && (isAuthEndpoint || isVerifyEndpoint || isTokenInvalid)) {
        // User was logged in but token is invalid/expired
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('selectedSchool');
        localStorage.removeItem('selectedCenter');
        localStorage.removeItem('currentSection');
        localStorage.removeItem('ownerEditMode');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
