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
  const { user, hasSubscription, isLoading: userLoading } = useSubscriptionStatus();

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
          backgroundColor: "#fff",
          opacity: service.available ? 1 : 0.6
        }
      ]}
      onPress={() => handleServicePress(service)}
    >
      <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
        <MaterialIcons name={service.icon as any} size={32} color="#fff" />
      </View>

      <View style={styles.serviceContent}>
        <Text style={styles.serviceTitle}>{service.title}</Text>
        <Text style={styles.serviceSubtitle}>{service.subtitle}</Text>

        {!service.available && (
          <Text style={styles.comingSoon}>Coming Soon</Text>
        )}
      </View>

      <View style={styles.serviceArrow}>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </View>
    </Pressable>
  );

  return (
    <LinearGradient
      colors={["#fff", "#f7f7f7"]}
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
                    <Text style={styles.sectionTitle}>Our Services</Text>
                    <Text style={styles.sectionSubtitle}>Choose from our available services</Text>
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
                <View style={styles.debugInfo}>
                  <Text style={styles.debugText}>
                    User: {user?.email} | Subscription: {hasSubscription ? '✅ YES' : '❌ NO'} | Loading: {userLoading ? 'YES' : 'NO'}
                  </Text>
                </View>

                {/* TanStack Query Debug Component */}
                <View style={styles.tanstackDebug}>
                  <Text style={styles.tanstackTitle}>🔧 TanStack Query Debug</Text>

                  <View style={styles.tanstackRow}>
                    <Text style={styles.tanstackLabel}>Loading:</Text>
                    <Text style={[styles.tanstackValue, { color: userLoading ? '#FF9800' : '#4CAF50' }]}>
                      {userLoading ? 'YES' : 'NO'}
                    </Text>
                  </View>

                  <View style={styles.tanstackRow}>
                    <Text style={styles.tanstackLabel}>User:</Text>
                    <Text style={styles.tanstackValue}>
                      {user ? `${user.email}` : 'Not loaded'}
                    </Text>
                  </View>

                  <View style={styles.tanstackRow}>
                    <Text style={styles.tanstackLabel}>Subscription:</Text>
                    <Text style={[styles.tanstackValue, { color: hasSubscription ? '#4CAF50' : '#F44336' }]}>
                      {hasSubscription ? '✅ ACTIVE' : '❌ NONE'}
                    </Text>
                  </View>

                  <View style={styles.tanstackRow}>
                    <Text style={styles.tanstackLabel}>Stripe ID:</Text>
                    <Text style={styles.tanstackValue}>
                      {user?.stripeCustomerId || 'None'}
                    </Text>
                  </View>

                  <Text style={styles.tanstackTimestamp}>
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
    color: '#000',
    marginBottom: verticalScale(5),
  },
  sectionSubtitle: {
    fontSize: fontSizes.FONT14,
    color: '#666',
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
    backgroundColor: '#f5f5f5',
    padding: scale(8),
    borderRadius: scale(6),
    marginTop: verticalScale(5),
  },
  debugText: {
    fontSize: fontSizes.FONT10,
    color: '#666',
    fontFamily: 'monospace',
  },
  tanstackDebug: {
    backgroundColor: '#e8f4fd',
    padding: scale(12),
    borderRadius: scale(8),
    marginTop: verticalScale(8),
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  tanstackTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: verticalScale(8),
    color: '#333',
  },
  tanstackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(4),
  },
  tanstackLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  tanstackValue: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  tanstackTimestamp: {
    fontSize: 10,
    color: '#999',
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
    color: '#000',
    marginBottom: verticalScale(4),
  },
  serviceSubtitle: {
    fontSize: fontSizes.FONT14,
    color: '#666',
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
