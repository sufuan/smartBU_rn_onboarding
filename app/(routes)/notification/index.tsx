import NotificationScreen from "@/screens/notification/notification.screen";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function Notification() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NotificationScreen />
    </GestureHandlerRootView>
  );
}