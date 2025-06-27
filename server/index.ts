import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import mqtt from "mqtt";
import { startCycle, stopCycle, updateDisplay } from "./esp32";
import { isAuthenticated } from "./middleware/auth.js";
import prisma from "./utils/prisma.js";
import { sendToken } from "./utils/sendToken.js";

// Additional imports for authentication
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";

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

    const mqttBroker = process.env.MQTT_BROKER || 'mqtt://localhost:1883';

    // Skip MQTT initialization if using mock
    if (mqttBroker === 'mock') {
      console.log('📡 MQTT broker: mock (testing mode)');
      return;
    }

    // Use MQTT_BROKER_URL if available, otherwise use MQTT_BROKER
    const mqttBrokerUrl = process.env.MQTT_BROKER_URL || mqttBroker;
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

// Email Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper Functions for Authentication
const generateOTP = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your LaundryApp Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4A90E2;">LaundryApp Verification</h2>
        <p>Your verification code is:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #4A90E2; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

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
    const mqttBroker = process.env.MQTT_BROKER || 'mock';

    if (mqttBroker === 'mock') {
      console.log(`📤 [MOCK] MQTT message to ${topic}:`, message);
      return true;
    }

    if (mqttClient && mqttClient.connected) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      mqttClient.publish(topic, messageStr);
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

// ==================== NEW AUTHENTICATION ENDPOINTS ====================

// 1. Check Email Endpoint
app.post("/auth/check-email", asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user exists with this email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    res.json({
      exists: !!user,
      message: user ? "Email found" : "Email not found",
    });
  } catch (error) {
    console.error("❌ Error checking email:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}));

// 2. Send OTP Endpoint
app.post("/auth/send-otp", asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Check if user already exists with this email
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email already registered. Please login instead." });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete any existing OTPs for this email
    await prisma.otp.deleteMany({
      where: { email: email.toLowerCase() },
    });

    // Create new OTP record
    await prisma.otp.create({
      data: {
        email: email.toLowerCase(),
        otp,
        expiresAt,
      },
    });

    // Send OTP email
    await sendOTPEmail(email, otp);

    console.log(`✅ OTP sent to ${email}: ${otp}`); // Remove in production

    res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("❌ Error sending OTP:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
}));

// 3. Verify OTP Endpoint
app.post("/auth/verify-otp", asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    // Find valid OTP
    const otpRecord = await prisma.otp.findFirst({
      where: {
        email: email.toLowerCase(),
        otp,
        verified: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Mark OTP as verified
    await prisma.otp.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    res.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("❌ Error verifying OTP:", error);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
}));

// 4. Complete Signup Endpoint
app.post("/auth/complete-signup", asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email, name, phone, password } = req.body;

    if (!email || !name || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Check if OTP was verified
    const verifiedOtp = await prisma.otp.findFirst({
      where: {
        email: email.toLowerCase(),
        verified: true,
        expiresAt: {
          gt: new Date(Date.now() - 10 * 60 * 1000), // Allow 10 minutes after verification
        },
      },
    });

    if (!verifiedOtp) {
      return res.status(400).json({ message: "Please verify your email first" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone_number: phone,
        password: hashedPassword,
        verified: true,
      },
    });

    // Update OTP record with user ID
    await prisma.otp.update({
      where: { id: verifiedOtp.id },
      data: { userId: user.id },
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET_KEY!,
      { expiresIn: "7d" }
    );

    console.log(`✅ User created successfully: ${user.email}`);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        verified: user.verified,
      },
      token,
    });
  } catch (error) {
    console.error("❌ Error completing signup:", error);
    res.status(500).json({ message: "Failed to create account" });
  }
}));

// 5. Email/Password Login Endpoint
app.post("/auth/login", asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET_KEY!,
      { expiresIn: "7d" }
    );

    console.log(`✅ User logged in successfully: ${user.email}`);

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        verified: user.verified,
        stripeCustomerId: user.stripeCustomerId,
      },
      token,
    });
  } catch (error) {
    console.error("❌ Error during login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}));

// ==================== END NEW AUTHENTICATION ENDPOINTS ====================

// Original Google Login Endpoint (keeping for backward compatibility)
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



// updating push token
app.put("/update-push-token", isAuthenticated, async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        pushToken: req.body.pushToken,
      },
    });
    res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(501).json({
      success: false,
      message: error.message,
    });
  }
});

// get notifications
app.get("/get-notifications", isAuthenticated, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [{ receiverId: req.user?.id }, { receiverId: "All" }],
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(201).json({
      success: true,
      notifications,
    });
  } catch (error) {
    res.status(501).json({
      success: false,
      message: error.message,
    });
  }
});

// delete notification
app.delete(
  "/delete-notification/:id",
  isAuthenticated,
  async (req, res, next) => {
    try {
      await prisma.notification.delete({
        where: {
          id: req.params.id,
        },
      });

      const notifications = await prisma.notification.findMany({
        where: {
          OR: [{ receiverId: req.user?.id }, { receiverId: "All" }],
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      res.status(201).json({
        success: true,
        notifications,
      });
    } catch (error) {
      res.status(501).json({
        success: false,
        message: error.message,
      });
    }
  }
);


// Get User Slots Endpoint - For "My Bookings" section
app.get("/api/user-slots", isAuthenticated as any, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const now = new Date();



    // Get user's active slots (upcoming and current within 30-minute window)
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    const userSlots = await prisma.slot.findMany({
      where: {
        userId,
        status: 'Reserved', // Only show reserved slots
        slotTime: {
          gte: thirtyMinutesAgo, // Include slots from 30 minutes ago (active window)
        },
      },
      include: {
        machine: {
          select: {
            id: true,
            machineId: true,
            location: true,
            status: true,
          },
        },
      },
      orderBy: {
        slotTime: 'asc', // Earliest first
      },
    });



    res.status(200).json({
      success: true,
      slots: userSlots,
      count: userSlots.length
    });
  } catch (error) {
    console.error("❌ Error fetching user slots:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      slots: []
    });
  }
}));

// Get All Machines Endpoint
app.get("/api/machines", asyncHandler(async (req: Request, res: Response) => {
  try {
    const { machineId } = req.query;

    // If machineId query param is provided, filter by it
    const whereCondition = machineId ? { machineId: machineId as string } : {};

    const machines = await prisma.machine.findMany({
      where: whereCondition,
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

// Get Single Machine by Database ID or MachineId Endpoint
app.get("/api/machines/:id", asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if the id is a valid ObjectId (24 hex characters) or a machineId
    let machine;

    if (id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
      // It's a valid ObjectId, search by id
      machine = await prisma.machine.findUnique({
        where: { id },
        select: {
          id: true,
          machineId: true,
          qrCode: true,
          status: true,
          location: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } else {
      // It's likely a machineId (like "WASHER-001"), search by machineId
      machine = await prisma.machine.findUnique({
        where: { machineId: id },
        select: {
          id: true,
          machineId: true,
          qrCode: true,
          status: true,
          location: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: "Machine not found"
      });
    }

    res.status(200).json({
      success: true,
      machine
    });
  } catch (error) {
    console.error("❌ Error fetching machine:", error);
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

// Book Slot Endpoint - Enhanced with race condition protection and better error handling
app.post("/api/book-slot", isAuthenticated as any, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slotTime, machineId } = req.body as BookSlotRequest;
    const userId = req.user.id;

    console.log(`🎯 Slot booking request: User ${userId}, Machine ${machineId}, Time ${slotTime}`);

    if (!slotTime || !machineId) {
      return res.status(400).json({
        message: "slotTime and machineId are required",
        error: "MISSING_FIELDS"
      });
    }

    // Check if user has a subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, name: true },
    });

    if (!user?.stripeCustomerId) {
      return res.status(403).json({
        message: "Subscription required to book slots",
        error: "NO_SUBSCRIPTION"
      });
    }

    const slotTimeDate = new Date(slotTime);
    const now = new Date();

    // Check if the slot is in the past
    if (slotTimeDate < now) {
      return res.status(400).json({
        message: "Cannot book slots in the past",
        error: "PAST_SLOT"
      });
    }

    // Check if the machine exists and is available
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      select: { id: true, machineId: true, status: true }
    });

    if (!machine) {
      return res.status(404).json({
        message: "Machine not found",
        error: "MACHINE_NOT_FOUND"
      });
    }

    if (machine.status === 'Offline') {
      return res.status(409).json({
        message: "Machine is currently offline",
        error: "MACHINE_OFFLINE"
      });
    }

    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Check if the slot is already booked (within transaction)
      const existingSlot = await tx.slot.findFirst({
        where: {
          machineId,
          slotTime: slotTimeDate,
          status: {
            in: ['Reserved', 'Completed'],
          },
        },
        select: { id: true, userId: true, user: { select: { name: true } } }
      });

      if (existingSlot) {
        const isOwnSlot = existingSlot.userId === userId;
        throw new Error(JSON.stringify({
          status: 409,
          message: isOwnSlot
            ? "You have already booked this slot"
            : `This slot has been taken by another user`,
          error: "SLOT_UNAVAILABLE",
          details: { isOwnSlot, bookedBy: existingSlot.user?.name }
        }));
      }

      // Check daily limit (within transaction)
      const startOfDay = new Date(slotTimeDate);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(slotTimeDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const userDailySlots = await tx.slot.findMany({
        where: {
          userId,
          slotTime: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: 'Reserved',
        },
        select: { id: true, slotTime: true, machine: { select: { machineId: true } } }
      });

      if (userDailySlots.length >= 1) {
        const existingSlot = userDailySlots[0];
        throw new Error(JSON.stringify({
          status: 409,
          message: "You can only book one slot per day",
          error: "DAILY_LIMIT_EXCEEDED",
          details: {
            existingSlot: {
              machine: existingSlot.machine.machineId,
              time: existingSlot.slotTime.toISOString()
            }
          }
        }));
      }

      // Generate a random auth code
      const authCode = generateAuthCode();

      // Create the slot (within transaction)
      const newSlot = await tx.slot.create({
        data: {
          userId,
          machineId,
          slotTime: slotTimeDate,
          duration: 3600000, // 1 hour in milliseconds
          authCode,
          status: 'Reserved',
        },
        include: {
          machine: { select: { machineId: true } }
        }
      });

      // Log the usage (within transaction)
      await tx.usageLog.create({
        data: {
          userId,
          machineId,
          slotId: newSlot.id,
          action: 'SlotBooked',
        },
      });

      // Create a notification for the user (within transaction)
      await tx.notification.create({
        data: {
          userId,
          slotId: newSlot.id,
          title: "Slot Booked!",
          message: `Your slot for ${machine.machineId} at ${slotTimeDate.toLocaleString()} is confirmed. Your auth code is ${authCode}.`,
          redirect_link: `/slot/${newSlot.id}`,
        },
      });

      return { newSlot, authCode };
    });

    console.log(`✅ Slot booked successfully: ${result.newSlot.id}`);

    // Send MQTT message to ESP32 to update display (outside transaction)
    try {
      sendMQTTMessage(`laundry/${machine.machineId}/display`, {
        line1: "Slot Reserved",
        line2: `By: ${user.name}`,
      });
    } catch (mqttError) {
      console.warn("⚠️ MQTT message failed:", mqttError);
      // Don't fail the booking if MQTT fails
    }

    res.status(201).json({
      message: "Slot booked successfully",
      success: true,
      booking: {
        id: result.newSlot.id,
        machineId: machine.machineId,
        slotTime: result.newSlot.slotTime.toISOString(),
        authCode: result.authCode,
        duration: result.newSlot.duration,
        status: result.newSlot.status,
      },
    });

  } catch (error: any) {
    console.error("❌ Error booking slot:", error);

    // Handle custom transaction errors
    if (error.message && error.message.startsWith('{')) {
      try {
        const errorData = JSON.parse(error.message);
        return res.status(errorData.status).json({
          message: errorData.message,
          error: errorData.error,
          details: errorData.details
        });
      } catch (parseError) {
        console.error("❌ Error parsing custom error:", parseError);
      }
    }

    // Handle Prisma unique constraint violations
    if (error.code === 'P2002') {
      return res.status(409).json({
        message: "This slot has been taken by another user",
        error: "SLOT_RACE_CONDITION"
      });
    }

    res.status(500).json({
      message: "Internal server error",
      error: "INTERNAL_ERROR"
    });
  }
}));

// Control Machine Endpoint - Start washing cycle
app.post("/api/control", isAuthenticated as any, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, slotTime, machineId, authCode } = req.body;

    console.log(`🎯 Validating slot for ${userId}, machineId: ${machineId}, slotTime: ${slotTime}`);

    if (!userId || !slotTime || !machineId || !authCode) {
      return res.status(400).json({
        error: "Invalid slot time"
      });
    }

    // Check if user has a subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, name: true },
    });

    if (!user?.stripeCustomerId) {
      console.log(`❌ No subscription for user: ${userId}`);
      return res.status(403).json({
        error: "Subscription required"
      });
    }

    console.log(`✅ User subscription verified: ${userId}`);

    // Parse slot time
    const slotTimeDate = new Date(slotTime);
    const now = new Date();

    // Validate current time is within slotTime to slotTime + 30 minutes window
    const slotEndTime = new Date(slotTimeDate.getTime() + 30 * 60 * 1000);

    if (now < slotTimeDate || now > slotEndTime) {
      console.log(`❌ Slot time invalid or not found for ${userId}, machineId: ${machineId}`);
      return res.status(400).json({
        error: "Invalid slot time"
      });
    }

    // First, find the machine to get its ObjectId
    let machine;
    if (machineId.length === 24 && /^[0-9a-fA-F]{24}$/.test(machineId)) {
      // It's already an ObjectId
      machine = await prisma.machine.findUnique({
        where: { id: machineId }
      });
    } else {
      // It's a machineId like "WASHER-001", find by machineId field
      machine = await prisma.machine.findUnique({
        where: { machineId: machineId }
      });
    }

    if (!machine) {
      console.log(`❌ Machine not found: ${machineId}`);
      return res.status(404).json({
        error: "Machine not found"
      });
    }

    console.log(`✅ Machine found: ${machine.machineId} (ObjectId: ${machine.id})`);

    // Find the slot with matching details using the machine's ObjectId
    const slot = await prisma.slot.findFirst({
      where: {
        userId,
        machineId: machine.id, // Use the machine's ObjectId
        slotTime: slotTimeDate,
        authCode,
        status: 'Reserved'
      },
      include: {
        machine: true,
        user: true
      }
    });

    if (!slot) {
      console.log(`❌ Invalid auth code for slot: ${userId}, ${machineId}, ${slotTime}`);
      return res.status(401).json({
        error: "Invalid auth code"
      });
    }

    console.log(`✅ Slot validated: ${slot.id}`);

    // Check if cycle has already been started by looking for existing 'Started' UsageLog
    const existingStartLog = await prisma.usageLog.findFirst({
      where: {
        slotId: slot.id,
        action: 'Started'
      }
    });

    const existingCompletedLog = await prisma.usageLog.findFirst({
      where: {
        slotId: slot.id,
        action: 'Completed'
      }
    });

    // If cycle already started and not completed, prevent duplicate start
    if (existingStartLog && !existingCompletedLog) {
      console.log(`❌ Cycle already started for slot: ${slot.id} at ${existingStartLog.createdAt}`);

      // Calculate remaining time for the already running cycle
      // Reuse existing slotEndTime variable from earlier in the function
      const currentTimeForDuplicate = new Date();
      const elapsedMs = currentTimeForDuplicate.getTime() - existingStartLog.createdAt.getTime();
      const elapsedSeconds = Math.floor(elapsedMs / 1000);

      // Calculate remaining time until slot expires (not full 30 minutes)
      const timeUntilSlotExpires = Math.max(0, Math.floor((slotEndTime.getTime() - currentTimeForDuplicate.getTime()) / 1000));
      const maxCycleSeconds = 30 * 60; // 30 minutes
      const cycleElapsedSeconds = Math.floor((currentTimeForDuplicate.getTime() - existingStartLog.createdAt.getTime()) / 1000);
      const remainingSeconds = Math.min(
        Math.max(0, maxCycleSeconds - cycleElapsedSeconds),
        timeUntilSlotExpires
      );

      return res.status(409).json({
        error: "Cycle already started",
        message: "This washing cycle is already running",
        cycleStartTime: existingStartLog.createdAt,
        timeRemaining: remainingSeconds
      });
    }

    // Update machine status to InUse
    await prisma.machine.update({
      where: { id: slot.machine.id },
      data: { status: 'InUse' }
    });

    // Create initial UsageLog entry for cycle start
    await prisma.usageLog.create({
      data: {
        userId,
        machineId: slot.machine.id,
        slotId: slot.id,
        action: 'Started',
      },
    });

    console.log(`✅ UsageLog created: action=Started, slotId=${slot.id}`);

    // Calculate actual cycle duration based on remaining slot time
    // Reuse existing now and slotEndTime variables from earlier in the function
    const currentTime = new Date(); // Use different variable name to avoid conflict
    const timeUntilSlotExpires = Math.max(0, Math.floor((slotEndTime.getTime() - currentTime.getTime()) / 1000));
    const maxCycleSeconds = 30 * 60; // 30 minutes
    const actualCycleDuration = Math.min(maxCycleSeconds, timeUntilSlotExpires);
    const actualCycleDurationMs = actualCycleDuration * 1000;

    console.log(`⏰ Cycle duration calculation:`, {
      slotTime: slotTimeDate.toISOString(),
      slotEndTime: slotEndTime.toISOString(),
      currentTime: currentTime.toISOString(),
      timeUntilSlotExpires: timeUntilSlotExpires,
      maxCycleSeconds: maxCycleSeconds,
      actualCycleDuration: actualCycleDuration,
      actualCycleDurationMinutes: Math.floor(actualCycleDuration / 60)
    });

    // Send MQTT message to ESP32 relay to start the cycle with slot end time
    try {
      await startCycle(slot.machine.machineId, slotEndTime);
      console.log(`📤 ESP32: Started cycle for machine ${slot.machine.machineId} until ${slotEndTime.toISOString()}`);
    } catch (error) {
      console.error(`❌ ESP32: Failed to start cycle for machine ${slot.machine.machineId}:`, error);
      // Continue execution even if MQTT fails (for offline scenarios)
    }

    // Send display update with actual remaining time
    const displayMinutes = Math.floor(actualCycleDuration / 60);
    const displaySeconds = actualCycleDuration % 60;
    const displayTime = `${displayMinutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;

    try {
      await updateDisplay(slot.machine.machineId, {
        line1: "Cycle Running",
        line2: `${displayTime} remaining`,
        line3: `User: ${user.name}`,
      });
      console.log(`📺 ESP32: Updated display for machine ${slot.machine.machineId}`);
    } catch (error) {
      console.error(`❌ ESP32: Failed to update display for machine ${slot.machine.machineId}:`, error);
    }

    // Schedule timeout for cycle completion based on actual duration
    setTimeout(async () => {
      try {
        console.log(`⏰ Cycle timeout reached for slotId: ${slot.id} after ${Math.floor(actualCycleDuration / 60)} minutes`);

        // Send MQTT stop message
        try {
          await stopCycle(slot.machine.machineId);
          console.log(`📤 ESP32: Stopped cycle for machine ${slot.machine.machineId}`);
        } catch (error) {
          console.error(`❌ ESP32: Failed to stop cycle for machine ${slot.machine.machineId}:`, error);
        }

        // Update slot status to Completed
        await prisma.slot.update({
          where: { id: slot.id },
          data: { status: 'Completed' }
        });
        console.log(`✅ Slot updated to Completed: ${slot.id}`);

        // Create notification for cycle completion
        await prisma.notification.create({
          data: {
            userId,
            slotId: slot.id,
            title: "Cycle Finished",
            message: "Your washing cycle has finished",
          },
        });
        console.log(`✅ Notification created: Cycle Finished for ${userId}`);

        // Create completion UsageLog entry
        await prisma.usageLog.create({
          data: {
            userId,
            machineId: slot.machine.id,
            slotId: slot.id,
            action: 'Completed',
          },
        });
        console.log(`✅ UsageLog created: action=Completed, slotId=${slot.id}`);

        // Update machine status back to Available
        await prisma.machine.update({
          where: { id: slot.machine.id },
          data: { status: 'Available' }
        });

      } catch (error) {
        console.error(`❌ Error in cycle timeout for slot ${slot.id}:`, error);
      }
    }, actualCycleDurationMs); // Use actual calculated duration

    console.log(`⏰ Scheduled stop for slotId=${slot.id} in ${Math.floor(actualCycleDuration / 60)} minutes (${actualCycleDuration} seconds)`);

    res.status(200).json({
      status: "success"
    });

  } catch (error) {
    console.error("❌ Error processing control request:", error);
    res.status(500).json({
      error: "Server error"
    });
  }
}));

// Get Cycle Status Endpoint - Check if cycle is running for a slot
app.get("/api/cycle-status/:slotId", isAuthenticated as any, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slotId } = req.params;
    const userId = req.user.id;

    console.log(`🔍 Checking cycle status for slot: ${slotId}, user: ${userId}`);

    // Find the slot and check if it belongs to the user
    const slot = await prisma.slot.findFirst({
      where: {
        id: slotId,
        userId: userId,
      },
      include: {
        machine: true,
        usageLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Get recent usage logs
        }
      }
    });

    if (!slot) {
      return res.status(404).json({
        error: "Slot not found"
      });
    }

    // Check if cycle has been started by looking for 'Started' usage log
    const startedLog = slot.usageLogs.find(log => log.action === 'Started');
    const completedLog = slot.usageLogs.find(log => log.action === 'Completed');

    // Determine cycle status
    const cycleStarted = !!startedLog && !completedLog;
    const cycleCompleted = !!completedLog;
    const cycleStartTime = startedLog?.createdAt || null;

    // Calculate remaining time if cycle is running
    let timeRemaining = null;
    if (cycleStarted && cycleStartTime) {
      const now = new Date();
      const slotEndTime = new Date(slot.slotTime.getTime() + 30 * 60 * 1000);
      const elapsedMs = now.getTime() - new Date(cycleStartTime).getTime();
      const elapsedSeconds = Math.floor(elapsedMs / 1000);

      // Calculate remaining time considering both cycle duration and slot expiration
      const timeUntilSlotExpires = Math.max(0, Math.floor((slotEndTime.getTime() - now.getTime()) / 1000));
      const maxCycleSeconds = 30 * 60; // 30 minutes
      const cycleTimeRemaining = Math.max(0, maxCycleSeconds - elapsedSeconds);

      // Use the minimum of cycle time remaining and time until slot expires
      timeRemaining = Math.min(cycleTimeRemaining, timeUntilSlotExpires);
    }

    console.log(`✅ Cycle status for slot ${slotId}:`, {
      cycleStarted,
      cycleCompleted,
      cycleStartTime,
      timeRemaining,
      machineStatus: slot.machine.status
    });

    res.status(200).json({
      success: true,
      slotId: slot.id,
      slotStatus: slot.status,
      machineStatus: slot.machine.status,
      cycleStarted,
      cycleCompleted,
      cycleStartTime,
      timeRemaining,
      usageLogs: slot.usageLogs.map(log => ({
        action: log.action,
        createdAt: log.createdAt
      }))
    });

  } catch (error) {
    console.error("❌ Error checking cycle status:", error);
    res.status(500).json({
      error: "Server error"
    });
  }
}));

// Get User Slot History Endpoint - For expired/completed slots
app.get("/api/user-slot-history", isAuthenticated as any, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    console.log(`🎯 Fetching slot history for user: ${userId}`);

    // Get user's completed/expired slots
    const slotHistory = await prisma.slot.findMany({
      where: {
        userId,
        OR: [
          { status: 'Completed' }, // Includes both completed and expired slots
          { status: 'Cancelled' },
          {
            status: 'Reserved',
            slotTime: {
              lt: new Date(), // Past slots that are still marked as Reserved
            }
          }
        ],
      },
      include: {
        machine: {
          select: {
            id: true,
            machineId: true,
            location: true,
          },
        },
      },
      orderBy: {
        slotTime: 'desc', // Most recent first
      },
      take: Number(limit),
      skip: Number(offset),
    });

    console.log(`✅ Found ${slotHistory.length} historical slots`);

    res.status(200).json({
      success: true,
      slots: slotHistory,
      count: slotHistory.length
    });
  } catch (error) {
    console.error("❌ Error fetching slot history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      slots: []
    });
  }
}));

// Cleanup Expired Slots Endpoint - Moves expired slots to history
app.post("/api/cleanup-expired-slots", isAuthenticated as any, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();

    console.log(`🧹 Starting expired slots cleanup at ${now.toISOString()}`);

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
      return res.status(200).json({
        success: true,
        message: 'No expired slots found',
        expiredCount: 0
      });
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

    // Log the cleanup
    for (const slot of expiredSlots) {
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
    }

    console.log(`✅ Successfully expired ${updateResult.count} slots`);

    res.status(200).json({
      success: true,
      message: `Successfully expired ${updateResult.count} slots`,
      expiredCount: updateResult.count,
      expiredSlots: expiredSlots.map(slot => ({
        id: slot.id,
        machine: slot.machine.machineId,
        slotTime: slot.slotTime,
        user: slot.user.email,
      }))
    });
  } catch (error) {
    console.error("❌ Error cleaning up expired slots:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
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

// Development Endpoint - Update User Subscription (DEV ONLY)
app.post("/api/dev/update-subscription", asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email, subscriptionType } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Subscription types
    const subscriptionTypes = {
      1: `cus_dev_premium_${Date.now()}`,
      2: `cus_dev_basic_${Date.now()}`,
      3: `cus_dev_trial_${Date.now()}`,
      4: null, // No subscription
      5: `cus_dev_expired_${Date.now()}`,
      6: null  // Cancelled
    };

    const stripeCustomerId = subscriptionTypes[subscriptionType as keyof typeof subscriptionTypes];

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { stripeCustomerId }
    });

    console.log(`✅ Updated subscription for ${email}: ${stripeCustomerId || 'None'}`);

    res.json({
      success: true,
      message: "Subscription updated successfully",
      user: {
        email: updatedUser.email,
        name: updatedUser.name,
        stripeCustomerId: updatedUser.stripeCustomerId
      }
    });

  } catch (error: any) {
    console.error("❌ Error updating subscription:", error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(500).json({ error: "Failed to update subscription" });
  }
}));

// ESP32 Test Endpoint - Test MQTT communication
app.get("/api/esp32/test", asyncHandler(async (req: Request, res: Response) => {
  try {
    const { action, machineId } = req.query;
    const testMachineId = (machineId as string) || "washer1";

    console.log(`🧪 ESP32 Test: ${action} for machine ${testMachineId}`);

    if (action === "start") {
      await startCycle(testMachineId);
      res.json({ success: true, message: `Start command sent to ${testMachineId}` });
    } else if (action === "stop") {
      await stopCycle(testMachineId);
      res.json({ success: true, message: `Stop command sent to ${testMachineId}` });
    } else if (action === "display") {
      await updateDisplay(testMachineId, {
        line1: "Test Mode",
        line2: "ESP32 Working",
        line3: "From Backend"
      });
      res.json({ success: true, message: `Display update sent to ${testMachineId}` });
    } else {
      res.json({
        success: true,
        message: "ESP32 Test Endpoint",
        usage: "?action=start|stop|display&machineId=washer1"
      });
    }
  } catch (error) {
    console.error("❌ ESP32 Test Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}));

// Start background jobs for slot management
import { startBackgroundJobs } from './background-jobs.js';

// Start Server
const PORT = parseInt(process.env.PORT || "3000");
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Express server running on port ${PORT}`);
  console.log("✅ Connected to MongoDB");

  // Start background jobs for automatic slot cleanup
  console.log('🔧 Starting background jobs...');
  startBackgroundJobs();
});
