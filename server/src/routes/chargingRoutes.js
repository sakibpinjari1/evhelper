import express from "express";
import authMiddleware from "../middleware/auth.js";
import ChargingRequest from "../models/ChargingRequest.js";
import User from "../models/User.js";

const router = express.Router();

// Fixed token cost for creating a charging request
const TOKEN_COST = 5;

/**
 * POST /api/charging/requests
 * Create a new charging request
 * Requires authentication
 * Deducts 5 tokens from user's balance
 */
router.post("/requests", authMiddleware, async (req, res) => {
  try {
    const { location, urgency, message, contactInfo, estimatedTime } = req.body;
    const userId = req.user._id;
    const userCity = req.user.city;

    // Validate required fields
    if (!location || !urgency) {
      return res.status(400).json({
        success: false,
        message: "Location and urgency are required fields"
      });
    }

    // Validate urgency enum
    const validUrgencyLevels = ["low", "medium", "high"];
    if (!validUrgencyLevels.includes(urgency)) {
      return res.status(400).json({
        success: false,
        message: "Invalid urgency level. Must be: low, medium, or high"
      });
    }

    // Check if user has sufficient tokens
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.tokenBalance < TOKEN_COST) {
      return res.status(400).json({
        success: false,
        message: `Insufficient tokens. You have ${user.tokenBalance} tokens, but ${TOKEN_COST} are required to create a charging request.`
      });
    }

    // Start a session for atomic operations
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Deduct tokens from user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          $inc: { tokenBalance: -TOKEN_COST },
          $push: {
            tokenHistory: {
              amount: -TOKEN_COST,
              type: "charging_request",
              description: "Created charging request",
              timestamp: new Date()
            }
          }
        },
        { 
          new: true, 
          session,
          select: 'tokenBalance email name city'
        }
      );

      if (!updatedUser) {
        throw new Error("Failed to update user tokens");
      }

      // Create charging request
      const chargingRequest = await ChargingRequest.create(
        [
          {
            requesterId: userId,
            city: userCity,
            status: "OPEN",
            location: location.trim(),
            urgency: urgency.toLowerCase(),
            message: message ? message.trim() : "",
            contactInfo: contactInfo ? contactInfo.trim() : "",
            estimatedTime: estimatedTime ? parseInt(estimatedTime) : null,
            tokenCost: TOKEN_COST
          }
        ],
        { session }
      );

      const request = chargingRequest[0];

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      // Populate requester information for socket event
      const populatedRequest = await ChargingRequest.findById(request._id)
        .populate('requesterId', 'name email city')
        .lean();

      // Emit real-time event to helpers in the same city
      // Note: This will be handled by importing io from server.js
      // For now, we'll emit the event and handle it in the server file
      const io = req.app.get('io');
      if (io) {
        const roomName = `city-${userCity.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
        
        io.to(roomName).emit('charging-request-created', {
          request: {
            id: request._id,
            requesterId: request.requesterId,
            requesterName: updatedUser.name,
            requesterEmail: updatedUser.email,
            city: request.city,
            location: request.location,
            urgency: request.urgency,
            message: request.message,
            contactInfo: request.contactInfo,
            estimatedTime: request.estimatedTime,
            status: request.status,
            tokenCost: request.tokenCost,
            createdAt: request.createdAt
          },
          timestamp: new Date().toISOString()
        });

        console.log(`Charging request ${request._id} broadcasted to city room: ${roomName}`);
      }

      // Return success response
      res.status(201).json({
        success: true,
        message: "Charging request created successfully",
        request: {
          id: request._id,
          requesterId: request.requesterId,
          city: request.city,
          status: request.status,
          location: request.location,
          urgency: request.urgency,
          message: request.message,
          contactInfo: request.contactInfo,
          estimatedTime: request.estimatedTime,
          tokenCost: request.tokenCost,
          remainingTokens: updatedUser.tokenBalance,
          createdAt: request.createdAt
        }
      });

    } catch (transactionError) {
      // Abort transaction if any error occurs
      await session.abortTransaction();
      session.endSession();
      
      console.error("Transaction error:", transactionError);
      
      // If token deduction failed but request creation succeeded, we need to handle this
      // In a real production environment, you might want to add compensation logic here
      
      res.status(500).json({
        success: false,
        message: "Failed to create charging request. Please try again."
      });
    }

  } catch (error) {
    console.error("Error creating charging request:", error);
    
    res.status(500).json({
      success: false,
      message: "Internal server error while creating charging request"
    });
  }
});

/**
 * GET /api/charging/requests
 * Get all charging requests for the authenticated user
 * Requires authentication
 */
router.get("/requests", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, city, page = 1, limit = 10 } = req.query;

    // Build query filter
    const filter = { requesterId: userId };
    
    if (status) {
      filter.status = status.toUpperCase();
    }
    
    if (city) {
      filter.city = city;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get requests with pagination
    const requests = await ChargingRequest.find(filter)
      .populate('helperId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination info
    const total = await ChargingRequest.countDocuments(filter);

    res.json({
      success: true,
      requests: requests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRequests: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error("Error fetching charging requests:", error);
    
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching charging requests"
    });
  }
});

/**
 * GET /api/charging/requests/city/:city
 * Get all OPEN charging requests in a specific city
 * Requires authentication
 */
router.get("/requests/city/:city", authMiddleware, async (req, res) => {
  try {
    const { city } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Build query filter for open requests in the specified city
    const filter = { 
      city: city,
      status: "OPEN"
    };

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get requests with pagination
    const requests = await ChargingRequest.find(filter)
      .populate('requesterId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination info
    const total = await ChargingRequest.countDocuments(filter);

    res.json({
      success: true,
      requests: requests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRequests: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error("Error fetching city charging requests:", error);
    
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching city charging requests"
    });
  }
});

/**
 * POST /api/charging/requests/:requestId/accept
 * Accept a charging request
 * Requires authentication
 */
router.post("/requests/:requestId/accept", authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const helperId = req.user._id;

    // Find and update the request
    const request = await ChargingRequest.findOneAndUpdate(
      { 
        _id: requestId, 
        status: "OPEN",
        requesterId: { $ne: helperId } // Prevent accepting own request
      },
      { 
        helperId: helperId,
        status: "ACCEPTED",
        acceptedAt: new Date()
      },
      { new: true }
    ).populate('requesterId helperId', 'name email city');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Charging request not found or cannot be accepted"
      });
    }

    // Emit real-time event to requester
    const io = req.app.get('io');
    if (io) {
      // Notify the specific requester
      io.to(request.requesterId._id.toString()).emit('charging-request-accepted', {
        request: {
          id: request._id,
          helperId: request.helperId._id,
          helperName: request.helperId.name,
          helperEmail: request.helperId.email,
          status: request.status,
          acceptedAt: request.acceptedAt
        },
        timestamp: new Date().toISOString()
      });

      // Notify the city that request was accepted
      const roomName = `city-${request.city.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
      io.to(roomName).emit('request-accepted-notification', {
        requestId: request._id,
        message: `A charging request has been accepted in ${request.city}`,
        timestamp: new Date().toISOString()
      });

      console.log(`Charging request ${requestId} accepted by ${helperId}`);
    }

    res.json({
      success: true,
      message: "Charging request accepted successfully",
      request: {
        id: request._id,
        requesterId: request.requesterId._id,
        helperId: request.helperId._id,
        city: request.city,
        status: request.status,
        acceptedAt: request.acceptedAt
      }
    });

  } catch (error) {
    console.error("Error accepting charging request:", error);
    
    res.status(500).json({
      success: false,
      message: "Internal server error while accepting charging request"
    });
  }
});

/**
 * POST /api/charging/requests/:requestId/complete
 * Complete a charging request
 * Transfer tokens from requester to helper
 * Only requester or helper can complete
 */
router.post("/requests/:requestId/complete", authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    // Find the request with populated user data
    const request = await ChargingRequest.findById(requestId)
      .populate('requesterId helperId', 'name email city tokenBalance');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Charging request not found"
      });
    }

    // Authorization check: Only requester or helper can complete
    if (request.requesterId._id.toString() !== userId && 
        (!request.helperId || request.helperId._id.toString() !== userId)) {
      return res.status(403).json({
        success: false,
        message: "Only the requester or assigned helper can complete this request"
      });
    }

    // Status check: Only ACCEPTED requests can be completed
    if (request.status !== "ACCEPTED") {
      return res.status(400).json({
        success: false,
        message: `Cannot complete request with status: ${request.status}`
      });
    }

    // Start a session for atomic operations
    const session = await User.startSession();
    session.startTransaction();

    try {
      const requesterId = request.requesterId._id;
      const helperId = request.helperId._id;

      // Add tokens to helper (reward for completing the request)
      const updatedHelper = await User.findByIdAndUpdate(
        helperId,
        { 
          $inc: { tokenBalance: TOKEN_COST },
          $push: {
            tokenHistory: {
              amount: TOKEN_COST,
              type: "reward",
              description: `Completed charging request for ${request.requesterId.name}`,
              timestamp: new Date()
            }
          }
        },
        { 
          new: true, 
          session,
          select: 'tokenBalance name email'
        }
      );

      if (!updatedHelper) {
        throw new Error("Failed to update helper tokens");
      }

      // Record payment in requester's history (tokens were already deducted at creation)
      const updatedRequester = await User.findByIdAndUpdate(
        requesterId,
        { 
          $push: {
            tokenHistory: {
              amount: -TOKEN_COST,
              type: "payment",
              description: `Payment to ${request.helperId.name} for charging service`,
              timestamp: new Date()
            }
          }
        },
        { 
          new: true, 
          session,
          select: 'tokenBalance name email'
        }
      );

      if (!updatedRequester) {
        throw new Error("Failed to update requester history");
      }

      // Update request status to COMPLETED
      const updatedRequest = await ChargingRequest.findByIdAndUpdate(
        requestId,
        {
          status: "COMPLETED",
          completedAt: new Date()
        },
        { 
          new: true, 
          session,
          populate: 'requesterId helperId', 'name email city'
        }
      );

      if (!updatedRequest) {
        throw new Error("Failed to update request status");
      }

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      console.log(`Charging request ${requestId} completed. Tokens transferred from ${requesterId} to ${helperId}`);

      // Emit real-time notifications
      const io = req.app.get('io');
      if (io) {
        const roomName = `city-${request.city.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

        // 1. Notify both parties of completion
        io.to(requesterId.toString()).emit('request-completed', {
          request: {
            id: updatedRequest._id,
            helperId: updatedRequest.helperId._id,
            helperName: updatedRequest.helperId.name,
            status: updatedRequest.status,
            completedAt: updatedRequest.completedAt,
            tokenAmount: TOKEN_COST
          },
          requesterNewBalance: updatedRequester.tokenBalance,
          timestamp: new Date().toISOString()
        });

        io.to(helperId.toString()).emit('request-completed', {
          request: {
            id: updatedRequest._id,
            requesterId: updatedRequest.requesterId._id,
            requesterName: updatedRequest.requesterId.name,
            status: updatedRequest.status,
            completedAt: updatedRequest.completedAt,
            tokenAmount: TOKEN_COST
          },
          helperNewBalance: updatedHelper.tokenBalance,
          timestamp: new Date().toISOString()
        });

        // 2. Notify city that request was completed
        io.to(roomName).emit('request-completed-notification', {
          requestId: updatedRequest._id,
          message: `A charging request has been completed in ${request.city}`,
          requesterName: updatedRequest.requesterId.name,
          helperName: updatedRequest.helperId.name,
          status: "COMPLETED",
          completedAt: updatedRequest.completedAt,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        message: "Charging request completed successfully",
        request: {
          id: updatedRequest._id,
          requesterId: updatedRequest.requesterId._id,
          helperId: updatedRequest.helperId._id,
          city: updatedRequest.city,
          status: updatedRequest.status,
          completedAt: updatedRequest.completedAt,
          tokenAmount: TOKEN_COST
        },
        balances: {
          requester: updatedRequester.tokenBalance,
          helper: updatedHelper.tokenBalance
        }
      });

    } catch (transactionError) {
      await session.abortTransaction();
      session.endSession();
      
      console.error("Transaction error during request completion:", transactionError);
      
      res.status(500).json({
        success: false,
        message: "Failed to complete charging request. Please try again."
      });
    }

  } catch (error) {
    console.error("Error completing charging request:", error);
    
    res.status(500).json({
      success: false,
      message: "Internal server error while completing charging request"
    });
  }
});

/**
 * POST /api/charging/requests/:requestId/cancel
 * Cancel a charging request
 * Refund tokens to requester
 * Only requester can cancel
 */
router.post("/requests/:requestId/cancel", authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    // Find the request
    const request = await ChargingRequest.findById(requestId)
      .populate('requesterId', 'name email city tokenBalance');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Charging request not found"
      });
    }

    // Authorization check: Only requester can cancel
    if (request.requesterId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the requester can cancel this request"
      });
    }

    // Status check: Only OPEN or ACCEPTED requests can be canceled
    if (request.status !== "OPEN" && request.status !== "ACCEPTED") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel request with status: ${request.status}`
      });
    }

    // Start a session for atomic operations
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Refund tokens to requester
      const updatedUser = await User.findByIdAndUpdate(
        request.requesterId._id,
        { 
          $inc: { tokenBalance: TOKEN_COST },
          $push: {
            tokenHistory: {
              amount: TOKEN_COST,
              type: "refund",
              description: "Refunded canceled charging request",
              timestamp: new Date()
            }
          }
        },
        { 
          new: true, 
          session,
          select: 'tokenBalance name email'
        }
      );

      if (!updatedUser) {
        throw new Error("Failed to refund tokens");
      }

      // Update request status to CANCELED
      const updatedRequest = await ChargingRequest.findByIdAndUpdate(
        requestId,
        {
          status: "CANCELED",
          canceledAt: new Date()
        },
        { 
          new: true, 
          session,
          populate: 'requesterId', 'name email city'
        }
      );

      if (!updatedRequest) {
        throw new Error("Failed to update request status");
      }

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      console.log(`Charging request ${requestId} canceled. Tokens refunded to ${request.requesterId._id}`);

      // Emit real-time notifications
      const io = req.app.get('io');
      if (io) {
        const roomName = `city-${request.city.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

        // 1. Notify requester of cancellation confirmation
        io.to(request.requesterId._id.toString()).emit('request-canceled', {
          request: {
            id: updatedRequest._id,
            status: updatedRequest.status,
            canceledAt: updatedRequest.canceledAt,
            tokenAmount: TOKEN_COST
          },
          newBalance: updatedUser.tokenBalance,
          timestamp: new Date().toISOString()
        });

        // 2. Notify city that request was canceled
        io.to(roomName).emit('request-canceled-notification', {
          requestId: updatedRequest._id,
          message: `A charging request has been canceled in ${request.city}`,
          requesterName: updatedRequest.requesterId.name,
          status: "CANCELED",
          canceledAt: updatedRequest.canceledAt,
          timestamp: new Date().toISOString()
        });

        // 3. If request was accepted, notify helper that it was canceled
        if (request.helperId) {
          io.to(request.helperId.toString()).emit('request-canceled-by-requester', {
            request: {
              id: updatedRequest._id,
              requesterName: updatedRequest.requesterId.name,
              status: updatedRequest.status,
              canceledAt: updatedRequest.canceledAt
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      res.json({
        success: true,
        message: "Charging request canceled successfully",
        request: {
          id: updatedRequest._id,
          requesterId: updatedRequest.requesterId._id,
          city: updatedRequest.city,
          status: updatedRequest.status,
          canceledAt: updatedRequest.canceledAt,
          tokenAmount: TOKEN_COST
        },
        newBalance: updatedUser.tokenBalance
      });

    } catch (transactionError) {
      await session.abortTransaction();
      session.endSession();
      
      console.error("Transaction error during request cancellation:", transactionError);
      
      res.status(500).json({
        success: false,
        message: "Failed to cancel charging request. Please try again."
      });
    }

  } catch (error) {
    console.error("Error canceling charging request:", error);
    
    res.status(500).json({
      success: false,
      message: "Internal server error while canceling charging request"
    });
  }
});

export default router;
