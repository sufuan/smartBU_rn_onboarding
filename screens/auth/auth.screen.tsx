import { useTheme } from "@/context/theme.context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { scale, verticalScale } from "react-native-size-matters";
import LoginForm from "./components/login.form";
import SignupFlow from "./components/signup.flow";

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [slideAnim] = useState(new Animated.Value(0));

  const handleTabChange = (tab: 'login' | 'signup') => {
    if (tab === activeTab) return;
    
    Animated.timing(slideAnim, {
      toValue: tab === 'login' ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.dark ? "#131313" : "#f8f9fa" }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.dark ? "#2a2a2a" : "#fff" }]}
        >
          <Ionicons name="arrow-back" size={scale(24)} color={theme.dark ? "#fff" : "#000"} />
        </Pressable>
        
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.dark ? "#fff" : "#000" }]}>
            Welcome
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.dark ? "#ccc" : "#666" }]}>
            Sign in to your account or create a new one
          </Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: theme.dark ? "#2a2a2a" : "#fff" }]}>
        <View style={styles.tabWrapper}>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'login' && styles.activeTab
            ]}
            onPress={() => handleTabChange('login')}
          >
            <Text style={[
              styles.tabText,
              { color: theme.dark ? "#ccc" : "#666" },
              activeTab === 'login' && [styles.activeTabText, { color: "#4A90E2" }]
            ]}>
              Login
            </Text>
          </Pressable>
          
          <Pressable
            style={[
              styles.tab,
              activeTab === 'signup' && styles.activeTab
            ]}
            onPress={() => handleTabChange('signup')}
          >
            <Text style={[
              styles.tabText,
              { color: theme.dark ? "#ccc" : "#666" },
              activeTab === 'signup' && [styles.activeTabText, { color: "#4A90E2" }]
            ]}>
              Sign Up
            </Text>
          </Pressable>
        </View>
        
        {/* Tab Indicator */}
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              transform: [{
                translateX: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, width / 2 - scale(40)]
                })
              }]
            }
          ]}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'login' ? (
          <LoginForm />
        ) : (
          <SignupFlow />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(20),
  },
  backButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(16),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: verticalScale(4),
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  tabContainer: {
    marginHorizontal: scale(20),
    borderRadius: scale(12),
    padding: scale(4),
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tabWrapper: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(8),
  },
  activeTab: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: scale(4),
    left: scale(4),
    width: width / 2 - scale(44),
    height: scale(3),
    backgroundColor: '#4A90E2',
    borderRadius: scale(2),
  },
  content: {
    flex: 1,
    paddingTop: verticalScale(30),
  },
});
