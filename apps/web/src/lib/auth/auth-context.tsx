'use client';

/**
 * Authentication Context and Provider
 * Manages user authentication state across the application
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'GUEST' | 'HOTEL_ADMIN' | 'HOTEL_STAFF';
  avatarUrl?: string;
  hotelId?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type GraphQLPayload<T = any> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

async function parseGraphQLResponse<T = any>(response: Response): Promise<GraphQLPayload<T>> {
  const raw = await response.text();
  if (!raw) {
    return { errors: [{ message: 'Empty response from server' }] };
  }

  try {
    return JSON.parse(raw) as GraphQLPayload<T>;
  } catch {
    return { errors: [{ message: 'Invalid response from server' }] };
  }
}

// Use same-origin proxy to avoid CORS/cross-origin issues (e.g. in Codespaces)
const API_URL = '/api/graphql';

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    accessToken: null,
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            query: `query Me { me { id email name phone role avatarUrl hotelId } }`,
          }),
        });

        const { data, errors } = await parseGraphQLResponse<{ me: User }>(response);

        if (errors || !data?.me) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setState({ user: null, isLoading: false, isAuthenticated: false, accessToken: null });
          return;
        }

        setState({
          user: data.me,
          isLoading: false,
          isAuthenticated: true,
          accessToken: token,
        });
      } catch (error) {
        console.error('Auth check failed:', error);
        setState({ user: null, isLoading: false, isAuthenticated: false, accessToken: null });
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation Login($email: String!, $password: String!) {
              login(input: { email: $email, password: $password }) {
                success
                message
                accessToken
                refreshToken
                user { id email name phone role avatarUrl hotelId }
              }
            }
          `,
          variables: { email, password },
        }),
      });

      const { data, errors } = await parseGraphQLResponse<any>(response);

      if (errors) {
        return { success: false, message: errors[0]?.message || 'Login failed' };
      }

      const result = data?.login;
      if (!result?.success) {
        return { success: false, message: result?.message || 'Invalid credentials' };
      }

      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);

      setState({
        user: result.user,
        isLoading: false,
        isAuthenticated: true,
        accessToken: result.accessToken,
      });

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation Register($input: RegisterInput!) {
              register(input: $input) {
                success
                message
                accessToken
                refreshToken
                user { id email name phone role avatarUrl hotelId }
              }
            }
          `,
          variables: { input: data },
        }),
      });

      const { data: responseData, errors } = await parseGraphQLResponse<any>(response);

      if (errors) {
        return { success: false, message: errors[0]?.message || 'Registration failed' };
      }

      const result = responseData?.register;
      if (!result?.success) {
        return { success: false, message: result?.message || 'Registration failed' };
      }

      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);

      setState({
        user: result.user,
        isLoading: false,
        isAuthenticated: true,
        accessToken: result.accessToken,
      });

      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            query: `mutation Logout { logout { success } }`,
          }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        accessToken: null,
      });
      router.push('/');
    }
  }, [router]);

  const refreshAuth = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation RefreshToken($refreshToken: String!) {
              refreshToken(refreshToken: $refreshToken) {
                success
                accessToken
                refreshToken
              }
            }
          `,
          variables: { refreshToken },
        }),
      });

      const { data, errors } = await parseGraphQLResponse<any>(response);

      if (errors || !data?.refreshToken?.success) {
        await logout();
        return;
      }

      localStorage.setItem('accessToken', data.refreshToken.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken.refreshToken);

      setState(prev => ({
        ...prev,
        accessToken: data.refreshToken.accessToken,
      }));
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
