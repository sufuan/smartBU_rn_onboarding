import { ThemeProvider } from '@/context/theme.context'
import { queryClient } from '@/lib/queryClient'
import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import React from 'react'

export default function _layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
         <Stack screenOptions={{headerShown:false}}>
          <Stack.Screen name='index'/>
          <Stack.Screen name='(routes)/onboarding/index'/>
           <Stack.Screen name="(routes)/notification/index" />
         </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  )
}