import ReviewCard from "@/components/cards/review.card";
import CourseDetailsTabs from "@/components/course/course.details.tabs";
import CourseLesson from "@/components/course/course.lesson";
import { useTheme } from "@/context/theme.context";
import useUser, { setAuthorizationHeader } from "@/hooks/fetch/useUser";
import {
  fontSizes,
  SCREEN_WIDTH,
  windowHeight,
  windowWidth
} from "@/themes/app.constant";
import CourseDetailsLoader from "@/utils/course-details-skelton";
import { Spacer } from "@/utils/skelton";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { BlurView } from "expo-blur";
import { router, useGlobalSearchParams } from "expo-router";
import { MotiView } from "moti";
import { Skeleton } from "moti/skeleton";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scale, verticalScale } from "react-native-size-matters";

export default function CourseDetailsScreen() {
  const params: any = useGlobalSearchParams();
  const [activeButton, setActiveButton] = useState("About");
  const { user, loader: userLoader, refetch } = useUser();
  const [purchaseLoader, setPurchaseLoader] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loader, setLoader] = useState(true);
  const [reviews, setReviews] = useState([]);
  const insets = useSafeAreaInsets();

  const courseData: CourseType | any = params;
  const prerequisites: BenefitsType[] | any = JSON.parse(params?.prerequisites || "[]");
  const benefits: BenefitsType[] | any = JSON.parse(params?.benefits || "[]");
  const courseContent: CourseDataType[] | any = JSON.parse(params?.courseContent || "[]");

  const { theme } = useTheme();

  useEffect(() => {
    // No IAP logic needed
  }, []);

  if (userLoader) return <CourseDetailsLoader />;

  if (!courseData || !courseData.name) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: theme.dark ? "#fff" : "#000" }}>Invalid course data</Text>
      </View>
    );
  }

  const userOrders = user?.orders;
  const isPurchased = userOrders?.find((i: OrderType) => i.courseId === courseData.id);

const handlePurchase = async () => {
  console.log("Starting purchase for course:", courseData.id);
  setPurchaseLoader(true);
  try {
    if (courseData.price === "0") {
      await setAuthorizationHeader();
      const res = await axios.post(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/create-free-order`,
        { courseId: courseData.id }
      );
      console.log("Free order response:", res.data);
      if (res.data.success) {
        router.replace({
          pathname: "/(routes)/course-access",
          params: courseData,
        });
      } else {
        Alert.alert("Enrollment failed", res.data.message || "Try again later.");
      }
    } else {
      router.push({
        pathname: "/checkout",
        params: {
          id: courseData.id,
          name: courseData.name,
          price: courseData.price,
        },
      });
    }
  } catch (error) {
    console.error("Course order failed:", error);
    Alert.alert("Error", "Something went wrong. Please try again.");
  } finally {
    setPurchaseLoader(false);
  }
};

  const reviewsFetchingHandler = async () => {
    setActiveButton("Reviews");
    try {
      const res = await axios.get(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/get-reviews/${params.id}`
      );
      setReviews(res.data.reviewsData);
    } catch (error) {
      console.log("Review fetch error:", error);
    } finally {
      setLoader(false);
    }
  };

  const handleCourseAccess = () => {
    router.push({
      pathname: "/(routes)/course-access",
      params: {
        ...courseData,
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.dark ? "#131313" : "#fff" }}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 120 // Fixed large padding to ensure content is not hidden
        }}
      >
        <View style={{ padding: windowWidth(15) }}>
          <Image
            source={{
              uri:
                courseData.slug === "multi-vendor-mern-stack-e-commerce-project-with-all-functionalities-absolutely-for-beginners"
                  ? "https://res.cloudinary.com/dwp4syk3r/image/upload/v1713574266/TMECA_yddc73.png"
                  : courseData.slug === "build-your-mobile-app-development-career-with-react-native"
                  ? "https://res.cloudinary.com/dkg6jv4l0/image/upload/v1731448241/thumbnail_jwi5xo.png"
                  : "https://res.cloudinary.com/dkg6jv4l0/image/upload/v1711468889/courses/spe7bcczfpjmtsdjzm6x.png",
            }}
            resizeMode="contain"
            style={{
              width: SCREEN_WIDTH - 40,
              height: (SCREEN_WIDTH - 40) * 0.5625,
              alignSelf: "center",
              borderRadius: windowWidth(10),
            }}
          />

          <Text
            style={{
              fontSize: fontSizes.FONT22,
              fontFamily: "Poppins_600SemiBold",
              paddingTop: verticalScale(10),
              color: theme.dark ? "#fff" : "#3E3B54",
              lineHeight: windowHeight(20),
            }}
          >
            {courseData.name}
          </Text>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row" }}>
              <Text
                style={{
                  fontSize: fontSizes.FONT22,
                  fontFamily: "Poppins_400Regular",
                  paddingTop: windowHeight(8),
                  color: theme.dark ? "#fff" : "#000",
                }}
              >
                ${courseData?.price}
              </Text>
              <Text
                style={{
                  fontSize: fontSizes.FONT22,
                  fontFamily: "Poppins_400Regular",
                  color: theme.dark ? "#fff" : "#3E3B54",
                  paddingLeft: windowWidth(5),
                  textDecorationLine: "line-through",
                }}
              >
                ${courseData?.estimatedPrice}
              </Text>
            </View>

            <Text
              style={{
                fontSize: fontSizes.FONT18,
                fontFamily: "Poppins_400Regular",
                color: theme.dark ? "#fff" : "#000",
              }}
            >
              {courseData?.purchased} Students
            </Text>
          </View>

          {/* Prerequisites */}
          <View style={{ paddingTop: windowHeight(12) }}>
            <Text
              style={{
                fontSize: fontSizes.FONT24,
                fontFamily: "Poppins_600SemiBold",
                color: theme.dark ? "#fff" : "#3E3B54",
              }}
            >
              Course Prerequisites
            </Text>
            {prerequisites.map((i: BenefitsType, index: number) => (
              <View key={index} style={{ flexDirection: "row", paddingVertical: windowHeight(5) }}>
                <Ionicons name="checkmark-done-outline" size={scale(17)} color={theme.dark ? "#fff" : "#000"} />
                <Text style={{ marginLeft: windowWidth(5), fontSize: fontSizes.FONT18, color: theme.dark ? "#fff" : "#000" }}>
                  {i?.title}
                </Text>
              </View>
            ))}
          </View>

          {/* Benefits */}
          <View style={{ paddingTop: windowHeight(12) }}>
            <Text
              style={{
                fontSize: fontSizes.FONT24,
                fontFamily: "Poppins_600SemiBold",
                color: theme.dark ? "#fff" : "#3E3B54",
              }}
            >
              Course Benefits
            </Text>
            {benefits.map((i: BenefitsType, index: number) => (
              <View key={index} style={{ flexDirection: "row", paddingVertical: windowHeight(5) }}>
                <Ionicons name="checkmark-done-outline" size={scale(17)} color={theme.dark ? "#fff" : "#000"} />
                <Text style={{ marginLeft: windowWidth(5), fontSize: fontSizes.FONT18, color: theme.dark ? "#fff" : "#000" }}>
                  {i?.title}
                </Text>
              </View>
            ))}
          </View>

          {/* Tabs */}
          <CourseDetailsTabs
            activeButton={activeButton}
            reviewsFetchingHandler={reviewsFetchingHandler}
            setActiveButton={setActiveButton}
          />

          {/* About */}
          {activeButton === "About" && (
            <View style={{ marginHorizontal: scale(12), marginVertical: verticalScale(10) }}>
              <Text style={{ fontSize: fontSizes.FONT25, fontFamily: "Poppins_500Medium", color: theme.dark ? "#fff" : "#000" }}>
                About course
              </Text>
              <Text style={{ color: !theme.dark ? "#525258" : "#fff", fontSize: fontSizes.FONT20, marginTop: 10, textAlign: "justify" }}>
                {isExpanded
                  ? courseData?.description || "No description available"
                  : courseData?.description?.slice(0, 302) || "No description available"}
              </Text>
              {courseData?.description?.length > 302 && (
                <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
                  <Text style={{ color: "#2467EC", fontSize: fontSizes.FONT16 }}>
                    {isExpanded ? "Show Less -" : "Show More +"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Lessons */}
          {activeButton === "Lessons" && (
            <View style={{ marginHorizontal: verticalScale(16), marginVertical: scale(15) }}>
              <CourseLesson courseDetails={courseContent} />
            </View>
          )}

          {/* Reviews */}
          {activeButton === "Reviews" && (
            <View style={{ marginHorizontal: 16, marginVertical: 25 }}>
              {loader ? (
                [...Array(5)].map((_, i) => (
                  <MotiView key={i} style={{ flexDirection: "row", gap: scale(10), marginVertical: verticalScale(10) }}>
                    <Skeleton colorMode={theme.dark ? "dark" : "light"} radius="round" height={55} width={55} />
                    <View>
                      <Skeleton colorMode={theme.dark ? "dark" : "light"} width={240} height={22} />
                      <Spacer height={15} />
                      <Skeleton colorMode={theme.dark ? "dark" : "light"} width={240} height={22} />
                    </View>
                  </MotiView>
                ))
              ) : (
                reviews.map((item, index) => <ReviewCard item={item} key={index} />)
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      <BlurView
        intensity={theme.dark ? 30 : 2}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: !theme.dark ? "#eaf3fb85" : "#000",
        }}
      >
        <View
          style={{
            paddingHorizontal: windowWidth(15),
            paddingTop: windowHeight(10),
            paddingBottom:
              insets.bottom > 0 ? insets.bottom : windowHeight(15),
          }}
        >
          {isPurchased ? (
            <TouchableOpacity
              style={{
                backgroundColor: "#2467EC",
                paddingVertical: windowHeight(10),
                borderRadius: windowWidth(8),
              }}
              onPress={handleCourseAccess}
            >
              <Text
                style={{
                  textAlign: "center",
                  color: "#FFFF",
                  fontSize: fontSizes.FONT24,
                  fontFamily: "Poppins_600SemiBold",
                }}
              >
                Enter to course
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={{
                backgroundColor: "#2467EC",
                paddingVertical: windowHeight(10),
                borderRadius: windowWidth(8),
                opacity: purchaseLoader ? 0.6 : 1,
              }}
              disabled={purchaseLoader}
              onPress={handlePurchase}
            >
              <Text
                style={{
                  textAlign: "center",
                  color: "#FFFF",
                  fontSize: fontSizes.FONT24,
                  fontFamily: "Poppins_600SemiBold",
                }}
              >
                {courseData?.price === "0"
                  ? "Enroll for Free"
                  : `Buy Now - $${courseData?.price}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </BlurView>
    </View>
  );
}
