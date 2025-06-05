import { setAuthorizationHeader } from "@/hooks/fetch/useUser";
import useUserData from "@/hooks/useUserData";
import { EvilIcons, Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";

export default function WelcomeHeader() {
  const { name } = useUserData();
  const [notificationLength, setNotificationLength] = useState(0);

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
        <View style={{ flexDirection: "row" }}>
          <Pressable onPress={() => router.push("/(routes)/notification")}>
            <View style={styles.notificationWrapper}>
              <Ionicons name="notifications-sharp" size={scale(25)} color="#fff" />
              <View style={styles.dot}>
                <Text style={styles.dotText}>{notificationLength}</Text>
              </View>
            </View>
          </Pressable>
        </View>
      </View>
      <View style={{ position: "relative" }}>
        <TextInput
          placeholder="Search for Topics, Courses"
          style={styles.input}
          placeholderTextColor="#666"
        />
        <Pressable style={styles.searchIcon}>
          <EvilIcons name="search" size={scale(30)} color="blue" />
        </Pressable>
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
  input: {
    height: verticalScale(40),
    backgroundColor: "#fff",
    color: "#000",
    marginTop: verticalScale(12),
    fontSize: 16,
    borderRadius: moderateScale(30),
    paddingHorizontal: moderateScale(15),
    fontFamily: "Poppins_400Regular",
  },
  searchIcon: {
    position: "absolute",
    right: scale(10),
    top: verticalScale(16),
  },
});
