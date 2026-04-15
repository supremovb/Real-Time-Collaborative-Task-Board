const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["suggestion", "bug"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    name: {
      type: String,
      default: "Anonymous",
      trim: true,
      maxlength: 60,
    },
    email: {
      type: String,
      default: null,
      trim: true,
      maxlength: 120,
    },
    isAuthenticated: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
