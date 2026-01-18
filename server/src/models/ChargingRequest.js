import mongoose from "mongoose";

const chargingRequestSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    helperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["OPEN", "ACCEPTED", "COMPLETED", "CANCELED"],
      default: "OPEN",
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    urgency: {
      type: String,
      required: true,
      enum: ["low", "medium", "high"],
      lowercase: true,
    },

    message: {
      type: String,
      trim: true,
      default: "",
    },

    contactInfo: {
      type: String,
      trim: true,
      default: "",
    },

    estimatedTime: {
      type: Number,
      min: 1,
      default: null,
    },

    tokenCost: {
      type: Number,
      required: true,
      default: 5,
      min: 1,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const ChargingRequest = mongoose.model("ChargingRequest", chargingRequestSchema);

export default ChargingRequest;
