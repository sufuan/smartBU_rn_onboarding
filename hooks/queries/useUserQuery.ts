import { useAuth } from '@/context/auth.context';
import { apiService } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';

// Token validation hook
export function useAuthToken() {
  const { isAuthenticated, isLoading } = useAuth();

  return {
    hasToken: isAuthenticated,
    isChecking: isLoading
  };
}

// User Query Hook with enhanced error handling
export function useUserQuery() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Return user data from auth context instead of making API calls
  return {
    user,
    isLoading,
    hasToken: isAuthenticated,
    isCheckingToken: isLoading,
    isAuthenticated,
    error: null,
    refetch: () => Promise.resolve(),
  };
}

// Login Mutation Hook (deprecated - use auth context instead)
export function useLoginMutation() {
  return useMutation({
    mutationFn: apiService.login,
    onSuccess: (data) => {
      console.log('✅ Login successful (deprecated hook)');
    },
    onError: (error) => {
      console.error('❌ Login failed:', error);
    },
  });
}

// Enhanced logout function (deprecated - use auth context instead)
export function useLogout() {
  const { logout } = useAuth();
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
