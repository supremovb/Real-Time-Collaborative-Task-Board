const mongoose = require("mongoose");

const boardSchema = new mongoose.Schema(
  {
    boardId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 50,
    },
    ownerName: {
      type: String,
      default: null,
      trim: true,
      maxlength: 60,
    },
    ownerTokenHash: {
      type: String,
      default: null,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    bypassToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Board", boardSchema);
