#!/usr/bin/env node

/**
 * Test Forgot Password Flow
 * Tests the complete forgot password functionality
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const SERVER_URI = process.env.EXPO_PUBLIC_SERVER_URI || 'http://localhost:3000';
const TEST_EMAIL = 'abusufian760.m@gmail.com';
const NEW_PASSWORD = 'NewPassword123!';

console.log('🔐 Testing Forgot Password Flow');
console.log('═'.repeat(40));
console.log(`📧 Test Email: ${TEST_EMAIL}`);
console.log(`🔑 New Password: ${NEW_PASSWORD}`);
console.log(`🌐 Server: ${SERVER_URI}\n`);

async function testForgotPasswordFlow() {
  try {
    // Step 1: Send OTP
    console.log('📤 Step 1: Sending OTP...');
    const otpResponse = await fetch(`${SERVER_URI}/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        purpose: 'forgot-password'
      }),
    });

    const otpResult = await otpResponse.json();
    
    if (!otpResponse.ok) {
      throw new Error(`OTP Error: ${otpResult.message}`);
    }
    
    console.log('✅ OTP sent successfully');
    console.log(`📨 Response: ${otpResult.message}\n`);

    // Step 2: Get OTP from console (in real app, user would enter this)
    console.log('🔍 Step 2: Getting OTP from server logs...');
    console.log('💡 In a real scenario, user would receive OTP via email');
    console.log('💡 For testing, check server console for the OTP code\n');
    
    // For testing, we'll use a mock OTP verification
    // In real testing, you'd need to get the actual OTP from server logs
    const mockOtp = '1234'; // This would be the actual OTP from server logs
    
    console.log('📤 Step 3: Verifying OTP...');
    const verifyResponse = await fetch(`${SERVER_URI}/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        otp: mockOtp
      }),
    });

    const verifyResult = await verifyResponse.json();
    
    if (!verifyResponse.ok) {
      console.log(`⚠️ OTP Verification failed (expected for mock OTP): ${verifyResult.message}`);
      console.log('💡 To complete the test, use the actual OTP from server logs\n');
      
      console.log('🧪 Testing Reset Password Endpoint Structure...');
      // Test the endpoint structure without valid OTP
      const resetResponse = await fetch(`${SERVER_URI}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: TEST_EMAIL,
          newPassword: NEW_PASSWORD
        }),
      });

      const resetResult = await resetResponse.json();
      
      if (resetResponse.status === 400 && resetResult.message.includes('verify your email')) {
        console.log('✅ Reset password endpoint is working correctly');
        console.log('✅ Properly requires OTP verification before password reset');
      } else {
        console.log('❌ Unexpected response from reset password endpoint');
        console.log(`Status: ${resetResponse.status}`);
        console.log(`Response: ${JSON.stringify(resetResult, null, 2)}`);
      }
      
      return;
    }
    
    console.log('✅ OTP verified successfully');
    console.log(`📨 Response: ${verifyResult.message}\n`);

    // Step 4: Reset Password
    console.log('📤 Step 4: Resetting password...');
    const resetResponse = await fetch(`${SERVER_URI}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        newPassword: NEW_PASSWORD
      }),
    });

    const resetResult = await resetResponse.json();
    
    if (!resetResponse.ok) {
      throw new Error(`Reset Password Error: ${resetResult.message}`);
    }
    
    console.log('✅ Password reset successfully');
    console.log(`📨 Response: ${resetResult.message}\n`);

    // Step 5: Test login with new password
    console.log('📤 Step 5: Testing login with new password...');
    const loginResponse = await fetch(`${SERVER_URI}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: NEW_PASSWORD
      }),
    });

    const loginResult = await loginResponse.json();
    
    if (!loginResponse.ok) {
      throw new Error(`Login Error: ${loginResult.message}`);
    }
    
    console.log('✅ Login successful with new password');
    console.log(`👤 User: ${loginResult.user.name}`);
    console.log(`📧 Email: ${loginResult.user.email}\n`);

    console.log('🎉 Forgot Password Flow Test Completed Successfully!');
    console.log('✅ All endpoints are working correctly');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure the server is running');
    console.log('2. Check that the test email exists in the database');
    console.log('3. For OTP verification, use the actual OTP from server logs');
    console.log('4. Ensure all environment variables are set correctly');
  }
}

// Run the test
testForgotPasswordFlow();
