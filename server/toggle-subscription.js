import prisma from './utils/prisma.js';

async function toggleSubscription() {
  try {
    console.log('🔄 Subscription Toggle Tool for Development');
    console.log('==========================================');

    const userEmail = 'abu49539@gmail.com';

    // Find the user
    const user = await prisma.user.findUnique({
      where: {
        email: userEmail
      }
    });

    if (!user) {
      console.log(`❌ User with email ${userEmail} not found`);
      return;
    }

    const hasSubscription = user.stripeCustomerId && user.stripeCustomerId.trim() !== '';
    
    console.log(`👤 User: ${user.name} (${user.email})`);
    console.log(`📊 Current Status: ${hasSubscription ? 'HAS SUBSCRIPTION' : 'NO SUBSCRIPTION'}`);

    if (hasSubscription) {
      // Remove subscription
      const updatedUser = await prisma.user.update({
        where: {
          email: userEmail
        },
        data: {
          stripeCustomerId: null
        }
      });

      console.log('\n❌ REMOVED subscription');
      console.log('🎯 Testing: User will now see "No Package" screen when clicking services');
      
    } else {
      // Add subscription
      const mockStripeCustomerId = 'cus_dev_abu49539_' + Date.now();
      
      const updatedUser = await prisma.user.update({
        where: {
          email: userEmail
        },
        data: {
          stripeCustomerId: mockStripeCustomerId,
          verified: true
        }
      });

      console.log('\n✅ ADDED subscription');
      console.log(`   Stripe Customer ID: ${updatedUser.stripeCustomerId}`);
      console.log('🎯 Testing: User will now have direct access to services');
    }

    console.log('\n📱 Test the app now:');
    console.log('1. Restart the React Native app (if needed)');
    console.log('2. Login with abu49539@gmail.com');
    console.log('3. Go to home screen');
    console.log('4. Tap "Your Laundry" to test the flow');

  } catch (error) {
    console.error('❌ Error toggling subscription:', error);
  } finally {
    await prisma.$disconnect();
  }
}

toggleSubscription();
