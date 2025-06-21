import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Stack, router } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Alert,
  AppState,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { scale } from "react-native-size-matters";
import Overlay from "./Overlay";

export default function Scanner() {
  const qrLock = useRef(false);
  const appState = useRef(AppState.currentState);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        qrLock.current = false;
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  const handleQRCodeScanned = ({ data }: { data: string }) => {
    if (data && !qrLock.current) {
      qrLock.current = true;

      if (data.startsWith("machineId:")) {
        const machineId = data.replace("machineId:", "");

        Alert.alert(
          "Machine Detected",
          `Machine ID: ${machineId}\nWould you like to control this machine?`,
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {
                qrLock.current = false;
              },
            },
            {
              text: "Control Machine",
              onPress: () => {
                router.push({
                  pathname: "/(routes)/control" as any,
                  params: { machineId },
                });
              },
            },
          ]
        );
      } else {
        Alert.alert("Invalid QR Code", "This is not a valid machine QR code.", [
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

  const handleGoBack = () => router.back();

  if (!permission || !permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#000", fontSize: 16 }}>
          Waiting for camera permission...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={StyleSheet.absoluteFillObject}>
      <Stack.Screen options={{ title: "QR Scanner", headerShown: false }} />
      {Platform.OS === "android" ? <StatusBar hidden /> : null}

      <View style={styles.header}>
        <Pressable onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(24)} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={handleQRCodeScanned}
      />

      <Overlay />

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Point your camera at the QR code on the washing machine
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    position: "absolute",
    top: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 50,
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
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: scale(18),
    fontWeight: "600",
    textAlign: "center",
  },
  instructionsContainer: {
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
    fontSize: scale(16),
    textAlign: "center",
    fontWeight: "500",
  },
});
