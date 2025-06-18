import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import mqtt from "mqtt";
import { isAuthenticated } from "./middleware/auth.js";
import prisma from "./utils/prisma.js";
import { sendToken } from "./utils/sendToken.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MQTT Client Setup
let mqttClient: mqtt.MqttClient | null = null;
let mqttReconnectAttempts = 0;
const MAX_MQTT_RECONNECT_ATTEMPTS = 3;

const initializeMQTT = () => {
  try {
    if (mqttReconnectAttempts >= MAX_MQTT_RECONNECT_ATTEMPTS) {
      console.log(`⚠️ MQTT connection disabled after ${MAX_MQTT_RECONNECT_ATTEMPTS} failed attempts.`);
      return;
    }
    
    const mqttBrokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
    console.log(`📡 MQTT broker: ${mqttBrokerUrl}`);
    
    mqttClient = mqtt.connect(mqttBrokerUrl, {
      reconnectPeriod: 10000, // Try to reconnect every 10 seconds
      connectTimeout: 30000, // 30 seconds timeout
    });

    mqttClient.on('connect', () => {
      console.log(`✅ MQTT client connected to ${mqttBrokerUrl}`);
      mqttReconnectAttempts = 0; // Reset counter on successful connection
      
      // Subscribe to relevant topics
      mqttClient?.subscribe('laundry/+/status', (err) => {
        if (!err) {
          console.log('📩 Subscribed to laundry machine status updates');
        }
      });
    });

    mqttClient.on('error', (error) => {
      console.error('❌ MQTT connection error:', error);
      mqttReconnectAttempts++;
      
      if (mqttClient) {
        mqttClient.end(true); // Force close connection
        mqttClient = null;
      }
      
      if (mqttReconnectAttempts < MAX_MQTT_RECONNECT_ATTEMPTS) {
        console.log(`⚠️ MQTT reconnect attempt ${mqttReconnectAttempts}/${MAX_MQTT_RECONNECT_ATTEMPTS} in 10 seconds...`);
        setTimeout(initializeMQTT, 10000); // Try again in 10 seconds
      } else {
        console.log(`⚠️ MQTT connection disabled after ${MAX_MQTT_RECONNECT_ATTEMPTS} failed attempts.`);
      }
    });

    mqttClient.on('message', (topic, message) => {
      console.log(`📨 MQTT message received on ${topic}:`, message.toString());
      
      // Handle different message types
      if (topic.startsWith('laundry/') && topic.endsWith('/status')) {
        const machineId = topic.split('/')[1];
        const status = message.toString();
        
        // Update machine status in the database
        updateMachineStatus(machineId, status).catch(error => {
          console.error(`❌ Error updating machine status: ${error}`);
        });
      }
    });
  } catch (error) {
    console.error('❌ Failed to initialize MQTT:', error);
    mqttReconnectAttempts++;
  }
};

// Helper function to update machine status
async function updateMachineStatus(machineId: string, status: string) {
  try {
    // Find the machine by its machineId field
    const machine = await prisma.machine.findUnique({
      where: { machineId }
    });
    
    if (machine) {
      // Map the status string to a valid MachineStatus enum value
      let machineStatus: 'Available' | 'InUse' | 'Offline' = 'Available';
      
      if (status === 'in_use') machineStatus = 'InUse';
      else if (status === 'offline') machineStatus = 'Offline';
      
      // Update the machine status
      await prisma.machine.update({
        where: { id: machine.id },
        data: { status: machineStatus }
      });
      
      console.log(`✅ Updated status of machine ${machineId} to ${machineStatus}`);
    } else {
      console.warn(`⚠️ Machine with ID ${machineId} not found`);
    }  } catch (error) {
    console.error('❌ Error updating machine status:', error);
    throw error;
  }
}

// Initialize MQTT on startup (only when not in test mode and MQTT_ENABLED is not false)
if (process.env.NODE_ENV !== 'test' && process.env.MQTT_ENABLED !== 'false') {
  console.log('🔄 Attempting to connect to MQTT broker...');
  // Add a slight delay to ensure server starts up properly first
  setTimeout(initializeMQTT, 2000);
} else {
  console.log('⏭️ MQTT connection disabled by configuration');
}

// Utility function to generate random auth code
const generateAuthCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));  }
  return result;
};

// Utility function to send MQTT message to ESP32
const sendMQTTMessage = (topic: string, message: any) => {
  try {
    if (mqttClient && mqttClient.connected) {
      mqttClient.publish(topic, JSON.stringify(message));
      console.log(`📤 MQTT message sent to ${topic}:`, message);
      return true;
    } else {
      console.log('⚠️ MQTT client not connected, message not sent');
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending MQTT message:', error);
    return false;
  }
};

// Types
interface AuthenticatedRequest extends Request {
  user?: any;
}

interface BookSlotRequest {
  userId: string;
  slotTime: string;
  machineId: string;
}

// Helper function for async route handlers
type AsyncRequestHandler = (req: Request | AuthenticatedRequest, res: Response) => Promise<any>;
const asyncHandler = (fn: AsyncRequestHandler) => (req: Request | AuthenticatedRequest, res: Response) => {
  Promise.resolve(fn(req, res)).catch((error) => {
    console.error('Unhandled route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  });
};

// Login Endpoint
app.post("/login", asyncHandler(async (req: Request, res: Response) => {
  try {
    const { signedToken } = req.body;

    if (!signedToken) {
      return res.status(400).json({ message: "signedToken is required" });
    }

    let decodedToken: any;
    try {
      decodedToken = jwt.verify(
        signedToken,
        process.env.EXPO_PUBLIC_JWT_SECRET_KEY!
      );
    } catch (error) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const { name, email, avatar } = decodedToken;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          email,
          avatar,
          verified: true, // Auto-verify users logging in with Expo
        },
      });
    } else if (!user.verified) {
      user = await prisma.user.update({
        where: { email },
        data: { verified: true },
      });
    }

    sendToken(user, res);
  } catch (error) {
    console.error("❌ Error during login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}));

// Get User Profile Endpoint
app.get("/me", isAuthenticated as any, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        slots: {
          include: {
            machine: true,
          },
          orderBy: {
            slotTime: 'desc',
          },
        },
        notifications: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("❌ Error fetching user profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}));

// Get All Machines Endpoint
app.get("/api/machines", asyncHandler(async (req: Request, res: Response) => {
  try {
    const machines = await prisma.machine.findMany({
      select: {
        id: true,
        machineId: true,
        qrCode: true,
        status: true,
        location: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        machineId: 'asc'
      }
    });

    res.status(200).json({
      success: true,
      machines
    });
  } catch (error) {
    console.error("❌ Error fetching machines:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}));

// Get Available Slots Endpoint - Simple version for React Native app
app.get("/api/slots", asyncHandler(async (req: Request, res: Response) => {
  try {
    const { machineId } = req.query;

    if (!machineId || typeof machineId !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Machine ID is required"
      });
    }

    // Get current time and next 24 hours
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find existing slots for this machine in the next 24 hours
    const existingSlots = await prisma.slot.findMany({
      where: {
        machineId: machineId,
        slotTime: {
          gte: now,
          lte: next24Hours
        },
        status: 'Reserved' // Only show reserved slots as occupied
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Generate available 30-minute slots for the next 24 hours
    const availableSlots = [];
    const slotDuration = 30 * 60 * 1000; // 30 minutes in milliseconds

    // Start from the next 30-minute interval
    const startTime = new Date(Math.ceil(now.getTime() / slotDuration) * slotDuration);

    for (let time = startTime; time < next24Hours; time = new Date(time.getTime() + slotDuration)) {
      // Check if this slot is already booked
      const isBooked = existingSlots.some(slot =>
        slot.slotTime.getTime() === time.getTime()
      );

      if (!isBooked) {
        availableSlots.push({
          slotTime: time,
          duration: slotDuration,
          status: 'Available',
          machineId: machineId
        });
      }
    }

    res.status(200).json({
      success: true,
      slots: availableSlots,
      bookedSlots: existingSlots
    });

  } catch (error) {
    console.error("❌ Error fetching slots:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch slots",
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

// Book Slot Endpoint - Updated version
app.post("/api/book-slot", isAuthenticated as any, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slotTime, machineId } = req.body as BookSlotRequest;
    const userId = req.user.id;

    if (!slotTime || !machineId) {
      return res.status(400).json({ message: "slotTime and machineId are required" });
    }

    // Check if user has a subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return res.status(403).json({ 
        message: "Subscription required to book slots",
        error: "NO_SUBSCRIPTION"
      });
    }

    const slotTimeDate = new Date(slotTime);

    // Check if the machine exists and is available
    const machine = await prisma.machine.findUnique({ where: { id: machineId } });
    if (!machine || machine.status === 'Offline') {
      return res.status(404).json({ message: "Machine not found or offline" });
    }

    // Check if the slot is already booked
    const existingSlot = await prisma.slot.findFirst({
      where: {
        machineId,
        slotTime: slotTimeDate,
        status: {
          in: ['Reserved', 'Completed'],
        },
      },
    });

    if (existingSlot) {
      return res.status(409).json({ 
        message: "Slot already booked",
        error: "SLOT_UNAVAILABLE" 
      });
    }

    // Check if the slot is in the past
    const now = new Date();
    if (slotTimeDate < now) {
      return res.status(400).json({ 
        message: "Cannot book slots in the past",
        error: "PAST_SLOT"
      });
    }

    // Check if the user has already booked a slot for the same day
    const startOfDay = new Date(slotTimeDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    const endOfDay = new Date(slotTimeDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const userDailySlotCount = await prisma.slot.count({
      where: {
        userId,
        slotTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'Reserved',
      },
    });

    if (userDailySlotCount >= 1) {
      return res.status(409).json({ 
        message: "You can only book one slot per day",
        error: "DAILY_LIMIT_EXCEEDED"
      });
    }

    // Generate a random auth code
    const authCode = generateAuthCode();

    // Create the slot
    const newSlot = await prisma.slot.create({
      data: {
        userId,
        machineId,
        slotTime: slotTimeDate,
        duration: 3600000, // 1 hour in milliseconds
        authCode,
        status: 'Reserved',
      },
    });

    // Log the usage
    await prisma.usageLog.create({
      data: {
        userId,
        machineId,
        slotId: newSlot.id,
        action: 'SlotBooked',
      },
    });

    // Create a notification for the user
    await prisma.notification.create({
      data: {
        userId,
        slotId: newSlot.id,
        title: "Slot Booked!",
        message: `Your slot for ${machine.machineId} at ${slotTimeDate.toLocaleString()} is confirmed. Your auth code is ${authCode}.`,        redirect_link: `/slot/${newSlot.id}`,
      },
    });

    // Send MQTT message to ESP32 to update display
    sendMQTTMessage(`laundry/${machine.machineId}/display`, {
      line1: "Slot Reserved",
      line2: `By: ${req.user.name}`,
    });

    res.status(201).json({
      message: "Slot booked successfully",
      slot: {
        ...newSlot,
        authCode,
      },
    });
  } catch (error) {
    console.error("❌ Error booking slot:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}));

// Cancel Slot Endpoint
app.post("/api/cancel-slot", isAuthenticated as any, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slotId } = req.body;

    if (!slotId) {
      return res.status(400).json({ message: "slotId is required" });
    }

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: { machine: true },
    });

    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    if (slot.userId !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to cancel this slot" });
    }

    if (slot.status !== 'Reserved') {
      return res.status(400).json({ message: "Only reserved slots can be cancelled" });
    }

    // Check if cancellation is allowed (e.g., at least 1 hour before)
    const now = new Date();
    const slotTime = new Date(slot.slotTime);
    const timeDiff = slotTime.getTime() - now.getTime();
    if (timeDiff < 3600000) { // 1 hour
      return res.status(400).json({ message: "Cannot cancel slot less than 1 hour before start time" });
    }

    const updatedSlot = await prisma.slot.update({
      where: { id: slotId },
      data: { status: 'Cancelled' },
    });

    // Log the cancellation
    await prisma.usageLog.create({
      data: {
        userId: req.user.id,
        machineId: slot.machineId,
        slotId: slot.id,
        action: 'SlotCancelled',
      },
    });

    // Create a notification for the user
    await prisma.notification.create({
      data: {
        userId: req.user.id,
        slotId: slot.id,
        title: "Slot Cancelled",
        message: `Your slot for ${slot.machine.machineId} at ${slotTime.toLocaleString()} has been cancelled.`,
      },
    });    // Send MQTT message to ESP32 to update display
    sendMQTTMessage(`laundry/${slot.machine.machineId}/display`, {
      line1: "Slot Available",
      line2: "",
    });

    res.status(200).json({
      message: "Slot cancelled successfully",
      slot: updatedSlot,
    });
  } catch (error) {
    console.error("❌ Error cancelling slot:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}));

// Start Server
const PORT = parseInt(process.env.PORT || "3000");
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Express server running on port ${PORT}`);
  console.log("✅ Connected to MongoDB");
});
