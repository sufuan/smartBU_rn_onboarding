#!/usr/bin/env node

/**
 * Complete Forgot Password Flow Test
 * Tests the entire flow with actual OTP
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const SERVER_URI = process.env.EXPO_PUBLIC_SERVER_URI || 'http://localhost:3000';
const TEST_EMAIL = 'abusufian760.m@gmail.com';
const NEW_PASSWORD = 'NewPassword123!';

console.log('🔐 Complete Forgot Password Flow Test');
console.log('═'.repeat(45));
console.log(`📧 Test Email: ${TEST_EMAIL}`);
console.log(`🔑 New Password: ${NEW_PASSWORD}`);
console.log(`🌐 Server: ${SERVER_URI}\n`);

async function testCompleteForgotPasswordFlow() {
  try {
    // Step 1: Send OTP
    console.log('📤 Step 1: Sending OTP for forgot password...');
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
    console.log(`📨 Response: ${otpResult.message}`);
    console.log('💡 Check server console for the OTP code\n');

    // Wait for user to check server logs
    console.log('⏳ Please check the server console for the OTP and enter it below:');
    
    // For automated testing, we'll use the OTP from the server logs
    const actualOtp = '2559'; // Updated with the actual OTP from server logs
    
    console.log(`🔢 Using OTP: ${actualOtp}\n`);

    // Step 2: Verify OTP
    console.log('📤 Step 2: Verifying OTP...');
    const verifyResponse = await fetch(`${SERVER_URI}/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        otp: actualOtp
      }),
    });

    const verifyResult = await verifyResponse.json();
    
    if (!verifyResponse.ok) {
      throw new Error(`OTP Verification Error: ${verifyResult.message}`);
    }
    
    console.log('✅ OTP verified successfully');
    console.log(`📨 Response: ${verifyResult.message}\n`);

    // Step 3: Reset Password
    console.log('📤 Step 3: Resetting password...');
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

    // Step 4: Test login with new password
    console.log('📤 Step 4: Testing login with new password...');
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
    console.log(`📧 Email: ${loginResult.user.email}`);
    console.log(`🔑 Token: ${loginResult.token.substring(0, 20)}...\n`);

    console.log('🎉 Complete Forgot Password Flow Test PASSED!');
    console.log('✅ All endpoints are working correctly');
    console.log('✅ OTP verification works');
    console.log('✅ Password reset works');
    console.log('✅ Login with new password works');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure the server is running');
    console.log('2. Check that the test email exists in the database');
    console.log('3. Use the actual OTP from server logs (update the script)');
    console.log('4. Ensure all environment variables are set correctly');
  }
}

// Run the test
testCompleteForgotPasswordFlow();
