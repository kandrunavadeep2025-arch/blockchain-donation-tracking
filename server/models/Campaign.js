const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Stored and displayed in ETH, not rupees or wei.
    // The smart contract stores the equivalent amount in wei.
    goalAmount: {
      type: Number,
      required: true,
      min: 0.000000000000000001,
    },

    blockchainCampaignId: {
      type: Number,
      required: true,
      min: 1,
      unique: true,
    },

    ngoWalletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "active", "completed", "removed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Campaign", campaignSchema);