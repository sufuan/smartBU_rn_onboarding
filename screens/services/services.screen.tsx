import { useTheme } from "@/context/theme.context";
import { useSubscriptionStatus } from "@/hooks/queries/useUserQuery";
import {
    fontSizes
} from "@/themes/app.constant";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
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

export default function ServicesScreen() {
  const { theme } = useTheme();
  const { user } = useSubscriptionStatus();

  const [machines, setMachines] = useState<MachineWithSlots[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Note: Subscription check is now handled at the home screen level
  // Users can only reach this screen if they have an active subscription

  // Fetch machines from API
  const fetchMachines = useCallback(async () => {
    try {
      console.log('🔄 Fetching machines...');
      setError(null);
      // Don't set auth header for public endpoints

      console.log('🌐 Server URI:', process.env.EXPO_PUBLIC_SERVER_URI);
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/api/machines`
      );

      console.log('✅ Machines response:', response.data);
      if (response.data.success) {
        const machinesData: MachineWithSlots[] = response.data.machines.map((machine: MachineType) => ({
          ...machine,
          availableSlots: [],
          loading: true,
        }));

        console.log('🏭 Machines data:', machinesData.length, 'machines');
        setMachines(machinesData);

        // Fetch slots for each machine
        console.log('🔄 Fetching slots for', machinesData.length, 'machines');
        await Promise.all(
          machinesData.map(async (machine) => {
            try {
              console.log('🔄 Fetching slots for machine:', machine.machineId);
              const slotsResponse = await axios.get(
                `${process.env.EXPO_PUBLIC_SERVER_URI}/api/slots?machineId=${machine.id}`
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
              console.error("Slot error details:", error.response?.data || error.message);
              setMachines(prev => prev.map(m =>
                m.id === machine.id
                  ? { ...m, availableSlots: [], loading: false }
                  : m
              ));
            }
          })
        );
      }
    } catch (error: any) {
      console.error("❌ Error fetching machines:", error);
      console.error("Error details:", error.response?.data || error.message);
      setError("Failed to load washing machines. Please try again.");
      Alert.alert("Error", "Failed to load washing machines. Please check your connection and try again.");
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
  const handleBookSlot = useCallback((machineId: string, slotTime: Date) => {
    Alert.alert(
      "Book Slot",
      `Would you like to book this slot?\n\nMachine: ${machineId}\nTime: ${formatTime(slotTime)}`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Book Now",
          onPress: () => {
            // TODO: Implement actual booking logic
            Alert.alert("Success", "Slot booking functionality will be implemented soon!");
          },
        },
      ]
    );
  }, []);

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Render slot item
  const renderSlot = ({ item: slot }: { item: AvailableSlot }) => (
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
        onPress={() => handleBookSlot(slot.machineId, slot.slotTime)}
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
            renderItem={renderSlot}
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
        <Text style={[styles.title, { color: theme.dark ? "#fff" : "#000" }]}>
          Washing Machines
        </Text>
        <Text style={[styles.subtitle, { color: theme.dark ? "#ccc" : "#666" }]}>
          Book your 30-minute slots
        </Text>
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
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(20),
  },
  title: {
    fontSize: fontSizes.FONT28,
    fontWeight: 'bold',
    marginBottom: verticalScale(5),
  },
  subtitle: {
    fontSize: fontSizes.FONT16,
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