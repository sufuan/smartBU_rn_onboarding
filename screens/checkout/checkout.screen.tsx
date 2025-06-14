import { useTheme } from "@/context/theme.context";
import { fontSizes, windowHeight, windowWidth } from "@/themes/app.constant";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { router, useGlobalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { scale } from "react-native-size-matters";

export default function CheckoutScreen() {
  const { theme } = useTheme();
  const params: any = useGlobalSearchParams();
  const [loading, setLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    name: "",
  });

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Here you would integrate with your payment processor
      // For now, we'll just simulate a payment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // After successful payment, create order
      await axios.post(`${process.env.EXPO_PUBLIC_SERVER_URI}/create-order`, {
        courseId: params.id,
        payment: {
          amount: params.price,
          method: "card",
        },
      });
      
      router.replace("/(routes)");
    } catch (error) {
      console.error("Payment failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.dark ? "#131313" : "#fff" }}>
      <ScrollView style={{ padding: windowWidth(15) }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: windowHeight(20) }}>
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
              ${params.price}
            </Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.dark ? "#fff" : "#000", fontSize: fontSizes.FONT16 }}>
              Total
            </Text>
            <Text style={{ color: theme.dark ? "#fff" : "#000", fontSize: fontSizes.FONT18, fontFamily: "Poppins_600SemiBold" }}>
              ${params.price}
            </Text>
          </View>
        </View>

        {/* Payment Form */}
        <View style={{ gap: windowHeight(15) }}>
          <View>
            <Text style={{ color: theme.dark ? "#fff" : "#000", marginBottom: windowHeight(5) }}>
              Card Holder Name
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.dark ? "#1E1E1E" : "#F5F5F5",
                padding: windowWidth(12),
                borderRadius: windowWidth(8),
                color: theme.dark ? "#fff" : "#000",
              }}
              placeholder="Enter card holder name"
              placeholderTextColor={theme.dark ? "#666" : "#999"}
              value={paymentDetails.name}
              onChangeText={(text) => setPaymentDetails({ ...paymentDetails, name: text })}
            />
          </View>

          <View>
            <Text style={{ color: theme.dark ? "#fff" : "#000", marginBottom: windowHeight(5) }}>
              Card Number
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.dark ? "#1E1E1E" : "#F5F5F5",
                padding: windowWidth(12),
                borderRadius: windowWidth(8),
                color: theme.dark ? "#fff" : "#000",
              }}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={theme.dark ? "#666" : "#999"}
              keyboardType="numeric"
              maxLength={16}
              value={paymentDetails.cardNumber}
              onChangeText={(text) => setPaymentDetails({ ...paymentDetails, cardNumber: text })}
            />
          </View>

          <View style={{ flexDirection: "row", gap: windowWidth(10) }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.dark ? "#fff" : "#000", marginBottom: windowHeight(5) }}>
                Expiry Date
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.dark ? "#1E1E1E" : "#F5F5F5",
                  padding: windowWidth(12),
                  borderRadius: windowWidth(8),
                  color: theme.dark ? "#fff" : "#000",
                }}
                placeholder="MM/YY"
                placeholderTextColor={theme.dark ? "#666" : "#999"}
                maxLength={5}
                value={paymentDetails.expiryDate}
                onChangeText={(text) => setPaymentDetails({ ...paymentDetails, expiryDate: text })}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.dark ? "#fff" : "#000", marginBottom: windowHeight(5) }}>
                CVV
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.dark ? "#1E1E1E" : "#F5F5F5",
                  padding: windowWidth(12),
                  borderRadius: windowWidth(8),
                  color: theme.dark ? "#fff" : "#000",
                }}
                placeholder="123"
                placeholderTextColor={theme.dark ? "#666" : "#999"}
                keyboardType="numeric"
                maxLength={3}
                value={paymentDetails.cvv}
                onChangeText={(text) => setPaymentDetails({ ...paymentDetails, cvv: text })}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Payment Button */}
      <View
        style={{
          padding: windowWidth(15),
          backgroundColor: theme.dark ? "#131313" : "#fff",
          borderTopWidth: 1,
          borderTopColor: theme.dark ? "#333" : "#eee",
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor: "#2467EC",
            paddingVertical: windowHeight(12),
            borderRadius: windowWidth(8),
            opacity: loading ? 0.7 : 1,
          }}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={{
                textAlign: "center",
                color: "#fff",
                fontSize: fontSizes.FONT20,
                fontFamily: "Poppins_600SemiBold",
              }}
            >
              Pay ${params.price}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
} 