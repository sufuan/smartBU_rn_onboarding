import { GoogleSignin } from "@react-native-google-signin/google-signin";
import axios from "axios";
import { BlurView } from "expo-blur";
import JWT from "expo-jwt";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { fontSizes, windowHeight, windowWidth } from "@/themes/app.constant";

export default function AuthModal({
  setModalVisible,
}: {
  setModalVisible: (modal: boolean) => void;
}) {
  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "115355708216-m9udpjkdfq29rf6fbc3r08d4mb7t7evg.apps.googleusercontent.com", // required for web sign-in
      iosClientId:
        "115355708216-kkavg7bmm4pdr58d8b769hhhsu3f6sgm.apps.googleusercontent.com", // iOS only
    });
  }, []);

  const googleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();

      console.log("Google User Info:", userInfo);

      if (!userInfo || !userInfo.data || !userInfo.data.user) {
        console.error("User info or user object is missing:", userInfo);
        return;
      }

      const { name, email, photo } = userInfo.data.user;

      console.log("User is logged in:", { name, email, photo });

      await authHandler({
        name: name ?? "Unknown User",
        email: email ?? "no-email@example.com",
        avatar: photo ?? "",
      });
    } catch (error) {
      console.error("Google Sign-In Error:", error);
    }
  };

  const authHandler = async ({
    name,
    email,
    avatar,
  }: {
    name: string;
    email: string;
    avatar: string;
  }) => {
    const user = { name, email, avatar };

    // Check if JWT secret is accessible
    const jwtSecret = process.env.EXPO_PUBLIC_JWT_SECRET_KEY;
    console.log("JWT Secret from env:", jwtSecret ? "FOUND" : "MISSING");

    if (!jwtSecret) {
      console.error("JWT secret key is missing!");
      return;
    }

    let token = "";
    try {
      token = JWT.encode(user, jwtSecret);
      console.log("Encoded JWT Token:", token);
    } catch (err) {
      console.error("Error encoding JWT token:", err);
      return;
    }

    try {
      const res = await axios.post(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/login`,
        { signedToken: token }
      );

      console.log("Backend login response:", res.data);

      await SecureStore.setItemAsync("accessToken", res.data.accessToken);
      await SecureStore.setItemAsync("name", name);
      await SecureStore.setItemAsync("email", email);
      await SecureStore.setItemAsync("avatar", avatar);

      setModalVisible(false);
      router.push("/(tabs)");
    } catch (err) {
      console.error("Backend login error:", err);
    }
  };

  return (
    <BlurView
      style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
    >
      <Pressable
        style={{
          width: windowWidth(420),
          height: windowHeight(250),
          marginHorizontal: windowWidth(50),
          backgroundColor: "#fff",
          borderRadius: 30,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: fontSizes.FONT35,
            fontFamily: "Poppins_700Bold",
          }}
        >
          Join to Becodemy
        </Text>
        <Text
          style={{
            fontSize: fontSizes.FONT17,
            paddingTop: windowHeight(5),
            fontFamily: "Poppins_300Light",
          }}
        >
          It's easier than your imagination!
        </Text>
        <View
          style={{
            paddingVertical: windowHeight(10),
            flexDirection: "row",
            gap: windowWidth(20),
          }}
        >
          <Pressable onPress={googleSignIn}>
            <Image
              source={require("@/assets/images/onboarding/google.png")}
              style={{
                width: windowWidth(40),
                height: windowHeight(40),
                resizeMode: "contain",
              }}
            />
          </Pressable>
        </View>
      </Pressable>
    </BlurView>
  );
}
