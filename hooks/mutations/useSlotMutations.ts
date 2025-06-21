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

      // Handle specific error cases with detailed messages
      const response = (error as any)?.response;
      const status = response?.status;
      const errorData = response?.data;
      const errorType = errorData?.error;

      let title = 'Booking Failed';
      let message = 'Unable to book slot. Please try again.';

      if (status === 403) {
        title = 'Subscription Required';
        message = 'You need an active subscription to book slots.';
      } else if (status === 409) {
        switch (errorType) {
          case 'SLOT_UNAVAILABLE':
            title = 'Slot Unavailable';
            if (errorData?.details?.isOwnSlot) {
              message = 'You have already booked this slot.';
            } else if (errorData?.details?.bookedBy) {
              message = `This slot has been taken by another user.`;
            } else {
              message = 'This slot is no longer available.';
            }
            break;
          case 'DAILY_LIMIT_EXCEEDED':
            title = 'Daily Limit Reached';
            const existingSlot = errorData?.details?.existingSlot;
            if (existingSlot) {
              message = `You can only book one slot per day.\n\nYour existing booking:\nMachine: ${existingSlot.machine}\nTime: ${new Date(existingSlot.time).toLocaleString()}`;
            } else {
              message = 'You can only book one slot per day.';
            }
            break;
          case 'MACHINE_OFFLINE':
            title = 'Machine Unavailable';
            message = 'This machine is currently offline. Please try another machine.';
            break;
          case 'SLOT_RACE_CONDITION':
            title = 'Slot Just Taken';
            message = 'This slot was just booked by another user. Please select a different time.';
            break;
          default:
            message = errorData?.message || 'This slot is no longer available.';
        }
      } else if (status === 400) {
        switch (errorType) {
          case 'PAST_SLOT':
            title = 'Invalid Time';
            message = 'Cannot book slots in the past. Please select a future time.';
            break;
          case 'MISSING_FIELDS':
            title = 'Invalid Request';
            message = 'Missing required information. Please try again.';
            break;
          default:
            message = errorData?.message || 'Invalid booking request.';
        }
      } else if (status === 404) {
        title = 'Machine Not Found';
        message = 'The selected machine is not available.';
      }

      Alert.alert(title, message);
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
