import { useTheme } from "@/context/theme.context";
import { fontSizes } from "@/themes/app.constant";
import { AntDesign } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { scale } from "react-native-size-matters";

export default function _layout() {
  const { theme } = useTheme();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Course Details",
          headerTitleStyle: {
            color: theme.dark ? "#fff" : "#000",
            fontSize: fontSizes.FONT22,
          },
          headerStyle: { backgroundColor: theme.dark ? "#131313" : "#fff" },
          headerShadowVisible: true,
          headerBackVisible: true,
          headerLeft: () => (
            <Pressable
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: scale(5),
              }}
              onPress={() => router.back()}
            >
              <AntDesign
                name="left"
                size={scale(20)}
                color={theme.dark ? "#fff" : "#005DE0"}
              />
              <Text
                style={{
                  color: theme?.dark ? "#fff" : "#005DE0",
                  fontSize: fontSizes.FONT20,
                }}
              >
                Back
              </Text>
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({});