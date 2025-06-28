/**
 * Background Jobs for Slot Management
 *
 * This module handles automatic cleanup of expired slots and other
 * periodic maintenance tasks for the washing machine booking system.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cycle completion cleanup - handles cycles that have reached their end time
export async function cleanupCompletedCycles() {
  try {
    const now = new Date();

    console.log(`🔄 [${now.toISOString()}] Starting cycle completion cleanup`);

    // Find all slots with cycles that should have ended (cycleEndTime <= now)
    const expiredCycles = await prisma.slot.findMany({
      where: {
        status: 'Reserved',
        cycleEndTime: {
          lte: now
        }
      },
      include: {
        machine: true,
        user: true
      }
    });

    if (expiredCycles.length === 0) {
      console.log('✅ No expired cycles found');
      return { success: true, completedCount: 0 };
    }

    console.log(`🔄 Found ${expiredCycles.length} cycles to complete`);

    let completedCount = 0;

    // Process each expired cycle
    for (const slot of expiredCycles) {
      try {
        await prisma.$transaction(async (tx) => {
          // Import functions dynamically to avoid auto-formatting issues
          const { stopCycle, updateDisplay } = await import('./esp32');
          const { sendPushNotification } = await import('./utils/notifications');

          // Stop the ESP32 cycle
          try {
            await stopCycle((slot as any).machine.machineId);
            console.log(`📤 ESP32: Stopped cycle for machine ${(slot as any).machine.machineId}`);
          } catch (error) {
            console.error(`❌ ESP32: Failed to stop cycle for machine ${(slot as any).machine.machineId}:`, error);
          }

          // Update slot status to Completed
          await tx.slot.update({
            where: { id: slot.id },
            data: { status: 'Completed' }
          });

          // Create notification for cycle completion
          await tx.notification.create({
            data: {
              userId: slot.userId,
              slotId: slot.id,
              title: 'Cycle Finished',
              message: 'Your washing cycle has finished',
              redirect_link: `slot:${slot.id}`
            }
          });

          // Create completion UsageLog entry
          await tx.usageLog.create({
            data: {
              userId: slot.userId,
              machineId: slot.machineId,
              slotId: slot.id,
              action: 'Completed'
            }
          });

          // Update machine status back to Available
          await tx.machine.update({
            where: { id: (slot as any).machine.id },
            data: { status: 'Available' }
          });

          // Update ESP32 display
          try {
            await updateDisplay((slot as any).machine.machineId, {
              line1: 'Cycle Complete',
              line2: 'Machine Available'
            });
            console.log(`📺 ESP32: Updated display for machine ${(slot as any).machine.machineId}`);
          } catch (error) {
            console.error(`❌ ESP32: Failed to update display for machine ${(slot as any).machine.machineId}:`, error);
          }

          // Send push notification
          try {
            await sendPushNotification((slot as any).user, {
              title: 'Cycle Finished',
              body: 'Your washing cycle has finished',
              data: {
                slotId: slot.id,
                redirect_link: `slot:${slot.id}`
              }
            });
            console.log(`📱 Push notification sent to ${(slot as any).user.email}`);
          } catch (error) {
            console.error(`❌ Failed to send push notification to ${(slot as any).user.email}:`, error);
          }
        });

        completedCount++;
        console.log(`   ✅ Completed cycle: ${(slot as any).machine.machineId} for ${(slot as any).user.email}`);

      } catch (error) {
        console.error(`❌ Failed to complete cycle for slot ${slot.id}:`, error);
      }
    }

    console.log(`✅ Completed ${completedCount}/${expiredCycles.length} cycles`);
    return { success: true, completedCount };

  } catch (error) {
    console.error("❌ Error in cycle completion cleanup:", error);
    return { success: false, error: (error as Error).message };
  }
}

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
    completedCycles: await cleanupCompletedCycles(),
    expiredSlots: await cleanupExpiredSlots(),
    oldNotifications: await cleanupOldNotifications(),
    oldUsageLogs: await cleanupOldUsageLogs(),
  };

  console.log('🎉 Maintenance tasks completed:', results);
  return results;
}

// Start the background job scheduler
export async function startBackgroundJobs() {
  console.log('🚀 Starting background job scheduler...');

  // Import CronJob dynamically to avoid auto-formatting issues
  const { CronJob } = await import('cron');

  // Cycle completion cleanup job - runs every minute
  const cycleCleanupJob = new CronJob('*/1 * * * *', async () => {
    await cleanupCompletedCycles();
  });

  // Expired slot cleanup job - runs every 10 minutes
  const slotCleanupJob = new CronJob('*/10 * * * *', async () => {
    await cleanupExpiredSlots();
  });

  // Full maintenance job - runs every 6 hours
  const maintenanceJob = new CronJob('0 */6 * * *', async () => {
    await runMaintenanceTasks();
  });

  // Start all jobs
  cycleCleanupJob.start();
  slotCleanupJob.start();
  maintenanceJob.start();

  // Run initial cleanup on startup
  setTimeout(cleanupCompletedCycles, 5000); // 5 seconds after startup
  setTimeout(cleanupExpiredSlots, 10000); // 10 seconds after startup

  console.log('✅ Background jobs scheduled:');
  console.log('   • Cycle completion cleanup: Every 1 minute');
  console.log('   • Expired slot cleanup: Every 10 minutes');
  console.log('   • Full maintenance: Every 6 hours');

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down background jobs...');
    cycleCleanupJob.stop();
    slotCleanupJob.stop();
    maintenanceJob.stop();
    prisma.$disconnect();
    process.exit(0);
  });

  return {
    cycleCleanupJob,
    slotCleanupJob,
    maintenanceJob,
    stop: () => {
      cycleCleanupJob.stop();
      slotCleanupJob.stop();
      maintenanceJob.stop();
    }
  };
}

// If this file is run directly, start the background jobs
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🎯 Background Jobs Manager');
  console.log('==========================');
  startBackgroundJobs();
}
