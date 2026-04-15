const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const Board = require("../models/Board");

const router = express.Router();

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

function sanitizeUsername(u) {
  if (!u || typeof u !== "string") return null;
  const s = u.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 30);
  return s.length >= 2 ? s : null;
}

// POST /api/auth/register
router.post("/register", authLimiter, async (req, res) => {
  try {
    const username = sanitizeUsername(req.body.username);
    if (!username) {
      return res.status(400).json({
        error: "Username must be 2–30 characters (letters, numbers, _ and - only)",
      });
    }
    const { password } = req.body;
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    if (password.length > 128) {
      return res.status(400).json({ error: "Password too long" });
    }

    const existing = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, "i") } });
    if (existing) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, passwordHash });

    // Issue a session token
    const token = crypto.randomBytes(32).toString("hex");
    // We store token in client; server validates via simple signed approach
    // For simplicity use a signed token: base64(userId):hmac
    const secret = process.env.SESSION_SECRET || "taskboard-secret";
    const hmac = crypto.createHmac("sha256", secret)
      .update(`${user._id}:${token}`)
      .digest("hex");
    const sessionToken = `${user._id}:${token}:${hmac}`;

    res.status(201).json({
      user: { id: user._id, username: user.username },
      token: sessionToken,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Username already taken" });
    }
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res) => {
  try {
    const username = sanitizeUsername(req.body.username);
    if (!username) return res.status(400).json({ error: "Invalid username" });

    const { password } = req.body;
    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "Password required" });
    }

    const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, "i") } });
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const secret = process.env.SESSION_SECRET || "taskboard-secret";
    const hmac = crypto.createHmac("sha256", secret)
      .update(`${user._id}:${token}`)
      .digest("hex");
    const sessionToken = `${user._id}:${token}:${hmac}`;

    res.json({
      user: { id: user._id, username: user.username },
      token: sessionToken,
    });
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

// Middleware: verify session token
function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const sessionToken = auth.slice(7);
  const parts = sessionToken.split(":");
  if (parts.length !== 3) return res.status(401).json({ error: "Invalid token" });

  const [userId, token, hmac] = parts;
  const secret = process.env.SESSION_SECRET || "taskboard-secret";
  const expected = crypto.createHmac("sha256", secret)
    .update(`${userId}:${token}`)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(expected, "hex"))) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.userId = userId;
  next();
}

// GET /api/auth/me — verify token and return user info
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("username boards");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: { id: user._id, username: user.username, boards: user.boards } });
  } catch {
    res.status(500).json({ error: "Failed to get user" });
  }
});

// GET /api/auth/my-boards — list boards owned by or joined by this user
router.get("/my-boards", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("boards username");
    if (!user) return res.status(404).json({ error: "User not found" });

    // Get board details for each
    const boardDocs = await Board.find({ boardId: { $in: user.boards } })
      .select("boardId ownerName passwordHash")
      .lean();

    // Preserve user's board order, include all even if not in DB yet
    const boardMap = new Map(boardDocs.map((b) => [b.boardId, b]));
    const boards = user.boards.map((id) => {
      const doc = boardMap.get(id);
      return {
        boardId: id,
        ownerName: doc?.ownerName || null,
        isOwner: doc?.ownerName === user.username,
        protected: !!(doc?.passwordHash),
      };
    });

    res.json({ boards });
  } catch {
    res.status(500).json({ error: "Failed to load boards" });
  }
});

// POST /api/auth/my-boards/:boardId — add a board to user's list
router.post("/my-boards/:boardId", verifyToken, async (req, res) => {
  try {
    const boardId = req.params.boardId.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 50);
    if (!boardId) return res.status(400).json({ error: "Invalid board ID" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.boards.includes(boardId)) {
      user.boards.unshift(boardId);
      if (user.boards.length > 20) user.boards = user.boards.slice(0, 20);
      await user.save();
    }

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to save board" });
  }
});

// DELETE /api/auth/my-boards/:boardId — remove a board from user's list
router.delete("/my-boards/:boardId", verifyToken, async (req, res) => {
  try {
    const boardId = req.params.boardId.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 50);
    if (!boardId) return res.status(400).json({ error: "Invalid board ID" });

    await User.findByIdAndUpdate(req.userId, { $pull: { boards: boardId } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to remove board" });
  }
});

module.exports = router;
module.exports.verifyToken = verifyToken;
