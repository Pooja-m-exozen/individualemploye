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
    const response = await fetch('http://192.168.0.5:5050/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Store auth data
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      localStorage.setItem(EXPIRES_AT_KEY, new Date(Date.now() + 3600000).toISOString()); // 1 hour expiry
      // Store both the original and the kyc-specific email format
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('kycEmail', data.user.email.replace('@exozen.in', '.dn@exozen.in'));
      
      return {
        ...data,
        success: true,
        message: 'Login successful'
      };
    }

    return {
      success: false,
      message: data.message || 'Login failed'
    } as LoginResponse;
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'An error occurred during login'
    } as LoginResponse;
  }
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
  localStorage.removeItem('userEmail');
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
