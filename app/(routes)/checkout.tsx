import { useTheme } from "@/context/theme.context";
import { fontSizes, IsAndroid, windowHeight, windowWidth } from "@/themes/app.constant";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { router, useGlobalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    Image,
    Platform,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { scale } from "react-native-size-matters";

export default function CheckoutScreen() {
  const { theme } = useTheme();
  const params: any = useGlobalSearchParams();
  const [loading, setLoading] = useState(false);

  const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

  const handleBkashPayment = async () => {
    setLoading(true);
    try {
      // Here you would integrate with bKash payment gateway
      // For now, we'll simulate a payment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // After successful payment, create order
      await axios.post(`${process.env.EXPO_PUBLIC_SERVER_URI}/create-order`, {
        courseId: params.id,
        payment: {
          amount: params.price,
          method: "bkash"
        },
      });
      
      router.replace("/");
    } catch (error) {
      console.error("Payment failed:", error);
      alert("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: theme.dark ? "#131313" : "#fff",
      paddingTop: STATUSBAR_HEIGHT,
    }}>
      <StatusBar
        backgroundColor={theme.dark ? "#131313" : "#fff"}
        barStyle={theme.dark ? "light-content" : "dark-content"}
      />
      <ScrollView style={{ padding: windowWidth(15) }}>
        {/* Header */}
        <View style={{ 
          flexDirection: "row", 
          alignItems: "center", 
          marginBottom: windowHeight(20),
          paddingTop: IsAndroid ? windowHeight(5) : 0,
        }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons 
              name="arrow-back" 
              size={scale(24)} 
              color={theme.dark ? "#fff" : "#000"} 
            />
          </TouchableOpacity>
          <Text
            style={{
              marginLeft: windowWidth(10),
              fontSize: fontSizes.FONT24,
              fontFamily: "Poppins_600SemiBold",
              color: theme.dark ? "#fff" : "#000",
            }}
          >
            Checkout
          </Text>
        </View>

        {/* Order Summary */}
        <View
          style={{
            backgroundColor: theme.dark ? "#1E1E1E" : "#F5F5F5",
            padding: windowWidth(15),
            borderRadius: windowWidth(10),
            marginBottom: windowHeight(20),
          }}
        >
          <Text
            style={{
              fontSize: fontSizes.FONT20,
              fontFamily: "Poppins_600SemiBold",
              color: theme.dark ? "#fff" : "#000",
              marginBottom: windowHeight(10),
            }}
          >
            Order Summary
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: windowHeight(10) }}>
            <Text style={{ color: theme.dark ? "#fff" : "#000", fontSize: fontSizes.FONT16 }}>
              {params.name}
            </Text>
            <Text style={{ color: theme.dark ? "#fff" : "#000", fontSize: fontSizes.FONT16 }}>
              ৳{params.price}
            </Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.dark ? "#fff" : "#000", fontSize: fontSizes.FONT16 }}>
              Total
            </Text>
            <Text style={{ color: theme.dark ? "#fff" : "#000", fontSize: fontSizes.FONT18, fontFamily: "Poppins_600SemiBold" }}>
              ৳{params.price}
            </Text>
          </View>
        </View>

        {/* bKash Payment Section */}
        <View style={{ alignItems: "center", marginVertical: windowHeight(20) }}>
          <TouchableOpacity 
            style={{
              backgroundColor: theme.dark ? "#1E1E1E" : "#F5F5F5",
              padding: windowWidth(20),
              borderRadius: windowWidth(10),
              width: "100%",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            onPress={handleBkashPayment}
            disabled={loading}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                source={{ uri: "https://www.logo.wine/a/logo/BKash/BKash-Icon-Logo.wine.svg" }}
                style={{ width: 50, height: 50 }}
                resizeMode="contain"
              />
              <Text style={{ 
                marginLeft: windowWidth(10),
                fontSize: fontSizes.FONT18,
                color: theme.dark ? "#fff" : "#000",
                fontFamily: "Poppins_600SemiBold",
              }}>
                bKash
              </Text>
            </View>
            <View style={{ 
              backgroundColor: "#E2136E",
              paddingHorizontal: windowWidth(15),
              paddingVertical: windowHeight(8),
              borderRadius: windowWidth(5),
            }}>
              <Text style={{ 
                color: "#fff",
                fontSize: fontSizes.FONT14,
                fontFamily: "Poppins_600SemiBold",
              }}>
                {loading ? "Processing..." : "Proceed"}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={{ 
            color: theme.dark ? "#ccc" : "#666", 
            marginTop: windowHeight(15),
            textAlign: "center",
            fontSize: fontSizes.FONT14
          }}>
            You will be redirected to bKash for payment
          </Text>
        </View>
      </ScrollView>
    </View>
  );
} 