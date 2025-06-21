import { useTheme } from "@/context/theme.context";
import { useUserSlotsQuery } from "@/hooks/queries/useMachineQueries";
import { useSubscriptionStatus, useUserQuery } from "@/hooks/queries/useUserQuery";
import { apiService } from "@/lib/api";
import { fontSizes } from "@/themes/app.constant";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { scale, verticalScale } from "react-native-size-matters";

interface Slot {
  id: string;
  slotTime: Date | string;
  machineId: string;
  status: string;
  authCode: string; // Add auth code field
  machine?: {
    machineId?: string;
    name?: string;
    location?: string;
  };
}

export default function MyBookingsScreen() {
  const { theme } = useTheme();
  const { user } = useUserQuery();
  const { hasSubscription, isLoading: subscriptionLoading } = useSubscriptionStatus();

  // Fetch active slots
  const {
    userSlots: activeSlots = [],
    isLoading: isLoadingActive,
    refetch: refetchActive,
    error: activeError
  } = useUserSlotsQuery(user?.id || "");

  // Fetch slot history
  const {
    data: historySlots = [],
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
    error: historyError
  } = useQuery({
    queryKey: ['user-slot-history', user?.id],
    queryFn: () => apiService.getUserSlotHistory(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Combine all slots for processing
  const allSlots = [...activeSlots, ...historySlots];
  const isLoading = isLoadingActive || isLoadingHistory;
  const error = activeError || historyError;

  // Reduced debug logging - only log when data changes significantly
  useEffect(() => {
    if (user?.id && !isLoading) {
      console.log('🔍 MyBookings Summary:', {
        userId: user.id.slice(-8),
        totalSlots: allSlots.length,
        activeSlots: activeSlots.length,
        historySlots: historySlots.length,
        hasError: !!error
      });
    }
  }, [user?.id, allSlots.length, activeSlots.length, historySlots.length, isLoading, error]);

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  // Real-time countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Subscription check - redirect if no subscription
  useEffect(() => {
    if (!subscriptionLoading && !hasSubscription) {
      router.replace({
        pathname: "/(routes)/no-package",
        params: { serviceName: "My Bookings" }
      });
    }
  }, [hasSubscription, subscriptionLoading]);

  // Helper function to convert Date to string
  const getSlotTimeString = (slotTime: Date | string): string => {
    if (slotTime instanceof Date) {
      return slotTime.toISOString();
    }
    return slotTime;
  };

  const getSlotState = (slotTime: Date | string) => {
    const slotTimeString = getSlotTimeString(slotTime);
    const now = new Date();
    const slotStart = new Date(slotTimeString);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000); // 30 minutes later

    if (now < slotStart) {
      return 'waiting';
    } else if (now >= slotStart && now <= slotEnd) {
      return 'active';
    } else {
      return 'expired';
    }
  };



  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString: Date | string) => {
    const slotTimeString = getSlotTimeString(dateString);
    const date = new Date(slotTimeString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Enhanced time display with start and end times
  const formatTimeRange = (dateString: Date | string) => {
    const slotTimeString = getSlotTimeString(dateString);
    const startTime = new Date(slotTimeString);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 minutes later

    const startFormatted = startTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    const endFormatted = endTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // If same AM/PM period, show: "10:00 - 10:30 AM"
    // If different periods, show: "11:30 AM - 12:00 PM"
    const startPeriod = startTime.getHours() >= 12 ? 'PM' : 'AM';
    const endPeriod = endTime.getHours() >= 12 ? 'PM' : 'AM';

    if (startPeriod === endPeriod) {
      const startWithoutPeriod = startFormatted.replace(/ (AM|PM)/, '');
      return `${startWithoutPeriod} - ${endFormatted}`;
    } else {
      return `${startFormatted} - ${endFormatted}`;
    }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'waiting':
        return '#FF9800'; // Orange
      case 'active':
        return '#4CAF50'; // Green
      case 'expired':
        return '#F44336'; // Red
      default:
        return theme.dark ? '#666' : '#999';
    }
  };



  // Real-time status text that updates with currentTime
  const getRealTimeStatusText = (state: string, slotTime: Date | string) => {
    // Force re-calculation by using currentTime
    const now = currentTime;
    const slotTimeString = getSlotTimeString(slotTime);
    const slotStart = new Date(slotTimeString);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

    switch (state) {
      case 'waiting':
        const diffMs = slotStart.getTime() - now.getTime();
        const timeUntil = Math.max(0, Math.floor(diffMs / 1000));
        return `Starts in ${formatTimer(timeUntil)}`;
      case 'active':
        const endDiffMs = slotEnd.getTime() - now.getTime();
        const timeRemaining = Math.max(0, Math.floor(endDiffMs / 1000));
        return `Active - ${formatTimer(timeRemaining)} left`;
      case 'expired':
        return 'Expired';
      default:
        return 'Unknown';
    }
  };

  // Filter slots based on status
  const getActiveBookings = () => {
    return allSlots.filter((slot: Slot) => {
      const state = getSlotState(slot.slotTime);
      return state === 'waiting' || state === 'active';
    });
  };

  const getHistoryBookings = () => {
    return allSlots.filter((slot: Slot) => {
      const state = getSlotState(slot.slotTime);
      return state === 'expired';
    });
  };

  const getCurrentTabData = () => {
    return activeTab === 'active' ? getActiveBookings() : getHistoryBookings();
  };

  const handleSlotPress = (slot: Slot) => {
    const state = getSlotState(slot.slotTime);

    if (state === 'expired') {
      Alert.alert("Slot Expired", "This slot has already expired.");
      return;
    }

    // Navigate to ControlScreen with slot details
    router.push({
      pathname: "/(routes)/control",
      params: {
        userId: user?.id,
        machineId: slot.machineId,
        slotTime: getSlotTimeString(slot.slotTime),
        authCode: slot.authCode, // Pass the actual auth code from the slot
      },
    });
  };

  const renderSlotItem = ({ item }: { item: Slot }) => {
    const state = getSlotState(item.slotTime);
    const { date } = formatDateTime(item.slotTime);
    const timeRange = formatTimeRange(item.slotTime);
    const statusColor = getStatusColor(state);
    const statusText = getRealTimeStatusText(state, item.slotTime);

    return (
      <TouchableOpacity
        style={[
          styles.slotCard,
          {
            backgroundColor: theme.dark ? "#2a2a2a" : "#fff",
            borderLeftColor: statusColor,
          }
        ]}
        onPress={() => handleSlotPress(item)}
        disabled={state === 'expired'}
      >
        <View style={styles.slotHeader}>
          <View style={styles.slotInfo}>
            <Text style={[styles.machineName, { color: theme.dark ? "#fff" : "#000" }]}>
              {item.machine?.machineId || item.machine?.name || `Machine ${item.machineId?.slice(-8)}`}
            </Text>
            <Text style={[styles.machineLocation, { color: theme.dark ? "#ccc" : "#666" }]}>
              {item.machine?.location || "Laundry Room"}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{state.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.slotDetails}>
          <View style={styles.timeInfo}>
            <Ionicons name="calendar-outline" size={16} color={theme.dark ? "#ccc" : "#666"} />
            <Text style={[styles.dateText, { color: theme.dark ? "#ccc" : "#666" }]}>
              {date}
            </Text>
          </View>
          <View style={styles.timeInfo}>
            <Ionicons name="time-outline" size={16} color={theme.dark ? "#ccc" : "#666"} />
            <Text style={[styles.timeText, { color: theme.dark ? "#ccc" : "#666" }]}>
              {timeRange}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusDescription, { color: statusColor }]}>
            {statusText}
          </Text>
          {state !== 'expired' && (
            <Feather name="chevron-right" size={20} color={theme.dark ? "#666" : "#ccc"} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCustomTabHeader = () => (
    <View>
      <View style={[
        styles.customTabHeader,
        {
          backgroundColor: theme.dark ? "#2a2a2a" : "#fff",
          borderBottomColor: theme.dark ? "#444" : "#e0e0e0"
        }
      ]}>
        <TouchableOpacity
          style={[
            styles.customTab,
            activeTab === 'active' && styles.activeCustomTab,
            { backgroundColor: activeTab === 'active' ? "#4A90E2" : "transparent" }
          ]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[
            styles.customTabText,
            { color: activeTab === 'active' ? "#fff" : (theme.dark ? "#ccc" : "#666") }
          ]}>
            Active Bookings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.customTab,
            activeTab === 'history' && styles.activeCustomTab,
            { backgroundColor: activeTab === 'history' ? "#4A90E2" : "transparent" }
          ]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[
            styles.customTabText,
            { color: activeTab === 'history' ? "#fff" : (theme.dark ? "#ccc" : "#666") }
          ]}>
            Wash History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Simplified Debug Info */}
      <View style={[styles.debugInfo, { backgroundColor: theme.dark ? "#1a1a1a" : "#f0f0f0" }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.debugText, { color: theme.dark ? "#ccc" : "#666" }]}>
            Slots: {allSlots.length} total ({activeSlots.length} active, {historySlots.length} history) | {isLoading ? 'Loading...' : 'Ready'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={async () => {
            console.log('🔄 Refreshing bookings data');
            await refetchActive();
            await refetchHistory();
          }}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => {
    const isActiveTab = activeTab === 'active';

    // Show error state if there's an error
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={scale(80)}
            color="#F44336"
          />
          <Text style={[styles.emptyTitle, { color: theme.dark ? "#fff" : "#000" }]}>
            Error Loading Bookings
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.dark ? "#ccc" : "#666" }]}>
            {error?.message || "Failed to load your bookings. Please try again."}
          </Text>
          <TouchableOpacity
            style={[styles.bookNowButton, { backgroundColor: "#F44336" }]}
            onPress={async () => {
              await refetchActive();
              await refetchHistory();
            }}
          >
            <Text style={styles.bookNowText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name={isActiveTab ? "calendar-outline" : "time-outline"}
          size={scale(80)}
          color={theme.dark ? "#444" : "#ddd"}
        />
        <Text style={[styles.emptyTitle, { color: theme.dark ? "#fff" : "#000" }]}>
          {isActiveTab ? "No Active Bookings" : "No Wash History"}
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.dark ? "#ccc" : "#666" }]}>
          {isActiveTab
            ? "Your active washing machine slots will appear here"
            : "Your completed washing sessions will appear here"
          }
        </Text>
        {isActiveTab && (
          <TouchableOpacity
            style={[styles.bookNowButton, { backgroundColor: "#4A90E2" }]}
            onPress={() => router.push("/(routes)/laundry")}
          >
            <Text style={styles.bookNowText}>Book a Slot</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.dark ? "#131313" : "#f8f9fa" }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.dark ? "#fff" : "#000" }]}>
            Loading your bookings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.dark ? "#131313" : "#f8f9fa" }]}>
      {renderCustomTabHeader()}
      <FlatList
        data={getCurrentTabData()}
        renderItem={renderSlotItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={async () => {
              setIsRefreshing(true);
              await refetchActive();
              await refetchHistory();
              setIsRefreshing(false);
            }}
            tintColor={theme.dark ? "#fff" : "#000"}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: fontSizes.FONT16,
  },
  listContainer: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(100), // Extra padding for tab bar
  },
  slotCard: {
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: verticalScale(12),
    borderLeftWidth: scale(4),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  slotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: verticalScale(12),
  },
  slotInfo: {
    flex: 1,
  },
  machineName: {
    fontSize: fontSizes.FONT18,
    fontWeight: "bold",
    marginBottom: verticalScale(4),
  },
  machineLocation: {
    fontSize: fontSizes.FONT14,
  },
  statusBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
  },
  statusText: {
    color: "#fff",
    fontSize: fontSizes.FONT12,
    fontWeight: "bold",
  },
  slotDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
  },
  timeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
  },
  dateText: {
    fontSize: fontSizes.FONT14,
  },
  timeText: {
    fontSize: fontSizes.FONT14,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusDescription: {
    fontSize: fontSizes.FONT14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: verticalScale(60),
  },
  emptyTitle: {
    fontSize: fontSizes.FONT24,
    fontWeight: "bold",
    marginTop: verticalScale(20),
    marginBottom: verticalScale(8),
  },
  emptySubtitle: {
    fontSize: fontSizes.FONT16,
    textAlign: "center",
    marginBottom: verticalScale(30),
    paddingHorizontal: scale(40),
  },
  bookNowButton: {
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
  },
  bookNowText: {
    color: "#fff",
    fontSize: fontSizes.FONT16,
    fontWeight: "600",
  },
  // Custom tab styles
  customTabHeader: {
    flexDirection: "row",
    paddingHorizontal: scale(20),
    paddingTop: 0,
    paddingBottom: verticalScale(4),
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  customTab: {
    flex: 1,
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
    marginHorizontal: scale(4),
    alignItems: "center",
  },
  activeCustomTab: {
    backgroundColor: "#4A90E2",
  },
  customTabText: {
    fontSize: fontSizes.FONT14,
    fontWeight: "600",
  },
  // Debug styles
  debugInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(4),
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  debugText: {
    fontSize: fontSizes.FONT12,
    flex: 1,
  },
  refreshButton: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(4),
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: fontSizes.FONT12,
    fontWeight: "600",
  },
});
