const ChatMessage = require("./models/ChatMessage");
const ActivityLog = require("./models/ActivityLog");
const { logActivity } = require("./services/activityService");

const roomUsers = new Map();
const socketMeta = new Map();
const pendingLeaves = new Map();

const MAX_CHAT = 100;
const MAX_MSG_LENGTH = 500;
const LEAVE_GRACE_MS = 1800;

function getRoomMemberMap(boardId) {
  if (!roomUsers.has(boardId)) roomUsers.set(boardId, new Map());
  return roomUsers.get(boardId);
}

function getUniqueMembers(boardId) {
  if (!roomUsers.has(boardId)) return [];
  return Array.from(new Set(Array.from(roomUsers.get(boardId).values())));
}

function emitRoomPresence(io, boardId) {
  const members = getUniqueMembers(boardId);
  io.to(boardId).emit("room:users", members.length);
  io.to(boardId).emit("room:members", members);
}

function leaveKey(boardId, name) {
  return `${boardId}::${name}`;
}

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

    const count = await ChatMessage.countDocuments({ boardId });
    if (count > MAX_CHAT) {
      const oldest = await ChatMessage.find({ boardId })
        .sort({ timestamp: 1 })
        .limit(count - MAX_CHAT)
        .select("_id")
        .lean();
      await ChatMessage.deleteMany({ _id: { $in: oldest.map((d) => d._id) } });
    }
  } catch (err) {
    console.error("Chat save error:", err);
  }
}

async function _loadActivity(boardId) {
  try {
    const docs = await ActivityLog.find({ boardId })
      .sort({ timestamp: 1 })
      .limit(200)
      .lean();

    return docs.map((d) => ({
      id: d.id || d._id.toString(),
      action: d.action,
      userName: d.userName,
      taskTitle: d.taskTitle || undefined,
      fromColumn: d.fromColumn || undefined,
      toColumn: d.toColumn || undefined,
      detail: d.detail || undefined,
      timestamp: d.timestamp,
    }));
  } catch (err) {
    console.error("Activity load error:", err);
    return [];
  }
}

function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on("board:join", async ({ boardId, userName }) => {
      if (!boardId || typeof boardId !== "string") return;
      const sanitized = boardId.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 50);
      if (!sanitized) return;

      const name = typeof userName === "string"
        ? userName.trim().slice(0, 60) || "Anonymous"
        : "Anonymous";

      const roomMap = getRoomMemberMap(sanitized);
      const wasAlreadyPresent = Array.from(roomMap.values()).includes(name);
      const pendingKey = leaveKey(sanitized, name);
      const hadPendingLeave = pendingLeaves.has(pendingKey);
      if (hadPendingLeave) {
        clearTimeout(pendingLeaves.get(pendingKey));
        pendingLeaves.delete(pendingKey);
      }

      socket.join(sanitized);
      socket._boardId = sanitized;
      socket._userName = name;
      socketMeta.set(socket.id, { name, boardId: sanitized });
      roomMap.set(socket.id, name);

      emitRoomPresence(io, sanitized);

      const history = await _loadHistory(sanitized);
      socket.emit("chat:history", history);

      const activityHistory = await _loadActivity(sanitized);
      socket.emit("activity:history", activityHistory);

      if (!wasAlreadyPresent && !hadPendingLeave) {
        io.to(sanitized).emit("chat:message", {
          id: `sys-${Date.now()}-${socket.id}`,
          type: "system",
          text: `${name} joined the board`,
          timestamp: Date.now(),
        });

        await logActivity(sanitized, {
          action: "member:joined",
          userName: name,
          timestamp: Date.now(),
        }, io);
      }
    });

    socket.on("board:leave", async (boardId) => {
      if (!boardId || typeof boardId !== "string") return;
      const sanitized = boardId.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 50);
      await _leaveBoard(socket, sanitized, io);
      socketMeta.delete(socket.id);
      socket._boardId = undefined;
      socket._userName = undefined;
      socket.leave(sanitized);
    });

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

    socket.on("activity:track", async ({ boardId, action, taskTitle, fromColumn, toColumn, detail }) => {
      if (!boardId || typeof boardId !== "string") return;
      const sanitized = boardId.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 50);
      const name = socket._userName || "Anonymous";

      await logActivity(sanitized, {
        action,
        userName: name,
        taskTitle: taskTitle || undefined,
        fromColumn: fromColumn || undefined,
        toColumn: toColumn || undefined,
        detail: detail || undefined,
        timestamp: Date.now(),
      }, io);
    });

    socket.on("disconnect", async () => {
      const meta = socketMeta.get(socket.id);
      if (meta) {
        await _leaveBoard(socket, meta.boardId, io);
        socketMeta.delete(socket.id);
      }
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });
}

async function _leaveBoard(socket, boardId, io) {
  if (!boardId || !roomUsers.has(boardId)) return;

  const name = socket._userName || "Anonymous";
  const roomMap = roomUsers.get(boardId);
  roomMap.delete(socket.id);

  if (roomMap.size === 0) {
    roomUsers.delete(boardId);
  }

  emitRoomPresence(io, boardId);

  const stillPresent = getUniqueMembers(boardId).includes(name);
  if (stillPresent) return;

  const key = leaveKey(boardId, name);
  if (pendingLeaves.has(key)) {
    clearTimeout(pendingLeaves.get(key));
  }

  pendingLeaves.set(key, setTimeout(async () => {
    pendingLeaves.delete(key);

    const presentLater = getUniqueMembers(boardId).includes(name);
    if (presentLater) return;

    io.to(boardId).emit("chat:message", {
      id: `sys-${Date.now()}-${socket.id}`,
      type: "system",
      text: `${name} left the board`,
      timestamp: Date.now(),
    });

    await logActivity(boardId, {
      action: "member:left",
      userName: name,
      timestamp: Date.now(),
    }, io);
  }, LEAVE_GRACE_MS));
}

module.exports = setupSocket;
