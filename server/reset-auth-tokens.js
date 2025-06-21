/**
 * Reset Authentication Tokens Script
 * 
 * This script helps reset authentication tokens and test login flow
 * to fix TanStack Query loading issues.
 */

import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function resetAuthTokens() {
  console.log('🔧 Reset Authentication Tokens Tool\n');

  try {
    // Find the test user
    const user = await prisma.user.findUnique({
      where: { email: 'abu49539@gmail.com' },
      select: { 
        id: true,
        email: true, 
        name: true,
        password: true,
        verified: true,
        stripeCustomerId: true
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 User Information:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Verified: ${user.verified}`);
    console.log(`   Has Password: ${user.password ? 'YES' : 'NO'}`);
    console.log(`   Subscription: ${user.stripeCustomerId ? 'YES' : 'NO'}\n`);

    console.log('🔧 AUTHENTICATION TROUBLESHOOTING:\n');

    console.log('📱 STEP 1: Check Current App State');
    console.log('1. Open React Native app');
    console.log('2. Look at TanStack Query Debug section');
    console.log('3. Check "Auth Token" status');
    console.log('4. Note current loading state\n');

    console.log('🔑 STEP 2: Generate Fresh Token (for testing)');
    
    if (!process.env.JWT_SECRET_KEY) {
      console.log('❌ JWT_SECRET_KEY not found in environment variables');
      console.log('🔧 Add JWT_SECRET_KEY to your .env file');
      return;
    }

    // Generate a fresh token for testing
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: '7d' });
    
    console.log('✅ Fresh token generated for testing:');
    console.log(`   Token: ${token.substring(0, 50)}...`);
    console.log(`   Expires: 7 days from now\n`);

    console.log('🧪 STEP 3: Test Token Manually');
    console.log('You can test this token with curl:');
    console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/me\n`);

    console.log('📱 STEP 4: Fix App Authentication');
    console.log('Choose one of these solutions:\n');

    console.log('✅ SOLUTION 1: Force Re-login in App');
    console.log('1. Clear app data/cache');
    console.log('2. Restart the app');
    console.log('3. Go through login flow again');
    console.log('4. Check if TanStack Query starts working\n');

    console.log('✅ SOLUTION 2: Clear SecureStore (iOS Simulator)');
    console.log('1. iOS Simulator → Device → Erase All Content and Settings');
    console.log('2. Restart React Native app');
    console.log('3. Login again\n');

    console.log('✅ SOLUTION 3: Clear App Data (Android)');
    console.log('1. Android Emulator → Settings → Apps → Your App → Storage');
    console.log('2. Clear Data');
    console.log('3. Restart app and login\n');

    console.log('✅ SOLUTION 4: Restart Development Environment');
    console.log('1. Stop React Native: Ctrl+C');
    console.log('2. Stop Server: Ctrl+C');
    console.log('3. Clear caches: npx expo start --clear');
    console.log('4. Restart server: npm start');
    console.log('5. Login again\n');

    console.log('🔍 STEP 5: Verify Fix');
    console.log('After applying a solution, check:');
    console.log('   • Auth Token: ✅ FOUND');
    console.log('   • Loading: NO');
    console.log('   • Authenticated: ✅ YES');
    console.log('   • User: Shows email address');
    console.log('   • Subscription: Shows correct status\n');

    console.log('🚨 COMMON ISSUES AND FIXES:\n');

    console.log('❌ ISSUE: "Auth Token: ❌ MISSING"');
    console.log('   🔧 FIX: User needs to log in through the app\n');

    console.log('❌ ISSUE: "Auth Token: ✅ FOUND" but "Loading: YES" forever');
    console.log('   🔧 FIX: Server might be down or API endpoint issues');
    console.log('   • Check server is running on correct port');
    console.log('   • Verify EXPO_PUBLIC_SERVER_URI is correct');
    console.log('   • Check network connectivity\n');

    console.log('❌ ISSUE: "Authenticated: ❌ NO" with token present');
    console.log('   🔧 FIX: Token might be expired or invalid');
    console.log('   • Clear app data and re-login');
    console.log('   • Check server logs for 401 errors\n');

    console.log('❌ ISSUE: App shows login screen but user exists');
    console.log('   🔧 FIX: Authentication flow issue');
    console.log('   • Check login API endpoint');
    console.log('   • Verify password is correct');
    console.log('   • Check user verification status\n');

    console.log('🎯 EXPECTED FINAL STATE:');
    console.log('   • TanStack Query Debug shows all green checkmarks');
    console.log('   • User information displays correctly');
    console.log('   • My Bookings section works');
    console.log('   • Slot booking functions properly');
    console.log('   • No infinite loading states');

    console.log('\n🎉 Once authentication is fixed, all TanStack Query');
    console.log('features should work correctly!');

  } catch (error) {
    console.error('❌ Error during token reset:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAuthTokens();
