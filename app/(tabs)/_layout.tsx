import { useTheme } from "@/context/theme.context";
import useUser from "@/hooks/fetch/useUser";
import { fontSizes, IsAndroid, IsIOS } from "@/themes/app.constant";
import { Feather, Ionicons, Octicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Dimensions, StatusBar, StyleSheet, View } from "react-native";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";

const STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const NAVIGATION_BAR_HEIGHT = IsAndroid ? 48 : 0; // Typical Android navigation bar height

export default function _layout() {
  const { theme } = useTheme();
  const { loader } = useUser();

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: theme.dark ? '#131313' : '#f5f5f5',
      paddingTop: IsAndroid ? STATUSBAR_HEIGHT : 0,
    }}>
      <StatusBar
        barStyle={theme.dark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <Tabs
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, focused }) => {
            const Icon = () => {
              switch (route.name) {
                case "index":
                  return (
                    <Feather
                      name="home"
                      size={moderateScale(22)}
                      color={color}
                    />
                  );
                case "courses/index":
                  return (
                    <Feather
                      name="book-open"
                      size={moderateScale(22)}
                      color={color}
                    />
                  );
                case "resources/index":
                  return (
                    <Ionicons
                      name="document-text-outline"
                      size={moderateScale(22)}
                      color={color}
                    />
                  );
                case "profile/index":
                  return (
                    <Octicons
                      name="person"
                      size={moderateScale(22)}
                      color={color}
                    />
                  );
              }
            };

            return (
              <View style={{ 
                alignItems: 'center',
                justifyContent: 'center',
                width: moderateScale(50),
                height: '100%',
              }}>
                {focused && (
                  <View style={{
                    position: 'absolute',
                    top: verticalScale(6),
                    width: moderateScale(4),
                    height: moderateScale(4),
                    borderRadius: moderateScale(2),
                    backgroundColor: color,
                  }} />
                )}
                <Icon />
              </View>
            );
          },
          tabBarActiveTintColor: "#4A90E2",
          tabBarInactiveTintColor: "#8e8e93",
          headerShown: route.name === "courses/index" || route.name === "resources/index",
          headerTitle:
            route.name === "courses/index"
              ? "Courses"
              : route.name === "resources/index"
              ? "Video Lessons"
              : "",
          headerTitleStyle: {
            color: theme.dark ? "#fff" : "#000",
            textAlign: "center",
            width: scale(320),
            fontSize: fontSizes.FONT22,
            fontFamily: "Poppins_400Regular",
          },
          headerStyle: {
            backgroundColor: theme.dark ? '#131313' : '#f5f5f5',
          },
          headerShadowVisible: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            position: 'absolute',
            height: IsAndroid ? verticalScale(48) : verticalScale(50),
            borderTopWidth: 0,
            backgroundColor: '#fff',
            opacity: loader ? 0 : 1,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: -2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 10,
            ...(IsAndroid
              ? {
                  left: 0,
                  right: 0,
                  bottom:0,
                
                }
              : {
                  borderTopLeftRadius: scale(20),
                  borderTopRightRadius: scale(20),
                }),
          },
          tabBarBackground: () => (
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: '#fff',
                ...(IsIOS && {
                  borderTopLeftRadius: scale(20),
                  borderTopRightRadius: scale(20),
                }),
              }}
            />
          ),
        })}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="courses/index" />
        <Tabs.Screen name="resources/index" />
        <Tabs.Screen name="profile/index" />
      </Tabs>
    </View>
  );
}
