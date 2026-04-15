const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const Board = require("../models/Board");

const router = express.Router();

// Sanitize boardId: alphanumeric + dash/underscore only
function sanitizeBoardId(id) {
  if (!id || typeof id !== "string") return null;
  const s = id.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 50);
  return s || null;
}

function sanitizeOwnerToken(token) {
  if (!token || typeof token !== "string") return null;
  const sanitized = token.trim();
  return sanitized || null;
}

async function hasOwnerAccess(board, ownerToken) {
  if (!board || !board.ownerTokenHash || !ownerToken) return false;
  return bcrypt.compare(ownerToken, board.ownerTokenHash);
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
// Returns whether a board has a password set and who the owner is
router.get("/:boardId/status", async (req, res) => {
  try {
    const boardId = sanitizeBoardId(req.params.boardId);
    if (!boardId) return res.status(400).json({ error: "Invalid board ID" });

    const board = await Board.findOne({ boardId });
    res.json({
      protected: !!(board && board.passwordHash),
      ownerName: board?.ownerName || null,
    });
  } catch {
    res.status(500).json({ error: "Failed to check board status" });
  }
});

// POST /api/boards/:boardId/claim-owner
// Set the owner name (only if not yet set)
router.post("/:boardId/claim-owner", async (req, res) => {
  try {
    const boardId = sanitizeBoardId(req.params.boardId);
    if (!boardId) return res.status(400).json({ error: "Invalid board ID" });

    const { ownerName } = req.body;
    const ownerToken = sanitizeOwnerToken(req.body.ownerToken);
    if (!ownerName || typeof ownerName !== "string" || !ownerName.trim()) {
      return res.status(400).json({ error: "Owner name is required" });
    }
    const sanitizedName = ownerName.trim().slice(0, 60);

    const board = await Board.findOne({ boardId });
    if (board && board.ownerName) {
      if (await hasOwnerAccess(board, ownerToken)) {
        return res.json({ ownerName: board.ownerName, claimed: false, isOwner: true, bypassToken: board.bypassToken || null });
      }

      // One-time migration path for boards created before owner tokens existed.
      if (!board.ownerTokenHash && sanitizedName === board.ownerName) {
        const issuedOwnerToken = crypto.randomBytes(24).toString("hex");
        const ownerTokenHash = await bcrypt.hash(issuedOwnerToken, 10);
        await Board.findOneAndUpdate({ boardId }, { ownerTokenHash });
        return res.json({
          ownerName: board.ownerName,
          claimed: false,
          isOwner: true,
          ownerToken: issuedOwnerToken,
        });
      }

      return res.json({ ownerName: board.ownerName, claimed: false, isOwner: false });
    }

    const issuedOwnerToken = crypto.randomBytes(24).toString("hex");
    const ownerTokenHash = await bcrypt.hash(issuedOwnerToken, 10);

    const updated = await Board.findOneAndUpdate(
      { boardId },
      { boardId, ownerName: sanitizedName, ownerTokenHash },
      { upsert: true, new: true }
    );
    res.json({
      ownerName: updated.ownerName,
      claimed: true,
      isOwner: true,
      ownerToken: issuedOwnerToken,
    });
  } catch {
    res.status(500).json({ error: "Failed to claim board owner" });
  }
});

// POST /api/boards/:boardId/setup
// Set a password on a board (only if none is set yet)
router.post("/:boardId/setup", async (req, res) => {
  try {
    const boardId = sanitizeBoardId(req.params.boardId);
    if (!boardId) return res.status(400).json({ error: "Invalid board ID" });

    const { password } = req.body;
    const ownerToken = sanitizeOwnerToken(req.body.ownerToken);
    if (!password || typeof password !== "string" || password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" });
    }
    if (password.length > 128) {
      return res.status(400).json({ error: "Password is too long" });
    }

    const existing = await Board.findOne({ boardId });
    if (!existing || !(await hasOwnerAccess(existing, ownerToken))) {
      return res.status(403).json({ error: "Only the board owner can set a password" });
    }
    if (existing.passwordHash) {
      return res.status(409).json({ error: "Board already has a password set" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const bypassToken = crypto.randomBytes(20).toString("hex");

    await Board.findOneAndUpdate(
      { boardId },
      { passwordHash, bypassToken },
      { new: true }
    );

    res.json({ success: true, bypassToken });
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
    const ownerToken = sanitizeOwnerToken(req.body.ownerToken);
    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "Current password is required" });
    }

    const board = await Board.findOne({ boardId });
    if (!board || !board.passwordHash) {
      return res.status(404).json({ error: "Board is not password-protected" });
    }
    if (!(await hasOwnerAccess(board, ownerToken))) {
      return res.status(403).json({ error: "Only the board owner can remove the password" });
    }

    const valid = await bcrypt.compare(password, board.passwordHash);
    if (!valid) return res.status(403).json({ error: "Incorrect password" });

    await Board.findOneAndUpdate({ boardId }, { passwordHash: null, bypassToken: null });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to remove password" });
  }
});

// POST /api/boards/:boardId/verify-bypass
// Validate an invite bypass token (allows entry without the password)
router.post("/:boardId/verify-bypass", async (req, res) => {
  try {
    const boardId = sanitizeBoardId(req.params.boardId);
    if (!boardId) return res.status(400).json({ error: "Invalid board ID" });

    const { bypassToken } = req.body;
    if (!bypassToken || typeof bypassToken !== "string") {
      return res.status(400).json({ valid: false });
    }

    const board = await Board.findOne({ boardId });
    if (!board || !board.bypassToken) return res.json({ valid: false });

    // Timing-safe comparison
    const valid = crypto.timingSafeEqual(
      Buffer.from(bypassToken),
      Buffer.from(board.bypassToken)
    );
    res.json({ valid });
  } catch {
    res.json({ valid: false });
  }
});

module.exports = router;
