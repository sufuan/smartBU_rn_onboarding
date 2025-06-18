import { MachineStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create a test machine
  const machine = await prisma.machine.upsert({
    where: { machineId: 'washer1' },
    update: {},
    create: {
      machineId: 'washer1',
      qrCode: 'machineId:washer1',
      status: MachineStatus.Available,
      location: 'Laundromat A',
    },
  });
  console.log(`Created machine: ${machine.machineId}`);

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      name: 'Test User',
      email: 'test@example.com',
      googleId: 'google123',
      stripeCustomerId: 'stripe123',
      role: 'User',
      verified: true,
    },
  });
  console.log(`Created user: ${user.name} (${user.email})`);

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
