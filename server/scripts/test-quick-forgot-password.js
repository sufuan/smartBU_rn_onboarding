#!/usr/bin/env node

/**
 * Quick Forgot Password Test
 * Tests with immediate OTP verification
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const SERVER_URI = process.env.EXPO_PUBLIC_SERVER_URI || 'http://localhost:3000';
const TEST_EMAIL = 'abusufian760.m@gmail.com';
const NEW_PASSWORD = 'QuickTest123!';

console.log('⚡ Quick Forgot Password Test');
console.log('═'.repeat(35));

async function quickTest() {
  try {
    // Send OTP
    console.log('📤 Sending OTP...');
    const otpResponse = await fetch(`${SERVER_URI}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        purpose: 'forgot-password'
      }),
    });

    if (!otpResponse.ok) {
      const error = await otpResponse.json();
      throw new Error(`OTP Error: ${error.message}`);
    }
    
    console.log('✅ OTP sent - check server console for the code');
    console.log('💡 Update the OTP in this script and run again\n');
    
    // Use the latest OTP from server logs
    const latestOtp = '9321'; // Updated with the actual OTP from server console
    
    console.log(`🔢 Testing with OTP: ${latestOtp}`);
    
    // Verify OTP immediately
    const verifyResponse = await fetch(`${SERVER_URI}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        otp: latestOtp
      }),
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      console.log(`⚠️ OTP verification failed: ${error.message}`);
      console.log('💡 The OTP might have expired or be incorrect');
      return;
    }
    
    console.log('✅ OTP verified successfully');
    
    // Reset password
    const resetResponse = await fetch(`${SERVER_URI}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        newPassword: NEW_PASSWORD
      }),
    });

    if (!resetResponse.ok) {
      const error = await resetResponse.json();
      throw new Error(`Reset Error: ${error.message}`);
    }
    
    console.log('✅ Password reset successfully');
    
    // Test login
    const loginResponse = await fetch(`${SERVER_URI}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: NEW_PASSWORD
      }),
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      throw new Error(`Login Error: ${error.message}`);
    }
    
    const loginResult = await loginResponse.json();
    console.log('✅ Login successful with new password');
    console.log(`👤 User: ${loginResult.user.name}`);
    
    console.log('\n🎉 FORGOT PASSWORD FLOW WORKS PERFECTLY!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

quickTest();
