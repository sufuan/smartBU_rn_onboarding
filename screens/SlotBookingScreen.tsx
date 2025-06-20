import { useTheme } from "@/context/theme.context";
import useUser from "@/hooks/fetch/useUser";
import {
    fontSizes
} from "@/themes/app.constant";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { scale, verticalScale } from "react-native-size-matters";

interface BookingParams {
  machineId: string;
  slotTime: string;
  machineLocation?: string;
}

interface BookingResponse {
  success: boolean;
  message: string;
  booking?: {
    authCode: string;
    slotTime: string;
    machineId: string;
    machine: {
      id: string;
      machineId: string;
      location: string;
    };
    duration: number;
    status: string;
  };
}

export default function SlotBookingScreen() {
  const { theme } = useTheme();
  const { user, refetch: refetchUser, loader: userLoading } = useUser();
  const params = useLocalSearchParams<BookingParams>();

  const [loading, setLoading] = useState(false);
  const [machineDetails, setMachineDetails] = useState<MachineType | null>(null);
  const [fetchingMachine, setFetchingMachine] = useState(true);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  // Parse parameters
  const machineId = params.machineId;
  const slotTime = params.slotTime ? new Date(params.slotTime) : new Date();
  const machineLocation = params.machineLocation || "Unknown Location";

  // Fetch machine details
  const fetchMachineDetails = useCallback(async () => {
    try {
      setFetchingMachine(true);
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/api/machines`
      );

      if (response.data.success) {
        const machine = response.data.machines.find(
          (m: MachineType) => m.id === machineId
        );
        setMachineDetails(machine || null);
      }
    } catch (error) {
      console.error("Error fetching machine details:", error);
    } finally {
      setFetchingMachine(false);
    }
  }, [machineId]);

  // Check subscription when user data is available
  useEffect(() => {
    const checkSubscription = () => {
      // Don't check if we're already checking
      if (checkingSubscription) {
        return;
      }

      // If no user data, wait a bit more
      if (!user) {
        console.log('⏳ SlotBookingScreen: No user data yet, will check again...');
        return;
      }

      console.log('🔍 SlotBookingScreen: Starting subscription check');
      setCheckingSubscription(true);

      console.log('🔍 SlotBookingScreen: User data available, checking subscription:', {
        userId: user.id,
        email: user.email,
        stripeCustomerId: user.stripeCustomerId,
        hasSubscription: hasActiveSubscription()
      });

      // Small delay to ensure UI updates
      setTimeout(() => {
        if (!hasActiveSubscription()) {
          console.log('❌ SlotBookingScreen: No subscription, showing alert');
          Alert.alert(
            "Subscription Required",
            "You need an active subscription to book washing machine slots.",
            [
              {
                text: "Subscribe Now",
                onPress: () => router.replace("/(routes)/checkout"),
              },
              {
                text: "Go Back",
                onPress: () => router.back(),
                style: "cancel",
              },
            ]
          );
        } else {
          console.log('✅ SlotBookingScreen: Subscription confirmed');
        }

        setCheckingSubscription(false);
      }, 500);
    };

    checkSubscription();
  }, [user]); // Only depend on user data

  useEffect(() => {
    if (machineId) {
      fetchMachineDetails();
    }
  }, [fetchMachineDetails]);

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatTimeShort = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Check if user has subscription
  const hasActiveSubscription = () => {
    return user?.stripeCustomerId && user.stripeCustomerId.trim() !== '';
  };

  // Handle booking confirmation
  const handleConfirmBooking = async () => {
    // Refresh user data before booking
    await refetchUser();

    // Small delay to ensure user data is updated
    setTimeout(async () => {
      if (!hasActiveSubscription()) {
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

      await proceedWithBooking();
    }, 300);
  };

  const proceedWithBooking = async () => {

    if (!user?.id || !machineId) {
      Alert.alert("Error", "Missing required information for booking.");
      return;
    }

    setLoading(true);

    try {
      const bookingData = {
        userId: user.id,
        slotTime: slotTime.toISOString(),
        machineId: machineId,
      };

      console.log("📤 Booking request:", bookingData);

      const response = await axios.post<BookingResponse>(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/api/book-slot`,
        bookingData,
        {
          headers: {
            'Content-Type': 'application/json',
            // JWT token should be handled by axios interceptor or auth middleware
          },
        }
      );

      console.log("✅ Booking response:", response.data);

      if (response.data.success && response.data.booking) {
        const { authCode, machineId: bookedMachineId, slotTime: bookedSlotTime } = response.data.booking;
        
        Alert.alert(
          "Booking Confirmed! 🎉",
          `Your slot has been booked successfully!\n\nAuth Code: ${authCode}\nMachine: ${bookedMachineId}\nTime: ${formatTime(new Date(bookedSlotTime))}`,
          [
            {
              text: "Go to Control",
              onPress: () => {
                // Navigate to ControlScreen with slot data
                router.push({
                  pathname: "/(routes)/control" as any,
                  params: {
                    userId: user.id,
                    authCode,
                    machineId: bookedMachineId,
                    slotTime: bookedSlotTime,
                    duration: response.data.booking?.duration || 30,
                  },
                });
              },
            },
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert("Booking Failed", response.data.message || "Unable to book slot. Please try again.");
      }
    } catch (error: any) {
      console.error("❌ Booking error:", error);
      
      let errorMessage = "Unable to book slot. Please try again.";
      
      if (error.response?.status === 403) {
        errorMessage = "Subscription required to book slots.";
      } else if (error.response?.status === 409) {
        errorMessage = error.response.data?.message || "This slot is no longer available or you've reached your daily limit.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      Alert.alert("Booking Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

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

  if (fetchingMachine) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.dark ? "#131313" : "#fff" }]}>
        <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={[styles.loadingText, { color: theme.dark ? "#ccc" : "#666" }]}>
            Loading machine details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.dark ? "#131313" : "#fff" }]}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.dark ? "#fff" : "#000"} />
        </Pressable>
        <Text style={[styles.title, { color: theme.dark ? "#fff" : "#000" }]}>
          Book Slot
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Machine Details Card */}
        <View style={[styles.card, { backgroundColor: theme.dark ? "#1e1e1e" : "#fff" }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="hardware-chip" size={32} color="#4A90E2" />
            <Text style={[styles.cardTitle, { color: theme.dark ? "#fff" : "#000" }]}>
              Machine Details
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.dark ? "#ccc" : "#666" }]}>
              Machine ID:
            </Text>
            <Text style={[styles.detailValue, { color: theme.dark ? "#fff" : "#000" }]}>
              {machineDetails?.machineId || machineId}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.dark ? "#ccc" : "#666" }]}>
              Location:
            </Text>
            <Text style={[styles.detailValue, { color: theme.dark ? "#fff" : "#000" }]}>
              {machineDetails?.location || machineLocation}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.dark ? "#ccc" : "#666" }]}>
              Status:
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: machineDetails?.status === 'Available' ? "#4CAF50" : "#FF9800" }
            ]}>
              <Text style={styles.statusText}>
                {machineDetails?.status || "Available"}
              </Text>
            </View>
          </View>
        </View>

        {/* Slot Details Card */}
        <View style={[styles.card, { backgroundColor: theme.dark ? "#1e1e1e" : "#fff" }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={32} color="#4A90E2" />
            <Text style={[styles.cardTitle, { color: theme.dark ? "#fff" : "#000" }]}>
              Slot Details
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.dark ? "#ccc" : "#666" }]}>
              Date & Time:
            </Text>
            <Text style={[styles.detailValue, { color: theme.dark ? "#fff" : "#000" }]}>
              {formatTime(slotTime)}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.dark ? "#ccc" : "#666" }]}>
              Duration:
            </Text>
            <Text style={[styles.detailValue, { color: theme.dark ? "#fff" : "#000" }]}>
              30 minutes
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.dark ? "#ccc" : "#666" }]}>
              Time Slot:
            </Text>
            <Text style={[styles.detailValue, { color: theme.dark ? "#fff" : "#000" }]}>
              {formatTimeShort(slotTime)} - {formatTimeShort(new Date(slotTime.getTime() + 30 * 60 * 1000))}
            </Text>
          </View>
        </View>

        {/* Subscription Status */}
        {!hasActiveSubscription() && (
          <View style={[styles.warningCard, { backgroundColor: "#FFF3CD", borderColor: "#FFEAA7" }]}>
            <MaterialIcons name="warning" size={24} color="#856404" />
            <Text style={[styles.warningText, { color: "#856404" }]}>
              You need an active subscription to book slots. You'll be redirected to subscribe.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.confirmButton,
            { 
              backgroundColor: loading ? "#ccc" : "#4A90E2",
              opacity: loading ? 0.7 : 1 
            }
          ]}
          onPress={handleConfirmBooking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
          )}
          <Text style={styles.confirmButtonText}>
            {loading ? "Booking..." : "Confirm Booking"}
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
  content: {
    flex: 1,
    paddingHorizontal: scale(20),
  },
  card: {
    borderRadius: scale(12),
    padding: scale(20),
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  cardTitle: {
    fontSize: fontSizes.FONT18,
    fontWeight: 'bold',
    marginLeft: scale(12),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  detailLabel: {
    fontSize: fontSizes.FONT14,
    flex: 1,
  },
  detailValue: {
    fontSize: fontSizes.FONT14,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
  },
  statusText: {
    color: '#fff',
    fontSize: fontSizes.FONT12,
    fontWeight: '600',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    borderRadius: scale(8),
    borderWidth: 1,
    marginBottom: verticalScale(16),
  },
  warningText: {
    fontSize: fontSizes.FONT14,
    marginLeft: scale(12),
    flex: 1,
  },
  footer: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(20),
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(16),
    borderRadius: scale(12),
    shadowColor: '#4A90E2',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: fontSizes.FONT18,
    fontWeight: 'bold',
    marginLeft: scale(8),
  },
});
