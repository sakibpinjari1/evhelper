import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../utils/auth.js';

// Initial auth state
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_LOADING: 'SET_LOADING',
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: action.payload,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null,
      };

    case AUTH_ACTIONS.REGISTER_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case AUTH_ACTIONS.REGISTER_SUCCESS:
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };

    case AUTH_ACTIONS.REGISTER_FAILURE:
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: action.payload,
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on mount
  useEffect(() => {
    const token = authAPI.getToken();
    const user = authAPI.getCurrentUser();
    
    if (token && user) {
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, token }
      });
    }
  }, []);

  // Action creators
  const actions = {
    login: async (credentials) => {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      try {
        const result = await authAPI.login(credentials);
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: result
        });
        return result;
      } catch (error) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: error.message || 'Login failed'
        });
        throw error;
      }
    },

    register: async (userData) => {
      dispatch({ type: AUTH_ACTIONS.REGISTER_START });
      try {
        const result = await authAPI.register(userData);
        dispatch({
          type: AUTH_ACTIONS.REGISTER_SUCCESS,
          payload: result
        });
        return result;
      } catch (error) {
        dispatch({
          type: AUTH_ACTIONS.REGISTER_FAILURE,
          payload: error.message || 'Registration failed'
        });
        throw error;
      }
    },

    logout: () => {
      authAPI.logout();
      dispatch({
        type: AUTH_ACTIONS.LOGOUT
      });
    },

    clearError: () => {
      dispatch({
        type: AUTH_ACTIONS.CLEAR_ERROR
      });
    },

    setLoading: (loading) => {
      dispatch({
        type: AUTH_ACTIONS.SET_LOADING,
        payload: loading
      });
    },
  };

  const value = {
    state,
    actions,
    dispatch,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
