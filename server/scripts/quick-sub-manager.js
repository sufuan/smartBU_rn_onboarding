#!/usr/bin/env node

/**
 * Quick Subscription Manager (No Database Required)
 * 
 * This is a simplified version that shows you the exact commands
 * to run in your database to set up different subscription types.
 */

import readline from 'readline';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Subscription types
const SUBSCRIPTION_TYPES = {
  1: {
    name: 'Active Premium Subscription',
    stripeCustomerId: 'cus_dev_premium_' + Date.now(),
    description: 'Full access to all laundry services',
    status: 'active'
  },
  2: {
    name: 'Active Basic Subscription', 
    stripeCustomerId: 'cus_dev_basic_' + Date.now(),
    description: 'Limited access to basic laundry services',
    status: 'active'
  },
  3: {
    name: 'Trial Subscription',
    stripeCustomerId: 'cus_dev_trial_' + Date.now(),
    description: '7-day free trial with full access',
    status: 'trialing'
  },
  4: {
    name: 'No Subscription',
    stripeCustomerId: null,
    description: 'No active subscription - will see "Buy Now" screen',
    status: 'none'
  },
  5: {
    name: 'Expired Subscription',
    stripeCustomerId: 'cus_dev_expired_' + Date.now(),
    description: 'Subscription expired - needs renewal',
    status: 'expired'
  },
  6: {
    name: 'Cancelled Subscription',
    stripeCustomerId: null,
    description: 'Previously had subscription but cancelled',
    status: 'cancelled'
  }
};

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function displaySubscriptionOptions() {
  console.log('\n📋 Available Subscription Types:');
  console.log('═'.repeat(50));
  
  Object.entries(SUBSCRIPTION_TYPES).forEach(([key, sub]) => {
    console.log(`${key}. ${sub.name}`);
    console.log(`   ${sub.description}`);
    console.log(`   Status: ${sub.status} | Customer ID: ${sub.stripeCustomerId || 'None'}`);
    console.log('');
  });
}

async function main() {
  try {
    console.log('🚀 Quick Subscription Manager');
    console.log('═'.repeat(40));
    console.log('This tool generates the commands you need to run.\n');

    // Get email
    const email = await askQuestion('📧 Enter your email address: ');
    
    if (!email || !email.includes('@')) {
      console.log('❌ Invalid email address. Please try again.');
      process.exit(1);
    }

    // Show subscription options
    displaySubscriptionOptions();
    
    // Get subscription choice
    const choice = await askQuestion('🎯 Select subscription type (1-6): ');
    
    if (!SUBSCRIPTION_TYPES[choice]) {
      console.log('❌ Invalid choice. Please select a number between 1-6.');
      process.exit(1);
    }

    const selectedSubscription = SUBSCRIPTION_TYPES[choice];
    
    console.log(`\n🎯 Selected: ${selectedSubscription.name}`);
    console.log(`📝 Description: ${selectedSubscription.description}`);
    
    // Generate commands
    console.log('\n📋 Database Commands to Run:');
    console.log('═'.repeat(50));

    if (selectedSubscription.stripeCustomerId) {
      console.log('✅ Update existing user subscription:');
      console.log(`   db.User.updateOne(`);
      console.log(`     { email: "${email}" },`);
      console.log(`     { $set: { stripeCustomerId: "${selectedSubscription.stripeCustomerId}" } }`);
      console.log(`   )`);
    } else {
      console.log('❌ Remove subscription (set to null):');
      console.log(`   db.User.updateOne(`);
      console.log(`     { email: "${email}" },`);
      console.log(`     { $set: { stripeCustomerId: null } }`);
      console.log(`   )`);
    }

    console.log('\n🚀 Alternative: Use API Endpoint (Recommended):');
    console.log(`   curl -X POST http://localhost:3000/api/dev/update-subscription \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"email": "${email}", "subscriptionType": ${choice}}'`);

    console.log('\n📱 Testing Instructions:');
    console.log('1. Run ONE of the commands above (MongoDB OR API)');
    console.log('2. Open your laundry app');
    console.log(`3. Login with your existing password for: ${email}`);
    console.log('4. Check subscription status in the app');
    console.log('5. If subscription still shows "NONE", check the debug logs');
    
    console.log('\n✅ Commands generated successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

// Run the script
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
