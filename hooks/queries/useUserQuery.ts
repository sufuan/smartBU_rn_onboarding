import { apiService } from '@/lib/api';
import { invalidateQueries, queryKeys } from '@/lib/queryClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

// Token validation hook
export function useAuthToken() {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkToken = async () => {
      try {
        console.log('🔍 useAuthToken: Checking for stored token...');
        const token = await SecureStore.getItemAsync('accessToken');
        const tokenExists = !!token;
        console.log(`🔍 useAuthToken: Token ${tokenExists ? 'found' : 'not found'}`);
        setHasToken(tokenExists);
      } catch (error) {
        console.error('❌ useAuthToken: Error checking token:', error);
        setHasToken(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkToken();
  }, []);

  return { hasToken, isChecking };
}

// User Query Hook with enhanced error handling
export function useUserQuery() {
  const queryClient = useQueryClient();
  const { hasToken, isChecking } = useAuthToken();

  const query = useQuery({
    queryKey: queryKeys.user,
    queryFn: async () => {
      try {
        console.log('🔄 useUserQuery: Fetching user data...');
        const user = await apiService.getUser();
        console.log('✅ useUserQuery: User data fetched successfully:', user?.email);
        return user;
      } catch (error: any) {
        console.error('❌ useUserQuery: Error fetching user:', error?.response?.status, error?.message);

        // Handle specific error cases
        if (error?.response?.status === 401) {
          console.log('🚪 useUserQuery: Unauthorized - clearing token');
          await SecureStore.deleteItemAsync('accessToken');
        }

        throw error;
      }
    },
    enabled: hasToken === true, // Only run query if token exists
    staleTime: 2 * 60 * 1000, // 2 minutes - user data changes less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error: any) => {
      console.log(`🔄 useUserQuery: Retry attempt ${failureCount}, error:`, error?.response?.status);

      // Don't retry on 401 (unauthorized) or 403 (forbidden)
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        console.log('🚫 useUserQuery: Not retrying auth errors');
        return false;
      }

      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Check if user has active subscription
  const hasActiveSubscription = () => {
    return query.data?.stripeCustomerId && query.data.stripeCustomerId.trim() !== '';
  };

  // Manual refetch function
  const refetch = async () => {
    console.log('🔄 useUserQuery: Manual refetch triggered');
    await query.refetch();
  };

  // Invalidate user data (useful after mutations)
  const invalidateUser = () => {
    invalidateQueries.user();
  };

  return {
    user: query.data,
    isLoading: query.isLoading || isChecking, // Include token checking in loading state
    isError: query.isError,
    error: query.error,
    refetch,
    invalidateUser,
    hasActiveSubscription,
    // Expose query status for debugging
    status: query.status,
    fetchStatus: query.fetchStatus,
    // Token status for debugging
    hasToken,
    isCheckingToken: isChecking,
    // Helper to determine if user is authenticated
    isAuthenticated: hasToken === true && !!query.data,
  };
}

// Login Mutation Hook
export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiService.login,
    onSuccess: async (data) => {
      console.log('✅ Login successful, storing token and user data');
      
      // Store token and user data
      await SecureStore.setItemAsync('accessToken', data.accessToken);
      await SecureStore.setItemAsync('name', data.user.name || '');
      await SecureStore.setItemAsync('email', data.user.email || '');
      await SecureStore.setItemAsync('avatar', data.user.avatar || '');

      // Set user data in cache
      queryClient.setQueryData(queryKeys.user, data.user);
      
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error('❌ Login failed:', error);
    },
  });
}

// Enhanced logout function with Google sign-out
export function useLogout() {
  const queryClient = useQueryClient();

  const logout = async () => {
    try {
      console.log('🚪 Enhanced logout process starting...');

      // 1. Sign out from Google to clear Google's session
      try {
        const isSignedIn = await GoogleSignin.isSignedIn();
        if (isSignedIn) {
          console.log('🔄 Signing out from Google...');
          await GoogleSignin.signOut();
          console.log('✅ Google sign-out successful');
        } else {
          console.log('ℹ️ User not signed in to Google');
        }
      } catch (googleError) {
        console.error('⚠️ Google sign-out error (continuing with logout):', googleError);
        // Continue with logout even if Google sign-out fails
      }

      // 2. Clear all stored data
      console.log('🧹 Clearing stored data...');
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('name');
      await SecureStore.deleteItemAsync('email');
      await SecureStore.deleteItemAsync('avatar');

      // 3. Clear all cached data
      console.log('🧹 Clearing query cache...');
      queryClient.clear();

      console.log('✅ Enhanced logout completed successfully');

    } catch (error) {
      console.error('❌ Logout error:', error);
      // Even if there's an error, try to clear what we can
      try {
        await SecureStore.deleteItemAsync('accessToken');
        queryClient.clear();
      } catch (cleanupError) {
        console.error('❌ Cleanup error:', cleanupError);
      }
    }
  };

  return { logout };
}

// Subscription status hook with real-time updates and auth checking
export function useSubscriptionStatus(userId?: string) {
  const { user, isLoading, hasToken, isCheckingToken, isAuthenticated } = useUserQuery();

  return {
    hasSubscription: user?.stripeCustomerId && user.stripeCustomerId.trim() !== '',
    stripeCustomerId: user?.stripeCustomerId,
    isLoading,
    user,
    // Auth status for debugging
    hasToken,
    isCheckingToken,
    isAuthenticated,
    // Helper to determine if we should show login screen
    needsLogin: hasToken === false,
  };
}
