import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  verified: boolean;
  stripeCustomerId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (userData: User, authToken: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  // Check authentication status on app startup
  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Auth Context: Checking authentication status...');
      setIsLoading(true);

      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem('accessToken'),
        AsyncStorage.getItem('user')
      ]);

      console.log('🔍 Auth Context: Token found:', !!storedToken);
      console.log('🔍 Auth Context: User found:', !!storedUser);

      if (storedToken && storedUser) {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);

        console.log('✅ Auth Context: User authenticated from storage:', userData.email);
        console.log('🔑 Auth Context: Token preview:', storedToken.substring(0, 20) + '...');
      } else {
        console.log('❌ Auth Context: No authentication data found');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Auth Context: Error checking auth status:', error);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (userData: User, authToken: string) => {
    try {
      console.log('🔄 Auth Context: Starting login process...');
      console.log('📧 User data:', userData.email);
      console.log('🔑 Token preview:', authToken.substring(0, 20) + '...');

      // Store in AsyncStorage
      await Promise.all([
        AsyncStorage.setItem('accessToken', authToken),
        AsyncStorage.setItem('user', JSON.stringify(userData))
      ]);

      console.log('💾 Auth Context: Data stored in AsyncStorage');

      // Update state
      setToken(authToken);
      setUser(userData);

      console.log('✅ Auth Context: User logged in successfully:', userData.email);

      // Navigate to home
      router.replace('/(tabs)');
    } catch (error) {
      console.error('❌ Auth Context: Error during login:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Clear AsyncStorage
      await Promise.all([
        AsyncStorage.removeItem('accessToken'),
        AsyncStorage.removeItem('user')
      ]);

      // Clear state
      setToken(null);
      setUser(null);

      console.log('✅ User logged out successfully');
      
      // Navigate to auth screen (not onboarding)
      router.replace('/(routes)/auth');
    } catch (error) {
      console.error('❌ Error during logout:', error);
    }
  };

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
