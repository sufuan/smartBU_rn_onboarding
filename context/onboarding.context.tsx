import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface OnboardingContextType {
  hasSeenOnboarding: boolean;
  isLoading: boolean;
  markOnboardingComplete: () => Promise<void>;
  resetOnboarding: () => Promise<void>; // For testing purposes
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: React.ReactNode;
}

const ONBOARDING_KEY = 'hasSeenOnboarding';

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check onboarding status on mount
  const checkOnboardingStatus = async () => {
    try {
      console.log('🔍 Onboarding Context: Checking onboarding status...');
      const storedValue = await AsyncStorage.getItem(ONBOARDING_KEY);
      
      console.log('🔍 Onboarding Context: Stored value:', storedValue);
      
      if (storedValue === 'true') {
        setHasSeenOnboarding(true);
        console.log('✅ Onboarding Context: User has seen onboarding');
      } else {
        setHasSeenOnboarding(false);
        console.log('❌ Onboarding Context: User has NOT seen onboarding');
      }
    } catch (error) {
      console.error('❌ Onboarding Context: Error checking onboarding status:', error);
      setHasSeenOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark onboarding as complete
  const markOnboardingComplete = async () => {
    try {
      console.log('✅ Onboarding Context: Marking onboarding as complete...');
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setHasSeenOnboarding(true);
      console.log('✅ Onboarding Context: Onboarding marked as complete');
    } catch (error) {
      console.error('❌ Onboarding Context: Error marking onboarding complete:', error);
    }
  };

  // Reset onboarding (for testing purposes)
  const resetOnboarding = async () => {
    try {
      console.log('🔄 Onboarding Context: Resetting onboarding status...');
      await AsyncStorage.removeItem(ONBOARDING_KEY);
      setHasSeenOnboarding(false);
      console.log('✅ Onboarding Context: Onboarding status reset');
    } catch (error) {
      console.error('❌ Onboarding Context: Error resetting onboarding:', error);
    }
  };

  // Check onboarding status on mount
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const value: OnboardingContextType = {
    hasSeenOnboarding,
    isLoading,
    markOnboardingComplete,
    resetOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
