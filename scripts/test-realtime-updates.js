/**
 * Test Script: Real-time Updates with TanStack Query
 * 
 * This script demonstrates how TanStack Query provides real-time updates
 * by toggling a user's subscription status and showing how the React Native
 * app automatically reflects the changes without manual refresh.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRealtimeUpdates() {
  console.log('🧪 Testing Real-time Updates with TanStack Query\n');

  try {
    // Find the test user
    const user = await prisma.user.findUnique({
      where: { email: 'abu49539@gmail.com' },
      select: { 
        id: true,
        email: true, 
        name: true, 
        stripeCustomerId: true
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 Test User Found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Current Subscription: ${user.stripeCustomerId || 'NONE'}`);
    console.log(`   Has Active Subscription: ${user.stripeCustomerId ? 'YES' : 'NO'}\n`);

    // Test 1: Remove subscription (if exists)
    if (user.stripeCustomerId) {
      console.log('🔄 Test 1: Removing subscription...');
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: null }
      });
      console.log('✅ Subscription removed');
      console.log('📱 React Native app should now show "❌ NO" subscription');
      console.log('🚫 "Your Laundry" should redirect to no-package screen\n');
      
      // Wait for user to observe changes
      await waitForUser('Press Enter after observing the app changes...');
    }

    // Test 2: Add subscription
    console.log('🔄 Test 2: Adding subscription...');
    const newStripeCustomerId = `cus_test_${user.email.split('@')[0]}_${Date.now()}`;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: newStripeCustomerId }
    });
    console.log(`✅ Subscription added: ${newStripeCustomerId}`);
    console.log('📱 React Native app should now show "✅ YES" subscription');
    console.log('🎯 "Your Laundry" should navigate to laundry screen\n');
    
    await waitForUser('Press Enter after observing the app changes...');

    // Test 3: Toggle subscription multiple times to show real-time updates
    console.log('🔄 Test 3: Rapid subscription toggles (every 3 seconds)...');
    console.log('📱 Watch the React Native app update in real-time!\n');

    for (let i = 0; i < 6; i++) {
      const isEven = i % 2 === 0;
      const action = isEven ? 'Removing' : 'Adding';
      const newValue = isEven ? null : `cus_toggle_${Date.now()}`;
      
      console.log(`${i + 1}/6: ${action} subscription...`);
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: newValue }
      });
      
      console.log(`   Status: ${newValue ? '✅ YES' : '❌ NO'}`);
      console.log(`   App should show: ${newValue ? 'Subscription Active' : 'No Subscription'}`);
      
      if (i < 5) {
        console.log('   Waiting 3 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log('\n🎉 Real-time Update Test Complete!');
    console.log('\n📊 What you should have observed:');
    console.log('   ✅ App subscription status updated automatically');
    console.log('   ✅ No manual refresh required');
    console.log('   ✅ Navigation behavior changed based on subscription');
    console.log('   ✅ Debug info updated in real-time');
    console.log('   ✅ TanStack Query handled all caching and updates');

    // Restore original subscription
    console.log('\n🔄 Restoring original subscription...');
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: 'cus_dev_abu49539_1750425077036' }
    });
    console.log('✅ Original subscription restored');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function waitForUser(message) {
  return new Promise((resolve) => {
    process.stdout.write(message);
    process.stdin.once('data', () => {
      resolve();
    });
  });
}

// Instructions for running the test
console.log('📋 INSTRUCTIONS:');
console.log('1. Make sure your React Native app is running');
console.log('2. Navigate to the Home screen');
console.log('3. Keep the app visible while running this test');
console.log('4. Watch the subscription status and navigation behavior');
console.log('5. Press Enter to start the test...\n');

process.stdin.once('data', () => {
  testRealtimeUpdates();
});

export default testRealtimeUpdates;
