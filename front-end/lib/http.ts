import axios from 'axios';

// Create axios instance with base configuration
export const httpClient = axios.create({
  baseURL: process.env.NODE_ENV === 'development' 
    ? '/api' // Use Next.js proxy in development  
    : 'https://memedici-backend.onrender.com',
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging and adding auth if needed
httpClient.interceptors.request.use(
  (config) => {
    console.log(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[HTTP] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
httpClient.interceptors.response.use(
  (response) => {
    console.log(`[HTTP] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('[HTTP] Response error:', error.response?.status, error.response?.data || error.message);
    
    // Handle common error scenarios
    if (error.response?.status === 422) {
      console.error('[HTTP] Validation error:', error.response.data);
    } else if (error.response?.status >= 500) {
      console.error('[HTTP] Server error');
    } else if (!error.response) {
      console.error('[HTTP] Network error');
    }
    
    return Promise.reject(error);
  }
);

export default httpClient; 