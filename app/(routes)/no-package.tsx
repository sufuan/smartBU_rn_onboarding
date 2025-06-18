import { useTheme } from "@/context/theme.context";
import {
    fontSizes
} from "@/themes/app.constant";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { scale, verticalScale } from "react-native-size-matters";

export default function NoPackageScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams();

  // Get service name from route params or use default
  const serviceName = (params.serviceName as string) || "this service";

  const handleBuyNow = () => {
    router.push("/(routes)/checkout");
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.dark ? "#131313" : "#fff" }]}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      
      {/* Header with back button */}
      <View style={styles.header}>
        <Pressable onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.dark ? "#fff" : "#000"} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.dark ? "#fff" : "#000" }]}>
          Subscription Required
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: theme.dark ? "#2a2a2a" : "#f8f9fa" }]}>
          <Ionicons name="lock-closed" size={64} color="#FF6B6B" />
        </View>

        {/* Main message */}
        <Text style={[styles.title, { color: theme.dark ? "#fff" : "#000" }]}>
          You don't have any package
        </Text>

        <Text style={[styles.subtitle, { color: theme.dark ? "#ccc" : "#666" }]}>
          To access {serviceName}, you need an active subscription package. 
          Choose from our available plans to get started.
        </Text>

        {/* Features list */}
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={[styles.featureText, { color: theme.dark ? "#ccc" : "#666" }]}>
              Access to all washing machines
            </Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={[styles.featureText, { color: theme.dark ? "#ccc" : "#666" }]}>
              Real-time slot booking
            </Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={[styles.featureText, { color: theme.dark ? "#ccc" : "#666" }]}>
              Priority customer support
            </Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={[styles.featureText, { color: theme.dark ? "#ccc" : "#666" }]}>
              Flexible scheduling options
            </Text>
          </View>
        </View>

        {/* Buy Now button */}
        <Pressable style={styles.buyButton} onPress={handleBuyNow}>
          <Text style={styles.buyButtonText}>Buy Now</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
        </Pressable>

        {/* Secondary action */}
        <Pressable style={styles.learnMoreButton} onPress={() => {}}>
          <Text style={[styles.learnMoreText, { color: theme.dark ? "#4A90E2" : "#4A90E2" }]}>
            Learn more about our packages
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(15),
  },
  backButton: {
    padding: scale(8),
  },
  headerTitle: {
    fontSize: fontSizes.FONT18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(30),
  },
  title: {
    fontSize: fontSizes.FONT28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: verticalScale(15),
  },
  subtitle: {
    fontSize: fontSizes.FONT16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: verticalScale(30),
    paddingHorizontal: scale(10),
  },
  featuresList: {
    width: '100%',
    marginBottom: verticalScale(40),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
    paddingHorizontal: scale(10),
  },
  featureText: {
    fontSize: fontSizes.FONT14,
    marginLeft: scale(12),
    flex: 1,
  },
  buyButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(40),
    paddingVertical: verticalScale(16),
    borderRadius: scale(12),
    marginBottom: verticalScale(20),
    width: '100%',
    shadowColor: '#4A90E2',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buyButtonText: {
    color: '#fff',
    fontSize: fontSizes.FONT18,
    fontWeight: 'bold',
  },
  learnMoreButton: {
    paddingVertical: verticalScale(12),
  },
  learnMoreText: {
    fontSize: fontSizes.FONT14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
