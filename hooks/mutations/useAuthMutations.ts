import { useMutation } from '@tanstack/react-query';

// Types
interface SendOtpRequest {
  email: string;
}

interface SendOtpResponse {
  success: boolean;
  message: string;
}

interface VerifyOtpRequest {
  email: string;
  otp: string;
}

interface VerifyOtpResponse {
  success: boolean;
  message: string;
  tempToken?: string;
}

interface CompleteSignupRequest {
  email: string;
  name: string;
  phone: string;
  password: string;
}

interface CompleteSignupResponse {
  success: boolean;
  message: string;
  user?: any;
  token?: string;
}

interface CheckEmailRequest {
  email: string;
}

interface CheckEmailResponse {
  exists: boolean;
  message: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  user?: any;
  token?: string;
}

// API Functions
const sendOtp = async (data: SendOtpRequest): Promise<SendOtpResponse> => {
  const response = await fetch(`${process.env.EXPO_PUBLIC_SERVER_URI}/auth/send-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to send OTP');
  }
  
  return result;
};

const verifyOtp = async (data: VerifyOtpRequest): Promise<VerifyOtpResponse> => {
  const response = await fetch(`${process.env.EXPO_PUBLIC_SERVER_URI}/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Invalid OTP');
  }
  
  return result;
};

const completeSignup = async (data: CompleteSignupRequest): Promise<CompleteSignupResponse> => {
  const response = await fetch(`${process.env.EXPO_PUBLIC_SERVER_URI}/auth/complete-signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to create account');
  }
  
  // Token storage is handled by auth context
  
  return result;
};

const checkEmail = async (data: CheckEmailRequest): Promise<CheckEmailResponse> => {
  const response = await fetch(`${process.env.EXPO_PUBLIC_SERVER_URI}/auth/check-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to check email');
  }
  
  return result;
};

const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await fetch(`${process.env.EXPO_PUBLIC_SERVER_URI}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Login failed');
  }
  
  // Token storage is handled by auth context
  
  return result;
};

// Custom Hooks
export const useSendOtpMutation = () => {
  return useMutation({
    mutationFn: sendOtp,
    onError: (error: Error) => {
      console.error('Send OTP error:', error.message);
    },
  });
};

export const useVerifyOtpMutation = () => {
  return useMutation({
    mutationFn: verifyOtp,
    onError: (error: Error) => {
      console.error('Verify OTP error:', error.message);
    },
  });
};

export const useCompleteSignupMutation = () => {
  return useMutation({
    mutationFn: completeSignup,
    onError: (error: Error) => {
      console.error('Complete signup error:', error.message);
    },
  });
};

export const useCheckEmailMutation = () => {
  return useMutation({
    mutationFn: checkEmail,
    onError: (error: Error) => {
      console.error('Check email error:', error.message);
    },
  });
};

export const useLoginMutation = () => {
  return useMutation({
    mutationFn: login,
    onError: (error: Error) => {
      console.error('Login error:', error.message);
    },
  });
};
