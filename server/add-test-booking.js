/**
 * Add Test Active Booking Script
 * 
 * This script creates an active booking for immediate testing
 * without waiting for scheduled times.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generate random auth code
function generateAuthCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function addTestBooking() {
  try {
    console.log('🚀 Adding Test Active Booking...\n');

    // Your user ID (from the logs)
    const userId = '6851bd571eb4567f348ff4d1';
    
    // WASHER-001 machine ID (from the logs)
    const machineId = '6851b99521aaf8ec986f6b99';

    // Create a slot that starts in 2 minutes and lasts 30 minutes
    const now = new Date();
    const slotTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now
    const authCode = generateAuthCode();

    console.log('📋 Booking Details:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Machine ID: ${machineId}`);
    console.log(`   Slot Time: ${slotTime.toISOString()}`);
    console.log(`   Local Time: ${slotTime.toLocaleString()}`);
    console.log(`   Auth Code: ${authCode}`);
    console.log(`   Duration: 30 minutes\n`);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    console.log(`✅ User found: ${user.name} (${user.email})`);

    // Check if machine exists
    const machine = await prisma.machine.findUnique({
      where: { id: machineId }
    });

    if (!machine) {
      console.log('❌ Machine not found!');
      return;
    }

    console.log(`✅ Machine found: ${machine.machineId} at ${machine.location}`);

    // Check for existing active bookings
    const existingBooking = await prisma.slot.findFirst({
      where: {
        userId: userId,
        status: 'Reserved',
        slotTime: {
          gte: new Date()
        }
      }
    });

    if (existingBooking) {
      console.log('⚠️  Existing active booking found:');
      console.log(`   Slot Time: ${existingBooking.slotTime.toLocaleString()}`);
      console.log(`   Auth Code: ${existingBooking.authCode}`);
      console.log('\n🔄 Removing existing booking first...');
      
      await prisma.slot.delete({
        where: { id: existingBooking.id }
      });
      
      console.log('✅ Existing booking removed');
    }

    // Create the new test booking
    const newBooking = await prisma.slot.create({
      data: {
        userId: userId,
        machineId: machineId,
        slotTime: slotTime,
        authCode: authCode,
        status: 'Reserved',
        duration: 30 * 60 * 1000, // 30 minutes in milliseconds
      },
      include: {
        machine: true,
        user: true
      }
    });

    console.log('\n🎉 Test Booking Created Successfully!');
    console.log('📋 Booking Details:');
    console.log(`   Booking ID: ${newBooking.id}`);
    console.log(`   User: ${newBooking.user.name}`);
    console.log(`   Machine: ${newBooking.machine.machineId}`);
    console.log(`   Location: ${newBooking.machine.location}`);
    console.log(`   Slot Time: ${newBooking.slotTime.toLocaleString()}`);
    console.log(`   Auth Code: ${newBooking.authCode}`);
    console.log(`   Status: ${newBooking.status}`);
    console.log(`   Duration: ${newBooking.duration / 60000} minutes`);

    console.log('\n📱 Testing Instructions:');
    console.log('1. 🔄 Refresh the My Bookings screen');
    console.log('2. 📊 Check Active Bookings tab - should show 1 booking');
    console.log('3. 🕐 Booking should show "WAITING" status (starts in 2 minutes)');
    console.log('4. ⏰ After 2 minutes, status should change to "ACTIVE"');
    console.log('5. 🎯 Tap the booking to go to Control Screen');
    console.log('6. 📷 Test QR code scanning with the auth code');
    console.log('7. 🚀 Test "Start Cycle" functionality');

    console.log('\n🔍 Debug Information:');
    console.log('Expected in My Bookings debug panel:');
    console.log(`   "Slots: 1 total (1 active, X history) | Ready"`);
    console.log('\nExpected in Control Screen:');
    console.log(`   Machine ID: ${newBooking.machine.machineId}`);
    console.log(`   Auth Code: ${newBooking.authCode}`);
    console.log(`   Location: ${newBooking.machine.location}`);

    console.log('\n⏰ Timing:');
    console.log(`   Current Time: ${now.toLocaleString()}`);
    console.log(`   Slot Starts: ${slotTime.toLocaleString()}`);
    console.log(`   Slot Ends: ${new Date(slotTime.getTime() + 30 * 60 * 1000).toLocaleString()}`);
    console.log(`   Time Until Start: ${Math.round((slotTime.getTime() - now.getTime()) / 1000)} seconds`);

  } catch (error) {
    console.error('❌ Error creating test booking:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Add option to create booking at different times
async function addCustomBooking() {
  const args = process.argv.slice(2);
  const option = args[0];

  switch (option) {
    case 'now':
      // Booking starts right now
      await addTestBookingAtTime(new Date());
      break;
    case 'active':
      // Booking that's already active (started 5 minutes ago)
      const activeTime = new Date(Date.now() - 5 * 60 * 1000);
      await addTestBookingAtTime(activeTime);
      break;
    case 'soon':
      // Booking starts in 1 minute
      const soonTime = new Date(Date.now() + 1 * 60 * 1000);
      await addTestBookingAtTime(soonTime);
      break;
    default:
      // Default: starts in 2 minutes
      await addTestBooking();
      break;
  }
}

async function addTestBookingAtTime(slotTime) {
  try {
    const userId = '6851bd571eb4567f348ff4d1';
    const machineId = '6851b99521aaf8ec986f6b99';
    const authCode = generateAuthCode();
    const now = new Date();

    console.log(`🚀 Adding Test Booking for ${slotTime.toLocaleString()}...\n`);

    // Remove existing active booking
    await prisma.slot.deleteMany({
      where: {
        userId: userId,
        status: 'Reserved',
        slotTime: { gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
      }
    });

    // Create new booking
    const newBooking = await prisma.slot.create({
      data: {
        userId: userId,
        machineId: machineId,
        slotTime: slotTime,
        authCode: authCode,
        status: 'Reserved',
        duration: 30 * 60 * 1000,
      },
      include: {
        machine: true,
        user: true
      }
    });

    const timeUntilStart = Math.round((slotTime.getTime() - now.getTime()) / 1000);
    const status = timeUntilStart > 0 ? 'WAITING' : 'ACTIVE';

    console.log('🎉 Test Booking Created!');
    console.log(`   Slot Time: ${slotTime.toLocaleString()}`);
    console.log(`   Auth Code: ${authCode}`);
    console.log(`   Status: ${status}`);
    console.log(`   Time Until Start: ${timeUntilStart} seconds`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
console.log('🎯 Test Booking Creator\n');
console.log('Usage:');
console.log('  node add-test-booking.js        # Starts in 2 minutes');
console.log('  node add-test-booking.js now    # Starts right now');
console.log('  node add-test-booking.js active # Already active (started 5 min ago)');
console.log('  node add-test-booking.js soon   # Starts in 1 minute\n');

addCustomBooking();
