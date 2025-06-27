// app/_layout.tsx
import { AuthProvider } from '@/context/auth.context';
import { NotificationProvider } from '@/context/notification.provider';
import { ThemeProvider } from '@/context/theme.context';
import { queryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import React from 'react';

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(routes)/onboarding/index" />
              <Stack.Screen name="(routes)/notification/index" />
            </Stack>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
