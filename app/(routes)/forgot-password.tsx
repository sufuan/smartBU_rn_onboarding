import { useTheme } from "@/context/theme.context";
import ForgotPasswordFlow from "@/screens/auth/components/forgot-password.flow";
import React from "react";
import { SafeAreaView, StatusBar } from "react-native";

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: theme.dark ? "#131313" : "#fff" 
    }}>
      <StatusBar 
        barStyle={theme.dark ? "light-content" : "dark-content"} 
        backgroundColor={theme.dark ? "#131313" : "#fff"} 
      />
      <ForgotPasswordFlow />
    </SafeAreaView>
  );
}
