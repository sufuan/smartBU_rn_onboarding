import { useAuth } from "@/context/auth.context";
import { useTheme } from "@/context/theme.context";
import { useCheckEmailMutation, useLoginMutation } from "@/hooks/mutations/useAuthMutations";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { scale, verticalScale } from "react-native-size-matters";

export default function LoginForm() {
  const { theme } = useTheme();
  const { login } = useAuth();
  const checkEmailMutation = useCheckEmailMutation();
  const loginMutation = useLoginMutation();
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const isLoading = checkEmailMutation.isPending || loginMutation.isPending;
  
  const [fadeAnim] = useState(new Animated.Value(1));

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailSubmit = () => {
    setErrors({});

    if (!email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }

    if (!validateEmail(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    checkEmailMutation.mutate({ email }, {
      onSuccess: (data) => {
        if (data.exists) {
          // Email exists, proceed to password step
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setStep('password');
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
          });
        } else {
          setErrors({ email: 'Email not found. Please sign up first.' });
        }
      },
      onError: (error) => {
        setErrors({ email: error.message });
      }
    });
  };

  const handleLogin = () => {
    setErrors({});

    if (!password.trim()) {
      setErrors({ password: 'Password is required' });
      return;
    }

    if (password.length < 6) {
      setErrors({ password: 'Password must be at least 6 characters' });
      return;
    }

    loginMutation.mutate({ email, password }, {
      onSuccess: async (data) => {
        try {
          console.log('🎉 Login Form: Login mutation successful');
          console.log('📧 Login Form: User data:', data.user?.email);
          console.log('🔑 Login Form: Token received:', !!data.token);

          if (!data.token) {
            console.error('❌ Login Form: No token in response');
            Alert.alert('Error', 'No authentication token received');
            return;
          }

          console.log('🔄 Login Form: Calling auth context login...');
          await login(data.user, data.token);
          console.log('✅ Login Form: Auth context login completed');
          // Navigation is handled in the login function
        } catch (error) {
          console.error('❌ Login Form: Error saving login data:', error);
          Alert.alert('Error', 'Failed to save login data');
        }
      },
      onError: (error) => {
        console.error('❌ Login Form: Login mutation failed:', error);
        setErrors({ password: error.message });
      }
    });
  };

  const handleBackToEmail = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setStep('email');
      setPassword('');
      setErrors({});
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {step === 'email' ? (
        <View style={styles.stepContainer}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: theme.dark ? "#fff" : "#000" }]}>
              What's your email?
            </Text>
            <Text style={[styles.subtitle, { color: theme.dark ? "#ccc" : "#666" }]}>
              Enter your email address to continue
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <View style={[
              styles.inputWrapper,
              { 
                backgroundColor: theme.dark ? "#2a2a2a" : "#fff",
                borderColor: errors.email ? "#FF4444" : (theme.dark ? "#3a3a3a" : "#e0e0e0")
              }
            ]}>
              <Ionicons 
                name="mail-outline" 
                size={scale(20)} 
                color={theme.dark ? "#888" : "#999"} 
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.dark ? "#fff" : "#000" }]}
                placeholder="Enter your email"
                placeholderTextColor={theme.dark ? "#888" : "#999"}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          <Pressable
            style={[
              styles.button,
              { 
                backgroundColor: email.trim() && !isLoading ? "#4A90E2" : (theme.dark ? "#3a3a3a" : "#e0e0e0"),
                opacity: email.trim() && !isLoading ? 1 : 0.6
              }
            ]}
            onPress={handleEmailSubmit}
            disabled={!email.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.stepContainer}>
          <View style={styles.titleContainer}>
            <Pressable onPress={handleBackToEmail} style={styles.backButton}>
              <Ionicons name="arrow-back" size={scale(24)} color={theme.dark ? "#fff" : "#000"} />
            </Pressable>
            <Text style={[styles.title, { color: theme.dark ? "#fff" : "#000" }]}>
              Enter your password
            </Text>
            <Text style={[styles.subtitle, { color: theme.dark ? "#ccc" : "#666" }]}>
              Welcome back, {email}
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <View style={[
              styles.inputWrapper,
              { 
                backgroundColor: theme.dark ? "#2a2a2a" : "#fff",
                borderColor: errors.password ? "#FF4444" : (theme.dark ? "#3a3a3a" : "#e0e0e0")
              }
            ]}>
              <Ionicons 
                name="lock-closed-outline" 
                size={scale(20)} 
                color={theme.dark ? "#888" : "#999"} 
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.dark ? "#fff" : "#000" }]}
                placeholder="Enter your password"
                placeholderTextColor={theme.dark ? "#888" : "#999"}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={scale(20)} 
                  color={theme.dark ? "#888" : "#999"} 
                />
              </Pressable>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: password.trim() && !isLoading ? "#4A90E2" : (theme.dark ? "#3a3a3a" : "#e0e0e0"),
                opacity: password.trim() && !isLoading ? 1 : 0.6
              }
            ]}
            onPress={handleLogin}
            disabled={!password.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </Pressable>

          {/* Forgot Password Link */}
          <Pressable
            style={styles.forgotPasswordContainer}
            onPress={() => router.push('/(routes)/forgot-password')}
          >
            <Text style={[styles.forgotPasswordText, { color: "#4A90E2" }]}>
              Forgot Password?
            </Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: scale(20),
  },
  stepContainer: {
    flex: 1,
  },
  titleContainer: {
    marginBottom: verticalScale(40),
  },
  backButton: {
    marginBottom: verticalScale(20),
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: verticalScale(8),
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: verticalScale(30),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    height: verticalScale(48), // Fixed height instead of padding
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputIcon: {
    marginRight: scale(12),
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  eyeButton: {
    padding: scale(4),
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    marginTop: verticalScale(8),
    marginLeft: scale(4),
  },
  button: {
    height: verticalScale(48), // Fixed height instead of padding
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: verticalScale(16),
  },
  forgotPasswordText: {
    fontSize: scale(14),
    fontWeight: '600',
  },
});
