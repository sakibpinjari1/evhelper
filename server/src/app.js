import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import chargingRoutes from "./routes/chargingRoutes.js";
import authMiddleware from "./middleware/auth.js";
import User from "./models/User.js";


dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API running");
});

app.use("/api/auth", authRoutes);
app.use("/api/charging", chargingRoutes);

// Example of protected routes using the auth middleware
// Uncomment and modify these examples as needed:

// Protect a single route:
// app.get("/api/profile", authMiddleware, (req, res) => {
//   res.json({
//     message: "Access granted to protected profile",
//     user: req.user
//   });
// });

// Protect a group of routes:
// app.use("/api/protected", authMiddleware);
// app.get("/api/protected/data", (req, res) => {
//   res.json({
//     message: "This is protected data",
//     user: req.user
//   });
// });

// Example of a protected route that uses user data:
// app.get("/api/user/tokens", authMiddleware, (req, res) => {
//   res.json({
//     tokenBalance: req.user.tokenBalance,
//     name: req.user.name
//   });
// });

export default app;
