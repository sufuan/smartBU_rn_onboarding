/**
 * Daily Limit Management Script
 *
 * This script allows you to:
 * 1. Check current daily bookings for any user
 * 2. Clear today's bookings for testing
 * 3. Simulate different daily limit scenarios
 * 4. Works with dynamic email input
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

async function manageDailyLimit() {
  console.log('🎯 Daily Limit Management Tool');
  console.log('═'.repeat(50));

  try {
    // Get email from user input
    const email = await askQuestion('📧 Enter user email: ');

    if (!email) {
      console.log('❌ Email is required');
      return;
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true
      }
    });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      console.log('\n💡 Available users:');

      // Show available users for reference
      const users = await prisma.user.findMany({
        select: { email: true, name: true },
        take: 5,
        orderBy: { createdAt: 'desc' }
      });

      users.forEach((u, index) => {
        console.log(`   ${index + 1}. ${u.email} (${u.name})`);
      });

      return;
    }

    console.log('👤 User Information:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Has Subscription: ${user.stripeCustomerId ? 'YES' : 'NO'}\n`);

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Check current bookings for today
    const todayBookings = await prisma.slot.findMany({
      where: {
        userId: user.id,
        slotTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'Reserved',
      },
      include: { machine: true },
      orderBy: { slotTime: 'asc' }
    });

    console.log('📊 Today\'s Bookings Status:');
    console.log(`   Date: ${today.toLocaleDateString()}`);
    console.log(`   Current Bookings: ${todayBookings.length}/1 (Daily Limit: 1)\n`);

    if (todayBookings.length > 0) {
      console.log('📋 Current Bookings:');
      todayBookings.forEach((slot, index) => {
        console.log(`   ${index + 1}. Machine: ${slot.machine.machineId}`);
        console.log(`      Time: ${new Date(slot.slotTime).toLocaleString()}`);
        console.log(`      Auth Code: ${slot.authCode}`);
        console.log(`      Status: ${slot.status}\n`);
      });
    } else {
      console.log('   No bookings found for today\n');
    }

    console.log('🛠️ Available Actions:');
    console.log('1. Clear today\'s bookings (for testing)');
    console.log('2. Show booking history');
    console.log('3. Test daily limit scenario');
    console.log('4. Reset daily limit for testing');
    console.log('5. Exit\n');

    const choice = await askQuestion('Enter your choice (1-5): ');

    switch (choice.trim()) {
      case '1':
        await clearTodayBookings(user.id, todayBookings);
        break;
      case '2':
        await showBookingHistory(user.id);
        break;
      case '3':
        await testDailyLimitScenario(user.id);
        break;
      case '4':
        await resetDailyLimitForTesting(user);
        break;
      case '5':
        console.log('👋 Goodbye!');
        break;
      default:
        console.log('❌ Invalid choice');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

async function clearTodayBookings(userId, todayBookings) {
  if (todayBookings.length === 0) {
    console.log('✅ No bookings to clear for today');
    return;
  }

  console.log(`⚠️ This will delete ${todayBookings.length} booking(s) for today.`);
  const confirm = await askQuestion('Are you sure? (y/N): ');

  if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
    const slotIds = todayBookings.map(slot => slot.id);

    // Delete related records first
    await prisma.usageLog.deleteMany({
      where: { slotId: { in: slotIds } }
    });

    await prisma.notification.deleteMany({
      where: { slotId: { in: slotIds } }
    });

    // Delete the slots
    const deleted = await prisma.slot.deleteMany({
      where: { id: { in: slotIds } }
    });

    console.log(`✅ Deleted ${deleted.count} booking(s)`);
    console.log('📱 Now you can test booking slots without daily limit restriction');
  } else {
    console.log('❌ Operation cancelled');
  }
}

async function showBookingHistory(userId) {
  const allBookings = await prisma.slot.findMany({
    where: { userId },
    include: { machine: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log('\n📚 Recent Booking History (Last 10):');
  if (allBookings.length === 0) {
    console.log('   No bookings found');
    return;
  }

  allBookings.forEach((slot, index) => {
    const slotTime = new Date(slot.slotTime);
    const createdTime = new Date(slot.createdAt);
    const isUpcoming = slotTime > new Date();
    
    console.log(`   ${index + 1}. Machine: ${slot.machine.machineId}`);
    console.log(`      Slot Time: ${slotTime.toLocaleString()}`);
    console.log(`      Booked: ${createdTime.toLocaleString()}`);
    console.log(`      Status: ${slot.status}`);
    console.log(`      Type: ${isUpcoming ? '🔜 UPCOMING' : '⏰ PAST'}`);
    console.log(`      Auth Code: ${slot.authCode || 'N/A'}\n`);
  });
}

async function testDailyLimitScenario(userId) {
  console.log('\n🧪 Daily Limit Test Scenario');
  console.log('This will help you test the daily limit functionality:\n');

  console.log('📱 TESTING STEPS:');
  console.log('1. Open your React Native app');
  console.log('2. Try to book a slot for today');
  console.log('3. If you already have a booking, you should see:');
  console.log('   "Daily Limit Reached - You can only book one slot per day"');
  console.log('4. The error should show your existing booking details\n');

  console.log('🎯 Expected Error Message Format:');
  console.log('   Title: "Daily Limit Reached"');
  console.log('   Message: "You can only book one slot per day."');
  console.log('   Details: "Your existing booking: Machine: [ID], Time: [DateTime]"\n');

  console.log('✅ If you see this error, the daily limit is working correctly!');
  console.log('❌ If you can book multiple slots, there\'s an issue to investigate.');
}

async function resetDailyLimitForTesting(user) {
  console.log('\n🔄 Reset Daily Limit for Testing');
  console.log('═'.repeat(40));

  console.log(`👤 User: ${user.email}`);
  console.log(`📧 This will clear ALL bookings for this user to reset daily limits.`);
  console.log(`⚠️ This is for TESTING purposes only!\n`);

  const confirm = await askQuestion('Are you sure you want to reset daily limits? (y/N): ');

  if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
    try {
      // Get all user slots
      const allSlots = await prisma.slot.findMany({
        where: { userId: user.id },
        include: { machine: true }
      });

      if (allSlots.length === 0) {
        console.log('✅ No bookings found - daily limit already reset');
        return;
      }

      console.log(`📊 Found ${allSlots.length} booking(s) to remove...`);

      const slotIds = allSlots.map(slot => slot.id);

      // Delete related records first
      const deletedUsageLogs = await prisma.usageLog.deleteMany({
        where: { slotId: { in: slotIds } }
      });

      const deletedNotifications = await prisma.notification.deleteMany({
        where: { slotId: { in: slotIds } }
      });

      // Delete the slots
      const deletedSlots = await prisma.slot.deleteMany({
        where: { id: { in: slotIds } }
      });

      console.log('✅ Daily limit reset completed!');
      console.log(`   📋 Deleted ${deletedSlots.count} booking(s)`);
      console.log(`   📝 Deleted ${deletedUsageLogs.count} usage log(s)`);
      console.log(`   🔔 Deleted ${deletedNotifications.count} notification(s)`);
      console.log('\n🧪 Testing Instructions:');
      console.log('1. Open your app');
      console.log(`2. Login with: ${user.email}`);
      console.log('3. Try booking multiple slots to test daily limit');
      console.log('4. First booking should succeed');
      console.log('5. Second booking should show daily limit error');

    } catch (error) {
      console.error('❌ Error resetting daily limit:', error.message);
    }
  } else {
    console.log('❌ Operation cancelled');
  }
}

manageDailyLimit();
