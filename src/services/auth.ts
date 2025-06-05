interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  projects: string[];
  employeeId: string;
  employeePhoto: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: User;
  };
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user';
const EXPIRES_AT_KEY = 'token_expires_at';
const EMPLOYEE_ID_KEY = 'employee_id';

export const login = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  try {
    const response = await fetch('https://cafm.zenapi.co.in/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Store auth data
      localStorage.setItem(TOKEN_KEY, data.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
      localStorage.setItem(EXPIRES_AT_KEY, new Date(Date.now() + 3600000).toISOString()); // 1 hour expiry
      localStorage.setItem('userEmail', data.data.user.email);
      localStorage.setItem(EMPLOYEE_ID_KEY, data.data.user.employeeId);
      
      return {
        success: true,
        message: data.message,
        data: data.data
      };
    }

    return {
      success: false,
      message: data.message || 'Login failed'
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'An error occurred during login'
    };
  }
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
  localStorage.removeItem('userEmail');
  localStorage.removeItem(EMPLOYEE_ID_KEY);
  // Use window.location.href for a full page refresh on logout
  window.location.href = '/login';
};

export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  return !!token;
};

export const getUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
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

export const getUserRole = (): string | null => {
  const user = getUser();
  return user?.role || null;
};

export const isEmployee = (): boolean => {
  const role = getUserRole();
  return role === 'Employee';
};

export const isAdmin = (): boolean => {
  const role = getUserRole();
  return role === 'Admin';
};

export const getInitialRoute = (): string => {
  return '/dashboard';
};

export const getUserEmail = (): string | null => {
  const user = getUser();
  // Try to get the KYC-specific email format first
  return localStorage.getItem('kycEmail') || user?.email || localStorage.getItem('userEmail');
};

export const getEmployeeId = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(EMPLOYEE_ID_KEY);
  }
  return null;
};
