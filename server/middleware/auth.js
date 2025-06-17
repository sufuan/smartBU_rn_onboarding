import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.js";

export const isAuthenticated = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"];

    if (accessToken && accessToken.startsWith("Bearer ")) {
      const token = accessToken.slice(7, accessToken.length);

      // verify the token
      const userData = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);

      // fetching user data
      const user = await prisma.user.findUnique({
        where: {
          id: userData.id,
        },
        include: {
          slots: {
            include: {
              machine: true,
            },
          },
          notifications: true,
          tickets: {
            include: {
              replies: true,
            },
          },
          usageLogs: {
            include: {
              machine: true,
              slot: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found. Please login again.",
        });
      }

      // Attach the user data to the request object
      req.user = user;

      next();
    } else {
      res.status(401).json({
        success: false,
        message: "Authentication token is missing or invalid.",
      });
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid token. Authentication failed.",
    });
  }
};