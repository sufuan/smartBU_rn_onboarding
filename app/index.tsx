import { useAuth } from "@/context/auth.context";
import { useOnboarding } from "@/context/onboarding.context";
import SplashScreen from "@/screens/splash/splash.screen";
import { Redirect } from "expo-router";
import React, { useState } from "react";

export default function Index() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasSeenOnboarding, isLoading: onboardingLoading } = useOnboarding();
  const [showSplash, setShowSplash] = useState(true);

  // Show splash screen while loading or splash animation is playing
  if (authLoading || onboardingLoading || showSplash) {
    return (
      <SplashScreen
        onFinish={() => setShowSplash(false)}
      />
    );
  }

  // Determine where to redirect based on auth and onboarding status
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  // If user is not authenticated, check onboarding status
  if (hasSeenOnboarding) {
    return <Redirect href="/(routes)/auth" />;
  } else {
    return <Redirect href="/(routes)/onboarding" />;
  }
}