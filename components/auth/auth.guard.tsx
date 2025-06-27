import { useAuth } from "@/context/auth.context";
import { useTheme } from "@/context/theme.context";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View
} from "react-native";
import { scale, verticalScale } from "react-native-size-matters";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean; // If true, requires authentication
}

export default function AuthGuard({ children, requireAuth = false }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isAuthenticated) {
        // User needs to be authenticated but isn't
        console.log('🔒 Authentication required, redirecting to onboarding');
        router.replace('/(routes)/onboarding');
      } else if (!requireAuth && isAuthenticated) {
        // User is authenticated but trying to access auth/onboarding screens
        console.log('✅ User already authenticated, redirecting to home');
        router.replace('/(tabs)');
      }
    }
  }, [isLoading, isAuthenticated, requireAuth]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.dark ? "#131313" : "#f8f9fa" }]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={[styles.loadingText, { color: theme.dark ? "#fff" : "#000" }]}>
          Loading...
        </Text>
      </View>
    );
  }

  // If auth is required but user is not authenticated, show loading
  // (navigation will happen in useEffect)
  if (requireAuth && !isAuthenticated) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.dark ? "#131313" : "#f8f9fa" }]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={[styles.loadingText, { color: theme.dark ? "#fff" : "#000" }]}>
          Redirecting...
        </Text>
      </View>
    );
  }

  // If auth is not required but user is authenticated, show loading
  // (navigation will happen in useEffect)
  if (!requireAuth && isAuthenticated) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.dark ? "#131313" : "#f8f9fa" }]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={[styles.loadingText, { color: theme.dark ? "#fff" : "#000" }]}>
          Redirecting...
        </Text>
      </View>
    );
  }

  // Render children if authentication state is appropriate
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: verticalScale(16),
    fontSize: 16,
    fontWeight: '500',
  },
});
