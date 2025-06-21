import { useTheme } from "@/context/theme.context";
import { fontSizes } from "@/themes/app.constant";
import { AntDesign, Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { scale, verticalScale } from "react-native-size-matters";

export default function SettingsScreen() {
  const { theme, toggleTheme } = useTheme();
  const [courseUpdates, setcourseUpdates] = useState<any>("");
  const [supportTicketResponse, setsupportTicketResponse] = useState<any>("");
  const [latestUpdates, setlatestUpdates] = useState<any>("");

  useEffect(() => {
    const checkForPreferences = async () => {
      const courseUpdates = await AsyncStorage.getItem("courseUpdates");
      const supportTicketResponse = await AsyncStorage.getItem(
        "supportTicketResponse"
      );
      const latestUpdates = await AsyncStorage.getItem("latestUpdates");

      if (courseUpdates || supportTicketResponse || latestUpdates) {
        setcourseUpdates(courseUpdates === "true" ? true : false);
        setsupportTicketResponse(
          supportTicketResponse === "true" ? true : false
        );
        setlatestUpdates(latestUpdates === "true" ? true : false);
      } else {
        await AsyncStorage.setItem("courseUpdates", "true");
        await AsyncStorage.setItem("supportTicketResponse", "true");
        await AsyncStorage.setItem("latestUpdates", "true");

        setcourseUpdates(true);
        setsupportTicketResponse(true);
        setlatestUpdates(true);
      }
    };
    checkForPreferences();
  }, []);

  const updatePreferences = async (e: string) => {
    if (e === "courseUpdates") {
      setcourseUpdates(!courseUpdates);
      const value = !courseUpdates;
      await AsyncStorage.setItem("courseUpdates", value.toString());
    } else if (e === "supportTicketResponse") {
      setsupportTicketResponse(!supportTicketResponse);
      const value = !supportTicketResponse;
      await AsyncStorage.setItem("supportTicketResponse", value.toString());
    } else {
      setlatestUpdates(!latestUpdates);
      const value = !latestUpdates;
      await AsyncStorage.setItem("latestUpdates", value.toString());
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.dark ? "#131313" : "#f8f9fa" }}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

      {/* Enhanced Header with Gradient */}
      <LinearGradient
        colors={theme.dark ? ["#1a1a1a", "#2a2a2a"] : ["#667eea", "#764ba2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerContent}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <AntDesign
                name="left"
                size={scale(22)}
                color="#fff"
              />
            </Pressable>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Settings</Text>
              <Text style={styles.headerSubtitle}>Customize your experience</Text>
            </View>

            <View style={{ width: scale(40) }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Enhanced Content */}
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Notifications Section */}
        <View style={[styles.sectionCard, { backgroundColor: theme.dark ? "#2a2a2a" : "#fff" }]}>
          <View style={styles.sectionHeaderContainer}>
            <View style={[styles.sectionIconContainer, { backgroundColor: theme.dark ? "#4A90E2" : "#E3F2FD" }]}>
              <Ionicons name="notifications" size={scale(20)} color={theme.dark ? "#fff" : "#4A90E2"} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.dark ? "#fff" : "#000" }]}>
              Push Notifications
            </Text>
          </View>

          <View style={styles.settingsGroup}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: theme.dark ? "#fff" : "#000" }]}>
                  Course Updates
                </Text>
                <Text style={[styles.settingDescription, { color: theme.dark ? "#ccc" : "#666" }]}>
                  Get notified about new courses and updates
                </Text>
              </View>
              <Switch
                value={courseUpdates}
                onValueChange={() => updatePreferences("courseUpdates")}
                trackColor={{ false: theme.dark ? "#444" : "#E0E0E0", true: "#4A90E2" }}
                thumbColor={courseUpdates ? "#fff" : theme.dark ? "#666" : "#f4f3f4"}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.dark ? "#444" : "#f0f0f0" }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: theme.dark ? "#fff" : "#000" }]}>
                  Support Responses
                </Text>
                <Text style={[styles.settingDescription, { color: theme.dark ? "#ccc" : "#666" }]}>
                  Receive updates on your support tickets
                </Text>
              </View>
              <Switch
                value={supportTicketResponse}
                onValueChange={() => updatePreferences("supportTicketResponse")}
                trackColor={{ false: theme.dark ? "#444" : "#E0E0E0", true: "#4A90E2" }}
                thumbColor={supportTicketResponse ? "#fff" : theme.dark ? "#666" : "#f4f3f4"}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.dark ? "#444" : "#f0f0f0" }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: theme.dark ? "#fff" : "#000" }]}>
                  Latest Updates
                </Text>
                <Text style={[styles.settingDescription, { color: theme.dark ? "#ccc" : "#666" }]}>
                  Stay informed about app improvements
                </Text>
              </View>
              <Switch
                value={latestUpdates}
                onValueChange={() => updatePreferences("latestUpdates")}
                trackColor={{ false: theme.dark ? "#444" : "#E0E0E0", true: "#4A90E2" }}
                thumbColor={latestUpdates ? "#fff" : theme.dark ? "#666" : "#f4f3f4"}
              />
            </View>
          </View>
        </View>

        {/* Appearance Section */}
        <View style={[styles.sectionCard, { backgroundColor: theme.dark ? "#2a2a2a" : "#fff" }]}>
          <View style={styles.sectionHeaderContainer}>
            <View style={[styles.sectionIconContainer, { backgroundColor: theme.dark ? "#FF6B6B" : "#FFE8E8" }]}>
              <Feather name="edit-3" size={scale(20)} color={theme.dark ? "#fff" : "#FF6B6B"} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.dark ? "#fff" : "#000" }]}>
              Appearance
            </Text>
          </View>

          <View style={styles.settingsGroup}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: theme.dark ? "#fff" : "#000" }]}>
                  Dark Mode
                </Text>
                <Text style={[styles.settingDescription, { color: theme.dark ? "#ccc" : "#666" }]}>
                  Switch between light and dark themes
                </Text>
              </View>
              <Switch
                value={theme.dark}
                onValueChange={toggleTheme}
                trackColor={{ false: "#E0E0E0", true: "#4A90E2" }}
                thumbColor={theme.dark ? "#fff" : "#f4f3f4"}
              />
            </View>
          </View>
        </View>

        {/* Additional Settings Section */}
        <View style={[styles.sectionCard, { backgroundColor: theme.dark ? "#2a2a2a" : "#fff" }]}>
          <View style={styles.sectionHeaderContainer}>
            <View style={[styles.sectionIconContainer, { backgroundColor: theme.dark ? "#4ECDC4" : "#E0F7F7" }]}>
              <MaterialIcons name="settings" size={scale(20)} color={theme.dark ? "#fff" : "#4ECDC4"} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.dark ? "#fff" : "#000" }]}>
              General
            </Text>
          </View>

          <View style={styles.settingsGroup}>
            <Pressable style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: theme.dark ? "#fff" : "#000" }]}>
                  Language
                </Text>
                <Text style={[styles.settingDescription, { color: theme.dark ? "#ccc" : "#666" }]}>
                  English (US)
                </Text>
              </View>
              <AntDesign name="right" size={scale(16)} color={theme.dark ? "#666" : "#ccc"} />
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.dark ? "#444" : "#f0f0f0" }]} />

            <Pressable style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: theme.dark ? "#fff" : "#000" }]}>
                  Storage
                </Text>
                <Text style={[styles.settingDescription, { color: theme.dark ? "#ccc" : "#666" }]}>
                  Manage app data and cache
                </Text>
              </View>
              <AntDesign name="right" size={scale(16)} color={theme.dark ? "#666" : "#ccc"} />
            </Pressable>
          </View>
        </View>

        {/* App Info */}
        <View style={[styles.appInfoCard, { backgroundColor: theme.dark ? "#1a1a1a" : "#f8f9fa" }]}>
          <Text style={[styles.appInfoTitle, { color: theme.dark ? "#fff" : "#000" }]}>
            Laundry App
          </Text>
          <Text style={[styles.appInfoVersion, { color: theme.dark ? "#ccc" : "#666" }]}>
            Version 1.0.0
          </Text>
          <Text style={[styles.appInfoDescription, { color: theme.dark ? "#888" : "#999" }]}>
            Smart laundry management made simple
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header Styles
  headerGradient: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: verticalScale(10),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: fontSizes.FONT24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: verticalScale(2),
  },
  headerSubtitle: {
    fontSize: fontSizes.FONT14,
    color: "rgba(255, 255, 255, 0.8)",
  },

  // Content Styles
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: scale(20),
    paddingBottom: verticalScale(40),
  },
  sectionCard: {
    borderRadius: scale(16),
    padding: scale(20),
    marginBottom: verticalScale(20),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(20),
  },
  sectionIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(12),
  },
  sectionTitle: {
    fontSize: fontSizes.FONT20,
    fontWeight: "600",
  },
  settingsGroup: {
    // Container for all settings in a section
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: verticalScale(12),
  },
  settingInfo: {
    flex: 1,
    marginRight: scale(16),
  },
  settingTitle: {
    fontSize: fontSizes.FONT16,
    fontWeight: "600",
    marginBottom: verticalScale(4),
  },
  settingDescription: {
    fontSize: fontSizes.FONT14,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    marginVertical: verticalScale(8),
  },

  // App Info Styles
  appInfoCard: {
    borderRadius: scale(16),
    padding: scale(20),
    alignItems: "center",
    marginTop: verticalScale(10),
  },
  appInfoTitle: {
    fontSize: fontSizes.FONT18,
    fontWeight: "bold",
    marginBottom: verticalScale(4),
  },
  appInfoVersion: {
    fontSize: fontSizes.FONT14,
    marginBottom: verticalScale(8),
  },
  appInfoDescription: {
    fontSize: fontSizes.FONT12,
    textAlign: "center",
    fontStyle: "italic",
  },
});