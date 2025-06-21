import HomeBanner from "@/components/home/home.banner";
import WelcomeHeader from "@/components/home/welcome.header";
import { useTheme } from "@/context/theme.context";
import { useSubscriptionStatus } from "@/hooks/queries/useUserQuery";
import {
  fontSizes
} from "@/themes/app.constant";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { scale, verticalScale } from "react-native-size-matters";

interface ServiceType {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  route: string;
  available: boolean;
}


export default function HomeScreen() {
  const { theme } = useTheme();
  const {
    user,
    hasSubscription,
    isLoading: userLoading,
    hasToken,
    isCheckingToken,
    isAuthenticated,
    needsLogin
  } = useSubscriptionStatus();

  const services: ServiceType[] = [
    {
      id: '1',
      title: 'Your Laundry',
      subtitle: 'Washing machines & slots',
      icon: 'local-laundry-service',
      color: '#4A90E2',
      route: '/(routes)/laundry',
      available: true,
    },
    {
      id: '2',
      title: 'Your Shop',
      subtitle: 'Shopping & marketplace',
      icon: 'storefront',
      color: '#FF6B6B',
      route: '/(routes)/shop',
      available: false,
    },
    {
      id: '3',
      title: 'Locker',
      subtitle: 'Secure storage solutions',
      icon: 'lock',
      color: '#4ECDC4',
      route: '/(routes)/locker',
      available: false,
    },
  ];

  // Manual refresh function for testing (using TanStack Query)
  const handleRefreshUser = async () => {
    console.log('🔄 HomeScreen: Manual refresh triggered (TanStack Query)');
    // TanStack Query automatically handles refetching
    // We can trigger a manual refetch if needed
  };

  // Handle service navigation with subscription check
  const handleServicePress = (service: ServiceType) => {
    if (!service.available) {
      // Show coming soon message for unavailable services
      Alert.alert(
        "Coming Soon",
        `${service.title} will be available soon!`,
        [{ text: "OK" }]
      );
      return;
    }

    // Check subscription status for available services (using TanStack Query)
    if (!hasSubscription) {
      // User doesn't have active subscription - navigate to no-package screen with service name
      router.push({
        pathname: "/(routes)/no-package" as any,
        params: { serviceName: service.title }
      });
      return;
    }

    // User has active subscription - navigate to service
    if (service.route === '/(routes)/laundry') {
      router.push("/(routes)/laundry" as any);
    } else {
      // For other services that might be implemented later
      Alert.alert(
        "Coming Soon",
        `${service.title} will be available soon!`,
        [{ text: "OK" }]
      );
    }
  };

  // Render service card
  const renderService = ({ item: service }: { item: ServiceType }) => (
    <Pressable
      style={[
        styles.serviceCard,
        {
          backgroundColor: theme.dark ? "#2a2a2a" : "#fff",
          opacity: service.available ? 1 : 0.6
        }
      ]}
      onPress={() => handleServicePress(service)}
    >
      <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
        <MaterialIcons name={service.icon as any} size={32} color="#fff" />
      </View>

      <View style={styles.serviceContent}>
        <Text style={[styles.serviceTitle, { color: theme.dark ? "#fff" : "#000" }]}>{service.title}</Text>
        <Text style={[styles.serviceSubtitle, { color: theme.dark ? "#ccc" : "#666" }]}>{service.subtitle}</Text>

        {!service.available && (
          <Text style={styles.comingSoon}>Coming Soon</Text>
        )}
      </View>

      <View style={styles.serviceArrow}>
        <Ionicons name="chevron-forward" size={20} color={theme.dark ? "#666" : "#ccc"} />
      </View>
    </Pressable>
  );

  return (
    <LinearGradient
      colors={theme.dark ? ["#131313", "#1a1a1a"] : ["#fff", "#f7f7f7"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <WelcomeHeader />

      <View style={{ flex: 1 }}>
        <FlatList
          ListHeaderComponent={() => (
            <>
              <HomeBanner />
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View>
                    <Text style={[styles.sectionTitle, { color: theme.dark ? "#fff" : "#000" }]}>Our Services</Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.dark ? "#ccc" : "#666" }]}>Choose from our available services</Text>
                  </View>
                  <Pressable
                    onPress={handleRefreshUser}
                    style={styles.refreshButton}
                    disabled={userLoading}
                  >
                    <Ionicons
                      name="refresh"
                      size={20}
                      color={userLoading ? "#ccc" : "#4A90E2"}
                    />
                    <Text style={[styles.refreshText, { color: userLoading ? "#ccc" : "#4A90E2" }]}>
                      {userLoading ? "Loading..." : "Refresh"}
                    </Text>
                  </Pressable>
                </View>

                {/* Debug Info - TanStack Query */}
                <View style={[styles.debugInfo, { backgroundColor: theme.dark ? "#2a2a2a" : "#f5f5f5" }]}>
                  <Text style={[styles.debugText, { color: theme.dark ? "#ccc" : "#666" }]}>
                    User: {user?.email} | Subscription: {hasSubscription ? '✅ YES' : '❌ NO'} | Loading: {userLoading ? 'YES' : 'NO'}
                  </Text>
                </View>

                {/* TanStack Query Debug Component */}
                <View style={[styles.tanstackDebug, {
                  backgroundColor: theme.dark ? "#1a1a1a" : "#e8f4fd",
                  borderColor: theme.dark ? "#444" : "#4A90E2"
                }]}>
                  <Text style={[styles.tanstackTitle, { color: theme.dark ? "#fff" : "#333" }]}>🔧 TanStack Query Debug</Text>

                  <View style={styles.tanstackRow}>
                    <Text style={[styles.tanstackLabel, { color: theme.dark ? "#ccc" : "#666" }]}>Auth Token:</Text>
                    <Text style={[styles.tanstackValue, { color: hasToken ? '#4CAF50' : '#F44336' }]}>
                      {isCheckingToken ? 'CHECKING...' : hasToken ? '✅ FOUND' : '❌ MISSING'}
                    </Text>
                  </View>

                  <View style={styles.tanstackRow}>
                    <Text style={[styles.tanstackLabel, { color: theme.dark ? "#ccc" : "#666" }]}>Loading:</Text>
                    <Text style={[styles.tanstackValue, { color: userLoading ? '#FF9800' : '#4CAF50' }]}>
                      {userLoading ? 'YES' : 'NO'}
                    </Text>
                  </View>

                  <View style={styles.tanstackRow}>
                    <Text style={[styles.tanstackLabel, { color: theme.dark ? "#ccc" : "#666" }]}>Authenticated:</Text>
                    <Text style={[styles.tanstackValue, { color: isAuthenticated ? '#4CAF50' : '#F44336' }]}>
                      {isAuthenticated ? '✅ YES' : '❌ NO'}
                    </Text>
                  </View>

                  <View style={styles.tanstackRow}>
                    <Text style={[styles.tanstackLabel, { color: theme.dark ? "#ccc" : "#666" }]}>User:</Text>
                    <Text style={[styles.tanstackValue, { color: theme.dark ? "#fff" : "#333" }]}>
                      {user ? `${user.email}` : needsLogin ? 'Need Login' : 'Loading...'}
                    </Text>
                  </View>

                  <View style={styles.tanstackRow}>
                    <Text style={[styles.tanstackLabel, { color: theme.dark ? "#ccc" : "#666" }]}>Subscription:</Text>
                    <Text style={[styles.tanstackValue, { color: hasSubscription ? '#4CAF50' : '#F44336' }]}>
                      {hasSubscription ? '✅ ACTIVE' : '❌ NONE'}
                    </Text>
                  </View>

                  <View style={styles.tanstackRow}>
                    <Text style={[styles.tanstackLabel, { color: theme.dark ? "#ccc" : "#666" }]}>Stripe ID:</Text>
                    <Text style={[styles.tanstackValue, { color: theme.dark ? "#fff" : "#333" }]}>
                      {user?.stripeCustomerId || 'None'}
                    </Text>
                  </View>

                  {needsLogin && (
                    <View style={[styles.tanstackRow, { backgroundColor: '#FFF3CD', padding: 8, borderRadius: 4, marginTop: 8 }]}>
                      <Text style={[styles.tanstackLabel, { color: '#856404' }]}>⚠️ Action Required:</Text>
                      <Text style={[styles.tanstackValue, { color: '#856404' }]}>Please log in</Text>
                    </View>
                  )}

                  <Text style={[styles.tanstackTimestamp, { color: theme.dark ? "#888" : "#999" }]}>
                    Last updated: {new Date().toLocaleTimeString()}
                  </Text>
                </View>
              </View>
            </>
          )}
          data={services}
          renderItem={renderService}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(15),
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(10),
  },
  sectionTitle: {
    fontSize: fontSizes.FONT24,
    fontWeight: 'bold',
    marginBottom: verticalScale(5),
  },
  sectionSubtitle: {
    fontSize: fontSizes.FONT14,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    backgroundColor: '#f0f8ff',
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  refreshText: {
    fontSize: fontSizes.FONT12,
    marginLeft: scale(4),
    fontWeight: '600',
  },
  debugInfo: {
    padding: scale(8),
    borderRadius: scale(6),
    marginTop: verticalScale(5),
  },
  debugText: {
    fontSize: fontSizes.FONT10,
    fontFamily: 'monospace',
  },
  tanstackDebug: {
    padding: scale(12),
    borderRadius: scale(8),
    marginTop: verticalScale(8),
    borderWidth: 1,
  },
  tanstackTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: verticalScale(8),
  },
  tanstackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(4),
  },
  tanstackLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tanstackValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  tanstackTimestamp: {
    fontSize: 10,
    marginTop: verticalScale(8),
    textAlign: 'center',
    fontStyle: 'italic',
  },
  listContainer: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: verticalScale(12),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  serviceIcon: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(16),
  },
  serviceContent: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: fontSizes.FONT18,
    fontWeight: 'bold',
    marginBottom: verticalScale(4),
  },
  serviceSubtitle: {
    fontSize: fontSizes.FONT14,
    marginBottom: verticalScale(4),
  },
  comingSoon: {
    fontSize: fontSizes.FONT12,
    color: '#FF9800',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  serviceArrow: {
    marginLeft: scale(8),
  },
});
