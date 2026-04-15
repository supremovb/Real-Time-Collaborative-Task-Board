/**
 * activityService.js
 * Shared helper for logging board activity to MongoDB and broadcasting via Socket.io.
 */
const ActivityLog = require("../models/ActivityLog");

const MAX_ACTIVITY = 200;

/**
 * Log a board activity: persist to DB, trim to MAX_ACTIVITY, and broadcast.
 *
 * @param {string} boardId  - Board room id
 * @param {object} entry    - { action, userName, taskTitle?, fromColumn?, toColumn?, detail? }
 * @param {object} [io]     - Socket.io server instance (optional — skips broadcast if absent)
 */
async function logActivity(boardId, entry, io) {
  const doc = {
    boardId,
    ...entry,
    id: entry.id || `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: entry.timestamp || Date.now(),
  };

  try {
    await ActivityLog.create(doc);

    // Trim oldest entries to MAX_ACTIVITY
    const count = await ActivityLog.countDocuments({ boardId });
    if (count > MAX_ACTIVITY) {
      const oldest = await ActivityLog.find({ boardId })
        .sort({ timestamp: 1 })
        .limit(count - MAX_ACTIVITY)
        .select("_id");
      await ActivityLog.deleteMany({ _id: { $in: oldest.map((d) => d._id) } });
    }
  } catch (err) {
    console.error("Activity save error:", err);
  }

  if (io) {
    io.to(boardId).emit("activity:log", doc);
  }
}

module.exports = { logActivity };
