import { QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

// Create a function to handle app state changes for background refetching
function onAppStateChange(status: string) {
  if (Platform.OS !== 'web') {
    if (status === 'active') {
      queryClient.resumePausedMutations();
      queryClient.invalidateQueries();
    }
  }
}

// Configure QueryClient with React Native optimizations
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times
      retry: 3,
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (when app becomes active)
      refetchOnWindowFocus: true,
      // Refetch when network reconnects
      refetchOnReconnect: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: 'always',
      // Background refetch interval for critical data
      refetchInterval: false, // We'll set this per query as needed
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      // Retry delay for mutations
      retryDelay: 1000,
    },
  },
});

// Set up app state listener for React Native
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', onAppStateChange);
}

// Query Keys - Centralized key management
export const queryKeys = {
  // User-related queries
  user: ['user'] as const,
  userProfile: (userId: string) => ['user', 'profile', userId] as const,
  
  // Machine-related queries
  machines: ['machines'] as const,
  machine: (machineId: string) => ['machines', machineId] as const,
  
  // Slot-related queries
  slots: ['slots'] as const,
  machineSlots: (machineId: string) => ['slots', 'machine', machineId] as const,
  userSlots: (userId: string) => ['slots', 'user', userId] as const,
  
  // Subscription-related queries
  subscription: (userId: string) => ['subscription', userId] as const,
} as const;

// Cache invalidation helpers
export const invalidateQueries = {
  // Invalidate all user data
  user: () => queryClient.invalidateQueries({ queryKey: queryKeys.user }),
  
  // Invalidate specific user profile
  userProfile: (userId: string) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(userId) }),
  
  // Invalidate all machines
  machines: () => queryClient.invalidateQueries({ queryKey: queryKeys.machines }),
  
  // Invalidate specific machine
  machine: (machineId: string) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.machine(machineId) }),
  
  // Invalidate all slots
  slots: () => queryClient.invalidateQueries({ queryKey: queryKeys.slots }),
  
  // Invalidate slots for specific machine
  machineSlots: (machineId: string) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.machineSlots(machineId) }),
  
  // Invalidate slots for specific user
  userSlots: (userId: string) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.userSlots(userId) }),
  
  // Invalidate subscription data
  subscription: (userId: string) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.subscription(userId) }),
  
  // Invalidate everything (nuclear option)
  all: () => queryClient.invalidateQueries(),
} as const;
