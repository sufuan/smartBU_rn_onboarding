#!/usr/bin/env node

/**
 * Debug User Script
 * Check what's actually in the database for a specific user
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

async function main() {
  try {
    console.log('🔍 User Debug Tool');
    console.log('═'.repeat(30));
    
    const email = await askQuestion('📧 Enter email to check: ');
    
    if (!email) {
      console.log('❌ Email required');
      process.exit(1);
    }
    
    console.log(`\n🔄 Looking up user: ${email}`);
    
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!user) {
      console.log('❌ User not found in database');
      console.log('\n💡 Suggestions:');
      console.log('1. Check if email is spelled correctly');
      console.log('2. User might not be created yet');
      console.log('3. Run: npm run quick-subs to create user');
    } else {
      console.log('✅ User found!');
      console.log('═'.repeat(40));
      console.log(`📧 Email: ${user.email}`);
      console.log(`👤 Name: ${user.name}`);
      console.log(`✅ Verified: ${user.verified}`);
      console.log(`💳 Stripe Customer ID: ${user.stripeCustomerId || 'NULL'}`);
      console.log(`🆔 User ID: ${user.id}`);
      
      // Check subscription status
      const hasSubscription = user.stripeCustomerId && user.stripeCustomerId.trim() !== '';
      console.log(`\n🎯 Subscription Status: ${hasSubscription ? '✅ HAS SUBSCRIPTION' : '❌ NO SUBSCRIPTION'}`);
      
      if (hasSubscription) {
        console.log(`🎉 User should have access to services!`);
      } else {
        console.log(`⚠️ User will see "No Package" screen`);
        console.log('\n💡 To fix:');
        console.log('1. Run: npm run quick-subs');
        console.log('2. Enter this email');
        console.log('3. Choose subscription type 1-3');
        console.log('4. Run the generated database command');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main().catch(console.error);
