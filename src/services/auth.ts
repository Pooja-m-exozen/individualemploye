import axios from 'axios';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  project_name: string;
  profile_image: string;
}

interface LoginResponse {
  message: string;
  token: string;
  expiresAt: string;
  user: User;
  session: {
    issuedAt: string;
    expiresAt: string;
  };
  success?: boolean;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user';
const EXPIRES_AT_KEY = 'token_expires_at';

export const login = async (
  username: string,
  password: string
): Promise<LoginResponse> => {
  try {
    const response = await fetch('https://sso.zenapi.co.in/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Check if user is Admin
      if (data.user.role !== 'Admin') {
        return {
          success: false,
          message: 'Access denied. Only Admin users are allowed to login.'
        } as LoginResponse;
      }

      // Store auth data
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      localStorage.setItem(EXPIRES_AT_KEY, data.expiresAt || data.session.expiresAt);
      
      return {
        ...data,
        success: true
      };
    }

    return {
      ...data,
      success: false,
      message: data.message || 'Login failed'
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'An error occurred during login'
    } as LoginResponse;
  }
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
  // Use window.location.href for a full page refresh on logout
  window.location.href = '/login';
};

export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  return !!token;
};

export const getUser = (): User | null => {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
};

export const clearAuthToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};
