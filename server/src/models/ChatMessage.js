const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    boardId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      index: true,
    },
    type: {
      type: String,
      enum: ["user", "system"],
      default: "user",
    },
    senderName: {
      type: String,
      trim: true,
      maxlength: 60,
      default: null,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    timestamp: {
      type: Number,
      required: true,
    },
  },
  { timestamps: false }
);

// Keep only the last 100 messages per board (enforced on write)
module.exports = mongoose.model("ChatMessage", chatMessageSchema);
