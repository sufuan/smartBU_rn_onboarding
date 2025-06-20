import { apiService, BookSlotRequest } from '@/lib/api';
import { invalidateQueries, queryKeys } from '@/lib/queryClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

// Book Slot Mutation Hook
export function useBookSlotMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiService.bookSlot,
    onMutate: async (variables: BookSlotRequest) => {
      console.log('🎯 Booking slot - optimistic update starting');
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.machineSlots(variables.machineId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.userSlots(variables.userId) });

      // Snapshot the previous values
      const previousMachineSlots = queryClient.getQueryData(queryKeys.machineSlots(variables.machineId));
      const previousUserSlots = queryClient.getQueryData(queryKeys.userSlots(variables.userId));

      // Optimistically update the cache
      // Remove the slot from available slots (optimistic)
      queryClient.setQueryData(queryKeys.machineSlots(variables.machineId), (old: any[]) => {
        if (!old) return [];
        return old.filter(slot => 
          new Date(slot.slotTime).getTime() !== new Date(variables.slotTime).getTime()
        );
      });

      // Return context with previous values for rollback
      return { previousMachineSlots, previousUserSlots, variables };
    },
    onError: (error, variables, context) => {
      console.error('❌ Slot booking failed:', error);
      
      // Rollback optimistic updates
      if (context?.previousMachineSlots) {
        queryClient.setQueryData(
          queryKeys.machineSlots(variables.machineId), 
          context.previousMachineSlots
        );
      }
      if (context?.previousUserSlots) {
        queryClient.setQueryData(
          queryKeys.userSlots(variables.userId), 
          context.previousUserSlots
        );
      }

      // Handle specific error cases
      const status = (error as any)?.response?.status;
      if (status === 403) {
        Alert.alert('Subscription Required', 'You need an active subscription to book slots.');
      } else if (status === 409) {
        Alert.alert('Slot Unavailable', 'This slot is no longer available or you have reached your daily limit.');
      } else {
        Alert.alert('Booking Failed', 'Unable to book slot. Please try again.');
      }
    },
    onSuccess: (data, variables) => {
      console.log('✅ Slot booked successfully:', data);
      
      // Invalidate and refetch related queries
      invalidateQueries.machineSlots(variables.machineId);
      invalidateQueries.userSlots(variables.userId);
      invalidateQueries.machines(); // Update machine status
      
      // Show success message
      Alert.alert(
        'Booking Confirmed! 🎉',
        `Your slot has been booked successfully!\n\nAuth Code: ${data.booking?.authCode}\nMachine: ${data.booking?.machineId}\nTime: ${new Date(data.booking?.slotTime || '').toLocaleString()}`
      );
    },
    onSettled: (data, error, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.machineSlots(variables.machineId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.userSlots(variables.userId) });
    },
  });
}

// Cancel Slot Mutation Hook
export function useCancelSlotMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiService.cancelSlot,
    onMutate: async (slotId: string) => {
      console.log('🚫 Cancelling slot - optimistic update starting');
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.slots });

      // Snapshot the previous values
      const previousData = queryClient.getQueryData(queryKeys.slots);

      // Optimistically remove the slot from all relevant caches
      queryClient.setQueriesData({ queryKey: queryKeys.slots }, (old: any) => {
        if (Array.isArray(old)) {
          return old.filter((slot: any) => slot.id !== slotId);
        }
        return old;
      });

      return { previousData, slotId };
    },
    onError: (error, slotId, context) => {
      console.error('❌ Slot cancellation failed:', error);
      
      // Rollback optimistic updates
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.slots, context.previousData);
      }

      Alert.alert('Cancellation Failed', 'Unable to cancel slot. Please try again.');
    },
    onSuccess: (data, slotId) => {
      console.log('✅ Slot cancelled successfully:', data);
      
      // Invalidate all slot-related queries
      invalidateQueries.slots();
      invalidateQueries.machines(); // Update machine availability
      
      Alert.alert('Slot Cancelled', 'Your slot has been cancelled successfully.');
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.slots });
      queryClient.invalidateQueries({ queryKey: queryKeys.machines });
    },
  });
}
