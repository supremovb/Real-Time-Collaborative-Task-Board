const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
      match: /^[a-zA-Z0-9_-]+$/,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    // boards this user has created/joined (by boardId string)
    boards: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
