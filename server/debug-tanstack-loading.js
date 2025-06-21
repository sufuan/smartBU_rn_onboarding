/**
 * Debug Script: TanStack Query Loading Issue
 * 
 * This script helps diagnose why TanStack Query is stuck in loading state
 * and provides solutions for the authentication/user loading problem.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugTanStackLoading() {
  console.log('🔍 Debugging TanStack Query Loading Issue\n');

  try {
    // Find the test user
    const user = await prisma.user.findUnique({
      where: { email: 'abu49539@gmail.com' },
      select: { 
        id: true,
        email: true, 
        name: true,
        stripeCustomerId: true,
        verified: true,
        createdAt: true
      }
    });

    if (!user) {
      console.log('❌ User not found in database');
      console.log('🔧 SOLUTION: User needs to log in first');
      return;
    }

    console.log('👤 User Found in Database:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Verified: ${user.verified}`);
    console.log(`   Subscription: ${user.stripeCustomerId ? 'YES' : 'NO'}`);
    console.log(`   Created: ${user.createdAt.toLocaleString()}\n`);

    console.log('🔍 COMMON CAUSES OF TANSTACK QUERY LOADING ISSUES:\n');

    console.log('❌ ISSUE 1: No Authentication Token');
    console.log('   • User hasn\'t logged in through the app');
    console.log('   • Access token not stored in SecureStore');
    console.log('   • Token expired and was cleared');
    console.log('   🔧 SOLUTION: User needs to log in again\n');

    console.log('❌ ISSUE 2: API Endpoint Issues');
    console.log('   • /me endpoint returning errors');
    console.log('   • Server not running or unreachable');
    console.log('   • Network connectivity issues');
    console.log('   🔧 SOLUTION: Check server status and network\n');

    console.log('❌ ISSUE 3: TanStack Query Configuration');
    console.log('   • Query not enabled properly');
    console.log('   • Infinite retry loops');
    console.log('   • Cache issues');
    console.log('   🔧 SOLUTION: Reset query cache or restart app\n');

    console.log('❌ ISSUE 4: React Native SecureStore Issues');
    console.log('   • SecureStore not accessible');
    console.log('   • Token retrieval failing silently');
    console.log('   • Platform-specific storage issues');
    console.log('   🔧 SOLUTION: Clear app data and re-login\n');

    console.log('🧪 DEBUGGING STEPS FOR THE APP:\n');

    console.log('📱 STEP 1: Check Authentication Status');
    console.log('1. Open React Native app');
    console.log('2. Check if user is logged in');
    console.log('3. Look for login screen vs main app');
    console.log('4. If not logged in → Go to login screen\n');

    console.log('📱 STEP 2: Check Network Connectivity');
    console.log('1. Ensure device/simulator has internet');
    console.log('2. Check if server is running on correct port');
    console.log('3. Verify EXPO_PUBLIC_SERVER_URI is correct');
    console.log('4. Test API endpoints manually\n');

    console.log('📱 STEP 3: Check TanStack Query Debug Info');
    console.log('1. Look at the debug component on home screen');
    console.log('2. Check console logs for API errors');
    console.log('3. Look for 401, 403, or 500 errors');
    console.log('4. Check if queries are retrying infinitely\n');

    console.log('📱 STEP 4: Force Re-login');
    console.log('1. Clear app data (if possible)');
    console.log('2. Force close and restart app');
    console.log('3. Go through login flow again');
    console.log('4. Check if TanStack Query starts working\n');

    console.log('🔧 QUICK FIXES TO TRY:\n');

    console.log('✅ FIX 1: Restart Development Server');
    console.log('   cd server && npm start\n');

    console.log('✅ FIX 2: Restart React Native App');
    console.log('   npx expo start --clear\n');

    console.log('✅ FIX 3: Clear App Cache');
    console.log('   • iOS Simulator: Device → Erase All Content and Settings');
    console.log('   • Android Emulator: Wipe data from AVD Manager');
    console.log('   • Physical device: Uninstall and reinstall app\n');

    console.log('✅ FIX 4: Check Environment Variables');
    console.log('   • Verify EXPO_PUBLIC_SERVER_URI in .env');
    console.log('   • Ensure server is accessible from device/simulator');
    console.log('   • Check network configuration\n');

    console.log('🎯 EXPECTED BEHAVIOR AFTER FIX:');
    console.log('   • TanStack Query Debug shows: Loading: NO');
    console.log('   • User information displays correctly');
    console.log('   • Subscription status shows properly');
    console.log('   • Stripe ID appears (if user has subscription)');
    console.log('   • No infinite loading states\n');

    console.log('📊 TESTING THE /me ENDPOINT:');
    console.log('You can test the /me endpoint manually:');
    console.log('1. Get an access token by logging in');
    console.log('2. Use curl or Postman to test:');
    console.log('   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/me');
    console.log('3. Should return user data without errors\n');

    console.log('🚨 IF STILL STUCK:');
    console.log('1. Check server logs for errors');
    console.log('2. Check React Native console for errors');
    console.log('3. Verify database connection');
    console.log('4. Test with a fresh user account');
    console.log('5. Check if JWT_SECRET_KEY is configured correctly\n');

    console.log('🎉 Once Fixed, You Should See:');
    console.log('   • Home screen loads properly');
    console.log('   • My Bookings section works');
    console.log('   • Slot booking functions correctly');
    console.log('   • Real-time updates work');
    console.log('   • No more infinite loading states');

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTanStackLoading();
