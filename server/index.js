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




app.post("/login", async (req, res) => {
  try {
    const { signedToken } = req.body;

    if (!signedToken) {
      return res.status(400).json({ message: "signedToken is required" });
    }

    let decodedToken;
    try {
      console.log("Server: EXPO_PUBLIC_JWT_SECRET_KEY is", process.env.EXPO_PUBLIC_JWT_SECRET_KEY ? "FOUND" : "MISSING or empty");
      decodedToken = jwt.verify(signedToken, process.env.EXPO_PUBLIC_JWT_SECRET_KEY);
    } catch (error) {
      console.error("JWT verification error on server:", error.message);
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



// get logged in user
app.get("/me", isAuthenticated, async (req, res, next) => {
  try {
    const user = req.user;
    res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    console.log(error);
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    console.log("✅ Connected to DB");
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  } catch (err) {
    console.error("❌ DB error:", err);
    process.exit(1);
  }
});
