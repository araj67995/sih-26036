import axios from 'axios';

// Get base URL from environment or use Vite proxy fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT token if present in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Extract data and handle common errors (e.g., 401 Unauthorized)
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred while communicating with the server';

    // Handle token expiry or unauthorized
    if (error.response?.status === 401) {
      // If unauthorized and has token, clear stale storage
      if (localStorage.getItem('token')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Let the application route or reload if needed
      }
    }

    return Promise.reject({
      message,
      statusCode: error.response?.status,
      errors: error.response?.data?.errors,
      originalError: error,
    });
  }
);

// Health check service helper
export const checkSystemHealth = async () => {
  return await api.get('/health');
};

export default api;
