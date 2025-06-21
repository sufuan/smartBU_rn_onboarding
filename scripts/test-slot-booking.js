/**
 * Test Script: Slot Booking with TanStack Query
 * 
 * This script tests the slot booking functionality to ensure
 * TanStack Query mutations are working properly.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSlotBooking() {
  console.log('🎯 Testing Slot Booking with TanStack Query\n');

  try {
    // Find the test user
    const user = await prisma.user.findUnique({
      where: { email: 'abu49539@gmail.com' },
      select: { 
        id: true,
        email: true, 
        stripeCustomerId: true
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    // Ensure user has subscription
    if (!user.stripeCustomerId) {
      console.log('🔄 Adding subscription for testing...');
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: `cus_test_${Date.now()}` }
      });
      console.log('✅ Subscription added');
    }

    console.log('👤 Test User:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Has Subscription: YES\n`);

    console.log('📱 SLOT BOOKING TEST INSTRUCTIONS:');
    console.log('1. Open your React Native app');
    console.log('2. Navigate to Home screen');
    console.log('3. Tap "Your Laundry" (should work now)');
    console.log('4. Find a washing machine with available slots');
    console.log('5. Tap "Book Slot" on any available slot');
    console.log('6. Watch for TanStack Query mutation behavior\n');

    console.log('🎯 Expected Behavior:');
    console.log('   ✅ Button shows "Booking..." immediately');
    console.log('   ✅ Optimistic update removes slot from list');
    console.log('   ✅ Success alert shows booking confirmation');
    console.log('   ✅ No infinite "checking subscription" loops');
    console.log('   ✅ Automatic cache invalidation updates data\n');

    console.log('🚨 If you see infinite "checking subscription":');
    console.log('   • The old subscription logic is still running');
    console.log('   • TanStack Query integration needs adjustment');
    console.log('   • Check console logs for debugging info\n');

    console.log('✅ If slot booking works smoothly:');
    console.log('   • TanStack Query mutations are working correctly');
    console.log('   • Optimistic updates are functioning');
    console.log('   • Cache invalidation is working');
    console.log('   • Real-time data sync is operational\n');

    console.log('Press Enter to continue...');
    await waitForUser('');

    // Check current slots to see if any bookings were made
    const currentSlots = await prisma.slot.findMany({
      where: { userId: user.id },
      include: { machine: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (currentSlots.length > 0) {
      console.log('\n📊 Recent Slot Bookings:');
      currentSlots.forEach((slot, index) => {
        console.log(`   ${index + 1}. Machine: ${slot.machine.machineId}`);
        console.log(`      Time: ${new Date(slot.slotTime).toLocaleString()}`);
        console.log(`      Status: ${slot.status}`);
        console.log(`      Auth Code: ${slot.authCode || 'N/A'}\n`);
      });
    } else {
      console.log('\n📊 No recent slot bookings found');
      console.log('   Try booking a slot in the app to test the functionality\n');
    }

    console.log('🎉 Slot Booking Test Complete!');
    console.log('\nIf slot booking worked without infinite loops,');
    console.log('TanStack Query integration is successful! 🚀');

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

testSlotBooking();

export default testSlotBooking;
