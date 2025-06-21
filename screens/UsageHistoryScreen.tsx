import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "@/context/theme.context";
import { useSubscriptionStatus } from "@/hooks/queries/useUserQuery";
import { fontSizes } from "@/themes/app.constant";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { scale, verticalScale } from "react-native-size-matters";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/api";
import { SlotType } from "@/types";

export default function UsageHistoryScreen() {
  const { theme } = useTheme();
  const { user } = useSubscriptionStatus();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user's slot history
  const { 
    data: slotHistory = [], 
    isLoading, 
    refetch,
    error 
  } = useQuery({
    queryKey: ['user-slot-history', user?.id],
    queryFn: () => apiService.getUserSlotHistory(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return '#28a745';
      case 'Expired':
        return '#ffc107';
      case 'Cancelled':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'checkmark-circle';
      case 'Expired':
        return 'time-outline';
      case 'Cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const renderHistoryItem = ({ item: slot }: { item: SlotType }) => {
    const slotTime = new Date(slot.slotTime);
    const statusColor = getStatusColor(slot.status);
    const statusIcon = getStatusIcon(slot.status);

    return (
      <View style={[styles.historyCard, { backgroundColor: theme.dark ? "#2a2a2a" : "#f8f9fa" }]}>
        <View style={styles.historyHeader}>
          <View style={styles.machineInfo}>
            <Text style={[styles.machineId, { color: theme.dark ? "#fff" : "#000" }]}>
              {slot.machine?.machineId || slot.machineId}
            </Text>
            <Text style={[styles.location, { color: theme.dark ? "#ccc" : "#666" }]}>
              {slot.machine?.location || "Unknown Location"}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Ionicons name={statusIcon as any} size={16} color="#fff" />
            <Text style={styles.statusText}>{slot.status}</Text>
          </View>
        </View>

        <View style={styles.historyDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.dark ? "#ccc" : "#666"} />
            <Text style={[styles.detailText, { color: theme.dark ? "#ccc" : "#666" }]}>
              {formatDate(slotTime)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={theme.dark ? "#ccc" : "#666"} />
            <Text style={[styles.detailText, { color: theme.dark ? "#ccc" : "#666" }]}>
              {formatTime(slotTime)} - {formatTime(new Date(slotTime.getTime() + 60 * 60 * 1000))}
            </Text>
          </View>
          {slot.authCode && (
            <View style={styles.detailRow}>
              <Ionicons name="key-outline" size={16} color={theme.dark ? "#ccc" : "#666"} />
              <Text style={[styles.detailText, { color: theme.dark ? "#ccc" : "#666" }]}>
                Auth Code: {slot.authCode}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.dark ? "#131313" : "#fff" }]}>
        <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={64} color="#ccc" />
          <Text style={[styles.errorText, { color: theme.dark ? "#ccc" : "#666" }]}>
            Please log in to view your usage history
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
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.dark ? "#fff" : "#000"} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.dark ? "#fff" : "#000" }]}>
          Usage History
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={[styles.loadingText, { color: theme.dark ? "#ccc" : "#666" }]}>
            Loading your usage history...
          </Text>
        </View>
      ) : (
        <FlatList
          data={slotHistory}
          renderItem={renderHistoryItem}
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
              <Ionicons name="time-outline" size={64} color="#ccc" />
              <Text style={[styles.emptyText, { color: theme.dark ? "#ccc" : "#666" }]}>
                No usage history found
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.dark ? "#999" : "#999" }]}>
                Your completed and expired bookings will appear here
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
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: scale(8),
  },
  headerTitle: {
    fontSize: fontSizes.FONT18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: scale(40),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: verticalScale(12),
    fontSize: fontSizes.FONT14,
  },
  listContainer: {
    padding: scale(16),
  },
  historyCard: {
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: verticalScale(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  machineInfo: {
    flex: 1,
  },
  machineId: {
    fontSize: fontSizes.FONT16,
    fontWeight: 'bold',
  },
  location: {
    fontSize: fontSizes.FONT12,
    marginTop: verticalScale(2),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
  },
  statusText: {
    color: '#fff',
    fontSize: fontSizes.FONT10,
    fontWeight: '600',
    marginLeft: scale(4),
  },
  historyDetails: {
    gap: verticalScale(6),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: fontSizes.FONT12,
    marginLeft: scale(8),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(60),
  },
  emptyText: {
    fontSize: fontSizes.FONT16,
    fontWeight: '600',
    marginTop: verticalScale(16),
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSizes.FONT14,
    marginTop: verticalScale(8),
    textAlign: 'center',
    paddingHorizontal: scale(32),
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSizes.FONT16,
    marginTop: verticalScale(16),
    textAlign: 'center',
  },
});
