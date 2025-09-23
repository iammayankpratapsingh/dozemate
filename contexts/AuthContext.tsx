import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

type AuthState = {
  isLoggedIn: boolean;
  isLoading: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
};

type AuthContextType = {
  auth: AuthState;
  login: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthState: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    isLoggedIn: false,
    isLoading: true,
  });

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userId = await AsyncStorage.getItem('user_id');
      const userEmail = await AsyncStorage.getItem('user_email');
      const userName = await AsyncStorage.getItem('user_name');

      if (token && userId) {
        setAuth({
          isLoggedIn: true,
          isLoading: false,
          token,
          user: {
            id: userId,
            email: userEmail || '',
            name: userName || '',
          },
        });
      } else {
        setAuth({
          isLoggedIn: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuth({
        isLoggedIn: false,
        isLoading: false,
      });
    }
  };

  const login = async (token: string, user: any) => {
    await AsyncStorage.multiSet([
      ['auth_token', token],
      ['user_id', String(user.id)],
      ['user_email', String(user.email)],
      ['user_name', String(user.name)],
    ]);

    setAuth({
      isLoggedIn: true,
      isLoading: false,
      token,
      user: {
        id: String(user.id),
        email: String(user.email),
        name: String(user.name),
      },
    });
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([
      'auth_token',
      'user_id',
      'user_email',
      'user_name',
      'remember_me',
    ]);

    setAuth({
      isLoggedIn: false,
      isLoading: false,
    });
  };

  useEffect(() => {
    checkAuthState();
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, logout, checkAuthState }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}