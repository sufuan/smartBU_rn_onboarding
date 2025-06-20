import { PrismaClient } from '@prisma/client';
import axios from 'axios';

async function testMeEndpoint() {
  const prisma = new PrismaClient();
  
  try {
    // First, get the user from database to get their ID for token generation
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
      console.log('❌ User not found in database');
      return;
    }
    
    console.log('🔍 Database User:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Stripe Customer ID: ${user.stripeCustomerId || 'NULL'}`);
    console.log(`   Has Subscription: ${user.stripeCustomerId ? 'YES' : 'NO'}`);
    
    // Now test the /me endpoint
    // Note: We need a valid JWT token to test this endpoint
    // For now, let's just check if the server is running
    
    try {
      const response = await axios.get('http://192.168.153.139:3000/test');
      console.log('\n🌐 Server Test Response:', response.data);
    } catch (error) {
      console.log('\n❌ Server not responding:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMeEndpoint();
