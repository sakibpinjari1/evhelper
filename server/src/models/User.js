import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    tokenBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    tokenHistory: [{
      amount: {
        type: Number,
        required: true,
      },
      type: {
        type: String,
        required: true,
        enum: ["charging_request", "reward", "refund", "bonus"]
      },
      description: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      }
    }],

    isOnline: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
