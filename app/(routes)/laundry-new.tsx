import { useTheme } from "@/context/theme.context";
import { useBookSlotMutation } from "@/hooks/mutations/useSlotMutations";
import { useMachineSlotsQuery, useMachinesQuery } from "@/hooks/queries/useMachineQueries";
import { useSubscriptionStatus } from "@/hooks/queries/useUserQuery";
import { fontSizes } from "@/themes/app.constant";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { scale, verticalScale } from "react-native-size-matters";

interface AvailableSlot {
  slotTime: Date;
  duration: number;
  status: 'Available';
  machineId: string;
}

export default function LaundryScreenNew() {
  const { theme } = useTheme();
  
  // TanStack Query hooks
  const { hasSubscription, isLoading: userLoading, user } = useSubscriptionStatus();
  const { machines, isLoading: machinesLoading, error: machinesError, refetch: refetchMachines } = useMachinesQuery();
  const bookSlotMutation = useBookSlotMutation();

  // Check subscription and redirect if needed
  React.useEffect(() => {
    if (!userLoading && !hasSubscription) {
      console.log('❌ LaundryScreen: No subscription, redirecting to no-package');
      router.replace({
        pathname: "/(routes)/no-package" as any,
        params: { serviceName: "Your Laundry" }
      });
    }
  }, [userLoading, hasSubscription]);

  // Enhanced machines data with slots
  const machinesWithSlots = useMemo(() => {
    return machines.map(machine => {
      // Use individual slot queries for each machine
      const slotsQuery = useMachineSlotsQuery(machine.id);
      
      return {
        ...machine,
        availableSlots: slotsQuery.slots?.map(slot => ({
          ...slot,
          slotTime: new Date(slot.slotTime),
        })) || [],
        slotsLoading: slotsQuery.isLoading,
        slotsError: slotsQuery.error,
      };
    });
  }, [machines]);

  // Handle slot booking with TanStack Query mutation
  const handleBookSlot = useCallback(async (machineId: string, slotTime: Date, machineLocation?: string) => {
    if (!user) {
      Alert.alert('Error', 'User not found. Please try again.');
      return;
    }

    if (!hasSubscription) {
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

    // Use TanStack Query mutation for booking
    bookSlotMutation.mutate({
      userId: user.id,
      machineId,
      slotTime: slotTime.toISOString(),
    });
  }, [user, hasSubscription, bookSlotMutation]);

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
        style={[
          styles.bookButton, 
          { 
            backgroundColor: bookSlotMutation.isPending ? "#ccc" : "#4A90E2",
            opacity: bookSlotMutation.isPending ? 0.7 : 1
          }
        ]}
        onPress={() => handleBookSlot(slot.machineId, slot.slotTime, machineLocation)}
        disabled={bookSlotMutation.isPending}
      >
        <Text style={styles.bookButtonText}>
          {bookSlotMutation.isPending ? "Booking..." : "Book Slot"}
        </Text>
      </Pressable>
    </View>
  );

  // Render machine item
  const renderMachine = ({ item: machine }: { item: any }) => (
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
        
        {machine.slotsLoading ? (
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

  // Loading states
  if (userLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.dark ? "#131313" : "#fff" }]}>
        <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={[styles.loadingText, { color: theme.dark ? "#ccc" : "#666" }]}>
            Loading user data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (machinesLoading) {
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
          Washing Machines (TanStack Query)
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Subscription Status Debug Info */}
      <View style={styles.debugInfo}>
        <Text style={[styles.debugText, { color: theme.dark ? "#ccc" : "#666" }]}>
          User: {user?.email} | Subscription: {hasSubscription ? '✅ YES' : '❌ NO'}
        </Text>
      </View>

      {machinesError ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#F44336" />
          <Text style={[styles.errorText, { color: theme.dark ? "#fff" : "#000" }]}>
            Failed to load washing machines
          </Text>
          <Pressable style={styles.retryButton} onPress={() => refetchMachines()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={machinesWithSlots}
          renderItem={renderMachine}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={machinesLoading}
              onRefresh={refetchMachines}
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
    fontSize: fontSizes.FONT18,
    fontWeight: 'bold',
  },
  debugInfo: {
    backgroundColor: '#f5f5f5',
    padding: scale(8),
    marginHorizontal: scale(20),
    borderRadius: scale(6),
    marginBottom: verticalScale(10),
  },
  debugText: {
    fontSize: fontSizes.FONT12,
    fontFamily: 'monospace',
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
    fontSize: fontSizes.FONT18,
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
  },
  slotInfo: {
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
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
    borderRadius: scale(6),
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: fontSizes.FONT12,
    fontWeight: '600',
  },
  noSlotsText: {
    fontSize: fontSizes.FONT14,
    fontStyle: 'italic',
  },
});