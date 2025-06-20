import React from "react";
import { Dimensions, Platform, StyleSheet, View } from "react-native";

const { width, height } = Dimensions.get("window");

const scanAreaSize = 280;

const Overlay = () => {
  return (
    <View
      style={[
        Platform.OS === "android" ? { flex: 1 } : StyleSheet.absoluteFillObject,
        styles.overlay
      ]}
      pointerEvents="none"
    >
      {/* Top overlay */}
      <View style={[styles.overlaySection, { height: (height - scanAreaSize) / 2 }]} />

      {/* Middle section with left, scan area, and right */}
      <View style={styles.middleSection}>
        <View style={[styles.overlaySection, { width: (width - scanAreaSize) / 2 }]} />

        {/* Scan area with border */}
        <View style={styles.scanArea}>
          <View style={styles.scanBorder} />
          {/* Corner indicators */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        <View style={[styles.overlaySection, { width: (width - scanAreaSize) / 2 }]} />
      </View>

      {/* Bottom overlay */}
      <View style={[styles.overlaySection, { height: (height - scanAreaSize) / 2 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlaySection: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleSection: {
    flexDirection: 'row',
    height: scanAreaSize,
  },
  scanArea: {
    width: scanAreaSize,
    height: scanAreaSize,
    position: 'relative',
  },
  scanBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#00FF00',
    borderRadius: 20,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00FF00',
    borderWidth: 4,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 20,
  },
});

export default Overlay;