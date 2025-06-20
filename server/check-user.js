import { PrismaClient } from '@prisma/client';

async function checkUser() {
  const prisma = new PrismaClient();
  
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'abu49539@gmail.com' },
      select: { 
        id: true,
        email: true, 
        name: true, 
        stripeCustomerId: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    console.log('🔍 Database User Check:');
    console.log('======================');
    if (user) {
      console.log('✅ User found:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Stripe Customer ID: ${user.stripeCustomerId || 'NULL'}`);
      console.log(`   Has Subscription: ${user.stripeCustomerId ? 'YES' : 'NO'}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`   Updated: ${user.updatedAt}`);
    } else {
      console.log('❌ User not found');
    }
  } catch (error) {
    console.error('❌ Error checking user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
