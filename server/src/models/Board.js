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
    passwordHash: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Board", boardSchema);
