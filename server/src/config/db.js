import mongoose from "mongoose";

const connectDB = async () => {
  // Safety check: ensure MONGODB_URI is defined
  if (!process.env.MONGODB_URI) {
    throw new Error("❌ MONGODB_URI is missing in .env file");
  }

  try {
    // Connection options optimized for MongoDB Atlas
    const options = {
      // Useful for serverless environments and MongoDB Atlas
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log(`✅ MongoDB connected successfully!`);
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`🗄️  Database: ${conn.connection.name}`);
    
  } catch (error) {
    console.error("❌ MongoDB connection failed:");
    console.error(error.message);
    
    // Provide helpful error messages for common issues
    if (error.message.includes('authentication failed')) {
      console.error("\n💡 Tip: Check your MongoDB Atlas username and password in .env file");
      console.error("   Make sure to URL encode special characters in the password");
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
      console.error("\n💡 Tip: Check your MongoDB Atlas Network Access settings");
      console.error("   Make sure your IP address is whitelisted");
    }
    
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});

export default connectDB;
