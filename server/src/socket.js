// Track connected users per board room: boardId -> Set of socketIds
const roomUsers = new Map();

function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on("board:join", (boardId) => {
      if (!boardId || typeof boardId !== "string") return;
      const sanitized = boardId.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 50);
      if (!sanitized) return;

      socket.join(sanitized);
      socket._boardId = sanitized;

      if (!roomUsers.has(sanitized)) roomUsers.set(sanitized, new Set());
      roomUsers.get(sanitized).add(socket.id);

      io.to(sanitized).emit("room:users", roomUsers.get(sanitized).size);
      console.log(`📋 ${socket.id} joined board: ${sanitized} (${roomUsers.get(sanitized).size} users)`);
    });

    socket.on("board:leave", (boardId) => {
      if (!boardId || typeof boardId !== "string") return;
      const sanitized = boardId.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 50);
      socket.leave(sanitized);
      if (roomUsers.has(sanitized)) {
        roomUsers.get(sanitized).delete(socket.id);
        io.to(sanitized).emit("room:users", roomUsers.get(sanitized).size);
        if (roomUsers.get(sanitized).size === 0) roomUsers.delete(sanitized);
      }
    });

    socket.on("disconnect", () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
      const boardId = socket._boardId;
      if (boardId && roomUsers.has(boardId)) {
        roomUsers.get(boardId).delete(socket.id);
        io.to(boardId).emit("room:users", roomUsers.get(boardId).size);
        if (roomUsers.get(boardId).size === 0) roomUsers.delete(boardId);
      }
    });
  });
}

module.exports = setupSocket;
