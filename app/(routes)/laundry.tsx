import { useTheme } from "@/context/theme.context";
import useUser from "@/hooks/fetch/useUser";
import {
  fontSizes
} from "@/themes/app.constant";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { scale, verticalScale } from "react-native-size-matters";

interface AvailableSlot {
  slotTime: Date;
  duration: number;
  status: 'Available';
  machineId: string;
}

interface MachineWithSlots extends MachineType {
  availableSlots: AvailableSlot[];
  loading: boolean;
}

export default function LaundryScreen() {
  const { theme } = useTheme();
  const { user, refetch: refetchUser, loader: userLoading } = useUser();

  const [machines, setMachines] = useState<MachineWithSlots[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  // Check if user has active subscription
  const hasActiveSubscription = () => {
    return user?.stripeCustomerId && user.stripeCustomerId.trim() !== '';
  };

  // Check subscription when user data is available
  useEffect(() => {
    // If user data is not yet available, we wait. The UI shows "Loading user data...".
    if (!user) {
      console.log('⏳ LaundryScreen: Waiting for user data...');
      return; // Exit until we have user data
    }

    // Once we have user data, we start the subscription check.
    console.log('🔍 LaundryScreen: User data found, checking subscription...');
    
    // The UI will show "Checking subscription..." because `checkingSubscription` is initially true.
    const subscriptionCheckTimeout = setTimeout(() => {
      if (hasActiveSubscription()) {
        // If subscription is active, we stop the check and allow the component to render the machine list.
        console.log('✅ LaundryScreen: Active subscription found.');
        setCheckingSubscription(false);
      } else {
        // If no subscription, redirect to the "no-package" screen.
        console.log('❌ LaundryScreen: No active subscription. Redirecting...');
        router.replace({
          pathname: "/(routes)/no-package" as any,
          params: { serviceName: "Your Laundry" },
        });
      }
    }, 500); // A small delay can prevent UI flickering.

    // Cleanup function to clear the timeout if the component unmounts or `user` changes.
    return () => clearTimeout(subscriptionCheckTimeout);
  }, [user]); // This effect runs whenever the `user` object changes.

  // Fetch machines from API with timeout and optimization
  const fetchMachines = useCallback(async () => {
    try {
      console.log('🔄 Fetching machines...');
      setError(null);

      console.log('🌐 Server URI:', process.env.EXPO_PUBLIC_SERVER_URI);

      // Add timeout to prevent long loading
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/api/machines`,
        { timeout: 8000 } // 8 second timeout
      );

      console.log('✅ Machines response:', response.data);
      if (response.data.success) {
        const machinesData: MachineWithSlots[] = response.data.machines.map((machine: any) => ({
          ...machine,
          availableSlots: [],
          loading: true,
        }));

        console.log('🏭 Machines data:', machinesData.length, 'machines');
        setMachines(machinesData);

        // Fetch slots for each machine with limited concurrency
        console.log('🔄 Fetching slots for', machinesData.length, 'machines');

        // Process machines in batches to avoid overwhelming the server
        const batchSize = 2;
        for (let i = 0; i < machinesData.length; i += batchSize) {
          const batch = machinesData.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (machine) => {
              try {
                console.log('🔄 Fetching slots for machine:', machine.machineId);
                const slotsResponse = await axios.get(
                  `${process.env.EXPO_PUBLIC_SERVER_URI}/api/slots?machineId=${machine.id}`,
                  { timeout: 5000 } // 5 second timeout for slots
                );

                console.log('✅ Slots response for', machine.machineId, ':', slotsResponse.data);
                if (slotsResponse.data.success) {
                  const availableSlots = slotsResponse.data.slots.map((slot: any) => ({
                    ...slot,
                    slotTime: new Date(slot.slotTime),
                  }));

                  console.log('📅 Available slots for', machine.machineId, ':', availableSlots.length);
                  setMachines(prev => prev.map(m =>
                    m.id === machine.id
                      ? { ...m, availableSlots, loading: false }
                      : m
                  ));
                }
              } catch (error: any) {
                console.error(`❌ Error fetching slots for machine ${machine.machineId}:`, error);
                setMachines(prev => prev.map(m =>
                  m.id === machine.id
                    ? { ...m, availableSlots: [], loading: false }
                    : m
                ));
              }
            })
          );

          // Small delay between batches to prevent server overload
          if (i + batchSize < machinesData.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }
    } catch (error: any) {
      console.error("❌ Error fetching machines:", error);

      if (error.code === 'ECONNABORTED') {
        setError("Connection timeout. Please check your internet connection.");
      } else {
        setError("Failed to load washing machines. Please try again.");
      }
    } finally {
      console.log('🏁 Fetch machines completed, setting loading to false');
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMachines();
  }, [fetchMachines]);

  // Handle slot booking
  const handleBookSlot = useCallback(async (machineId: string, slotTime: Date, machineLocation?: string) => {
    console.log('🎯 LaundryScreen: Slot booking initiated for machine:', machineId);

    // Double-check subscription before booking
    await refetchUser();

    // Longer delay to ensure user data is updated
    setTimeout(() => {
      console.log('🔍 LaundryScreen: Checking subscription for slot booking:', {
        userId: user?.id,
        email: user?.email,
        stripeCustomerId: user?.stripeCustomerId,
        hasSubscription: hasActiveSubscription()
      });

      if (!hasActiveSubscription()) {
        console.log('❌ LaundryScreen: No subscription for slot booking');
        Alert.alert(
          "Subscription Required",
          "You need an active subscription to book washing machine slots.",
          [
            {
              text: "Subscribe Now",
              onPress: () => router.push("/(routes)/checkout"),
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ]
        );
        return;
      }

      console.log('✅ LaundryScreen: Subscription confirmed, navigating to slot booking');
      // Navigate to SlotBookingScreen with parameters
      router.push({
        pathname: "/(routes)/slot-booking" as any,
        params: {
          machineId: machineId,
          slotTime: slotTime.toISOString(),
          machineLocation: machineLocation || "Unknown Location",
        },
      });
    }, 500); // Increased delay
  }, [user]);

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Render slot item
  const renderSlot = ({ item: slot, machineLocation }: { item: AvailableSlot, machineLocation?: string }) => (
    <View style={[styles.slotCard, { backgroundColor: theme.dark ? "#2a2a2a" : "#f8f9fa" }]}>
      <View style={styles.slotInfo}>
        <Text style={[styles.slotTime, { color: theme.dark ? "#fff" : "#000" }]}>
          {formatTime(slot.slotTime)}
        </Text>
        <Text style={[styles.slotDuration, { color: theme.dark ? "#ccc" : "#666" }]}>
          30 minutes
        </Text>
      </View>
      <Pressable
        style={[styles.bookButton, { backgroundColor: "#4A90E2" }]}
        onPress={() => handleBookSlot(slot.machineId, slot.slotTime, machineLocation)}
      >
        <Text style={styles.bookButtonText}>Book Slot</Text>
      </Pressable>
    </View>
  );

  // Render machine item
  const renderMachine = ({ item: machine }: { item: MachineWithSlots }) => (
    <View style={[styles.machineCard, { backgroundColor: theme.dark ? "#1e1e1e" : "#fff" }]}>
      <View style={styles.machineHeader}>
        <View style={styles.machineInfo}>
          <Text style={[styles.machineId, { color: theme.dark ? "#fff" : "#000" }]}>
            {machine.machineId}
          </Text>
          <Text style={[styles.machineLocation, { color: theme.dark ? "#ccc" : "#666" }]}>
            {machine.location || "Location not specified"}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: machine.status === 'Available' ? "#4CAF50" : machine.status === 'InUse' ? "#FF9800" : "#F44336" }
        ]}>
          <Text style={styles.statusText}>{machine.status}</Text>
        </View>
      </View>

      <View style={styles.slotsSection}>
        <Text style={[styles.slotsTitle, { color: theme.dark ? "#fff" : "#000" }]}>
          Available Slots
        </Text>
        
        {machine.loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4A90E2" />
            <Text style={[styles.loadingText, { color: theme.dark ? "#ccc" : "#666" }]}>
              Loading slots...
            </Text>
          </View>
        ) : machine.availableSlots.length > 0 ? (
          <FlatList
            data={machine.availableSlots.slice(0, 6)} // Show first 6 slots
            renderItem={({ item }) => renderSlot({ item, machineLocation: machine.location })}
            keyExtractor={(slot, index) => `${machine.id}-${slot.slotTime.getTime()}-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.slotsContainer}
          />
        ) : (
          <Text style={[styles.noSlotsText, { color: theme.dark ? "#ccc" : "#666" }]}>
            No available slots for today
          </Text>
        )}
      </View>
    </View>
  );

  if (checkingSubscription || !user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.dark ? "#131313" : "#fff" }]}>
        <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={[styles.loadingText, { color: theme.dark ? "#ccc" : "#666" }]}>
            {!user ? "Loading user data..." : "Checking subscription..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.dark ? "#131313" : "#fff" }]}>
        <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={[styles.loadingText, { color: theme.dark ? "#ccc" : "#666" }]}>
            Loading washing machines...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.dark ? "#131313" : "#fff" }]}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.dark ? "#fff" : "#000"} />
        </Pressable>
        <Text style={[styles.title, { color: theme.dark ? "#fff" : "#000" }]}>
          Washing Machines
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#F44336" />
          <Text style={[styles.errorText, { color: theme.dark ? "#fff" : "#000" }]}>
            {error}
          </Text>
          <Pressable style={styles.retryButton} onPress={fetchMachines}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={machines}
          renderItem={renderMachine}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#4A90E2"]}
              tintColor="#4A90E2"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={64} color="#ccc" />
              <Text style={[styles.emptyText, { color: theme.dark ? "#ccc" : "#666" }]}>
                No washing machines available
              </Text>
            </View>
          }
        />
      )}
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
  title: {
    fontSize: fontSizes.FONT20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
  },
  loadingText: {
    marginTop: verticalScale(10),
    fontSize: fontSizes.FONT16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
  },
  errorText: {
    fontSize: fontSizes.FONT16,
    textAlign: 'center',
    marginVertical: verticalScale(15),
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    borderRadius: scale(8),
  },
  retryButtonText: {
    color: '#fff',
    fontSize: fontSizes.FONT16,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(50),
  },
  emptyText: {
    fontSize: fontSizes.FONT16,
    marginTop: verticalScale(10),
  },
  machineCard: {
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: verticalScale(16),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  machineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  machineInfo: {
    flex: 1,
  },
  machineId: {
    fontSize: fontSizes.FONT20,
    fontWeight: 'bold',
    marginBottom: verticalScale(4),
  },
  machineLocation: {
    fontSize: fontSizes.FONT14,
  },
  statusBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(16),
  },
  statusText: {
    color: '#fff',
    fontSize: fontSizes.FONT12,
    fontWeight: '600',
  },
  slotsSection: {
    marginTop: verticalScale(8),
  },
  slotsTitle: {
    fontSize: fontSizes.FONT16,
    fontWeight: '600',
    marginBottom: verticalScale(12),
  },
  slotsContainer: {
    paddingRight: scale(20),
  },
  slotCard: {
    borderRadius: scale(8),
    padding: scale(12),
    marginRight: scale(12),
    minWidth: scale(120),
    alignItems: 'center',
  },
  slotInfo: {
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  slotTime: {
    fontSize: fontSizes.FONT14,
    fontWeight: '600',
  },
  slotDuration: {
    fontSize: fontSizes.FONT12,
    marginTop: verticalScale(2),
  },
  bookButton: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(6),
  },
  bookButtonText: {
    color: '#fff',
    fontSize: fontSizes.FONT12,
    fontWeight: '600',
  },
  noSlotsText: {
    fontSize: fontSizes.FONT14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: verticalScale(20),
  },
});
