import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authroutes.js";
import chargingRoutes from "./routes/chargingRoutes.js";
import iotRoutes from "./routes/iotRoutes.js";
import authMiddleware from "./middleware/auth.js";
import User from "./models/User.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
connectDB();

const app = express();

const corsOptions = {
  // Reflect the requesting origin. This prevents production breakage when the
  // frontend domain changes (e.g. new Vercel deployment URL) and ensures
  // preflight requests receive Access-Control-Allow-Origin.
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// Ensure CORS preflight requests are handled for all routes.
// Express 5 does not accept '*' as a route string; use a regex route instead.
app.options(/.*/, cors(corsOptions));
app.use(express.json());

// Add security headers middleware
app.use((req, res, next) => {
  // Allow postMessage and cross-origin communication
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

// Serve static files from React build (production)
const distPath = path.join(__dirname, '../../client/evhelper/dist');
const fallbackPath = path.join(__dirname, '../public');

// In production, serve React build; in dev, serve test HTML
const staticPath = fs.existsSync(distPath) ? distPath : fallbackPath;
console.log('DEBUG: Serving static files from:', staticPath);

app.use(express.static(staticPath, { 
  setHeaders: (res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    // Security headers to allow postMessage and prevent COOP blocking
    res.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
  }
}));

app.use("/api/auth", authRoutes);
app.use("/api/charging", chargingRoutes);
app.use("/api/iot", iotRoutes);

// API 404 (keep API responses JSON)
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// Fallback: Serve index.html for any non-API route (SPA-style)
app.get(/^\/(?!api).*/, (req, res) => {
  const indexPath = fs.existsSync(distPath) 
    ? path.join(distPath, 'index.html')
    : path.join(fallbackPath, 'index.html');
  res.sendFile(indexPath);
});

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
