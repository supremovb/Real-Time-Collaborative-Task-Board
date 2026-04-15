require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

const connectDB = require("./db");
const setupSocket = require("./socket");
const taskRoutes = require("./routes/tasks");
const boardRoutes = require("./routes/boards");
const authRoutes = require("./routes/auth");
const feedbackRoutes = require("./routes/feedback");

const app = express();
const server = http.createServer(app);

// Support comma-separated origins for multi-env deployments, e.g.:
// CLIENT_URL=https://taskboard-pv.vercel.app,http://localhost:3000
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const corsOrigins = CLIENT_URL.split(",").map((u) => u.trim());
const corsOrigin = corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins;

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Security: HTTP headers (X-Frame-Options, HSTS, X-Content-Type-Options, etc.)
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));

// Security: CORS — only allow the configured client origin(s)
app.use(cors({ origin: corsOrigin }));

// Security: body size limit — prevent large-payload attacks
app.use(express.json({ limit: "10kb" }));

// Security: NoSQL injection — strip $ and . from req.body / params / query
app.use(mongoSanitize());

// Security: rate limiting — 200 requests / 15 min per IP (general)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", apiLimiter);

// Security: stricter write limiter — 60 mutations / min per IP
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});
app.use("/api/tasks", writeLimiter);

// Attach io instance so route handlers can broadcast events
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// Routes
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/tasks", taskRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/feedback", feedbackRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// Socket.io
setupSocket(io);

// Start
const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
