import useUser from "@/hooks/fetch/useUser";
import useUserData from "@/hooks/useUserData";
import {
    fontSizes,
    IsAndroid,
    IsHaveNotch,
    IsIPAD,
} from "@/themes/app.constant";
import {
    Feather,
    FontAwesome,
    Ionicons,
    MaterialCommunityIcons,
    MaterialIcons,
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
import { scale, verticalScale } from "react-native-size-matters";

export default function ProfileScreen() {
  const { user } = useUser();
  const { name, email, avatar } = useUserData();

  const logoutHandler = async () => {
    await SecureStore.deleteItemAsync("accessToken");
    router.push("/(routes)/onboarding");
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#6248FF", "#8673FC"]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.header}
      >
        <StatusBar barStyle={"light-content"} />
        <SafeAreaView style={{ paddingTop: IsAndroid ? verticalScale(20) : 0 }}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.profileWrapper}>
        <View style={{ flexDirection: "row" }}>
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
            <Text style={styles.statNumber}>{user?.orders?.length}</Text>
            <Text style={styles.statLabel}>Enrolled</Text>
          </LinearGradient>
          <LinearGradient
            style={styles.statBox}
            colors={["#BF6FF8", "#3C1BE9"]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Certificates</Text>
          </LinearGradient>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ padding: scale(20) }}>
        {[
          {
            title: "Enrolled Courses",
            subtitle: "Explore your all enrolled courses",
            icon: <Feather name="book-open" size={scale(21)} />,
            onPress: () =>
              router.push({
                pathname: "/(routes)/enrolled-courses",
                params: { courses: JSON.stringify(user?.orders) },
              }),
          },
          {
            title: "Course Leaderboard",
            subtitle: "Let's see your position in Leaderboard",
            icon: <MaterialIcons name="leaderboard" size={scale(23)} />,
          },
          {
            title: "My Tickets",
            subtitle: "Explore your all support tickets",
            icon: (
              <MaterialCommunityIcons
                name="message-alert-outline"
                size={scale(22)}
              />
            ),
            onPress: () => router.push("/(routes)/my-tickets"),
          },
          {
            title: "Support Center",
            subtitle: "Explore our fastest support center",
            icon: <FontAwesome name="support" size={scale(22)} />,
            onPress: () => router.push("/(routes)/support-center"),
          },
          {
            title: "Notifications",
            subtitle: "Explore the important notifications",
            icon: <Ionicons name="notifications" size={scale(22)} />,
            onPress: () => router.push("/(routes)/notification"),
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
        ].map((item, idx) => (
          <Pressable
            key={idx}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: verticalScale(20),
            }}
            onPress={item.onPress}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: scale(38),
                  height: scale(38),
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: scale(10),
                  borderWidth: 1,
                  borderColor: "#E2DDFF",
                }}
              >
                {React.cloneElement(item.icon, {
                  color: "#0047AB",
                })}
              </View>
              <View>
                <Text
                  style={{
                    marginLeft: scale(10),
                    fontSize: fontSizes.FONT22,
                    fontFamily: "Poppins_400Regular",
                    color: "#000",
                  }}
                >
                  {item.title}
                </Text>
                <Text
                  style={{
                    marginLeft: scale(10),
                    fontSize: fontSizes.FONT15,
                    fontFamily: "Poppins_400Regular",
                    color: "#000",
                    opacity: 0.6,
                  }}
                >
                  {item.subtitle}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    height: verticalScale(180),
    borderBottomLeftRadius: scale(20),
    borderBottomRightRadius: scale(20),
    padding: scale(20),
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
    width: scale(320),
    height: IsAndroid
      ? verticalScale(155)
      : !IsHaveNotch
      ? verticalScale(175)
      : IsIPAD
      ? verticalScale(185)
      : verticalScale(155),
    marginTop: verticalScale(-90),
    alignSelf: "center",
    borderRadius: scale(20),
    padding: scale(15),
    backgroundColor: "#fff",
    zIndex: 10,
    shadowColor: "#999",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileImage: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    marginBottom: verticalScale(10),
  },
  profileTextContainer: {
    marginBottom: verticalScale(10),
    marginLeft: scale(10),
  },
  profileName: {
    fontSize: fontSizes.FONT22,
    fontFamily: "Poppins_500Medium",
    color: "#000",
  },
  profileTitle: {
    fontSize: fontSizes.FONT17,
    fontFamily: "Poppins_400Regular",
    color: "#8a8a8a",
    width: scale(230),
    overflow: "hidden",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: verticalScale(10),
  },
  statBox: {
    alignItems: "center",
    justifyContent: "center",
    width: scale(120),
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
});
