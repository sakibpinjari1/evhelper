import axios from 'axios';

// API base URL - adjust based on your server configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('evhelper_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    // Handle 401 responses (token expired)
    if (response.status === 401) {
      localStorage.removeItem('evhelper_token');
      localStorage.removeItem('evhelper_user');
      window.location.href = '/login';
    }
    
    return response;
  },
  (error) => {
    console.error('Response interceptor error:', error);
    
    // Handle 401 errors from response interceptor
    if (error.response?.status === 401) {
      localStorage.removeItem('evhelper_token');
      localStorage.removeItem('evhelper_user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Authentication functions
export const authAPI = {
  // Register new user
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error.response?.data || error.message;
    }
  },

  // Login user
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        // Store token and user data
        localStorage.setItem('evhelper_token', token);
        localStorage.setItem('evhelper_user', JSON.stringify(user));
        
        return { success: true, user, token };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error.response?.data || error.message;
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('evhelper_token');
    localStorage.removeItem('evhelper_user');
  },

  // Get current user
  getCurrentUser: () => {
    const userStr = localStorage.getItem('evhelper_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Get current token
  getToken: () => {
    return localStorage.getItem('evhelper_token');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('evhelper_token');
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const token = localStorage.getItem('evhelper_token');
      const response = await api.put('/auth/profile', profileData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.data.success) {
        // Update stored user data
        localStorage.setItem('evhelper_user', JSON.stringify(response.data.user));
        return response.data;
      } else {
        throw new Error(response.data.message || 'Profile update failed');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      throw error.response?.data || error.message;
    }
  },
};

export default api;
