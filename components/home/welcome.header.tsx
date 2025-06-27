import { useTheme } from "@/context/theme.context";
import { setAuthorizationHeader } from "@/hooks/fetch/useUser";
import useUserData from "@/hooks/useUserData";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";


import { useCameraPermissions } from "expo-camera";


export default function WelcomeHeader() {
  const { theme } = useTheme();
  const { name } = useUserData();
  const [notificationLength, setNotificationLength] = useState(0);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(-50))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];

  const [permission, requestPermission] = useCameraPermissions();
  const isPermissionGranted = Boolean(permission?.granted);

  // Get current time for dynamic greeting
  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const handleScanPress = async () => {
    if (!isPermissionGranted) {
      // Request permission first
      const result = await requestPermission();
      if (result.granted) {
        // Permission granted, navigate to scanner
        router.push("/(routes)/scanner" as any);
      } else {
        // Permission denied, show alert
        Alert.alert(
          "Camera Permission Required",
          "Please enable camera permission to scan QR codes.",
          [{ text: "OK" }]
        );
      }
    } else {
      // Permission already granted, navigate to scanner
      router.push("/(routes)/scanner" as any);
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      await setAuthorizationHeader();
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/get-notifications`
      );
      const filtered = response.data.notifications?.filter(
        (i: any) => i.status === "Unread"
      );
      setNotificationLength(filtered.length);
    };
    fetchNotifications();

    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  return (
    <LinearGradient
      colors={["#4A90E2", "#357ABD"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerWrapper}
    >
      <StatusBar barStyle="light-content" />

      {/* Animated Background Elements */}
      <Animated.View style={[styles.backgroundCircle1, { opacity: fadeAnim }]} />
      <Animated.View style={[styles.backgroundCircle2, { opacity: fadeAnim }]} />

      <View style={styles.topRow}>
        <Animated.View
          style={[
            styles.greetingContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.greeting}>{getCurrentGreeting()}</Text>
          <Text style={styles.userName}>{name?.split(" ")[0] || "User"}!</Text>
          <Text style={styles.subtitle}>Ready to do some laundry?</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.actionsContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Pressable
            onPress={() => router.push("/(routes)/notification")}
            style={styles.actionButton}
          >
            <View style={styles.notificationWrapper}>
              <Ionicons name="notifications-outline" size={scale(20)} color="#fff" />
              {notificationLength > 0 && (
                <View style={styles.dot}>
                  <Text style={styles.dotText}>{notificationLength}</Text>
                </View>
              )}
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    height: verticalScale(140),
    paddingHorizontal: moderateScale(20),
    borderBottomLeftRadius: moderateScale(25),
    borderBottomRightRadius: moderateScale(25),
    paddingTop: verticalScale(35),
    paddingBottom: verticalScale(20),
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  backgroundCircle1: {
    position: "absolute",
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    top: -scale(30),
    right: -scale(30),
  },
  backgroundCircle2: {
    position: "absolute",
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    bottom: -scale(20),
    left: -scale(20),
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1,
  },
  greetingContainer: {
    flex: 1,
    paddingRight: scale(15),
  },
  greeting: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "400",
    marginBottom: verticalScale(2),
  },
  userName: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "700",
    marginBottom: verticalScale(2),
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.75)",
    fontWeight: "400",
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  notificationWrapper: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    position: "absolute",
    right: scale(-3),
    top: scale(-3),
    width: scale(14),
    height: scale(14),
    backgroundColor: "#FF4444",
    borderRadius: scale(7),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  dotText: {
    fontSize: 9,
    color: "#fff",
    fontWeight: "bold",
  },
});