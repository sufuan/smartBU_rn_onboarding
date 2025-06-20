import { apiService } from '@/lib/api';
import { invalidateQueries, queryKeys } from '@/lib/queryClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';

// User Query Hook
export function useUserQuery() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.user,
    queryFn: apiService.getUser,
    staleTime: 2 * 60 * 1000, // 2 minutes - user data changes less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error: any) => {
      // Don't retry on 401 (unauthorized)
      if (error?.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
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
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch,
    invalidateUser,
    hasActiveSubscription,
    // Expose query status for debugging
    status: query.status,
    fetchStatus: query.fetchStatus,
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

// Logout function
export function useLogout() {
  const queryClient = useQueryClient();

  const logout = async () => {
    console.log('🚪 Logging out user');
    
    // Clear stored data
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('name');
    await SecureStore.deleteItemAsync('email');
    await SecureStore.deleteItemAsync('avatar');

    // Clear all cached data
    queryClient.clear();
  };

  return { logout };
}

// Subscription status hook with real-time updates
export function useSubscriptionStatus(userId?: string) {
  const { user, isLoading } = useUserQuery();

  return {
    hasSubscription: user?.stripeCustomerId && user.stripeCustomerId.trim() !== '',
    stripeCustomerId: user?.stripeCustomerId,
    isLoading,
    user,
  };
}
