import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import { isAuthenticated } from "./middleware/auth.js";
import prisma from "./utils/prisma.js";
import { sendToken } from "./utils/sendToken.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Login Endpoint
app.post("/login", async (req, res) => {
  try {
    const { signedToken } = req.body;

    if (!signedToken) {
      return res.status(400).json({ message: "signedToken is required" });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(
        signedToken,
        process.env.EXPO_PUBLIC_JWT_SECRET_KEY
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
          name: name || "Unknown",
          email,
          avatar: avatar || "",
        },
      });
    }

    sendToken(user, res);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

// Get current logged-in user
app.get("/me", isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Test endpoint
app.get("/test", (req, res) => {
  res.json({ message: "Server is running updated code!", timestamp: new Date() });
});

// Get all courses
app.get("/get-courses", async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        courseData: {
          include: {
            links: true,
          },
        },
        benefits: true,
        prerequisites: true,
      },
    });

    res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});



// Create Course
// Add this to your Express server file (e.g., index.js)

app.post("/create-course", async (req, res) => {
  try {
    const {
      name,
      description,
      categories,
      price,
      estimatedPrice,
      thumbnail,
      tags,
      level,
      demoUrl,
      slug,
      iosProductId,
      androidProductId,
      visibility = true,
      benefits = [],
      prerequisites = [],
      courseData = [],
    } = req.body;

    // Simple validation
    if (!name || !description || !price || !slug) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const course = await prisma.course.create({
      data: {
        name,
        description,
        categories,
        price: parseFloat(price),
        estimatedPrice: parseFloat(estimatedPrice || 0),
        thumbnail,
        tags,
        level,
        demoUrl,
        slug,
        iosProductId,
        androidProductId,
        visibility,

        benefits: {
          create: benefits.map((title) => ({ title })),
        },
        prerequisites: {
          create: prerequisites.map((title) => ({ title })),
        },
        courseData: {
          create: courseData.map((section) => ({
            title: section.title,
            description: section.description || "",
            videoUrl: section.videoUrl || "",
            videoSection: section.videoSection || section.title || "",
            videoLength: section.videoLength || "0",
            videoPlayer: section.videoPlayer || null,
            links: {
              create: section.links || [],
            },
          })),
        },
      },
      include: {
        benefits: true,
        prerequisites: true,
        courseData: {
          include: { links: true },
        },
      },
    });

    return res.status(201).json({
      success: true,
      course,
    });
  } catch (error) {
    console.error("Create course error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});



// Create Free Order

app.post("/create-free-order", isAuthenticated, async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.id;

    console.log("Free enrollment request:", { courseId, userId, body: req.body });

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required"
      });
    }

    // Handle simple courseId like "1", "2", etc. by finding course by index
    let course;

    // First, try to find all courses and match by index (since courseId might be '1', '2', etc.)
    const allCourses = await prisma.course.findMany({
      select: { id: true, name: true, price: true, slug: true }
    });

    // Try to match by index (courseId '1' = first course, '2' = second course, etc.)
    const courseIndex = parseInt(courseId) - 1;
    if (courseIndex >= 0 && courseIndex < allCourses.length) {
      course = allCourses[courseIndex];
    } else {
      // If not found by index, try to find by actual id (in case it's a valid ObjectId)
      try {
        course = await prisma.course.findFirst({
          where: { id: courseId },
          select: { id: true, name: true, price: true, slug: true }
        });
      } catch (error) {
        // If ObjectId is invalid, course will remain undefined
      }
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Check if course is free
    if (course.price !== 0) {
      return res.status(400).json({
        success: false,
        message: "This course requires payment. Please use the checkout process."
      });
    }

    // Check if user already enrolled
    const existingOrder = await prisma.orders.findFirst({
      where: {
        userId: userId,
        courseId: course.id
      }
    });

    if (existingOrder) {
      return res.status(409).json({
        success: false,
        message: "You are already enrolled in this course"
      });
    }

    // Create free enrollment order
    const order = await prisma.orders.create({
      data: {
        userId: userId,
        courseId: course.id,
        payment_info: "FREE_ENROLLMENT",
        product_id: null,
        transaction_id: `FREE_${Date.now()}_${userId.slice(-6)}`
      }
    });

    // Update course purchased count
    await prisma.course.update({
      where: { id: course.id },
      data: {
        purchased: {
          increment: 1
        }
      }
    });

    res.status(201).json({
      success: true,
      message: "Successfully enrolled in the free course!",
      order: {
        id: order.id,
        courseId: order.courseId,
        courseName: course.name,
        courseSlug: course.slug || course.name.toLowerCase().replace(/\s+/g, '-'),
        enrollmentType: "FREE",
        enrolledAt: order.createdAt
      }
    });

  } catch (error) {
    console.error("Free enrollment error:", error);
    console.error("Error details:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to enroll in course",
      error: error.message
    });
  }
});



// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", async () => {
  try {
    await prisma.$connect();
    console.log("✅ Connected to DB");
    console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
  } catch (err) {
    console.error("❌ DB connection error:", err);
    process.exit(1);
  }
});
