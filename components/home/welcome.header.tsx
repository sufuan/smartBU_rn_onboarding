import { setAuthorizationHeader } from "@/hooks/fetch/useUser";
import useUserData from "@/hooks/useUserData";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";


import { useCameraPermissions } from "expo-camera";


export default function WelcomeHeader() {
  const { name } = useUserData();
  const [notificationLength, setNotificationLength] = useState(0);

  const [permission, requestPermission] = useCameraPermissions();
  const isPermissionGranted = Boolean(permission?.granted);

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
  }, []);

  return (
    <LinearGradient
      colors={["#75ABFC", "#0047AB"]}
      start={{ x: 1, y: 1 }}
      end={{ x: 0, y: 1 }}
      style={styles.headerWrapper}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.topRow}>
        <View>
          <Text style={styles.greeting}>Hi {name?.split(" ")[0]},</Text>
          <Text style={styles.subtitle}>Let's start Learning</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable onPress={() => router.push("/(routes)/notification")}>
            <View style={styles.notificationWrapper}>
              <Ionicons name="notifications-sharp" size={scale(25)} color="#fff" />
              <View style={styles.dot}>
                <Text style={styles.dotText}>{notificationLength}</Text>
              </View>
            </View>
          </Pressable>

          {/* Scan Button */}
          <View>
            <Pressable onPress={handleScanPress}>
              <Text style={styles.buttonStyle}>
                {isPermissionGranted ? "Scan QR Code" : "Enable Camera & Scan"}
              </Text>
            </Pressable>
          </View>

        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    height: verticalScale(155),
    paddingHorizontal: moderateScale(25),
    borderBottomLeftRadius: moderateScale(40),
    borderBottomRightRadius: moderateScale(40),
    paddingTop: verticalScale(30),
    justifyContent: "center",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 32,
    color: "#fff",
    fontFamily: "Poppins_600SemiBold",
  },
  subtitle: {
    fontSize: 22,
    color: "#fff",
    fontFamily: "Poppins_400Regular",
  },
  notificationWrapper: {
    position: "relative",
    width: scale(45),
    height: scale(45),
    borderRadius: scale(10),
    backgroundColor: "#004FAB",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    right: scale(5),
    top: scale(5),
    width: scale(13),
    height: scale(13),
    backgroundColor: "#19C964",
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  dotText: {
    fontSize: 12,
    color: "#fff",
  },
  scanButton: {
    marginLeft: scale(10),
    backgroundColor: "#19C964",
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(14),
    borderRadius: scale(10),
    justifyContent: "center",
    alignItems: "center",
  },
  scanButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
  },
  buttonStyle: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    backgroundColor: "#19C964",
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(14),
    borderRadius: scale(10),
    textAlign: "center",
  },
});
