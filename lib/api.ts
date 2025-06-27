import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Set up axios defaults
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_SERVER_URI,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 API Request with token:', token.substring(0, 20) + '...');
    } else {
      console.log('❌ API Request: No token found in AsyncStorage');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log('❌ 401 Unauthorized - Token invalid or expired');
      console.log('🔄 Clearing stored auth data...');

      // Token expired, clear it
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('user');

      console.log('✅ Auth data cleared - user needs to login again');
    }
    return Promise.reject(error);
  }
);

// API Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface BookSlotRequest {
  userId: string;
  slotTime: string;
  machineId: string;
}

export interface BookSlotResponse {
  success: boolean;
  message: string;
  booking?: {
    authCode: string;
    slotTime: string;
    machineId: string;
    machine: {
      id: string;
      machineId: string;
      location: string;
    };
    duration: number;
    status: string;
  };
}

export interface ControlMachineRequest {
  userId: string;
  slotTime: string;
  machineId: string;
  authCode: string;
}

export interface ControlMachineResponse {
  status: string;
  message: string;
  slot?: {
    id: string;
    machineId: string;
    duration: number;
    startTime: string;
  };
}

// API Functions
export const apiService = {
  // User APIs
  async getUser(): Promise<UserType> {
    const response = await api.get('/me');
    return response.data.user;
  },

  // Machine APIs
  async getMachines(): Promise<MachineType[]> {
    const response = await api.get('/api/machines');
    return response.data.machines;
  },

  async getMachine(machineId: string): Promise<MachineType> {
    const response = await api.get(`/api/machines/${machineId}`);
    return response.data.machine;
  },

  // Slot APIs
  async getSlots(machineId: string): Promise<SlotType[]> {
    const response = await api.get(`/api/slots?machineId=${machineId}`);
    return response.data.slots;
  },

  async getUserSlots(userId: string): Promise<SlotType[]> {
    const response = await api.get(`/api/user-slots?userId=${userId}`);
    return response.data.slots;
  },

  async getUserSlotHistory(userId: string, limit = 20, offset = 0): Promise<SlotType[]> {
    const response = await api.get(`/api/user-slot-history?limit=${limit}&offset=${offset}`);
    return response.data.slots;
  },

  async cleanupExpiredSlots(): Promise<{ success: boolean; expiredCount: number; message: string }> {
    const response = await api.post('/api/cleanup-expired-slots');
    return response.data;
  },

  async bookSlot(data: BookSlotRequest): Promise<BookSlotResponse> {
    const response = await api.post('/api/book-slot', data);
    return response.data;
  },

  async cancelSlot(slotId: string): Promise<{ message: string }> {
    const response = await api.delete(`/api/slots/${slotId}`);
    return response.data;
  },

  // Control APIs
  async controlMachine(data: ControlMachineRequest): Promise<ControlMachineResponse> {
    const response = await api.post('/api/control', data);
    return response.data;
  },

  // Auth APIs
  async login(signedToken: string): Promise<{ accessToken: string; user: UserType }> {
    const response = await api.post('/login', { signedToken });
    return response.data;
  },
};

export default api;
