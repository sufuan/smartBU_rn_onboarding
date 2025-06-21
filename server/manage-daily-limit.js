/**
 * Daily Limit Management Script
 * 
 * This script allows you to:
 * 1. Check current daily bookings for a user
 * 2. Clear today's bookings for testing
 * 3. Simulate different daily limit scenarios
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function manageDailyLimit() {
  console.log('🎯 Daily Limit Management Tool\n');

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
    console.log('4. Exit\n');

    console.log('Enter your choice (1-4): ');
    const choice = await getUserInput();

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
        console.log('👋 Goodbye!');
        break;
      default:
        console.log('❌ Invalid choice');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function clearTodayBookings(userId, todayBookings) {
  if (todayBookings.length === 0) {
    console.log('✅ No bookings to clear for today');
    return;
  }

  console.log(`⚠️ This will delete ${todayBookings.length} booking(s) for today.`);
  console.log('Are you sure? (y/N): ');
  const confirm = await getUserInput();

  if (confirm.trim().toLowerCase() === 'y') {
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

function getUserInput() {
  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      resolve(data.toString());
    });
  });
}

manageDailyLimit();
