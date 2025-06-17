import HomeBanner from "@/components/home/home.banner";
import WelcomeHeader from "@/components/home/welcome.header";
import { useTheme } from "@/context/theme.context";
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

  // Handle service navigation
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

    if (service.route === '/(routes)/laundry') {
      router.push('/laundry' as any);
    } else {
      // For other services, show coming soon
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
                <Text style={styles.sectionTitle}>Our Services</Text>
                <Text style={styles.sectionSubtitle}>Choose from our available services</Text>
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
