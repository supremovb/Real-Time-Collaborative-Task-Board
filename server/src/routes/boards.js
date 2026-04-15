const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const Board = require("../models/Board");

const router = express.Router();

// Sanitize boardId: alphanumeric + dash/underscore only
function sanitizeBoardId(id) {
  if (!id || typeof id !== "string") return null;
  const s = id.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 50);
  return s || null;
}

// Strict rate limiter for password verify — 10 attempts per 15 min per IP
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password attempts, please try again later." },
});

// GET /api/boards/:boardId/status
// Returns whether a board has a password set
router.get("/:boardId/status", async (req, res) => {
  try {
    const boardId = sanitizeBoardId(req.params.boardId);
    if (!boardId) return res.status(400).json({ error: "Invalid board ID" });

    const board = await Board.findOne({ boardId });
    res.json({ protected: !!(board && board.passwordHash) });
  } catch {
    res.status(500).json({ error: "Failed to check board status" });
  }
});

// POST /api/boards/:boardId/setup
// Set a password on a board (only if none is set yet)
router.post("/:boardId/setup", async (req, res) => {
  try {
    const boardId = sanitizeBoardId(req.params.boardId);
    if (!boardId) return res.status(400).json({ error: "Invalid board ID" });

    const { password } = req.body;
    if (!password || typeof password !== "string" || password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" });
    }
    if (password.length > 128) {
      return res.status(400).json({ error: "Password is too long" });
    }

    // Check if board already has a password
    const existing = await Board.findOne({ boardId });
    if (existing && existing.passwordHash) {
      return res.status(409).json({ error: "Board already has a password set" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await Board.findOneAndUpdate(
      { boardId },
      { boardId, passwordHash },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to set board password" });
  }
});

// POST /api/boards/:boardId/verify
// Verify a board password
router.post("/:boardId/verify", verifyLimiter, async (req, res) => {
  try {
    const boardId = sanitizeBoardId(req.params.boardId);
    if (!boardId) return res.status(400).json({ error: "Invalid board ID" });

    const { password } = req.body;
    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "Password is required" });
    }

    const board = await Board.findOne({ boardId });
    if (!board || !board.passwordHash) {
      return res.status(404).json({ error: "Board is not password-protected" });
    }

    const valid = await bcrypt.compare(password, board.passwordHash);
    res.json({ valid });
  } catch {
    res.status(500).json({ error: "Failed to verify password" });
  }
});

// POST /api/boards/:boardId/remove-password
// Remove password protection (requires current password)
router.post("/:boardId/remove-password", verifyLimiter, async (req, res) => {
  try {
    const boardId = sanitizeBoardId(req.params.boardId);
    if (!boardId) return res.status(400).json({ error: "Invalid board ID" });

    const { password } = req.body;
    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "Current password is required" });
    }

    const board = await Board.findOne({ boardId });
    if (!board || !board.passwordHash) {
      return res.status(404).json({ error: "Board is not password-protected" });
    }

    const valid = await bcrypt.compare(password, board.passwordHash);
    if (!valid) return res.status(403).json({ error: "Incorrect password" });

    await Board.findOneAndUpdate({ boardId }, { passwordHash: null });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to remove password" });
  }
});

module.exports = router;
