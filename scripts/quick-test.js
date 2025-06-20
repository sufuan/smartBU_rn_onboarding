/**
 * Quick Test: TanStack Query Integration
 * 
 * This script quickly tests if TanStack Query is working by toggling
 * the user's subscription status and checking if the app updates.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function quickTest() {
  console.log('🚀 Quick TanStack Query Test\n');

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

    const currentStatus = user.stripeCustomerId ? 'HAS SUBSCRIPTION' : 'NO SUBSCRIPTION';
    console.log(`👤 User: ${user.email}`);
    console.log(`📊 Current Status: ${currentStatus}\n`);

    console.log('📱 INSTRUCTIONS:');
    console.log('1. Open your React Native app');
    console.log('2. Go to the Home screen');
    console.log('3. Look for the "🔧 TanStack Query Debug" section');
    console.log('4. Watch the subscription status change in real-time\n');

    // Toggle subscription
    const newStatus = user.stripeCustomerId ? null : `cus_test_${Date.now()}`;
    const action = user.stripeCustomerId ? 'Removing' : 'Adding';
    
    console.log(`🔄 ${action} subscription...`);
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: newStatus }
    });

    const newStatusText = newStatus ? 'HAS SUBSCRIPTION' : 'NO SUBSCRIPTION';
    console.log(`✅ ${action} complete!`);
    console.log(`📊 New Status: ${newStatusText}`);
    console.log(`📱 App should now show: ${newStatus ? '✅ ACTIVE' : '❌ NONE'}\n`);

    console.log('🎯 Expected Results:');
    console.log('   • TanStack Query Debug shows updated status');
    console.log('   • No manual refresh required');
    console.log('   • Navigation behavior changes based on subscription');
    console.log('   • "Your Laundry" button behavior updates automatically\n');

    // Wait 5 seconds then toggle back
    console.log('⏳ Waiting 5 seconds, then toggling back...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const finalStatus = newStatus ? null : `cus_test_${Date.now()}`;
    const finalAction = newStatus ? 'Removing' : 'Adding';
    
    console.log(`🔄 ${finalAction} subscription...`);
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: finalStatus }
    });

    const finalStatusText = finalStatus ? 'HAS SUBSCRIPTION' : 'NO SUBSCRIPTION';
    console.log(`✅ ${finalAction} complete!`);
    console.log(`📊 Final Status: ${finalStatusText}`);
    console.log(`📱 App should now show: ${finalStatus ? '✅ ACTIVE' : '❌ NONE'}\n`);

    console.log('🎉 Quick Test Complete!');
    console.log('\n✅ If you saw the subscription status change in the app');
    console.log('   without manual refresh, TanStack Query is working perfectly!');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickTest();

export default quickTest;
