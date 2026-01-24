import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authroutes.js";
import chargingRoutes from "./routes/chargingRoutes.js";
import authMiddleware from "./middleware/auth.js";
import User from "./models/User.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/evhelper/dist')));
}

app.get("/", (req, res) => {
  res.send("API running");
});

app.use("/api/auth", authRoutes);
app.use("/api/charging", chargingRoutes);

// Serve React app for any non-API routes in production
if (process.env.NODE_ENV === 'production') {
  // Serve index.html for any non-API route. Using app.use avoids wildcard path
  // patterns that are incompatible with Express 5's path-to-regexp upgrade.
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, '../../client/evhelper/dist/index.html'));
  });
}

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
