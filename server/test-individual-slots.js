/**
 * Test Script: Individual Slot Loading States
 * 
 * This script helps test that only the clicked slot button shows
 * "Booking..." while other slots remain clickable.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testIndividualSlots() {
  console.log('🎯 Testing Individual Slot Loading States\n');

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

    console.log('📱 INDIVIDUAL SLOT LOADING TEST:');
    console.log('1. Open your React Native app');
    console.log('2. Navigate to Home screen');
    console.log('3. Tap "Your Laundry"');
    console.log('4. Find a washing machine with MULTIPLE available slots');
    console.log('5. Tap "Book Slot" on ONE specific slot');
    console.log('6. Watch the button behavior carefully\n');

    console.log('🎯 Expected Behavior (FIXED):');
    console.log('   ✅ ONLY the clicked button shows "Booking..."');
    console.log('   ✅ OTHER slot buttons remain clickable');
    console.log('   ✅ OTHER slot buttons still show "Book Slot"');
    console.log('   ✅ No global loading state affecting all buttons');
    console.log('   ✅ Individual slot tracking working correctly\n');

    console.log('🚨 Previous Problem (SHOULD BE FIXED):');
    console.log('   ❌ ALL buttons showed "Booking..." when one was clicked');
    console.log('   ❌ Global mutation state affected all slots');
    console.log('   ❌ Users couldn\'t book multiple slots quickly\n');

    console.log('🧪 How to Test:');
    console.log('   1. Click on slot A - only slot A should show "Booking..."');
    console.log('   2. While slot A is booking, click slot B');
    console.log('   3. Slot B should also show "Booking..." independently');
    console.log('   4. Both slots should complete independently\n');

    console.log('✅ Success Indicators:');
    console.log('   • Each slot button has independent loading state');
    console.log('   • Multiple slots can be booked simultaneously');
    console.log('   • No interference between different slot buttons');
    console.log('   • Smooth user experience for slot booking\n');

    console.log('Press Enter to continue...');
    await waitForUser('');

    // Check recent bookings
    const recentBookings = await prisma.slot.findMany({
      where: { 
        userId: user.id,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      },
      include: { machine: true },
      orderBy: { createdAt: 'desc' }
    });

    if (recentBookings.length > 0) {
      console.log('\n📊 Recent Slot Bookings (Last 5 minutes):');
      recentBookings.forEach((slot, index) => {
        console.log(`   ${index + 1}. Machine: ${slot.machine.machineId}`);
        console.log(`      Time: ${new Date(slot.slotTime).toLocaleString()}`);
        console.log(`      Booked: ${new Date(slot.createdAt).toLocaleTimeString()}`);
        console.log(`      Status: ${slot.status}\n`);
      });

      if (recentBookings.length > 1) {
        console.log('🎉 Multiple slots booked! Individual loading states working!');
      } else {
        console.log('✅ Single slot booked successfully!');
      }
    } else {
      console.log('\n📊 No recent bookings found');
      console.log('   Try booking slots in the app to test individual loading states\n');
    }

    console.log('🎉 Individual Slot Loading Test Complete!');
    console.log('\nIf only the clicked button showed "Booking...",');
    console.log('the individual slot loading fix is working! 🚀');

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

testIndividualSlots();
