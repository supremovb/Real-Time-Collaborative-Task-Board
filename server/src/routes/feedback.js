const express = require("express");
const rateLimit = require("express-rate-limit");
const Feedback = require("../models/Feedback");

const router = express.Router();

const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many feedback submissions, please try again later." },
});

router.post("/", feedbackLimiter, async (req, res) => {
  try {
    const type = req.body.type === "bug" ? "bug" : "suggestion";
    const title = typeof req.body.title === "string" ? req.body.title.trim().slice(0, 120) : "";
    const message = typeof req.body.message === "string" ? req.body.message.trim().slice(0, 2000) : "";
    const name = typeof req.body.name === "string" ? req.body.name.trim().slice(0, 60) : "Anonymous";
    const email = typeof req.body.email === "string" ? req.body.email.trim().slice(0, 120) : "";
    const isAuthenticated = !!req.body.isAuthenticated;

    if (!title) return res.status(400).json({ error: "Title is required" });
    if (!message) return res.status(400).json({ error: "Details are required" });

    await Feedback.create({
      type,
      title,
      message,
      name: name || "Anonymous",
      email: email || null,
      isAuthenticated,
    });

    res.status(201).json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

module.exports = router;
