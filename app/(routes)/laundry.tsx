import { useTheme } from "@/context/theme.context";
import { useBookSlotMutation } from "@/hooks/mutations/useSlotMutations";
import { useUserSlotsQuery } from "@/hooks/queries/useMachineQueries";
import { useSubscriptionStatus } from "@/hooks/queries/useUserQuery";
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
  const { user, hasSubscription, isLoading: userLoading } = useSubscriptionStatus();
  const bookSlotMutation = useBookSlotMutation();

  // Fetch user's booked slots
  const { userSlots = [], isLoading: userSlotsLoading } = useUserSlotsQuery(user?.id || '');

  const [machines, setMachines] = useState<MachineWithSlots[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [bookingSlots, setBookingSlots] = useState<Set<string>>(new Set()); // Track individual slot booking states

  // Check if user has active subscription (using TanStack Query)
  const hasActiveSubscription = () => {
    return hasSubscription;
  };

  // Check subscription when component mounts (simplified with TanStack Query)
  useEffect(() => {
    if (!userLoading && !hasSubscription) {
      console.log('❌ LaundryScreen: No subscription, redirecting to no-package');
      router.replace({
        pathname: "/(routes)/no-package" as any,
        params: { serviceName: "Your Laundry" }
      });
    } else if (!userLoading && hasSubscription) {
      console.log('✅ LaundryScreen: Subscription confirmed, staying on page');
      setCheckingSubscription(false);
    }
  }, [userLoading, hasSubscription]); // Depend on TanStack Query states

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

  // Handle slot booking (using TanStack Query mutation with individual slot tracking)
  const handleBookSlot = useCallback(async (machineId: string, slotTime: Date, machineLocation?: string) => {
    console.log('🎯 LaundryScreen: Slot booking initiated for machine:', machineId);
    console.log('🎯 LaundryScreen: Slot time:', slotTime.toISOString());
    console.log('🎯 LaundryScreen: User data:', { id: user?.id, email: user?.email });
    console.log('🎯 LaundryScreen: Subscription status:', hasSubscription);
    console.log('🎯 LaundryScreen: Mutation status:', {
      isPending: bookSlotMutation.isPending,
      isError: bookSlotMutation.isError,
      error: bookSlotMutation.error
    });

    // Create unique slot identifier
    const slotId = `${machineId}-${slotTime.getTime()}`;

    // Check if this specific slot is already being booked
    if (bookingSlots.has(slotId)) {
      console.log('⏳ LaundryScreen: Slot already being booked:', slotId);
      return;
    }

    // Check if user exists
    if (!user) {
      console.error('❌ LaundryScreen: User not found');
      Alert.alert('Error', 'User not found. Please try again.');
      return;
    }

    // Check subscription using TanStack Query
    console.log('🔍 LaundryScreen: Checking subscription for slot booking:', {
      userId: user.id,
      email: user.email,
      hasSubscription: hasSubscription,
      userLoading: userLoading
    });

    if (!hasSubscription) {
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

    console.log('✅ LaundryScreen: Subscription confirmed, booking slot with TanStack Query');

    // Add slot to booking state
    setBookingSlots(prev => new Set(prev).add(slotId));

    // Use TanStack Query mutation for slot booking
    try {
      console.log('🚀 LaundryScreen: Calling mutation with data:', {
        userId: user.id,
        machineId,
        slotTime: slotTime.toISOString(),
      });

      bookSlotMutation.mutate({
        userId: user.id,
        machineId,
        slotTime: slotTime.toISOString(),
      }, {
        onSuccess: (data) => {
          console.log('✅ LaundryScreen: Slot booking successful:', data);
          // Remove slot from booking state
          setBookingSlots(prev => {
            const newSet = new Set(prev);
            newSet.delete(slotId);
            return newSet;
          });

          // Show success message and redirect to tabs
          Alert.alert(
            "Booking Successful!",
            "Your slot has been booked successfully. Tap the 'My Bookings' tab (calendar icon) to view and manage your bookings.",
            [
              {
                text: "Go to Tabs",
                onPress: () => {
                  // Try to navigate directly to My Bookings tab
                  try {
                    router.push("/mybookings");
                  } catch (error) {
                    // Fallback to tabs root
                    router.replace("/(tabs)");
                  }
                },
              },
              {
                text: "Stay Here",
                style: "cancel",
              },
            ]
          );
        },
        onError: (error) => {
          console.error('❌ LaundryScreen: Slot booking failed:', error);
          // Remove slot from booking state
          setBookingSlots(prev => {
            const newSet = new Set(prev);
            newSet.delete(slotId);
            return newSet;
          });
        }
      });
    } catch (error) {
      console.error('❌ LaundryScreen: Error calling mutation:', error);
      setBookingSlots(prev => {
        const newSet = new Set(prev);
        newSet.delete(slotId);
        return newSet;
      });
    }
  }, [user, hasSubscription, userLoading, bookSlotMutation, bookingSlots]);

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Render slot item with individual loading state and booked status
  const renderSlot = ({ item: slot, machineLocation }: { item: AvailableSlot, machineLocation?: string }) => {
    const slotId = `${slot.machineId}-${slot.slotTime.getTime()}`;
    const isBookingThisSlot = bookingSlots.has(slotId);

    // Check if this slot is already booked by the current user
    const isSlotBookedByUser = userSlots.some(userSlot =>
      userSlot.machineId === slot.machineId &&
      new Date(userSlot.slotTime).getTime() === slot.slotTime.getTime()
    );

    const isDisabled = isBookingThisSlot || isSlotBookedByUser;

    return (
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
              backgroundColor: isSlotBookedByUser ? "#28a745" : isBookingThisSlot ? "#ccc" : "#4A90E2",
              opacity: isDisabled ? 0.7 : 1
            }
          ]}
          onPress={() => !isDisabled && handleBookSlot(slot.machineId, slot.slotTime, machineLocation)}
          disabled={isDisabled}
        >
          <Text style={styles.bookButtonText}>
            {isSlotBookedByUser ? "Booked" : isBookingThisSlot ? "Booking..." : "Book Slot"}
          </Text>
        </Pressable>
      </View>
    );
  };

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

  if (userLoading || checkingSubscription) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.dark ? "#131313" : "#fff" }]}>
        <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={[styles.loadingText, { color: theme.dark ? "#ccc" : "#666" }]}>
            {userLoading ? "Loading user data..." : "Checking subscription..."}
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
          ListHeaderComponent={() => (
            <View style={styles.myBookingsSection}>
              {/* Debug Information */}
              <View style={[styles.debugContainer, { backgroundColor: theme.dark ? "#2a2a2a" : "#f0f0f0" }]}>
                <Text style={[styles.debugTitle, { color: theme.dark ? "#fff" : "#000" }]}>🔧 Debug Info</Text>
                <Text style={[styles.debugText, { color: theme.dark ? "#ccc" : "#666" }]}>
                  User ID: {user?.id || 'Not found'}
                </Text>
                <Text style={[styles.debugText, { color: theme.dark ? "#ccc" : "#666" }]}>
                  Has Subscription: {hasSubscription ? 'YES' : 'NO'}
                </Text>
                <Text style={[styles.debugText, { color: theme.dark ? "#ccc" : "#666" }]}>
                  User Loading: {userLoading ? 'YES' : 'NO'}
                </Text>
                <Text style={[styles.debugText, { color: theme.dark ? "#ccc" : "#666" }]}>
                  User Slots Loading: {userSlotsLoading ? 'YES' : 'NO'}
                </Text>
                <Text style={[styles.debugText, { color: theme.dark ? "#ccc" : "#666" }]}>
                  User Slots Count: {userSlots.length}
                </Text>
                <Text style={[styles.debugText, { color: theme.dark ? "#ccc" : "#666" }]}>
                  Mutation Pending: {bookSlotMutation.isPending ? 'YES' : 'NO'}
                </Text>
              </View>

              <View style={styles.myBookingsHeader}>
                <Text style={[styles.myBookingsTitle, { color: theme.dark ? "#fff" : "#000" }]}>
                  My Bookings
                </Text>
                {userSlots.length > 0 && (
                  <Pressable
                    style={styles.viewAllButton}
                    onPress={() => {
                      try {
                        router.push("/mybookings");
                      } catch (error) {
                        router.replace("/(tabs)");
                      }
                    }}
                  >
                    <Text style={styles.viewAllText}>Go to My Bookings</Text>
                    <Ionicons name="chevron-forward" size={16} color="#4A90E2" />
                  </Pressable>
                )}
              </View>
              {userSlotsLoading ? (
                <View style={styles.myBookingsLoading}>
                  <ActivityIndicator size="small" color="#4A90E2" />
                  <Text style={[styles.loadingText, { color: theme.dark ? "#ccc" : "#666" }]}>
                    Loading your bookings...
                  </Text>
                </View>
              ) : userSlots.length > 0 ? (
                <FlatList
                  data={userSlots}
                  renderItem={({ item: slot }) => (
                    <Pressable
                      style={[styles.myBookingCard, { backgroundColor: theme.dark ? "#2a2a2a" : "#f8f9fa" }]}
                      onPress={() => {
                        console.log('🎯 Navigating to ControlScreen with slot:', slot);
                        router.push({
                          pathname: "/(routes)/control" as any,
                          params: {
                            userId: user?.id || '',
                            authCode: slot.authCode || '',
                            machineId: slot.machine?.machineId || slot.machineId || '',
                            slotTime: slot.slotTime.toString(),
                          },
                        });
                      }}
                    >
                      <View style={styles.myBookingInfo}>
                        <Text style={[styles.myBookingMachine, { color: theme.dark ? "#fff" : "#000" }]}>
                          {slot.machine?.machineId || slot.machineId}
                        </Text>
                        <Text style={[styles.myBookingTime, { color: theme.dark ? "#ccc" : "#666" }]}>
                          {formatTime(new Date(slot.slotTime))}
                        </Text>
                        <Text style={[styles.myBookingDate, { color: theme.dark ? "#ccc" : "#666" }]}>
                          {new Date(slot.slotTime).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={[styles.myBookingStatus, { backgroundColor: "#28a745" }]}>
                        <Text style={styles.myBookingStatusText}>Booked</Text>
                      </View>
                      <View style={styles.tapIndicator}>
                        <Ionicons name="chevron-forward" size={16} color={theme.dark ? "#ccc" : "#666"} />
                      </View>
                    </Pressable>
                  )}
                  keyExtractor={(slot) => slot.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.myBookingsContainer}
                />
              ) : (
                <Text style={[styles.noBookingsText, { color: theme.dark ? "#ccc" : "#666" }]}>
                  No bookings yet. Book your first slot below!
                </Text>
              )}
            </View>
          )}
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
  // My Bookings Section Styles
  myBookingsSection: {
    marginBottom: verticalScale(20),
  },
  myBookingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  myBookingsTitle: {
    fontSize: fontSizes.FONT18,
    fontWeight: 'bold',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
  },
  viewAllText: {
    fontSize: fontSizes.FONT14,
    color: '#4A90E2',
    fontWeight: '600',
    marginRight: scale(4),
  },
  myBookingsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(20),
  },
  myBookingsContainer: {
    paddingRight: scale(20),
  },
  myBookingCard: {
    borderRadius: scale(8),
    padding: scale(12),
    marginRight: scale(12),
    minWidth: scale(140),
    alignItems: 'center',
  },
  myBookingInfo: {
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  myBookingMachine: {
    fontSize: fontSizes.FONT14,
    fontWeight: 'bold',
    marginBottom: verticalScale(2),
  },
  myBookingTime: {
    fontSize: fontSizes.FONT12,
    marginBottom: verticalScale(2),
  },
  myBookingDate: {
    fontSize: fontSizes.FONT10,
  },
  myBookingStatus: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
  },
  myBookingStatusText: {
    color: '#fff',
    fontSize: fontSizes.FONT10,
    fontWeight: '600',
  },
  tapIndicator: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
  },
  noBookingsText: {
    fontSize: fontSizes.FONT14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: verticalScale(20),
  },
  // Debug styles
  debugContainer: {
    borderRadius: scale(8),
    padding: scale(12),
    marginBottom: verticalScale(16),
    borderWidth: 1,
    borderColor: "#ddd",
  },
  debugTitle: {
    fontSize: fontSizes.FONT14,
    fontWeight: "bold",
    marginBottom: verticalScale(8),
  },
  debugText: {
    fontSize: fontSizes.FONT12,
    marginBottom: verticalScale(4),
  },
});
