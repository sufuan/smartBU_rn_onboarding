import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const fetchMachineData = async (machineId: string) => {
  const response = await axios.get(`${process.env.EXPO_PUBLIC_SERVER_URI}/api/machines/${machineId}`);
  return response.data.machine;
};

export const useMachineData = (machineId: string) => {
  return useQuery({
    queryKey: ['machineData', machineId],
    queryFn: () => fetchMachineData(machineId),
    enabled: !!machineId, // Only run the query if machineId is available
  });
};
