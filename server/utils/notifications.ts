/**
 * Push Notification Utilities
 * 
 * This module handles sending push notifications to users using Expo's
 * push notification service.
 */

import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

// Create a new Expo SDK client
const expo = new Expo();

interface PushNotificationData {
  title: string;
  body: string;
  data?: {
    slotId?: string;
    redirect_link?: string;
    [key: string]: any;
  };
}

interface UserWithPushToken {
  id: string;
  name?: string;
  email?: string;
  pushToken?: string | null;
}

/**
 * Send push notification to a user
 * @param user - User object with pushToken
 * @param notificationData - Notification content and data
 * @returns Promise<boolean> - Success status
 */
export async function sendPushNotification(
  user: UserWithPushToken,
  notificationData: PushNotificationData
): Promise<boolean> {
  try {
    // Check if user has a valid push token
    if (!user.pushToken) {
      console.log(`⚠️ No push token for user ${user.id} (${user.email})`);
      return false;
    }

    // Check that the push token is valid
    if (!Expo.isExpoPushToken(user.pushToken)) {
      console.error(`❌ Invalid push token for user ${user.id}: ${user.pushToken}`);
      return false;
    }

    // Construct the message
    const message: ExpoPushMessage = {
      to: user.pushToken,
      sound: 'default',
      title: notificationData.title,
      body: notificationData.body,
      data: notificationData.data || {},
      priority: 'high',
      channelId: 'default',
    };

    console.log(`📤 Sending push notification to ${user.email}:`, {
      title: notificationData.title,
      body: notificationData.body,
      data: notificationData.data
    });

    // Send the notification
    const tickets = await expo.sendPushNotificationsAsync([message]);
    const ticket = tickets[0] as ExpoPushTicket;

    if (ticket.status === 'error') {
      console.error(`❌ Push notification error for user ${user.id}:`, ticket.message);
      return false;
    }

    console.log(`✅ Push notification sent successfully to ${user.email}`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to send push notification to user ${user.id}:`, error);
    return false;
  }
}

/**
 * Send push notifications to multiple users
 * @param users - Array of user objects with pushTokens
 * @param notificationData - Notification content and data
 * @returns Promise<number> - Number of successful sends
 */
export async function sendPushNotificationToMultipleUsers(
  users: UserWithPushToken[],
  notificationData: PushNotificationData
): Promise<number> {
  try {
    const messages: ExpoPushMessage[] = [];
    const validUsers: UserWithPushToken[] = [];

    // Filter users with valid push tokens
    for (const user of users) {
      if (user.pushToken && Expo.isExpoPushToken(user.pushToken)) {
        messages.push({
          to: user.pushToken,
          sound: 'default',
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
          priority: 'high',
          channelId: 'default',
        });
        validUsers.push(user);
      } else {
        console.log(`⚠️ Skipping user ${user.id} - no valid push token`);
      }
    }

    if (messages.length === 0) {
      console.log('⚠️ No valid push tokens found for batch notification');
      return 0;
    }

    console.log(`📤 Sending push notifications to ${messages.length} users`);

    // Send notifications in chunks (Expo recommends max 100 per batch)
    const chunks = expo.chunkPushNotifications(messages);
    let successCount = 0;

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        
        tickets.forEach((ticket, index) => {
          if (ticket.status === 'ok') {
            successCount++;
          } else {
            const user = validUsers[index];
            console.error(`❌ Push notification failed for user ${user?.id}:`, ticket.message);
          }
        });
      } catch (error) {
        console.error('❌ Error sending notification chunk:', error);
      }
    }

    console.log(`✅ Successfully sent ${successCount}/${messages.length} push notifications`);
    return successCount;

  } catch (error) {
    console.error('❌ Failed to send batch push notifications:', error);
    return 0;
  }
}

/**
 * Validate and clean push tokens
 * @param pushToken - Push token to validate
 * @returns string | null - Valid token or null
 */
export function validatePushToken(pushToken: string | null | undefined): string | null {
  if (!pushToken) return null;
  
  if (Expo.isExpoPushToken(pushToken)) {
    return pushToken;
  }
  
  return null;
}
