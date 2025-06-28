import { useAuth } from "@/context/auth.context";
import { useTheme } from "@/context/theme.context";
import { useCompleteSignupMutation, useSendOtpMutation, useVerifyOtpMutation } from "@/hooks/mutations/useAuthMutations";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
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

type SignupStep = 'email' | 'otp' | 'details';

interface SignupData {
  email: string;
  otp: string;
  name: string;
  phone: string;
  password: string;
}

export default function SignupFlow() {
  const { theme } = useTheme();
  const { login } = useAuth();
  const sendOtpMutation = useSendOtpMutation();
  const verifyOtpMutation = useVerifyOtpMutation();
  const completeSignupMutation = useCompleteSignupMutation();
  const [step, setStep] = useState<SignupStep>('email');
  const [signupData, setSignupData] = useState<SignupData>({
    email: '',
    otp: '',
    name: '',
    phone: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<SignupData>>({});
  const [otpTimer, setOtpTimer] = useState(0);

  const isLoading = sendOtpMutation.isPending || verifyOtpMutation.isPending || completeSignupMutation.isPending;
  
  const [fadeAnim] = useState(new Animated.Value(1));
  const otpRefs = useRef<TextInput[]>([]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  };

  const startOtpTimer = () => {
    setOtpTimer(300); // 5 minutes
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendOtp = () => {
    setErrors({});

    if (!signupData.email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }

    if (!validateEmail(signupData.email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    sendOtpMutation.mutate({ email: signupData.email }, {
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

  const handleVerifyOtp = () => {
    setErrors({});

    if (signupData.otp.length !== 4) {
      setErrors({ otp: 'Please enter the 4-digit OTP' });
      return;
    }

    verifyOtpMutation.mutate({
      email: signupData.email,
      otp: signupData.otp
    }, {
      onSuccess: () => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setStep('details');
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

  const handleCompleteSignup = () => {
    setErrors({});

    // Validate all fields
    const newErrors: Partial<SignupData> = {};

    if (!signupData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!signupData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(signupData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!signupData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (signupData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    completeSignupMutation.mutate({
      email: signupData.email,
      name: signupData.name,
      phone: signupData.phone,
      password: signupData.password,
    }, {
      onSuccess: async (data) => {
        try {
          await login(data.user, data.token);
          Alert.alert('Success', 'Account created successfully!');
          // Navigation is handled in the login function
        } catch (error) {
          Alert.alert('Error', 'Failed to save account data');
        }
      },
      onError: (error) => {
        Alert.alert('Error', error.message);
      }
    });
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = signupData.otp.split('');
    newOtp[index] = value;
    const updatedOtp = newOtp.join('');
    
    setSignupData(prev => ({ ...prev, otp: updatedOtp }));
    
    // Auto-focus next input
    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleBackStep = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (step === 'otp') {
        setStep('email');
        setSignupData(prev => ({ ...prev, otp: '' }));
      } else if (step === 'details') {
        setStep('otp');
        setSignupData(prev => ({ ...prev, name: '', phone: '', password: '' }));
      }
      setErrors({});
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const renderEmailStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: theme.dark ? "#fff" : "#000" }]}>
          What's your email?
        </Text>
        <Text style={[styles.subtitle, { color: theme.dark ? "#ccc" : "#666" }]}>
          We'll send you a verification code
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
            value={signupData.email}
            onChangeText={(text) => setSignupData(prev => ({ ...prev, email: text }))}
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
            backgroundColor: signupData.email.trim() && !isLoading ? "#4A90E2" : (theme.dark ? "#3a3a3a" : "#e0e0e0"),
            opacity: signupData.email.trim() && !isLoading ? 1 : 0.6
          }
        ]}
        onPress={handleSendOtp}
        disabled={!signupData.email.trim() || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Send OTP</Text>
        )}
      </Pressable>
    </View>
  );

  const renderOtpStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.titleContainer}>
        <Pressable onPress={handleBackStep} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.dark ? "#fff" : "#000"} />
        </Pressable>
        <Text style={[styles.title, { color: theme.dark ? "#fff" : "#000" }]}>
          Enter verification code
        </Text>
        <Text style={[styles.subtitle, { color: theme.dark ? "#ccc" : "#666" }]}>
          We sent a 4-digit code to {signupData.email}
        </Text>
      </View>

      <View style={styles.otpContainer}>
        <View style={styles.otpInputs}>
          {[0, 1, 2, 3].map((index) => (
            <TextInput
              key={index}
              ref={(ref) => (otpRefs.current[index] = ref!)}
              style={[
                styles.otpInput,
                {
                  backgroundColor: theme.dark ? "#2a2a2a" : "#fff",
                  borderColor: errors.otp ? "#FF4444" : (theme.dark ? "#3a3a3a" : "#e0e0e0"),
                  color: theme.dark ? "#fff" : "#000"
                }
              ]}
              value={signupData.otp[index] || ''}
              onChangeText={(value) => handleOtpChange(value, index)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              editable={!isLoading}
            />
          ))}
        </View>
        {errors.otp && (
          <Text style={styles.errorText}>{errors.otp}</Text>
        )}

        <View style={styles.otpFooter}>
          {otpTimer > 0 ? (
            <Text style={[styles.timerText, { color: theme.dark ? "#ccc" : "#666" }]}>
              Resend code in {formatTime(otpTimer)}
            </Text>
          ) : (
            <Pressable onPress={handleSendOtp}>
              <Text style={styles.resendText}>Resend code</Text>
            </Pressable>
          )}
        </View>
      </View>

      <Pressable
        style={[
          styles.button,
          {
            backgroundColor: signupData.otp.length === 4 && !isLoading ? "#4A90E2" : (theme.dark ? "#3a3a3a" : "#e0e0e0"),
            opacity: signupData.otp.length === 4 && !isLoading ? 1 : 0.6
          }
        ]}
        onPress={handleVerifyOtp}
        disabled={signupData.otp.length !== 4 || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Verify</Text>
        )}
      </Pressable>
    </View>
  );

  const renderDetailsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.titleContainer}>
        <Pressable onPress={handleBackStep} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.dark ? "#fff" : "#000"} />
        </Pressable>
        <Text style={[styles.title, { color: theme.dark ? "#fff" : "#000" }]}>
          Complete your profile
        </Text>
        <Text style={[styles.subtitle, { color: theme.dark ? "#ccc" : "#666" }]}>
          Just a few more details to get started
        </Text>
      </View>

      <View style={styles.detailsForm}>
        {/* Name Input */}
        <View style={styles.inputContainer}>
          <View style={[
            styles.inputWrapper,
            {
              backgroundColor: theme.dark ? "#2a2a2a" : "#fff",
              borderColor: errors.name ? "#FF4444" : (theme.dark ? "#3a3a3a" : "#e0e0e0")
            }
          ]}>
            <Ionicons
              name="person-outline"
              size={scale(20)}
              color={theme.dark ? "#888" : "#999"}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: theme.dark ? "#fff" : "#000" }]}
              placeholder="Full name"
              placeholderTextColor={theme.dark ? "#888" : "#999"}
              value={signupData.name}
              onChangeText={(text) => setSignupData(prev => ({ ...prev, name: text }))}
              autoCapitalize="words"
              editable={!isLoading}
            />
          </View>
          {errors.name && (
            <Text style={styles.errorText}>{errors.name}</Text>
          )}
        </View>

        {/* Phone Input */}
        <View style={styles.inputContainer}>
          <View style={[
            styles.inputWrapper,
            {
              backgroundColor: theme.dark ? "#2a2a2a" : "#fff",
              borderColor: errors.phone ? "#FF4444" : (theme.dark ? "#3a3a3a" : "#e0e0e0")
            }
          ]}>
            <Ionicons
              name="call-outline"
              size={scale(20)}
              color={theme.dark ? "#888" : "#999"}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: theme.dark ? "#fff" : "#000" }]}
              placeholder="Phone number"
              placeholderTextColor={theme.dark ? "#888" : "#999"}
              value={signupData.phone}
              onChangeText={(text) => setSignupData(prev => ({ ...prev, phone: text }))}
              keyboardType="phone-pad"
              editable={!isLoading}
            />
          </View>
          {errors.phone && (
            <Text style={styles.errorText}>{errors.phone}</Text>
          )}
        </View>

        {/* Password Input */}
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
              placeholder="Password (min 6 characters)"
              placeholderTextColor={theme.dark ? "#888" : "#999"}
              value={signupData.password}
              onChangeText={(text) => setSignupData(prev => ({ ...prev, password: text }))}
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
      </View>

      <Pressable
        style={[
          styles.button,
          {
            backgroundColor: signupData.name.trim() && signupData.phone.trim() && signupData.password.trim() && !isLoading ? "#4A90E2" : (theme.dark ? "#3a3a3a" : "#e0e0e0"),
            opacity: signupData.name.trim() && signupData.phone.trim() && signupData.password.trim() && !isLoading ? 1 : 0.6
          }
        ]}
        onPress={handleCompleteSignup}
        disabled={!signupData.name.trim() || !signupData.phone.trim() || !signupData.password.trim() || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Create Account</Text>
        )}
      </Pressable>
    </View>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {step === 'email' && renderEmailStep()}
      {step === 'otp' && renderOtpStep()}
      {step === 'details' && renderDetailsStep()}
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
    marginBottom: verticalScale(20),
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
    marginTop: verticalScale(20),
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  otpContainer: {
    marginBottom: verticalScale(30),
  },
  otpInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(20),
  },
  otpInput: {
    width: scale(60),
    height: scale(60),
    borderWidth: 1,
    borderRadius: scale(12),
    fontSize: 24,
    fontWeight: '600',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  otpFooter: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 14,
    opacity: 0.8,
  },
  resendText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  detailsForm: {
    marginBottom: verticalScale(20),
  },
});
