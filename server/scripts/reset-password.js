#!/usr/bin/env node

/**
 * Reset User Password
 * Set a known password for testing
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    console.log('🔑 Resetting Password');
    console.log('═'.repeat(30));
    
    const email = 'abusufian760.m@gmail.com';
    const newPassword = 'DevTest123!';
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user password
    const updatedUser = await prisma.user.update({
      where: { email: email },
      data: { password: hashedPassword }
    });
    
    console.log('✅ Password reset successfully!');
    console.log('📧 Email:', updatedUser.email);
    console.log('🔑 New Password:', newPassword);
    console.log('💳 Stripe ID:', updatedUser.stripeCustomerId || 'None');
    
    console.log('\n🧪 Test Login:');
    console.log('Email:', email);
    console.log('Password:', newPassword);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'P2025') {
      console.log('💡 User not found. Creating user...');
      
      try {
        const hashedPassword = await bcrypt.hash('DevTest123!', 10);
        
        const newUser = await prisma.user.create({
          data: {
            email: 'abusufian760.m@gmail.com',
            name: 'Abu Sufian',
            password: hashedPassword,
            verified: true,
            stripeCustomerId: 'cus_dev_premium_' + Date.now()
          }
        });
        
        console.log('✅ User created successfully!');
        console.log('📧 Email:', newUser.email);
        console.log('🔑 Password: DevTest123!');
        console.log('💳 Stripe ID:', newUser.stripeCustomerId);
        
      } catch (createError) {
        console.error('❌ Error creating user:', createError.message);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
