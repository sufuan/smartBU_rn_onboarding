import { MotiView } from "moti";
import { Skeleton } from "moti/skeleton";
import React from "react";
import { StyleSheet, View } from "react-native";
import { scale } from "react-native-size-matters";
import { windowHeight, windowWidth } from "../themes/app.constant";

export default function SkeltonLoader() {
  return (
    <MotiView
      transition={{ type: "timing" }}
      style={[styles.container, styles.padded]}
      animate={{ backgroundColor: "#fff" }} // Static background
    >
      <Skeleton
        width={windowWidth(440)}
        height={windowHeight(160)}
        colorMode="light" // Hardcoded to light mode
      />
      <Spacer />
      <View style={{ flexDirection: "row", gap: windowWidth(15) }}>
        <Skeleton
          colorMode="light"
          radius="round"
          height={windowWidth(80)}
          width={windowWidth(80)}
        />
        <View>
          <Skeleton
            width={windowWidth(338)}
            height={windowHeight(20)}
            colorMode="light"
          />
          <Spacer />
          <Skeleton
            width={windowWidth(338)}
            height={windowHeight(20)}
            colorMode="light"
          />
          <Spacer />
        </View>
      </View>
    </MotiView>
  );
}

export const Spacer = ({ height = 16 }) => <View style={{ height }} />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  padded: {
    padding: scale(14),
  },
});
