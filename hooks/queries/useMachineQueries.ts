import { apiService } from '@/lib/api';
import { invalidateQueries, queryKeys } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

// Machines Query Hook
export function useMachinesQuery() {
  const query = useQuery({
    queryKey: queryKeys.machines,
    queryFn: apiService.getMachines,
    staleTime: 1 * 60 * 1000, // 1 minute - machine data changes moderately
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time machine status
  });

  const invalidateMachines = () => {
    invalidateQueries.machines();
  };

  return {
    machines: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    invalidateMachines,
    status: query.status,
    fetchStatus: query.fetchStatus,
  };
}

// Single Machine Query Hook
export function useMachineQuery(machineId: string) {
  const query = useQuery({
    queryKey: queryKeys.machine(machineId),
    queryFn: () => apiService.getMachine(machineId),
    staleTime: 30 * 1000, // 30 seconds - individual machine data changes frequently
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 15 * 1000, // Refetch every 15 seconds for real-time status
    enabled: !!machineId, // Only run if machineId is provided
  });

  const invalidateMachine = () => {
    invalidateQueries.machine(machineId);
  };

  return {
    machine: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    invalidateMachine,
    status: query.status,
    fetchStatus: query.fetchStatus,
  };
}

// Machine Slots Query Hook
export function useMachineSlotsQuery(machineId: string) {
  const query = useQuery({
    queryKey: queryKeys.machineSlots(machineId),
    queryFn: () => apiService.getSlots(machineId),
    staleTime: 30 * 1000, // 30 seconds - slot data changes frequently
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 20 * 1000, // Refetch every 20 seconds for real-time availability
    enabled: !!machineId, // Only run if machineId is provided
  });

  const invalidateMachineSlots = () => {
    invalidateQueries.machineSlots(machineId);
  };

  return {
    slots: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    invalidateMachineSlots,
    status: query.status,
    fetchStatus: query.fetchStatus,
  };
}

// User Slots Query Hook
export function useUserSlotsQuery(userId: string) {
  const query = useQuery({
    queryKey: queryKeys.userSlots(userId),
    queryFn: () => apiService.getUserSlots(userId),
    staleTime: 1 * 60 * 1000, // 1 minute - user slots change less frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60 * 1000, // Refetch every minute for user's bookings
    enabled: !!userId, // Only run if userId is provided
  });

  const invalidateUserSlots = () => {
    invalidateQueries.userSlots(userId);
  };

  return {
    userSlots: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    invalidateUserSlots,
    status: query.status,
    fetchStatus: query.fetchStatus,
  };
}
