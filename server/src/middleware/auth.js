import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Authentication Middleware
 * Verifies JWT token and attaches authenticated user to request object
 * 
 * Usage: app.use('/api/protected', authMiddleware);
 *        or: router.get('/profile', authMiddleware, getProfile);
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header("Authorization");
    
    if (!authHeader) {
      return res.status(401).json({ 
        message: "Access denied. No token provided." 
      });
    }

    // Check if token is in Bearer format
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        message: "Invalid token format. Expected: Bearer <token>" 
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user in database to ensure user still exists
    const user = await User.findById(decoded.userId).select("-password");
    
    if (!user) {
      return res.status(401).json({ 
        message: "Token is valid but user not found." 
      });
    }

    // Attach user object to request
    req.user = user;
    
    // Continue to next middleware/route handler
    next();

  } catch (error) {
    // Handle specific JWT errors
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ 
        message: "Invalid token." 
      });
    }
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ 
        message: "Token expired." 
      });
    }

    // Handle other errors (e.g., database connection issues)
    console.error("Authentication middleware error:", error);
    return res.status(500).json({ 
      message: "Internal server error during authentication." 
    });
  }
};

export default authMiddleware;
