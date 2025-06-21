import { useTheme } from "@/context/theme.context";
import { useSubscriptionStatus } from "@/hooks/queries/useUserQuery";
import {
  fontSizes,
} from "@/themes/app.constant";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
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

// Navigation params interface
interface ControlScreenParams {
  userId: string;
  slotTime: string;
  machineId: string;
  authCode: string;
}

export default function ControlScreen() {
  const { theme } = useTheme();
  const { user } = useSubscriptionStatus();
  const params = useLocalSearchParams();

  // Get navigation params with proper typing
  const userId = (params.userId as string) || user?.id;
  const machineId = params.machineId as string;
  const slotTime = params.slotTime ? new Date(params.slotTime as string) : new Date();
  const initialAuthCode = (params.authCode as string) || "";

  // State variables
  const [authCode, setAuthCode] = useState(initialAuthCode);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [cycleStarted, setCycleStarted] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedMachineId, setScannedMachineId] = useState<string | null>(null);
  const [countdownToSlot, setCountdownToSlot] = useState<number | null>(null);

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();

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

    console.log('🕐 Countdown Debug:', {
      now: now.toISOString(),
      slotStart: slotStart.toISOString(),
      diffMs,
      secondsUntil,
      slotTime: slotTime.toISOString()
    });

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

    const now = new Date();
    const slotStart = new Date(slotTime);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

    console.log('🔍 Slot Validity Debug:', {
      now: now.toISOString(),
      slotStart: slotStart.toISOString(),
      slotEnd: slotEnd.toISOString(),
      slotState: state,
      isValid,
      nowTime: now.getTime(),
      slotStartTime: slotStart.getTime(),
      slotEndTime: slotEnd.getTime()
    });

    return isValid;
  };

  // Removed unused helper functions - using getSlotState() directly

  // Initialize countdown to slot time and set up real-time updates
  useEffect(() => {
    console.log('🚀 Initializing ControlScreen with params:', {
      userId,
      machineId,
      slotTime: slotTime.toISOString(),
      authCode: initialAuthCode
    });

    // Function to update countdown and slot state based on current time
    const updateCountdown = () => {
      const timeUntilSlot = getTimeUntilSlot();
      const currentSlotState = getSlotState();

      console.log('⏰ Updating countdown and state:', {
        timeUntilSlot,
        currentSlotState,
        slotTime: slotTime.toISOString(),
        currentTime: new Date().toISOString()
      });

      // Always update countdown based on current state
      if (currentSlotState === 'waiting') {
        setCountdownToSlot(timeUntilSlot);
      } else {
        // Clear countdown when slot becomes active or expired
        setCountdownToSlot(null);
      }
    };

    // Initial countdown calculation
    updateCountdown();

    // Set up real-time updates every second
    const realTimeInterval = setInterval(updateCountdown, 1000);
    console.log('⏰ Real-time countdown updates started');

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (realTimeInterval) clearInterval(realTimeInterval);
      console.log('⏰ All intervals cleared');
    };
  }, [slotTime]);

  // Note: Countdown is now handled by real-time updates in the main useEffect
  // This effect is kept for the cycle timer only

  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            Alert.alert("Cycle Finished", "Your washing cycle is complete!");
            router.push("/(tabs)/services" as any);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeRemaining === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeRemaining]);

  const handleStartCycle = async () => {
    if (!userId || !machineId || !authCode) {
      Alert.alert("Error", "Missing required information");
      return;
    }

    if (!isSlotTimeValid()) {
      Alert.alert("Error", "Slot time not active");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/api/control`,
        {
          userId,
          slotTime: slotTime.toISOString(),
          machineId,
          authCode,
        }
      );

      console.log("✅ Control API response:", response.data);

      if (response.data.status === "success") {
        Alert.alert("Success", "Cycle started");
        setCycleStarted(true);
        setTimeRemaining(30 * 60);
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

      // Check if QR code matches expected format: "machineId:<machineId>"
      if (data.startsWith("machineId:")) {
        const scannedId = data.replace("machineId:", "");

        // Validate it matches the slot's machineId
        if (scannedId !== machineId) {
          Alert.alert("Error", "Wrong machine scanned", [
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
        setScannedMachineId(scannedId);
        setShowScanner(false);
        qrLock.current = false;

        Alert.alert("Success", `Machine ${scannedId} verified! You can now start the cycle.`);
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
              const now = new Date();
              const slotEnd = new Date(new Date(slotTime).getTime() + 30 * 60 * 1000);
              const timeRemaining = Math.max(0, Math.floor((slotEnd.getTime() - now.getTime()) / 1000));

              return (
                <View style={styles.readyContainer}>
                  <Text style={[styles.readyText, { color: theme.dark ? "#4CAF50" : "#2E7D32" }]}>
                    ✅ Slot is active! Scan QR code to start washing
                  </Text>
                  <Text style={[styles.activeTimeText, { color: theme.dark ? "#4CAF50" : "#2E7D32" }]}>
                    Active for {formatTimer(timeRemaining)} more
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
        {cycleStarted && timeRemaining !== null && (
          <View style={styles.timerContainer}>
            <Text style={[styles.timerLabel, { color: "#fff" }]}>Cycle Time Remaining</Text>
            <Text style={[styles.timerText, { color: "#fff" }]}>{formatTimer(timeRemaining)}</Text>
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
            <Text style={[styles.detailValue, { color: theme.dark ? "#fff" : "#000" }]}>{machineId}</Text>
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
        <View style={styles.buttonContainer}>
          {/* Debug Info */}
          <View style={[styles.debugContainer, { backgroundColor: theme.dark ? "#2a2a2a" : "#f0f0f0" }]}>
            <Text style={[styles.debugTitle, { color: theme.dark ? "#fff" : "#000" }]}>🔧 Real-Time Debug Info</Text>
            <Text style={[styles.debugText, { color: theme.dark ? "#ccc" : "#666" }]}>
              Current Time: {new Date().toLocaleTimeString()}
            </Text>
            <Text style={[styles.debugText, { color: theme.dark ? "#ccc" : "#666" }]}>
              Slot Time: {slotTime.toLocaleTimeString()}
            </Text>
            <Text style={[styles.debugText, { color: theme.dark ? "#ccc" : "#666" }]}>
              Slot State: {getSlotState().toUpperCase()}
            </Text>
            <Text style={[styles.debugText, { color: theme.dark ? "#ccc" : "#666" }]}>
              Countdown: {countdownToSlot !== null ? `${countdownToSlot}s (${formatTimer(countdownToSlot)})` : 'null'}
            </Text>
            <Text style={[styles.debugText, { color: theme.dark ? "#ccc" : "#666" }]}>
              Slot Valid (Active): {isSlotTimeValid() ? 'YES' : 'NO'}
            </Text>
            <Text style={[styles.debugText, { color: theme.dark ? "#ccc" : "#666" }]}>
              Scanner Available: {isSlotTimeValid() ? 'YES' : 'NO'}
            </Text>
            <Text style={[styles.debugText, { color: theme.dark ? "#ccc" : "#666" }]}>
              Machine Scanned: {scannedMachineId ? 'YES' : 'NO'}
            </Text>
          </View>

          <Pressable
            style={[
              styles.button,
              styles.scanButton,
              { opacity: !isSlotTimeValid() ? 0.5 : 1 }
            ]}
            onPress={handleScanQRCode}
            disabled={!isSlotTimeValid()}
          >
            <Ionicons name="qr-code" size={20} color="#fff" />
            <Text style={styles.buttonText}>
              {!isSlotTimeValid() ? 'Scanner Not Available' : 'Scan QR Code'}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.button,
              styles.startButton,
              { opacity: isLoading || !authCode || !scannedMachineId || !isSlotTimeValid() ? 0.5 : 1 }
            ]}
            onPress={handleStartCycle}
            disabled={isLoading || !authCode || !scannedMachineId || !isSlotTimeValid()}
          >
            {isLoading ? (
              <Text style={styles.buttonText}>Starting...</Text>
            ) : (
              <>
                <Ionicons name="play-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Start Cycle</Text>
              </>
            )}
          </Pressable>
        </View>
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
