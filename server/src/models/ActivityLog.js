const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    boardId:    { type: String, required: true, index: true },
    action:     { type: String, required: true },
    userName:   { type: String, required: true },
    taskTitle:  { type: String, default: null },
    fromColumn: { type: String, default: null },
    toColumn:   { type: String, default: null },
    detail:     { type: String, default: null },
    timestamp:  { type: Number, required: true },
  },
  { versionKey: false }
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);
