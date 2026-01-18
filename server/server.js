import http from "http";
import app from "./src/app.js";
import { Server } from "socket.io";

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// Make io instance available to routes
app.set('io', io);

/**
 * Utility function to sanitize and format city names for room names
 * @param {string} city - City name to sanitize
 * @returns {string} - Sanitized room name
 */
const sanitizeCityName = (city) => {
  return city
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  /**
   * Handle user joining a city-specific room
   * Event: 'join-city'
   * Data: { city: string }
   */
  socket.on("join-city", (data) => {
    try {
      const { city } = data;

      // Validate city input
      if (!city || typeof city !== 'string' || city.trim().length === 0) {
        socket.emit("error", { message: "Invalid city provided" });
        return;
      }

      const sanitizedCity = sanitizeCityName(city);
      const roomName = `city-${sanitizedCity}`;

      // Join city-specific room
      socket.join(roomName);
      
      // Store city info in socket object for reference
      socket.userCity = city;
      socket.roomName = roomName;

      console.log(`User ${socket.id} joined city room: ${roomName}`);

      // Confirm successful room join to client
      socket.emit("city-joined", { 
        city: city, 
        roomName: roomName,
        message: `Successfully joined ${city} room`
      });

      // Notify other users in same city
      socket.to(roomName).emit("user-joined-city", {
        userId: socket.id,
        city: city,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error("Error joining city room:", error);
      socket.emit("error", { message: "Failed to join city room" });
    }
  });

  /**
   * Handle leaving city room
   * Event: 'leave-city'
   */
  socket.on("leave-city", () => {
    if (socket.roomName) {
      socket.leave(socket.roomName);
      
      // Notify other users in same city
      socket.to(socket.roomName).emit("user-left-city", {
        userId: socket.id,
        city: socket.userCity,
        timestamp: new Date().toISOString()
      });

      console.log(`User ${socket.id} left city room: ${socket.roomName}`);
      
      // Clear stored city info
      socket.userCity = null;
      socket.roomName = null;
      
      socket.emit("city-left", { message: "Successfully left city room" });
    }
  });

  /**
   * Handle charging requests within a city
   * Event: 'charging-request'
   * Data: charging request object
   */
  socket.on("charging-request", (requestData) => {
    if (socket.roomName) {
      // Broadcast charging request to all users in same city (including sender for confirmation)
      io.to(socket.roomName).emit("charging-request", {
        ...requestData,
        requesterId: socket.id,
        city: socket.userCity,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Charging request broadcasted in ${socket.roomName}`);
    } else {
      socket.emit("error", { message: "You must join a city room first" });
    }
  });

  /**
   * Handle accepting charging requests with race condition protection
   * Event: 'accept-charging-request'
   * Data: { requestId: string }
   */
  socket.on("accept-charging-request", async (data) => {
    try {
      const { requestId } = data;
      const helperId = socket.userId; // Assuming userId is stored in socket after auth
      
      if (!socket.roomName) {
        socket.emit("error", { message: "You must join a city room first" });
        return;
      }

      if (!helperId) {
        socket.emit("error", { message: "User not authenticated" });
        return;
      }

      // Import models here to avoid circular dependencies
      const ChargingRequest = (await import('./src/models/ChargingRequest.js')).default;
      const User = (await import('./src/models/User.js')).default;

      // Start a session for atomic operations
      const session = await ChargingRequest.startSession();
      session.startTransaction();

      try {
        // Find and update request atomically
        // This ensures only one helper can accept the request (race condition protection)
        const request = await ChargingRequest.findOneAndUpdate(
          {
            _id: requestId,
            status: "OPEN", // Only accept OPEN requests
            requesterId: { $ne: helperId } // Prevent accepting own request
          },
          {
            $set: {
              helperId: helperId,
              status: "ACCEPTED",
              acceptedAt: new Date()
            }
          },
          {
            new: true,
            session,
            returnDocument: "after"
          }
        ).populate('requesterId helperId', 'name email city');

        if (!request) {
          await session.abortTransaction();
          session.endSession();
          
          // Check if request exists but is already accepted
          const existingRequest = await ChargingRequest.findById(requestId);
          if (existingRequest) {
            if (existingRequest.status !== "OPEN") {
              socket.emit("accept-failed", {
                requestId: requestId,
                reason: "Request already accepted or completed",
                status: existingRequest.status
              });
            } else if (existingRequest.requesterId.toString() === helperId) {
              socket.emit("accept-failed", {
                requestId: requestId,
                reason: "Cannot accept your own request"
              });
            }
          } else {
            socket.emit("accept-failed", {
              requestId: requestId,
              reason: "Request not found"
            });
          }
          return;
        }

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        console.log(`Charging request ${requestId} accepted by helper ${helperId}`);

        // Emit real-time notifications
        
        // 1. Notify the specific requester that their request was accepted
        io.to(request.requesterId._id.toString()).emit("charging-request-accepted", {
          request: {
            id: request._id,
            helperId: request.helperId._id,
            helperName: request.helperId.name,
            helperEmail: request.helperId.email,
            helperCity: request.helperId.city,
            status: request.status,
            acceptedAt: request.acceptedAt
          },
          timestamp: new Date().toISOString()
        });

        // 2. Notify the accepting helper for confirmation
        socket.emit("accept-confirmed", {
          request: {
            id: request._id,
            requesterId: request.requesterId._id,
            requesterName: request.requesterId.name,
            requesterEmail: request.requesterId.email,
            requesterCity: request.requesterId.city,
            status: request.status,
            acceptedAt: request.acceptedAt
          },
          timestamp: new Date().toISOString()
        });

        // 3. Notify all other helpers in the same city that this request is no longer available
        socket.to(socket.roomName).emit("request-taken", {
          requestId: requestId,
          message: `Charging request in ${socket.userCity} has been accepted`,
          status: "ACCEPTED",
          acceptedAt: request.acceptedAt,
          timestamp: new Date().toISOString()
        });

        // 4. Broadcast general notification to the city
        io.to(socket.roomName).emit("request-accepted-notification", {
          requestId: request._id,
          message: `A charging request has been accepted in ${socket.userCity}`,
          requesterName: request.requesterId.name,
          helperName: request.helperId.name,
          timestamp: new Date().toISOString()
        });

      } catch (transactionError) {
        await session.abortTransaction();
        session.endSession();
        
        console.error("Transaction error during request acceptance:", transactionError);
        socket.emit("accept-failed", {
          requestId: requestId,
          reason: "Database error during acceptance",
          error: "Transaction failed"
        });
      }

    } catch (error) {
      console.error("Error accepting charging request:", error);
      socket.emit("accept-failed", {
        requestId: data.requestId,
        reason: "Internal server error",
        error: "Server error occurred"
      });
    }
  });

  /**
   * Handle disconnection
   */
  socket.on("disconnect", () => {
    if (socket.roomName && socket.userCity) {
      // Notify other users in the same city that this user left
      socket.to(socket.roomName).emit("user-left-city", {
        userId: socket.id,
        city: socket.userCity,
        timestamp: new Date().toISOString()
      });
      
      console.log(`User ${socket.id} disconnected from ${socket.roomName}`);
    } else {
      console.log(`User ${socket.id} disconnected`);
    }
  });

  /**
   * Handle errors
   */
  socket.on("error", (error) => {
    console.error(`Socket error for user ${socket.id}:`, error);
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
