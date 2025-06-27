import { useTheme } from "@/context/theme.context";
import { useSubscriptionStatus } from "@/hooks/queries/useUserQuery";
import useUserData from "@/hooks/useUserData";
import {
  fontSizes,
  IsAndroid,
  IsHaveNotch,
  IsIPAD,
} from "@/themes/app.constant";
import {
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scale, verticalScale } from "react-native-size-matters";

export default function ProfileScreen() {
  // --- Hooks for user data and safe area ---
  const { theme } = useTheme();
  const { user } = useSubscriptionStatus();
  const { name, email, avatar } = useUserData();
  const insets = useSafeAreaInsets();

  // --- Enhanced logout handler function ---
  const logoutHandler = async () => {
    try {
      console.log('🚪 Starting logout process...');

      // Clear all local storage
      console.log('🧹 Clearing local storage...');
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("name");
      await SecureStore.deleteItemAsync("email");
      await SecureStore.deleteItemAsync("avatar");

      console.log('✅ Logout completed successfully');

      // Navigate to onboarding
      router.push("/(routes)/onboarding");

    } catch (error) {
      console.error('❌ Logout error:', error);
      // Even if there's an error, try to navigate to onboarding
      router.push("/(routes)/onboarding");
    }
  };

  // --- Array of profile options for clean mapping ---
  const profileOptions = [
    {
      title: "My Packages",
      subtitle: "View active and expired laundry packages",
      icon: <MaterialCommunityIcons name="package-variant" size={scale(22)} />,
      onPress: () => router.push("/(routes)/my-packages"),
    },
    {
      title: "Add Points / Buy Package",
      subtitle: "Purchase points or laundry packages",
      icon: <MaterialIcons name="add-shopping-cart" size={scale(22)} />,
      onPress: () => router.push("/(routes)/checkout"),
    },
    {
      title: "Machine Access Status",
      subtitle: "Check your machine access status",
      icon: <MaterialCommunityIcons name="washing-machine" size={scale(22)} />,
      onPress: () => router.push("/(routes)/access-status"),
    },
    {
      title: "Referral Program",
      subtitle: "Invite friends and earn exclusive rewards",
      icon: <MaterialIcons name="card-giftcard" size={scale(22)} />,
      onPress: () => router.push("/(routes)/refer-earn"),
    },
    {
      title: "Support Center",
      subtitle: "Explore our fastest support center",
      icon: <FontAwesome name="support" size={scale(22)} />,
      onPress: () => router.push("/(routes)/support-center"),
    },
    {
      title: "Settings",
      subtitle: "Control the app as per your preferences",
      icon: <Ionicons name="settings-sharp" size={scale(23)} />,
      onPress: () => router.push("/(routes)/settings"),
    },
    {
      title: "Privacy & Policy",
      subtitle: "Explore our privacy and policy",
      icon: <MaterialIcons name="policy" size={scale(23)} />,
      onPress: () =>
        WebBrowser.openBrowserAsync(
          "https://www.becodemy.com/privacy-policy"
        ),
    },
    {
      title: "Log Out",
      subtitle: "Logging out from your account",
      icon: <MaterialIcons name="logout" size={scale(23)} />,
      onPress: logoutHandler,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.dark ? "#131313" : "#f8f9fa" }]}>
      <LinearGradient
        colors={["#6248FF", "#8673FC"]} // Static colors
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.header}
      >
        <StatusBar barStyle={"light-content"} />
        <SafeAreaView style={{ paddingTop: IsAndroid ? verticalScale(20) : 0 }}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Profile</Text>
            {/* ThemeSwitcher removed */}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Profile wrapper OUTSIDE ScrollView to create the overlap effect */}
      <View style={styles.profileWrapper}>
        <View style={styles.profileInfoContainer}>
          {avatar && (
            <Image source={{ uri: avatar }} style={styles.profileImage} />
          )}
          <View style={styles.profileTextContainer}>
            <Text style={styles.profileName}>{name}</Text>
            <Text style={styles.profileTitle}>{email}</Text>
          </View>
        </View>
        <View style={styles.statsContainer}>
          <LinearGradient
            style={styles.statBox}
            colors={["#01CED3", "#0185F7"]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.statNumber}>{user?.orders?.length || 0}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </LinearGradient>
          <LinearGradient
            style={styles.statBox}
            colors={["#BF6FF8", "#3C1BE9"]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.statNumber}>{user?.stripeCustomerId ? "✓" : "✗"}</Text>
            <Text style={styles.statLabel}>Access</Text>
          </LinearGradient>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            // Minimal paddingTop to prevent content from being hidden by the profile wrapper
            paddingTop: verticalScale(20),
            paddingHorizontal: scale(20),
            // Increased bottom padding to ensure Log Out is fully visible above tab bar
            paddingBottom: insets.bottom + verticalScale(120), // Increased for tab bar clearance
          }
        ]}
      >
          {profileOptions.map((item, idx) => (
            <Pressable
              key={idx}
              style={[
                styles.optionRow,
                {
                  backgroundColor: theme.dark ? "#2a2a2a" : "#fff",
                  borderColor: theme.dark ? "#3a3a3a" : "#f0f0f0"
                }
              ]}
              onPress={item.onPress}
              android_ripple={{
                color: theme.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
              }}
            >
              <View style={styles.optionLeftContainer}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: theme.dark ? "#3a3a3a" : "#f8f9ff" }
                ]}>
                  {React.cloneElement(item.icon, {
                    color: "#4A90E2",
                  })}
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={[
                    styles.optionTitle,
                    { color: theme.dark ? "#fff" : "#1a1a1a" }
                  ]}>
                    {item.title}
                  </Text>
                  <Text style={[
                    styles.optionSubtitle,
                    { color: theme.dark ? "#b0b0b0" : "#666" }
                  ]}>
                    {item.subtitle}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.chevronContainer,
                { backgroundColor: theme.dark ? "#3a3a3a" : "#f5f5f5" }
              ]}>
                <Ionicons
                  name="chevron-forward"
                  size={scale(18)}
                  color={theme.dark ? "#888" : "#999"}
                />
              </View>
            </Pressable>
          ))}
      </ScrollView>
    </View>
  );
}

// --- Stylesheet without theme-dependent values ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5", // Static background color
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    height: verticalScale(180),
    borderBottomLeftRadius: scale(20),
    borderBottomRightRadius: scale(20),
    paddingHorizontal: scale(20),
    paddingTop: scale(20),
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: fontSizes.FONT28,
    color: "#fff",
    fontFamily: "Poppins_500Medium",
  },
  profileWrapper: {
    height: IsAndroid
      ? verticalScale(155)
      : !IsHaveNotch
      ? verticalScale(175)
      : IsIPAD
      ? verticalScale(185)
      : verticalScale(155),
    width: "90%",
    alignSelf: "center",
    backgroundColor: "#fff", // Static background color
    marginTop: verticalScale(-90), // Use margin to pull the card up
    borderRadius: scale(20),
    padding: scale(15),
    zIndex: 10,
    shadowColor: "#999",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    justifyContent: "space-between", // Helps space top info and bottom stats
  },
  profileInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
  },
  profileTextContainer: {
    marginLeft: scale(10),
  },
  profileName: {
    fontSize: fontSizes.FONT22,
    fontFamily: "Poppins_500Medium",
    color: "#000", // Static text color
  },
  profileTitle: {
    fontSize: fontSizes.FONT17,
    fontFamily: "Poppins_400Regular",
    color: "#8a8a8a",
    width: scale(230),
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    alignItems: "center",
    justifyContent: "center",
    width: "48%",
    height: verticalScale(62),
    borderRadius: scale(10),
  },
  statNumber: {
    fontSize: fontSizes.FONT25,
    fontFamily: "Poppins_700Bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: fontSizes.FONT20,
    fontFamily: "Poppins_400Regular",
    color: "#fff",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderRadius: scale(16),
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  optionLeftContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: scale(48),
    height: scale(48),
    justifyContent: "center",
    alignItems: "center",
    borderRadius: scale(12),
    marginRight: scale(16),
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fontSizes.FONT18,
    fontWeight: "600",
    marginBottom: verticalScale(2),
  },
  optionSubtitle: {
    fontSize: fontSizes.FONT14,
    opacity: 0.8,
    lineHeight: fontSizes.FONT14 * 1.3,
  },
  chevronContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    justifyContent: "center",
    alignItems: "center",
  },
});
