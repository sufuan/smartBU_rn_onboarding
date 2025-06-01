import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();

export const sendToken = async (user, res) => {
  const accessToken = jwt.sign(
    { id: user.id },
    process.env.JWT_ACCESS_TOKEN_SECRET
  );

  res.status(201).json({
    success: true,
    accessToken,
  });
};