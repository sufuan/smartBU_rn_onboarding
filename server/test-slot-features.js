/**
 * Test Script: Complete Slot Features
 * 
 * This script tests all the slot-related features:
 * 1. Individual slot loading states
 * 2. Disabled booked slots
 * 3. My Bookings section visibility
 * 4. User's own booked slots display
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSlotFeatures() {
  console.log('🎯 Testing Complete Slot Features\n');

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

    console.log('📱 COMPLETE SLOT FEATURES TEST:\n');

    console.log('🔧 FEATURE 1: Individual Slot Loading States');
    console.log('1. Open React Native app');
    console.log('2. Navigate to "Your Laundry"');
    console.log('3. Find machine with multiple slots');
    console.log('4. Click ONE slot button');
    console.log('5. ✅ ONLY that button should show "Booking..."');
    console.log('6. ✅ OTHER buttons should remain "Book Slot"\n');

    console.log('🔧 FEATURE 2: Disabled Booked Slots');
    console.log('1. After booking a slot successfully');
    console.log('2. ✅ That slot should show "Booked" (green button)');
    console.log('3. ✅ "Booked" button should be disabled');
    console.log('4. ✅ Other slots should still be clickable\n');

    console.log('🔧 FEATURE 3: My Bookings Section');
    console.log('1. In the laundry screen');
    console.log('2. ✅ Should see "My Bookings" section at the top');
    console.log('3. ✅ Should show your booked slots horizontally');
    console.log('4. ✅ Each booking should show machine, time, date\n');

    console.log('🔧 FEATURE 4: Control Screen My Booking');
    console.log('1. After booking a slot, you get an auth code');
    console.log('2. Navigate to the control screen');
    console.log('3. ✅ Should see "My Booking" section');
    console.log('4. ✅ Should show slot time, machine ID, countdown\n');

    console.log('Press Enter to check current bookings...');
    await waitForUser('');

    // Check current user bookings
    const userBookings = await prisma.slot.findMany({
      where: { userId: user.id },
      include: { machine: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (userBookings.length > 0) {
      console.log('\n📊 Current User Bookings:');
      userBookings.forEach((slot, index) => {
        const slotTime = new Date(slot.slotTime);
        const isUpcoming = slotTime > new Date();
        
        console.log(`   ${index + 1}. Machine: ${slot.machine.machineId}`);
        console.log(`      Time: ${slotTime.toLocaleString()}`);
        console.log(`      Status: ${slot.status}`);
        console.log(`      Auth Code: ${slot.authCode || 'N/A'}`);
        console.log(`      Type: ${isUpcoming ? '🔜 UPCOMING' : '⏰ PAST'}\n`);
      });

      const upcomingSlots = userBookings.filter(slot => new Date(slot.slotTime) > new Date());
      
      if (upcomingSlots.length > 0) {
        console.log('✅ EXPECTED APP BEHAVIOR:');
        console.log('   • My Bookings section should show these slots');
        console.log('   • These slots should appear as "Booked" (green) in machine list');
        console.log('   • These slots should be disabled/unclickable');
        console.log('   • Control screen should show booking details\n');
      } else {
        console.log('📝 NO UPCOMING BOOKINGS:');
        console.log('   • My Bookings section should show "No bookings yet"');
        console.log('   • All slots should be available for booking');
        console.log('   • Try booking a slot to test the features\n');
      }
    } else {
      console.log('\n📊 No bookings found');
      console.log('   • My Bookings section should show "No bookings yet"');
      console.log('   • All slots should be available for booking');
      console.log('   • Book a slot to test all features\n');
    }

    console.log('🎯 TESTING CHECKLIST:');
    console.log('   □ Individual slot loading (only clicked button shows "Booking...")');
    console.log('   □ Booked slots show "Booked" and are disabled');
    console.log('   □ My Bookings section visible at top of laundry screen');
    console.log('   □ My Bookings shows user\'s slots horizontally');
    console.log('   □ Control screen shows booking details');
    console.log('   □ Multiple slots can be booked independently\n');

    console.log('🎉 Complete Slot Features Test Ready!');
    console.log('Test each feature in the app and verify the expected behavior.');

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

testSlotFeatures();
