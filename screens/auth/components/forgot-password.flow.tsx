import { useTheme } from "@/context/theme.context";
import { useResetPasswordMutation, useSendOtpMutation, useVerifyOtpMutation } from "@/hooks/mutations/useAuthMutations";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { scale, verticalScale } from "react-native-size-matters";

type ForgotPasswordStep = 'email' | 'otp' | 'password' | 'success';

interface ForgotPasswordData {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ForgotPasswordFlow() {
  const { theme } = useTheme();
  const sendOtpMutation = useSendOtpMutation();
  const verifyOtpMutation = useVerifyOtpMutation();
  const resetPasswordMutation = useResetPasswordMutation();
  
  const [step, setStep] = useState<ForgotPasswordStep>('email');
  const [forgotPasswordData, setForgotPasswordData] = useState<ForgotPasswordData>({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Partial<ForgotPasswordData>>({});
  const [fadeAnim] = useState(new Animated.Value(1));
  const [otpTimer, setOtpTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const otpRefs = useRef<(TextInput | null)[]>([]);

  // Validation helper
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // OTP Timer
  const startOtpTimer = () => {
    setOtpTimer(60);
    const interval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle email submission
  const handleSendOtp = () => {
    setErrors({});

    if (!forgotPasswordData.email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }

    if (!validateEmail(forgotPasswordData.email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    sendOtpMutation.mutate({ email: forgotPasswordData.email, purpose: 'forgot-password' }, {
      onSuccess: () => {
        startOtpTimer();
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setStep('otp');
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();
        });
      },
      onError: (error) => {
        setErrors({ email: error.message });
      }
    });
  };

  // Handle OTP verification
  const handleVerifyOtp = () => {
    setErrors({});

    if (forgotPasswordData.otp.length !== 4) {
      setErrors({ otp: 'Please enter the 4-digit OTP' });
      return;
    }

    verifyOtpMutation.mutate({
      email: forgotPasswordData.email,
      otp: forgotPasswordData.otp
    }, {
      onSuccess: () => {
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
      },
      onError: (error) => {
        setErrors({ otp: error.message });
      }
    });
  };

  // Handle password reset
  const handleResetPassword = () => {
    setErrors({});

    if (!forgotPasswordData.newPassword.trim()) {
      setErrors({ newPassword: 'Password is required' });
      return;
    }

    if (forgotPasswordData.newPassword.length < 6) {
      setErrors({ newPassword: 'Password must be at least 6 characters' });
      return;
    }

    if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    resetPasswordMutation.mutate({
      email: forgotPasswordData.email,
      newPassword: forgotPasswordData.newPassword
    }, {
      onSuccess: () => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setStep('success');
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();
        });
      },
      onError: (error) => {
        setErrors({ newPassword: error.message });
      }
    });
  };

  // Handle OTP input change
  const handleOtpChange = (value: string, index: number) => {
    const newOtp = forgotPasswordData.otp.split('');
    newOtp[index] = value;
    const otpString = newOtp.join('');
    
    setForgotPasswordData(prev => ({ ...prev, otp: otpString }));
    
    // Auto-focus next input
    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP backspace
  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !forgotPasswordData.otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Back navigation handlers
  const handleBackToEmail = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setStep('email');
      setErrors({});
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleBackToOtp = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setStep('otp');
      setErrors({});
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const isLoading = sendOtpMutation.isPending || verifyOtpMutation.isPending || resetPasswordMutation.isPending;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {step === 'email' && (
        <View style={styles.stepContainer}>
          <View style={styles.titleContainer}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={scale(24)} color={theme.dark ? "#fff" : "#000"} />
            </Pressable>
            <Text style={[styles.title, { color: theme.dark ? "#fff" : "#000" }]}>
              Forgot Password?
            </Text>
            <Text style={[styles.subtitle, { color: theme.dark ? "#ccc" : "#666" }]}>
              Enter your email address and we'll send you a code to reset your password
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
                value={forgotPasswordData.email}
                onChangeText={(text) => setForgotPasswordData(prev => ({ ...prev, email: text }))}
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
                backgroundColor: forgotPasswordData.email.trim() && !isLoading ? "#4A90E2" : (theme.dark ? "#3a3a3a" : "#e0e0e0"),
                opacity: forgotPasswordData.email.trim() && !isLoading ? 1 : 0.6
              }
            ]}
            onPress={handleSendOtp}
            disabled={!forgotPasswordData.email.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Code</Text>
            )}
          </Pressable>
        </View>
      )}

      {step === 'otp' && (
        <View style={styles.stepContainer}>
          <View style={styles.titleContainer}>
            <Pressable onPress={handleBackToEmail} style={styles.backButton}>
              <Ionicons name="arrow-back" size={scale(24)} color={theme.dark ? "#fff" : "#000"} />
            </Pressable>
            <Text style={[styles.title, { color: theme.dark ? "#fff" : "#000" }]}>
              Enter verification code
            </Text>
            <Text style={[styles.subtitle, { color: theme.dark ? "#ccc" : "#666" }]}>
              We sent a 4-digit code to {forgotPasswordData.email}
            </Text>
          </View>

          <View style={styles.otpContainer}>
            <View style={styles.otpInputContainer}>
              {[0, 1, 2, 3].map((index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (otpRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    {
                      backgroundColor: theme.dark ? "#2a2a2a" : "#fff",
                      borderColor: errors.otp ? "#FF4444" : (theme.dark ? "#3a3a3a" : "#e0e0e0"),
                      color: theme.dark ? "#fff" : "#000"
                    }
                  ]}
                  value={forgotPasswordData.otp[index] || ''}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                  editable={!isLoading}
                />
              ))}
            </View>
            {errors.otp && (
              <Text style={styles.errorText}>{errors.otp}</Text>
            )}
          </View>

          <View style={styles.resendContainer}>
            {otpTimer > 0 ? (
              <Text style={[styles.timerText, { color: theme.dark ? "#ccc" : "#666" }]}>
                Resend code in {otpTimer}s
              </Text>
            ) : (
              <Pressable onPress={handleSendOtp} disabled={isLoading}>
                <Text style={[styles.resendText, { color: "#4A90E2" }]}>
                  Resend code
                </Text>
              </Pressable>
            )}
          </View>

          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: forgotPasswordData.otp.length === 4 && !isLoading ? "#4A90E2" : (theme.dark ? "#3a3a3a" : "#e0e0e0"),
                opacity: forgotPasswordData.otp.length === 4 && !isLoading ? 1 : 0.6
              }
            ]}
            onPress={handleVerifyOtp}
            disabled={forgotPasswordData.otp.length !== 4 || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Verify Code</Text>
            )}
          </Pressable>
        </View>
      )}

      {step === 'password' && (
        <View style={styles.stepContainer}>
          <View style={styles.titleContainer}>
            <Pressable onPress={handleBackToOtp} style={styles.backButton}>
              <Ionicons name="arrow-back" size={scale(24)} color={theme.dark ? "#fff" : "#000"} />
            </Pressable>
            <Text style={[styles.title, { color: theme.dark ? "#fff" : "#000" }]}>
              Create new password
            </Text>
            <Text style={[styles.subtitle, { color: theme.dark ? "#ccc" : "#666" }]}>
              Your new password must be different from your previous password
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <View style={[
              styles.inputWrapper,
              {
                backgroundColor: theme.dark ? "#2a2a2a" : "#fff",
                borderColor: errors.newPassword ? "#FF4444" : (theme.dark ? "#3a3a3a" : "#e0e0e0")
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
                placeholder="New password"
                placeholderTextColor={theme.dark ? "#888" : "#999"}
                value={forgotPasswordData.newPassword}
                onChangeText={(text) => setForgotPasswordData(prev => ({ ...prev, newPassword: text }))}
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
            {errors.newPassword && (
              <Text style={styles.errorText}>{errors.newPassword}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <View style={[
              styles.inputWrapper,
              {
                backgroundColor: theme.dark ? "#2a2a2a" : "#fff",
                borderColor: errors.confirmPassword ? "#FF4444" : (theme.dark ? "#3a3a3a" : "#e0e0e0")
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
                placeholder="Confirm new password"
                placeholderTextColor={theme.dark ? "#888" : "#999"}
                value={forgotPasswordData.confirmPassword}
                onChangeText={(text) => setForgotPasswordData(prev => ({ ...prev, confirmPassword: text }))}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <Pressable
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                  size={scale(20)}
                  color={theme.dark ? "#888" : "#999"}
                />
              </Pressable>
            </View>
            {errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}
          </View>

          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: forgotPasswordData.newPassword.trim() && forgotPasswordData.confirmPassword.trim() && !isLoading ? "#4A90E2" : (theme.dark ? "#3a3a3a" : "#e0e0e0"),
                opacity: forgotPasswordData.newPassword.trim() && forgotPasswordData.confirmPassword.trim() && !isLoading ? 1 : 0.6
              }
            ]}
            onPress={handleResetPassword}
            disabled={!forgotPasswordData.newPassword.trim() || !forgotPasswordData.confirmPassword.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </Pressable>
        </View>
      )}

      {step === 'success' && (
        <View style={styles.stepContainer}>
          <View style={styles.successContainer}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={scale(80)} color="#4CAF50" />
            </View>
            <Text style={[styles.successTitle, { color: theme.dark ? "#fff" : "#000" }]}>
              Password Reset Successful!
            </Text>
            <Text style={[styles.successSubtitle, { color: theme.dark ? "#ccc" : "#666" }]}>
              Your password has been successfully reset. You can now login with your new password.
            </Text>
          </View>

          <Pressable
            style={[styles.button, { backgroundColor: "#4A90E2" }]}
            onPress={() => router.replace('/(routes)/auth')}
          >
            <Text style={styles.buttonText}>Back to Login</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(60),
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titleContainer: {
    marginBottom: verticalScale(40),
  },
  backButton: {
    marginBottom: verticalScale(20),
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: scale(28),
    fontWeight: 'bold',
    marginBottom: verticalScale(8),
  },
  subtitle: {
    fontSize: scale(16),
    lineHeight: scale(22),
  },
  inputContainer: {
    marginBottom: verticalScale(20),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    height: verticalScale(48), // Consistent with other forms
  },
  inputIcon: {
    marginRight: scale(12),
  },
  input: {
    flex: 1,
    fontSize: scale(16),
    height: '100%',
  },
  eyeButton: {
    padding: scale(4),
  },
  button: {
    height: verticalScale(48), // Consistent with other forms
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  buttonText: {
    color: '#fff',
    fontSize: scale(16),
    fontWeight: '600',
  },
  errorText: {
    color: '#FF4444',
    fontSize: scale(14),
    marginTop: verticalScale(8),
  },
  otpContainer: {
    alignItems: 'center',
    marginBottom: verticalScale(30),
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: verticalScale(20),
  },
  otpInput: {
    width: scale(50),
    height: scale(50),
    borderWidth: 1,
    borderRadius: scale(12),
    fontSize: scale(20),
    fontWeight: 'bold',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: verticalScale(30),
  },
  timerText: {
    fontSize: scale(14),
  },
  resendText: {
    fontSize: scale(14),
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  successIconContainer: {
    marginBottom: verticalScale(30),
  },
  successTitle: {
    fontSize: scale(24),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: verticalScale(12),
  },
  successSubtitle: {
    fontSize: scale(16),
    textAlign: 'center',
    lineHeight: scale(22),
    paddingHorizontal: scale(20),
  },
});
