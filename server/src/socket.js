// Track connected users per board room: boardId -> Set of socketIds
const roomUsers = new Map();
// Track user names per socket: socketId -> { name, boardId }
const socketMeta = new Map();
// Chat history per board (ephemeral, max 100 messages)
const chatHistory = new Map();

const MAX_CHAT = 100;
const MAX_MSG_LENGTH = 500;

function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on("board:join", ({ boardId, userName }) => {
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

      // Send existing chat history to the newcomer
      socket.emit("chat:history", chatHistory.get(sanitized) || []);

      // Announce join
      const joinMsg = {
        id: `sys-${Date.now()}-${socket.id}`,
        type: "system",
        text: `${name} joined the board`,
        timestamp: Date.now(),
      };
      _pushChat(sanitized, joinMsg);
      io.to(sanitized).emit("chat:message", joinMsg);

      console.log(`📋 ${name} (${socket.id}) joined board: ${sanitized} (${roomUsers.get(sanitized).size} users)`);
    });

    socket.on("board:leave", (boardId) => {
      if (!boardId || typeof boardId !== "string") return;
      const sanitized = boardId.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 50);
      _leaveBoard(socket, sanitized, io);
      socket.leave(sanitized);
    });

    // Chat message
    socket.on("chat:send", ({ boardId, text }) => {
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
      _pushChat(sanitized, msg);
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

function _pushChat(boardId, msg) {
  if (!chatHistory.has(boardId)) chatHistory.set(boardId, []);
  const arr = chatHistory.get(boardId);
  arr.push(msg);
  if (arr.length > MAX_CHAT) arr.splice(0, arr.length - MAX_CHAT);
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
    // Keep chatHistory so messages survive refreshes / rejoins
  } else {
    const leaveMsg = {
      id: `sys-${Date.now()}-${socket.id}`,
      type: "system",
      text: `${name} left the board`,
      timestamp: Date.now(),
    };
    _pushChat(boardId, leaveMsg);
    io.to(boardId).emit("chat:message", leaveMsg);
  }
}

module.exports = setupSocket;

