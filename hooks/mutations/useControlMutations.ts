import { apiService, ControlMachineRequest } from '@/lib/api';
import { invalidateQueries, queryKeys } from '@/lib/queryClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

// Control Machine Mutation Hook
export function useControlMachineMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiService.controlMachine,
    onMutate: async (variables: ControlMachineRequest) => {
      console.log('🎮 Starting machine control - optimistic update');
      
      // Cancel any outgoing refetches for machine data
      await queryClient.cancelQueries({ queryKey: queryKeys.machine(variables.machineId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.machines });

      // Snapshot the previous values
      const previousMachine = queryClient.getQueryData(queryKeys.machine(variables.machineId));
      const previousMachines = queryClient.getQueryData(queryKeys.machines);

      // Optimistically update machine status to "InUse"
      queryClient.setQueryData(queryKeys.machine(variables.machineId), (old: any) => {
        if (!old) return old;
        return { ...old, status: 'InUse' };
      });

      // Update machines list
      queryClient.setQueryData(queryKeys.machines, (old: any[]) => {
        if (!old) return old;
        return old.map((machine: any) => 
          machine.machineId === variables.machineId 
            ? { ...machine, status: 'InUse' }
            : machine
        );
      });

      return { previousMachine, previousMachines, variables };
    },
    onError: (error, variables, context) => {
      console.error('❌ Machine control failed:', error);
      
      // Rollback optimistic updates
      if (context?.previousMachine) {
        queryClient.setQueryData(
          queryKeys.machine(variables.machineId), 
          context.previousMachine
        );
      }
      if (context?.previousMachines) {
        queryClient.setQueryData(queryKeys.machines, context.previousMachines);
      }

      // Handle specific error cases
      const status = (error as any)?.response?.status;
      const errorData = (error as any)?.response?.data;
      
      if (status === 401) {
        Alert.alert('Invalid Auth Code', 'The authentication code is incorrect or expired.');
      } else if (status === 400) {
        Alert.alert('Invalid Slot Time', 'The slot time has expired or is not yet active.');
      } else if (status === 403) {
        Alert.alert('Subscription Required', 'You need an active subscription to control machines.');
      } else {
        Alert.alert(
          'Control Failed', 
          errorData?.message || 'Failed to start the washing cycle. Please try again.'
        );
      }
    },
    onSuccess: (data, variables) => {
      console.log('✅ Machine control successful:', data);
      
      // Invalidate and refetch related queries
      invalidateQueries.machine(variables.machineId);
      invalidateQueries.machines();
      invalidateQueries.userSlots(variables.userId);
      
      // Show success message
      Alert.alert(
        'Cycle Started! 🎉',
        `Your washing cycle has started successfully!\n\nMachine: ${variables.machineId}\nDuration: 30 minutes\n\nYou will be notified when the cycle is complete.`
      );
    },
    onSettled: (data, error, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.machine(variables.machineId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.machines });
      queryClient.invalidateQueries({ queryKey: queryKeys.userSlots(variables.userId) });
    },
  });
}

// Machine Status Update Hook (for real-time updates)
export function useMachineStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ machineId, status }: { machineId: string; status: string }) => {
      // This would typically be called by a WebSocket or push notification
      // For now, we'll just update the cache directly
      return { machineId, status };
    },
    onSuccess: ({ machineId, status }) => {
      console.log(`🔄 Machine ${machineId} status updated to: ${status}`);
      
      // Update machine status in cache
      queryClient.setQueryData(queryKeys.machine(machineId), (old: any) => {
        if (!old) return old;
        return { ...old, status };
      });

      // Update machines list
      queryClient.setQueryData(queryKeys.machines, (old: any[]) => {
        if (!old) return old;
        return old.map((machine: any) => 
          machine.machineId === machineId 
            ? { ...machine, status }
            : machine
        );
      });

      // If machine becomes available, invalidate slots to show new availability
      if (status === 'Available') {
        invalidateQueries.machineSlots(machineId);
      }
    },
  });
}

// Cycle Complete Notification Hook
export function useCycleCompleteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ machineId, userId }: { machineId: string; userId: string }) => {
      // This would typically be triggered by a push notification or WebSocket
      return { machineId, userId };
    },
    onSuccess: ({ machineId, userId }) => {
      console.log(`🏁 Cycle completed for machine ${machineId}`);
      
      // Update machine status to Available
      queryClient.setQueryData(queryKeys.machine(machineId), (old: any) => {
        if (!old) return old;
        return { ...old, status: 'Available' };
      });

      // Invalidate related queries
      invalidateQueries.machine(machineId);
      invalidateQueries.machines();
      invalidateQueries.userSlots(userId);
      invalidateQueries.machineSlots(machineId);
      
      // Show completion notification
      Alert.alert(
        'Cycle Complete! 🎉',
        `Your washing cycle on machine ${machineId} has completed. Please collect your laundry.`
      );
    },
  });
}
