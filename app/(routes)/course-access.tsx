import { useTheme } from "@/context/theme.context";
import { fontSizes } from "@/themes/app.constant";
import { useGlobalSearchParams } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

export default function CourseAccessScreen() {
  const { theme } = useTheme();
  const params: any = useGlobalSearchParams();

  return (
    <View style={{ flex: 1, backgroundColor: theme.dark ? "#131313" : "#fff", padding: 20 }}>
      <Text style={{ 
        fontSize: fontSizes.FONT24, 
        fontFamily: "Poppins_600SemiBold",
        color: theme.dark ? "#fff" : "#000" 
      }}>
        {params.name}
      </Text>
      <Text style={{ 
        fontSize: fontSizes.FONT18,
        color: theme.dark ? "#fff" : "#000",
        marginTop: 10 
      }}>
        Course content will be displayed here
      </Text>
    </View>
  );
} 