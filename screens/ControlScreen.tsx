import { useTheme } from "@/context/theme.context";
import useUser from "@/hooks/fetch/useUser";
import {
  fontSizes,
} from "@/themes/app.constant";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { scale, verticalScale } from "react-native-size-matters";

export default function ControlScreen() {
  const { theme } = useTheme();
  const { user } = useUser();
  const params = useLocalSearchParams();

  // Get userId from params or from user hook (for QR code scanning)
  const userId = (params.userId as string) || user?.id;
  const machineId = params.machineId as string;
  const slotTime = params.slotTime ? new Date(params.slotTime as string) : new Date();
  const initialAuthCode = (params.authCode as string) || "";

  const [authCode, setAuthCode] = useState(initialAuthCode);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [cycleStarted, setCycleStarted] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const isSlotActive = () => {
    const now = new Date();
    const slotStart = new Date(slotTime);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
    return now >= slotStart && now <= slotEnd;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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

    if (!isSlotActive()) {
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

  const handleGoBack = () => router.back();
  const handleGoHome = () => router.push("/(tabs)/" as any);

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
        {cycleStarted && timeRemaining !== null && (
          <View style={styles.timerContainer}>
            <Text style={[styles.timerLabel, { color: theme.dark ? "#ccc" : "#666" }]}>Time Remaining</Text>
            <Text style={[styles.timerText, { color: theme.dark ? "#fff" : "#000" }]}>{formatTimer(timeRemaining)}</Text>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: theme.dark ? "#1e1e1e" : "#fff" }]}>
          <Text style={[styles.cardTitle, { color: theme.dark ? "#fff" : "#000" }]}>Slot Details</Text>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.dark ? "#ccc" : "#666" }]}>Machine:</Text>
            <Text style={[styles.detailValue, { color: theme.dark ? "#fff" : "#000" }]}>{machineId}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.dark ? "#ccc" : "#666" }]}>Time Slot:</Text>
            <Text style={[styles.detailValue, { color: theme.dark ? "#fff" : "#000" }]}>{formatTime(slotTime)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.dark ? "#ccc" : "#666" }]}>Duration:</Text>
            <Text style={[styles.detailValue, { color: theme.dark ? "#fff" : "#000" }]}>30 minutes</Text>
          </View>
        </View>

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

        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.button, styles.startButton, { opacity: isLoading || !authCode ? 0.5 : 1 }]}
            onPress={handleStartCycle}
            disabled={isLoading || !authCode}
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
  card: {
    borderRadius: scale(12),
    padding: scale(20),
    marginBottom: verticalScale(16),
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
  startButton: {
    backgroundColor: "#4CAF50",
  },
  buttonText: {
    color: "#fff",
    fontSize: fontSizes.FONT16,
    fontWeight: "bold",
    marginLeft: scale(8),
  },
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
});
