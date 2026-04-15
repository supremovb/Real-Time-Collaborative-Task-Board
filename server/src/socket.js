const ChatMessage = require("./models/ChatMessage");

// Track connected users per board room: boardId -> Map(socketId -> name)
const roomUsers = new Map();
// Track user names per socket: socketId -> { name, boardId }
const socketMeta = new Map();

const MAX_CHAT = 100;
const MAX_MSG_LENGTH = 500;

async function _loadHistory(boardId) {
  try {
    const docs = await ChatMessage.find({ boardId })
      .sort({ timestamp: 1 })
      .limit(MAX_CHAT)
      .lean();
    return docs.map((d) => ({
      id: d._id.toString(),
      type: d.type,
      senderName: d.senderName || undefined,
      text: d.text,
      timestamp: d.timestamp,
    }));
  } catch (err) {
    console.error("Chat load error:", err);
    return [];
  }
}

async function _saveMsg(boardId, msg) {
  try {
    await ChatMessage.create({
      boardId,
      type: msg.type,
      senderName: msg.senderName || null,
      text: msg.text,
      timestamp: msg.timestamp,
    });
    // Trim to MAX_CHAT: delete oldest docs beyond the limit
    const count = await ChatMessage.countDocuments({ boardId });
    if (count > MAX_CHAT) {
      const oldest = await ChatMessage.find({ boardId })
        .sort({ timestamp: 1 })
        .limit(count - MAX_CHAT)
        .select("_id")
        .lean();
      const ids = oldest.map((d) => d._id);
      await ChatMessage.deleteMany({ _id: { $in: ids } });
    }
  } catch (err) {
    console.error("Chat save error:", err);
  }
}

function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on("board:join", async ({ boardId, userName }) => {
      if (!boardId || typeof boardId !== "string") return;
      const sanitized = boardId.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 50);
      if (!sanitized) return;
      const name = (userName && typeof userName === "string")
        ? userName.trim().slice(0, 60) || "Anonymous"
        : "Anonymous";

      socket.join(sanitized);
      socket._boardId = sanitized;
      socket._userName = name;
      socketMeta.set(socket.id, { name, boardId: sanitized });

      if (!roomUsers.has(sanitized)) roomUsers.set(sanitized, new Map());
      roomUsers.get(sanitized).set(socket.id, name);

      // Emit updated user list to room
      const members = Array.from(roomUsers.get(sanitized).values());
      io.to(sanitized).emit("room:users", members.length);
      io.to(sanitized).emit("room:members", members);

      // Load history from MongoDB and send to the newcomer
      const history = await _loadHistory(sanitized);
      socket.emit("chat:history", history);

      // Announce join — broadcast live only, do NOT persist to DB
      // (persisting causes duplicate join messages on every page refresh)
      const joinMsg = {
        id: `sys-${Date.now()}-${socket.id}`,
        type: "system",
        text: `${name} joined the board`,
        timestamp: Date.now(),
      };
      io.to(sanitized).emit("chat:message", joinMsg);

      console.log(`📋 ${name} (${socket.id}) joined board: ${sanitized} (${roomUsers.get(sanitized).size} users)`);
    });

    socket.on("board:leave", (boardId) => {
      if (!boardId || typeof boardId !== "string") return;
      const sanitized = boardId.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 50);
      _leaveBoard(socket, sanitized, io);
      socket.leave(sanitized);
    });

    // Chat message — save to DB then broadcast
    socket.on("chat:send", async ({ boardId, text }) => {
      if (!boardId || typeof text !== "string") return;
      const sanitized = boardId.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 50);
      const clean = text.trim().slice(0, MAX_MSG_LENGTH);
      if (!clean) return;

      const name = socket._userName || "Anonymous";
      const msg = {
        id: `${Date.now()}-${socket.id}`,
        type: "user",
        senderName: name,
        senderId: socket.id,
        text: clean,
        timestamp: Date.now(),
      };
      await _saveMsg(sanitized, msg);
      io.to(sanitized).emit("chat:message", msg);
    });

    socket.on("disconnect", () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
      const meta = socketMeta.get(socket.id);
      if (meta) {
        _leaveBoard(socket, meta.boardId, io);
        socketMeta.delete(socket.id);
      }
    });
  });
}

function _leaveBoard(socket, boardId, io) {
  if (!boardId || !roomUsers.has(boardId)) return;
  const name = socket._userName || "Anonymous";
  roomUsers.get(boardId).delete(socket.id);

  const members = Array.from(roomUsers.get(boardId).values());
  io.to(boardId).emit("room:users", members.length);
  io.to(boardId).emit("room:members", members);

  if (roomUsers.get(boardId).size === 0) {
    roomUsers.delete(boardId);
    // Chat history lives in MongoDB — nothing to clear in memory
  } else {
    const leaveMsg = {
      id: `sys-${Date.now()}-${socket.id}`,
      type: "system",
      text: `${name} left the board`,
      timestamp: Date.now(),
    };
    // Broadcast live only — do NOT persist leave messages to DB
    io.to(boardId).emit("chat:message", leaveMsg);
  }
}

module.exports = setupSocket;

