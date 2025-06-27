import { useTheme } from "@/context/theme.context";
import { useSubscriptionStatus } from "@/hooks/queries/useUserQuery";
import api from "@/lib/api";
import {
  fontSizes,
} from "@/themes/app.constant";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { scale, verticalScale } from "react-native-size-matters";
import { useCycleStatus } from "../hooks/useCycleStatus";

// Navigation params interface removed - using direct param access

export default function ControlScreen() {
  const { theme } = useTheme();
  const { user } = useSubscriptionStatus();
  const params = useLocalSearchParams();

  // Get navigation params with proper typing
  const userId = (params.userId as string) || user?.id;
  const machineId = params.machineId as string; // This is the database ObjectId
  const slotTime = params.slotTime ? new Date(params.slotTime as string) : new Date();
  const initialAuthCode = (params.authCode as string) || "";

  // State to store the actual machine data
  const [machineData, setMachineData] = useState<any>(null);

  // State to store the slot ID (we'll get this from finding the slot)
  const [slotId, setSlotId] = useState<string | null>(null);

  // Use cycle status hook to sync with backend
  const {
    cycleStarted: backendCycleStarted,
    cycleCompleted: backendCycleCompleted,
    cycleStartTime: backendCycleStartTime,
    timeRemaining: backendTimeRemaining,
    machineStatus: backendMachineStatus,
    isLoading: cycleStatusLoading,
    error: cycleStatusError,
    refetch: refetchCycleStatus,
  } = useCycleStatus(slotId);

  // State variables
  const [authCode, setAuthCode] = useState(initialAuthCode);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [cycleStarted, setCycleStarted] = useState(false);
  const [cycleStartTime, setCycleStartTime] = useState<Date | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedMachineId, setScannedMachineId] = useState<string | null>(null);
  const [countdownToSlot, setCountdownToSlot] = useState<number | null>(null);
  const [activeTimeRemaining, setActiveTimeRemaining] = useState<number | null>(null);

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();

  // Fetch machine data and find slot ID
  useEffect(() => {
    const fetchMachineDataAndSlot = async () => {
      if (!machineId || !userId) return;

      try {
        // Fetch machine data using authenticated API
        const machineResponse = await api.get(`/api/machines/${machineId}`);

        if (machineResponse.data.success) {
          setMachineData(machineResponse.data.machine);
        }

        // Find the slot ID by matching user, machine, slot time, and auth code
        const slotsResponse = await api.get(`/api/user-slots?userId=${userId}`);

        if (slotsResponse.data.success) {
          const matchingSlot = slotsResponse.data.slots.find((slot: any) =>
            slot.machineId === machineId &&
            slot.authCode === initialAuthCode &&
            new Date(slot.slotTime).getTime() === slotTime.getTime()
          );

          if (matchingSlot) {
            setSlotId(matchingSlot.id);
          }
        }
      } catch (error: any) {
        console.error('❌ Error fetching machine data or slot:', error);
        console.error('❌ Failed machine ID:', machineId);
        console.error('❌ Error details:', error.response?.data || error.message);
      }
    };

    fetchMachineDataAndSlot();
  }, [machineId, userId, initialAuthCode, slotTime]);

  // Sync frontend state with backend cycle status
  useEffect(() => {
    if (backendCycleStarted !== undefined) {
      console.log('🔄 Syncing frontend state with backend:', {
        backendCycleStarted,
        backendCycleCompleted,
        backendCycleStartTime,
        backendTimeRemaining,
        slotId,
        currentLocalState: { cycleStarted, cycleStartTime }
      });

      // Update local state based on backend state
      setCycleStarted(backendCycleStarted && !backendCycleCompleted);

      if (backendCycleStartTime) {
        setCycleStartTime(backendCycleStartTime);
      }

      // If backend shows cycle completed, reset local state
      if (backendCycleCompleted) {
        setCycleStarted(false);
        setCycleStartTime(null);
        setTimeRemaining(null);
      }

      // If cycle is running and we have backend time remaining, use it
      if (backendCycleStarted && !backendCycleCompleted && backendTimeRemaining !== null) {
        setTimeRemaining(backendTimeRemaining);
      }
    }
  }, [backendCycleStarted, backendCycleCompleted, backendCycleStartTime, backendTimeRemaining]);

  // Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrLock = useRef(false);

  const formatTime = (date: Date) =>
    date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }) + ', ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const formatTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Removed duplicate isSlotActive() - using isSlotTimeValid() instead

  // Check if current time is before slot time for countdown
  const getTimeUntilSlot = () => {
    const now = new Date();
    const slotStart = new Date(slotTime);
    const diffMs = slotStart.getTime() - now.getTime();
    const secondsUntil = Math.max(0, Math.floor(diffMs / 1000));

    // Countdown logging removed for cleaner console

    return secondsUntil;
  };

  // Get slot state: 'waiting', 'active', or 'expired'
  const getSlotState = () => {
    const now = new Date();
    const slotStart = new Date(slotTime);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

    if (now < slotStart) {
      return 'waiting'; // Before slot start time
    } else if (now >= slotStart && now <= slotEnd) {
      return 'active'; // Within 30-minute active window
    } else {
      return 'expired'; // After 30-minute window
    }
  };

  // Check if slot is currently active (within 30-minute window)
  const isSlotTimeValid = () => {
    const state = getSlotState();
    const isValid = state === 'active';

    // Only log slot validity changes, not every check
    // console.log('🔍 Slot Validity:', { slotState: state, isValid });

    return isValid;
  };

  // Removed unused helper functions - using getSlotState() directly

  // Initialize countdown to slot time and set up real-time updates
  useEffect(() => {


    // Function to update countdown and slot state based on current time
    const updateCountdown = () => {
      const timeUntilSlot = getTimeUntilSlot();
      const currentSlotState = getSlotState();

      // Calculate active time remaining
      const now = new Date();
      const slotStart = new Date(slotTime);
      const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
      const activeTimeLeft = Math.max(0, Math.floor((slotEnd.getTime() - now.getTime()) / 1000));

      // State change logging removed for cleaner console

      // Update state based on current slot state
      if (currentSlotState === 'waiting') {
        setCountdownToSlot(timeUntilSlot);
        setActiveTimeRemaining(null);
      } else if (currentSlotState === 'active') {
        setCountdownToSlot(null);
        setActiveTimeRemaining(activeTimeLeft);
      } else {
        // Expired state
        setCountdownToSlot(null);
        setActiveTimeRemaining(null);
      }
    };

    // Initial countdown calculation
    updateCountdown();

    // Set up real-time updates every second
    const realTimeInterval = setInterval(updateCountdown, 1000);
    // console.log('⏰ Real-time countdown updates started');

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (realTimeInterval) clearInterval(realTimeInterval);
      // console.log('⏰ All intervals cleared');
    };
  }, [slotTime]);

  // Real-time cycle timer that calculates remaining time based on actual start time and slot expiration
  useEffect(() => {
    if (cycleStarted && cycleStartTime) {
      const updateCycleTimer = () => {
        const now = new Date();
        const slotEndTime = new Date(slotTime.getTime() + 30 * 60 * 1000);
        const elapsedMs = now.getTime() - cycleStartTime.getTime();
        const elapsedSeconds = Math.floor(elapsedMs / 1000);

        // Calculate remaining time considering both cycle duration and slot expiration
        const timeUntilSlotExpires = Math.max(0, Math.floor((slotEndTime.getTime() - now.getTime()) / 1000));
        const maxCycleSeconds = 30 * 60; // 30 minutes
        const cycleTimeRemaining = Math.max(0, maxCycleSeconds - elapsedSeconds);

        // Use the minimum of cycle time remaining and time until slot expires
        const remainingSeconds = Math.min(cycleTimeRemaining, timeUntilSlotExpires);

        setTimeRemaining(remainingSeconds);

        // Check if cycle is complete
        if (remainingSeconds <= 0) {
          setCycleStarted(false);
          setCycleStartTime(null);
          setTimeRemaining(null);
          Alert.alert("Cycle Finished", "Your washing cycle is complete!");
          router.push("/(tabs)/mybookings" as any);
        }
      };

      // Update immediately
      updateCycleTimer();

      // Set up interval to update every second
      timerRef.current = setInterval(updateCycleTimer, 1000);
    } else {
      // Clear timer if cycle not started
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTimeRemaining(null);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [cycleStarted, cycleStartTime]);

  const handleStartCycle = async () => {
    if (!userId || !machineId || !authCode) {
      Alert.alert("Error", "Missing required information");
      return;
    }

    if (!isSlotTimeValid()) {
      Alert.alert("Error", "Slot time not active");
      return;
    }

    // Check if cycle has already been started (local or backend state)
    if (cycleStarted || backendCycleStarted) {
      Alert.alert(
        "Cycle Already Started",
        "The washing cycle is already running. No need to start again.",
        [{ text: "OK" }]
      );
      return;
    }

    // Check if machine has been scanned
    if (!scannedMachineId) {
      Alert.alert(
        "Machine Not Scanned",
        "Please scan the machine QR code first before starting the cycle.",
        [{ text: "OK" }]
      );
      return;
    }

    console.log('🚀 Starting cycle with state:', {
      cycleStarted,
      scannedMachineId,
      authCode,
      userId,
      machineId
    });

    setIsLoading(true);

    try {
      const response = await api.post('/api/control', {
        userId,
        slotTime: slotTime.toISOString(),
        machineId,
        authCode,
      });

      console.log("✅ Control API response:", response.data);

      if (response.data.status === "success") {
        Alert.alert("Success", "Cycle started");
        setCycleStarted(true);
        setCycleStartTime(new Date()); // Set the actual start time for real-time countdown

        // Refetch cycle status from backend to sync state
        if (refetchCycleStatus) {
          setTimeout(() => refetchCycleStatus(), 1000); // Small delay to ensure backend is updated
        }
      } else {
        Alert.alert("Error", "Failed to start cycle");
      }
    } catch (error: any) {
      console.error("❌ Control API error:", error);

      if (error.response?.status === 401) {
        Alert.alert("Error", "Invalid auth code");
      } else if (error.response?.status === 400) {
        Alert.alert("Error", "Slot time expired or not started");
      } else if (error.response?.status === 403) {
        Alert.alert("Error", "Subscription required", [
          {
            text: "Subscribe",
            onPress: () => router.push("/(routes)/checkout" as any),
          },
          { text: "Cancel", style: "cancel" },
        ]);
      } else if (error.response?.status === 409) {
        // Cycle already started - sync with backend state
        const responseData = error.response.data;
        Alert.alert(
          "Cycle Already Running",
          responseData.message || "This washing cycle is already running",
          [{ text: "OK" }]
        );

        // Update local state to match backend
        setCycleStarted(true);
        if (responseData.cycleStartTime) {
          setCycleStartTime(new Date(responseData.cycleStartTime));
        }
        if (responseData.timeRemaining !== undefined) {
          setTimeRemaining(responseData.timeRemaining);
        }

        // Refetch cycle status to ensure full sync
        if (refetchCycleStatus) {
          setTimeout(() => refetchCycleStatus(), 500);
        }
      } else {
        Alert.alert("Error", "Failed to start cycle");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // QR Code scanning functions
  const handleScanQRCode = async () => {
    if (!isSlotTimeValid()) {
      Alert.alert("Error", "Slot time not active");
      return;
    }

    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Error", "Camera permission required");
        return;
      }
    }

    setShowScanner(true);
  };

  const handleQRCodeScanned = ({ data }: { data: string }) => {
    if (data && !qrLock.current) {
      qrLock.current = true;

      console.log('🔍 QR Code scanned:', data);
      console.log('🏭 Machine data:', machineData);
      console.log('🔍 Current state:', { scannedMachineId, cycleStarted });

      // Check if machine has already been scanned and verified
      if (scannedMachineId) {
        Alert.alert(
          "Already Scanned",
          `Machine ${machineData?.machineId || scannedMachineId} has already been verified. ${cycleStarted ? 'Cycle is already running.' : 'You can start the cycle now.'}`,
          [
            {
              text: "OK",
              onPress: () => {
                qrLock.current = false;
                setShowScanner(false);
              },
            },
          ]
        );
        return;
      }

      // Check if cycle has already been started (local or backend state)
      if (cycleStarted || backendCycleStarted) {
        Alert.alert(
          "Cycle Already Started",
          "The washing cycle is already running. No need to scan again.",
          [
            {
              text: "OK",
              onPress: () => {
                qrLock.current = false;
                setShowScanner(false);
              },
            },
          ]
        );
        return;
      }

      // Check if QR code matches expected format: "machineId:<machineId>"
      if (data.startsWith("machineId:")) {
        const scannedMachineIdValue = data.replace("machineId:", "");

        // Validate it matches the slot's machine machineId (not the database ID)
        if (!machineData) {
          Alert.alert("Error", "Machine data not loaded. Please try again.", [
            {
              text: "OK",
              onPress: () => {
                qrLock.current = false;
              },
            },
          ]);
          return;
        }

        if (scannedMachineIdValue !== machineData.machineId) {
          Alert.alert("Error", `Wrong machine scanned.`, [
            {
              text: "OK",
              onPress: () => {
                qrLock.current = false;
              },
            },
          ]);
          return;
        }

        // Machine matches - close scanner and update state
        setScannedMachineId(scannedMachineIdValue);
        setShowScanner(false);
        qrLock.current = false;

        Alert.alert("Success", `Machine ${scannedMachineIdValue} verified! You can now start the cycle.`);
      } else {
        Alert.alert("Error", "Invalid QR code format", [
          {
            text: "OK",
            onPress: () => {
              qrLock.current = false;
            },
          },
        ]);
      }
    }
  };

  const handleGoBack = () => {
    console.log('🔙 Back button pressed');
    try {
      router.back();
    } catch (error) {
      console.error('❌ Error navigating back:', error);
      // Fallback navigation
      router.push("/(routes)/laundry");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.dark ? "#131313" : "#fff" }]}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <Pressable onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.dark ? "#fff" : "#000"} />
        </Pressable>
        <Text style={[styles.title, { color: theme.dark ? "#fff" : "#000" }]}>Machine Control</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* My Booking Section */}
        <View style={[styles.bookingCard, { backgroundColor: theme.dark ? "#2a2a2a" : "#f5f5f5" }]}>
          <Text style={[styles.cardTitle, { color: theme.dark ? "#fff" : "#000" }]}>My Booking</Text>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.dark ? "#ccc" : "#666" }]}>Slot Time:</Text>
            <Text style={[styles.detailValue, { color: theme.dark ? "#fff" : "#000" }]}>{formatTime(slotTime)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.dark ? "#ccc" : "#666" }]}>Machine ID:</Text>
            <Text style={[styles.detailValue, { color: theme.dark ? "#fff" : "#000" }]}>{machineId}</Text>
          </View>

          {/* Countdown, Active, or Expired Status */}
          {(() => {
            const slotState = getSlotState();

            if (slotState === 'waiting') {
              // Show countdown when waiting for slot to start
              return (
                <View style={styles.countdownContainer}>
                  <Text style={[styles.countdownLabel, { color: theme.dark ? "#ccc" : "#666" }]}>
                    Slot starts in
                  </Text>
                  <Text style={[styles.countdownText, { color: theme.dark ? "#FF9800" : "#F57C00" }]}>
                    {formatTimer(countdownToSlot || 0)}
                  </Text>
                  <Text style={[styles.countdownSubtext, { color: theme.dark ? "#999" : "#888" }]}>
                    Scanner will be available when slot starts
                  </Text>
                </View>
              );
            } else if (slotState === 'active') {
              // Show active status when slot is within 30-minute window
              return (
                <View style={styles.readyContainer}>
                  <Text style={[styles.readyText, { color: theme.dark ? "#4CAF50" : "#2E7D32" }]}>
                    ✅ Slot is active! Scan QR code to start washing
                  </Text>
                  <Text style={[styles.activeTimeText, { color: theme.dark ? "#4CAF50" : "#2E7D32" }]}>
                    Active for {formatTimer(activeTimeRemaining || 0)} more
                  </Text>
                </View>
              );
            } else {
              // Show expired status when slot window has passed
              return (
                <View style={styles.expiredContainer}>
                  <Text style={[styles.expiredText, { color: theme.dark ? "#F44336" : "#D32F2F" }]}>
                    ⏰ Slot time has expired
                  </Text>
                  <Text style={[styles.expiredSubtext, { color: theme.dark ? "#999" : "#888" }]}>
                    Please book a new slot
                  </Text>
                </View>
              );
            }
          })()}
        </View>

        {/* Cycle Timer */}
        {(cycleStarted || backendCycleStarted) && (timeRemaining !== null || backendTimeRemaining !== null) && (
          <View style={styles.timerContainer}>
            <Text style={[styles.timerLabel, { color: "#fff" }]}>Cycle Time Remaining</Text>
            <Text style={[styles.timerText, { color: "#fff" }]}>
              {formatTimer(backendTimeRemaining !== null ? backendTimeRemaining : (timeRemaining || 0))}
            </Text>
          </View>
        )}

        {/* Slot Details Section */}
        <View style={[styles.card, { backgroundColor: theme.dark ? "#1e1e1e" : "#fff" }]}>
          <Text style={[styles.cardTitle, { color: theme.dark ? "#fff" : "#000" }]}>Slot Details</Text>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.dark ? "#ccc" : "#666" }]}>Slot Time:</Text>
            <Text style={[styles.detailValue, { color: theme.dark ? "#fff" : "#000" }]}>{formatTime(slotTime)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.dark ? "#ccc" : "#666" }]}>Machine ID:</Text>
            <Text style={[styles.detailValue, { color: theme.dark ? "#fff" : "#000" }]}>
              {machineData?.machineId || "Loading..."}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.dark ? "#ccc" : "#666" }]}>Location:</Text>
            <Text style={[styles.detailValue, { color: theme.dark ? "#fff" : "#000" }]}>
              {machineData?.location || "Loading..."}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.dark ? "#ccc" : "#666" }]}>Auth Code:</Text>
            <Text style={[styles.detailValue, { color: theme.dark ? "#fff" : "#000" }]}>{authCode}</Text>
          </View>
        </View>

        {/* Auth Code Input */}
        <View style={[styles.card, { backgroundColor: theme.dark ? "#1e1e1e" : "#fff" }]}>
          <Text style={[styles.cardTitle, { color: theme.dark ? "#fff" : "#000" }]}>Authentication Code</Text>
          <TextInput
            style={[
              styles.authCodeInput,
              {
                backgroundColor: theme.dark ? "#2a2a2a" : "#f8f9fa",
                color: theme.dark ? "#fff" : "#000",
                borderColor: theme.dark ? "#444" : "#ddd",
              },
            ]}
            value={authCode}
            onChangeText={setAuthCode}
            placeholder="Enter Auth Code"
            placeholderTextColor={theme.dark ? "#888" : "#999"}
            maxLength={8}
            autoCapitalize="characters"
          />
        </View>

        {/* Action Buttons */}
       
      </ScrollView>

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => {
          setShowScanner(false);
          qrLock.current = false;
        }}
      >
        <View style={StyleSheet.absoluteFillObject}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={handleQRCodeScanned}
          />

          {/* Scanner Overlay */}
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerHeader}>
              <Pressable
                onPress={() => {
                  setShowScanner(false);
                  qrLock.current = false;
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={scale(24)} color="#fff" />
              </Pressable>
              <Text style={styles.scannerTitle}>Scan QR Code</Text>
              <View style={{ width: scale(40) }} />
            </View>

            <View style={styles.scannerInstructions}>
              <Text style={styles.instructionsText}>
                Point your camera at the QR code on the washing machine
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(15),
  },
  backButton: { padding: scale(8) },
  title: {
    fontSize: fontSizes.FONT20,
    fontWeight: "bold",
  },
  content: { flex: 1, paddingHorizontal: scale(20) },

  // My Booking Card
  bookingCard: {
    borderRadius: scale(12),
    padding: scale(20),
    marginBottom: verticalScale(16),
    borderWidth: 1,
    borderColor: "#ddd",
  },

  // Regular Card
  card: {
    borderRadius: scale(12),
    padding: scale(20),
    marginBottom: verticalScale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  cardTitle: {
    fontSize: fontSizes.FONT18,
    fontWeight: "bold",
    marginBottom: verticalScale(16),
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
  },

  detailLabel: { fontSize: fontSizes.FONT14 },
  detailValue: {
    fontSize: fontSizes.FONT14,
    fontWeight: "600",
    textAlign: "right",
  },

  // Countdown styles
  countdownContainer: {
    alignItems: "center",
    marginTop: verticalScale(16),
    padding: scale(16),
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: scale(8),
  },

  countdownLabel: {
    fontSize: fontSizes.FONT14,
    marginBottom: verticalScale(8),
  },

  countdownText: {
    fontSize: fontSizes.FONT24,
    fontWeight: "bold",
    fontFamily: "monospace",
  },

  countdownSubtext: {
    fontSize: fontSizes.FONT12,
    marginTop: verticalScale(8),
    textAlign: "center",
  },

  // Ready status
  readyContainer: {
    alignItems: "center",
    marginTop: verticalScale(16),
    padding: scale(16),
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: scale(8),
  },

  readyText: {
    fontSize: fontSizes.FONT16,
    fontWeight: "600",
    textAlign: "center",
  },

  activeTimeText: {
    fontSize: fontSizes.FONT12,
    fontWeight: "500",
    textAlign: "center",
    marginTop: verticalScale(4),
  },

  // Expired status
  expiredContainer: {
    alignItems: "center",
    marginTop: verticalScale(16),
    padding: scale(16),
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderRadius: scale(8),
  },

  expiredText: {
    fontSize: fontSizes.FONT16,
    fontWeight: "600",
    textAlign: "center",
  },

  expiredSubtext: {
    fontSize: fontSizes.FONT12,
    marginTop: verticalScale(4),
    textAlign: "center",
  },

  // Auth code input
  authCodeInput: {
    borderWidth: 1,
    borderRadius: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    fontSize: fontSizes.FONT16,
    fontWeight: "600",
    letterSpacing: 2,
    textAlign: "center",
    textTransform: "uppercase",
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

  // Buttons
  buttonContainer: {
    marginTop: verticalScale(20),
    gap: verticalScale(12),
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(16),
    borderRadius: scale(12),
  },

  scanButton: {
    backgroundColor: "#2196F3",
  },

  startButton: {
    backgroundColor: "#4CAF50",
  },

  buttonText: {
    color: "#fff",
    fontSize: fontSizes.FONT16,
    fontWeight: "bold",
    marginLeft: scale(8),
  },

  // Timer
  timerContainer: {
    alignItems: "center",
    backgroundColor: "#4A90E2",
    borderRadius: scale(16),
    padding: scale(24),
    marginBottom: verticalScale(20),
  },

  timerLabel: {
    fontSize: fontSizes.FONT14,
    color: "#fff",
    marginBottom: verticalScale(8),
  },

  timerText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fff",
    fontFamily: "monospace",
  },

  // Scanner Modal Styles
  scannerOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },

  scannerHeader: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingVertical: scale(15),
    zIndex: 1000,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },

  closeButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  scannerTitle: {
    color: "#fff",
    fontSize: fontSizes.FONT18,
    fontWeight: "600",
    textAlign: "center",
  },

  scannerInstructions: {
    position: "absolute",
    bottom: scale(100),
    left: scale(20),
    right: scale(20),
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: scale(10),
    padding: scale(15),
    zIndex: 1000,
  },

  instructionsText: {
    color: "#fff",
    fontSize: fontSizes.FONT16,
    textAlign: "center",
    fontWeight: "500",
  },
});
