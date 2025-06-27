import { bannerData } from "@/configs/constants";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";
import Swiper from "react-native-swiper";

export default function HomeBanner() {
  const handlePress = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <View style={styles.container}>
      <Swiper
        dotStyle={styles.dot}
        activeDotStyle={styles.activeDot}
        autoplay
        autoplayTimeout={5}
        style={{ height: moderateScale(230) }}
      >
        {bannerData.map((item, index) => (
          <Pressable key={index} style={styles.slide} onPress={() => handlePress(item.url)}>
            <Image
              source={{ uri: item.image }}
              style={styles.image}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </Swiper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(2), // Reduced from 7 to 2 for wider banner
  },
  dot: {
    backgroundColor: "#C6C7CC",
    width: scale(8),
    height: scale(8),
    borderRadius: scale(5),
    marginHorizontal: verticalScale(3),
  },
  activeDot: {
    backgroundColor: "#2467EC",
    width: scale(8),
    height: scale(8),
    borderRadius: scale(5),
    marginHorizontal: verticalScale(3),
  },
  slide: {
    flex: 1,
    marginHorizontal: scale(3), // Reduced from 10 to 3 for wider banner
  },
  image: {
    height: moderateScale(185),
    borderRadius: scale(8), // Slightly increased border radius for better look
    width: "100%",
  },
});