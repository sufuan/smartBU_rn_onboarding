import { useTheme } from "@/context/theme.context";
import { fontSizes } from "@/themes/app.constant";
import Ratings from "@/utils/ratings";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import moment from "moment";
import React from "react";
import { Image, Text, View } from "react-native";
import { scale, verticalScale } from "react-native-size-matters";

export default function ReviewCard({ item }: { item: ReviewsType }) {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row" }}>
        <Image
          style={{
            width: scale(40),
            height: scale(40),
            borderRadius: scale(100),
          }}
          source={{
            uri:
              item?.user?.avatar ||
              "https://res.cloudinary.com/dshp9jnuy/image/upload/v1665822253/avatars/nrxsg8sd9iy10bbsoenn.png",
          }}
        />
        <View style={{ marginHorizontal: verticalScale(7), flex: 1 }}>
          <View style={{ flex: 1, justifyContent: "space-around" }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: scale(16),
                    color: theme.dark ? "#fff" : "#000",
                  }}
                >
                  {item?.user?.name}
                </Text>
                <View style={{ marginTop: verticalScale(3) }}>
                  <Ratings rating={item?.rating} />
                </View>
                <Text
                  style={{
                    fontSize: fontSizes.FONT16,
                    paddingVertical: verticalScale(4),
                    paddingHorizontal: scale(3),
                    color: theme.dark ? "#fff" : "#000",
                  }}
                >
                  {item.comment}
                </Text>
                <Text
                  style={{
                    fontSize: fontSizes.FONT16,
                    paddingVertical: verticalScale(3),
                    paddingHorizontal: scale(3),
                    color: theme.dark ? "#fff" : "#000",
                    opacity: 0.8,
                  }}
                >
                  {moment(item.createdAt).fromNow()}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* replies */}
      {item?.replies?.length !== 0 && (
        <View
          style={{
            flexDirection: "row",
            marginTop: verticalScale(10),
            marginLeft: verticalScale(20),
          }}
        >
          <Image
            style={{
              width: scale(40),
              height: scale(40),
              borderRadius: scale(100),
            }}
            source={{
              uri:
                item.replies[0]?.user?.avatar ||
                "https://res.cloudinary.com/dshp9jnuy/image/upload/v1665822253/avatars/nrxsg8sd9iy10bbsoenn.png",
            }}
          />
          <View style={{ marginHorizontal: verticalScale(6), flex: 1 }}>
            <View style={{ flex: 1, justifyContent: "space-around" }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View>
                  <Text
                    style={{
                      fontSize: scale(16),
                      color: theme.dark ? "#fff" : "#000",
                      alignItems: "center",
                    }}
                  >
                    {item.replies[0]?.user?.name}{" "}
                    <MaterialIcons
                      name="verified"
                      size={scale(16)}
                      color="#0095F6"
                    />
                  </Text>
                  <Text
                    style={{
                      fontSize: fontSizes.FONT16,
                      paddingVertical: verticalScale(3),
                      paddingHorizontal: scale(3),
                      color: theme.dark ? "#fff" : "#000",
                    }}
                  >
                    {item?.replies[0]?.reply}
                  </Text>
                  <Text
                    style={{
                      fontSize: fontSizes.FONT16,
                      paddingVertical: verticalScale(3),
                      paddingHorizontal: scale(3),
                      color: theme.dark ? "#fff" : "#000",
                      opacity: 0.8,
                    }}
                  >
                    {moment(item?.replies[0]?.createdAt).fromNow()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}