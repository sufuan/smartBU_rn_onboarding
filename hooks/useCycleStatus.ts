import api from '@/lib/api';
import { useEffect, useState } from 'react';

interface CycleStatusResponse {
  success: boolean;
  slotId: string;
  slotStatus: string;
  machineStatus: string;
  cycleStarted: boolean;
  cycleCompleted: boolean;
  cycleStartTime: string | null;
  timeRemaining: number | null;
  usageLogs: Array<{
    action: string;
    createdAt: string;
  }>;
}

interface UseCycleStatusReturn {
  cycleStarted: boolean;
  cycleCompleted: boolean;
  cycleStartTime: Date | null;
  timeRemaining: number | null;
  machineStatus: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useCycleStatus = (slotId: string | null): UseCycleStatusReturn => {
  const [cycleStarted, setCycleStarted] = useState(false);
  const [cycleCompleted, setCycleCompleted] = useState(false);
  const [cycleStartTime, setCycleStartTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [machineStatus, setMachineStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const fetchCycleStatus = async () => {
    if (!slotId) {
      // Reset state if no slot ID
      setCycleStarted(false);
      setCycleCompleted(false);
      setCycleStartTime(null);
      setTimeRemaining(null);
      setMachineStatus(null);
      setError(null);
      return;
    }

    // Debounce: Don't fetch if we just fetched within the last 2 seconds
    const now = Date.now();
    if (now - lastFetchTime < 2000) {
      console.log('🔄 Skipping cycle status fetch - too soon since last fetch');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLastFetchTime(now);

    try {
      console.log(`🔍 Fetching cycle status for slot: ${slotId}`);
      
      const response = await api.get<CycleStatusResponse>(`/api/cycle-status/${slotId}`);

      if (response.data.success) {
        const data = response.data;
        
        setCycleStarted(data.cycleStarted);
        setCycleCompleted(data.cycleCompleted);
        setCycleStartTime(data.cycleStartTime ? new Date(data.cycleStartTime) : null);
        setTimeRemaining(data.timeRemaining);
        setMachineStatus(data.machineStatus);

        console.log(`✅ Cycle status fetched:`, {
          slotId: data.slotId,
          cycleStarted: data.cycleStarted,
          cycleCompleted: data.cycleCompleted,
          cycleStartTime: data.cycleStartTime,
          timeRemaining: data.timeRemaining,
          machineStatus: data.machineStatus
        });
      } else {
        setError('Failed to fetch cycle status');
      }
    } catch (err: any) {
      console.error('❌ Error fetching cycle status:', err);
      console.error('❌ Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        slotId
      });

      if (err.response?.status === 404) {
        console.log('🔍 Slot not found - this might be normal for new bookings');
        setError('Slot not found');
        // Reset cycle state for 404 errors
        setCycleStarted(false);
        setCycleCompleted(false);
        setCycleStartTime(null);
        setTimeRemaining(null);
        setMachineStatus(null);
      } else if (err.response?.status === 401) {
        setError('Unauthorized - please login again');
      } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        setError('Request timeout - check your connection');
      } else {
        setError(`Failed to fetch cycle status: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch cycle status when slotId changes
  useEffect(() => {
    let isMounted = true;

    const fetchWithMountCheck = async () => {
      if (isMounted) {
        await fetchCycleStatus();
      }
    };

    fetchWithMountCheck();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [slotId]);

  return {
    cycleStarted,
    cycleCompleted,
    cycleStartTime,
    timeRemaining,
    machineStatus,
    isLoading,
    error,
    refetch: fetchCycleStatus,
  };
};
