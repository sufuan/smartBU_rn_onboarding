/**
 * Add Test Active Booking Script
 *
 * This script creates an active booking for immediate testing
 * without waiting for scheduled times.
 * Now supports dynamic email input and machine selection.
 */

import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Generate random auth code
function generateAuthCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Get user by email
async function getUserByEmail(email) {
  if (!email) {
    console.log('❌ Email is required');
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user) {
    console.log(`❌ User not found: ${email}`);
    console.log('\n💡 Available users:');

    const users = await prisma.user.findMany({
      select: { email: true, name: true },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    users.forEach((u, index) => {
      console.log(`   ${index + 1}. ${u.email} (${u.name})`);
    });

    return null;
  }

  console.log(`✅ User found: ${user.name} (${user.email})`);
  return user;
}

// Get available machines
async function selectMachine() {
  const machines = await prisma.machine.findMany({
    select: { id: true, machineId: true, location: true, status: true }
  });

  if (machines.length === 0) {
    console.log('❌ No machines found in database');
    return null;
  }

  console.log('\n🏭 Available Machines:');
  machines.forEach((machine, index) => {
    console.log(`   ${index + 1}. ${machine.machineId} (${machine.status}) - ${machine.location || 'No location'}`);
  });

  const choice = await askQuestion(`\nSelect machine (1-${machines.length}): `);
  const machineIndex = parseInt(choice) - 1;

  if (machineIndex < 0 || machineIndex >= machines.length) {
    console.log('❌ Invalid machine selection');
    return null;
  }

  const selectedMachine = machines[machineIndex];
  console.log(`✅ Selected: ${selectedMachine.machineId} at ${selectedMachine.location}`);
  return selectedMachine;
}

async function addTestBooking() {
  try {
    console.log('🚀 Adding Test Active Booking...\n');

    // Get user email from input
    const email = await askQuestion('📧 Enter user email: ');
    const user = await getUserByEmail(email);
    if (!user) return;

    // Select machine
    const machine = await selectMachine();
    if (!machine) return;

    // Create a slot that starts in 2 minutes and lasts 30 minutes
    const now = new Date();
    const slotTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now
    const authCode = generateAuthCode();

    console.log('\n📋 Booking Details:');
    console.log(`   User: ${user.name} (${user.email})`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Machine: ${machine.machineId} at ${machine.location}`);
    console.log(`   Machine ID: ${machine.id}`);
    console.log(`   Slot Time: ${slotTime.toISOString()}`);
    console.log(`   Local Time: ${slotTime.toLocaleString()}`);
    console.log(`   Auth Code: ${authCode}`);
    console.log(`   Duration: 30 minutes\n`);

    // Check for existing active bookings
    const existingBooking = await prisma.slot.findFirst({
      where: {
        userId: user.id,
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
        userId: user.id,
        machineId: machine.id,
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
    rl.close();
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
      const activeTime = new Date(Date.now() - 26 * 60 * 1000);
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

async function addTestBookingAtTime(slotTime, email = null, machineChoice = null) {
  try {
    // Get user email from input if not provided
    if (!email) {
      email = await askQuestion('📧 Enter user email: ');
    }

    const user = await getUserByEmail(email);
    if (!user) return;

    // Select machine if not provided
    let machine;
    if (machineChoice) {
      const machines = await prisma.machine.findMany();
      machine = machines[machineChoice - 1];
      if (!machine) {
        console.log('❌ Invalid machine choice');
        return;
      }
    } else {
      machine = await selectMachine();
      if (!machine) return;
    }

    const authCode = generateAuthCode();
    const now = new Date();

    console.log(`🚀 Adding Test Booking for ${slotTime.toLocaleString()}...\n`);

    // Remove existing active booking
    await prisma.slot.deleteMany({
      where: {
        userId: user.id,
        status: 'Reserved',
        slotTime: { gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
      }
    });

    // Create new booking
    const newBooking = await prisma.slot.create({
      data: {
        userId: user.id,
        machineId: machine.id,
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
    rl.close();
  }
}

// Run the script
console.log('🎯 Dynamic Test Booking Creator\n');
console.log('✨ Features:');
console.log('  • Dynamic email input (no more hardcoded users)');
console.log('  • Machine selection from available machines');
console.log('  • Multiple timing options');
console.log('  • Automatic cleanup of existing bookings\n');
console.log('📋 Usage:');
console.log('  node add-test-booking.js        # Starts in 2 minutes (interactive)');
console.log('  node add-test-booking.js now    # Starts right now (interactive)');
console.log('  node add-test-booking.js active # Already active - started 5 min ago (interactive)');
console.log('  node add-test-booking.js soon   # Starts in 1 minute (interactive)\n');

addCustomBooking();
