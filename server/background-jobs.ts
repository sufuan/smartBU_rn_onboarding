/**
 * Background Jobs for Slot Management
 * 
 * This module handles automatic cleanup of expired slots and other
 * periodic maintenance tasks for the washing machine booking system.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cleanup expired slots automatically
export async function cleanupExpiredSlots() {
  try {
    const now = new Date();
    
    console.log(`🧹 [${now.toISOString()}] Starting automatic expired slots cleanup`);

    // Find all expired slots (slotTime + duration < now)
    const expiredSlots = await prisma.slot.findMany({
      where: {
        status: 'Reserved',
        slotTime: {
          lt: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago (slot duration)
        },
      },
      include: {
        machine: { select: { machineId: true } },
        user: { select: { name: true, email: true } },
      },
    });

    if (expiredSlots.length === 0) {
      console.log('✅ No expired slots found');
      return { success: true, expiredCount: 0 };
    }

    console.log(`🔄 Found ${expiredSlots.length} expired slots to cleanup`);

    // Update expired slots to 'Completed' status (expired slots)
    const updateResult = await prisma.slot.updateMany({
      where: {
        id: { in: expiredSlots.map(slot => slot.id) },
      },
      data: {
        status: 'Completed',
      },
    });

    // Log the cleanup and create notifications
    for (const slot of expiredSlots) {
      // Log the expiration
      await prisma.usageLog.create({
        data: {
          userId: slot.userId,
          machineId: slot.machineId,
          slotId: slot.id,
          action: 'SlotExpired',
        },
      });

      // Create notification for expired slot
      await prisma.notification.create({
        data: {
          userId: slot.userId,
          slotId: slot.id,
          title: "Slot Expired",
          message: `Your slot for ${slot.machine.machineId} at ${new Date(slot.slotTime).toLocaleString()} has expired and moved to history.`,
          redirect_link: `/history`,
        },
      });

      console.log(`   ⏰ Expired: ${slot.machine.machineId} at ${new Date(slot.slotTime).toLocaleString()} for ${slot.user.email}`);
    }

    console.log(`✅ Successfully expired ${updateResult.count} slots`);

    return {
      success: true,
      expiredCount: updateResult.count,
      expiredSlots: expiredSlots.map(slot => ({
        id: slot.id,
        machine: slot.machine.machineId,
        slotTime: slot.slotTime,
        user: slot.user.email,
      }))
    };

  } catch (error) {
    console.error("❌ Error in automatic slot cleanup:", error);
    return { success: false, error: (error as Error).message };
  }
}

// Clean up old notifications (older than 30 days)
export async function cleanupOldNotifications() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    console.log(`🧹 Cleaning up notifications older than ${thirtyDaysAgo.toISOString()}`);

    const deleteResult = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    console.log(`✅ Deleted ${deleteResult.count} old notifications`);
    return { success: true, deletedCount: deleteResult.count };

  } catch (error) {
    console.error("❌ Error cleaning up old notifications:", error);
    return { success: false, error: (error as Error).message };
  }
}

// Clean up old usage logs (older than 90 days)
export async function cleanupOldUsageLogs() {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    console.log(`🧹 Cleaning up usage logs older than ${ninetyDaysAgo.toISOString()}`);

    const deleteResult = await prisma.usageLog.deleteMany({
      where: {
        createdAt: {
          lt: ninetyDaysAgo,
        },
      },
    });

    console.log(`✅ Deleted ${deleteResult.count} old usage logs`);
    return { success: true, deletedCount: deleteResult.count };

  } catch (error) {
    console.error("❌ Error cleaning up old usage logs:", error);
    return { success: false, error: (error as Error).message };
  }
}

// Run all maintenance tasks
export async function runMaintenanceTasks() {
  console.log('🔧 Starting maintenance tasks...');
  
  const results = {
    expiredSlots: await cleanupExpiredSlots(),
    oldNotifications: await cleanupOldNotifications(),
    oldUsageLogs: await cleanupOldUsageLogs(),
  };

  console.log('🎉 Maintenance tasks completed:', results);
  return results;
}

// Start the background job scheduler
export function startBackgroundJobs() {
  console.log('🚀 Starting background job scheduler...');

  // Run expired slot cleanup every 10 minutes
  const slotCleanupInterval = setInterval(cleanupExpiredSlots, 10 * 60 * 1000);

  // Run full maintenance tasks every 6 hours
  const maintenanceInterval = setInterval(runMaintenanceTasks, 6 * 60 * 60 * 1000);

  // Run initial cleanup on startup
  setTimeout(cleanupExpiredSlots, 5000); // 5 seconds after startup

  console.log('✅ Background jobs scheduled:');
  console.log('   • Expired slot cleanup: Every 10 minutes');
  console.log('   • Full maintenance: Every 6 hours');

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down background jobs...');
    clearInterval(slotCleanupInterval);
    clearInterval(maintenanceInterval);
    prisma.$disconnect();
    process.exit(0);
  });

  return {
    slotCleanupInterval,
    maintenanceInterval,
    stop: () => {
      clearInterval(slotCleanupInterval);
      clearInterval(maintenanceInterval);
    }
  };
}

// If this file is run directly, start the background jobs
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🎯 Background Jobs Manager');
  console.log('==========================');
  startBackgroundJobs();
}
