import CourseCard from "@/components/cards/course.card";
// import GradiantText from "@/components/common/gradient.text";
import HomeBanner from "@/components/home/home.banner";
import WelcomeHeader from "@/components/home/welcome.header";
import useGetCourses from "@/hooks/fetch/useGetCourses";
import {
  fontSizes,
  windowHeight,
  windowWidth
} from "@/themes/app.constant";
import SkeltonLoader from "@/utils/skelton";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { scale, verticalScale } from "react-native-size-matters";

export default function HomeScreen() {
  const { courses, loading } = useGetCourses();
  const bottomTabBarHeight = useBottomTabBarHeight();

  return (
    <>
      <LinearGradient
        colors={["#fff", "#f7f7f7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          flex: 1,
          backgroundColor: "#fff",
        }}
      >
        <WelcomeHeader />
        <View style={{ flex: 1 }}>
          {loading ? (
            <>
              <SkeltonLoader />
              <SkeltonLoader />
            </>
          ) : (
            <View
              style={{
                paddingHorizontal: scale(8),
              }}
            >
              <FlatList
                ListHeaderComponent={() => (
                  <>
                    <HomeBanner />
                    <View
                      style={{
                        marginHorizontal: windowWidth(20),
                        marginTop: verticalScale(-25),
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          marginTop: windowHeight(5),
                        }}
                      >
                        <Text
                          style={{
                            fontSize: fontSizes.FONT35,
                            fontFamily: "Poppins_500Medium",
                            color: "#000",
                          }}
                        >
                          Popular
                        </Text>
                        {/* <GradiantText
                          text="Courses"
                          styles={{
                            fontSize: fontSizes.FONT35,
                            fontFamily: "Poppins_500Medium",
                            paddingLeft: scale(5),
                          }}
                        /> */}
                      </View>
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <View
                          style={{
                            backgroundColor: "#12BB70",
                            width: windowWidth(15),
                            height: windowWidth(15),
                            borderRadius: 100,
                          }}
                        />
                        <Text
                          style={{
                            fontFamily: "Poppins_400Regular",
                            fontSize: fontSizes.FONT18,
                            paddingLeft: windowWidth(5),
                            color: "#000",
                          }}
                        >
                          our comprehensive project based courses
                        </Text>
                      </View>
                    </View>
                  </>
                )}
                data={courses}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <CourseCard item={item} />}
                ListEmptyComponent={<Text>No courses Available yet!</Text>}
                ListFooterComponent={() => (
                  <View style={{ height: verticalScale(10) }}></View>
                )}
              />
            </View>
          )}
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({});
