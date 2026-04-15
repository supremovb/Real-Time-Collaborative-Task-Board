const express = require("express");
const mongoose = require("mongoose");
const Task = require("../models/Task");

const router = express.Router();

const VALID_COLUMNS = ["todo", "in-progress", "done"];
const VALID_PRIORITIES = ["low", "medium", "high", "critical"];

// Validate MongoDB ObjectId format to prevent prototype-pollution edge cases
function isValidObjectId(id) {
  return (
    mongoose.Types.ObjectId.isValid(id) &&
    String(new mongoose.Types.ObjectId(id)) === id
  );
}

// Sanitize boardId: alphanumeric + dash/underscore only
function sanitizeBoardId(id) {
  if (!id || typeof id !== "string") return null;
  const s = id.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 50);
  return s || null;
}

// GET all tasks for a board
router.get("/:boardId", async (req, res) => {
  try {
    const boardId = sanitizeBoardId(req.params.boardId);
    if (!boardId) return res.status(400).json({ error: "Invalid board ID" });
    const tasks = await Task.find({ boardId }).sort({ order: 1 });
    res.json(tasks);
  } catch {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// POST create a new task
router.post("/", async (req, res) => {
  try {
    const { title, description, column, boardId: rawBoardId, priority, dueDate } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: "Invalid priority" });
    }
    if (column !== undefined && !VALID_COLUMNS.includes(column)) {
      return res.status(400).json({ error: "Invalid column" });
    }

    const boardId = sanitizeBoardId(rawBoardId) || "default";

    let parsedDueDate = null;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ error: "Invalid due date" });
      }
    }

    const count = await Task.countDocuments({ boardId, column: column || "todo" });

    const task = await Task.create({
      title: title.trim(),
      description: description?.trim() || "",
      column: column || "todo",
      priority: priority || "medium",
      dueDate: parsedDueDate,
      order: count,
      boardId,
    });

    req.io.to(task.boardId).emit("task:created", task);
    res.status(201).json(task);
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    res.status(500).json({ error: "Failed to create task" });
  }
});

// PUT update a task
router.put("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }

    const { title, description, priority, dueDate } = req.body;
    const update = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ error: "Title cannot be empty" });
      }
      update.title = title.trim();
    }
    if (description !== undefined) {
      update.description = typeof description === "string" ? description.trim() : "";
    }
    if (priority !== undefined) {
      if (!VALID_PRIORITIES.includes(priority)) {
        return res.status(400).json({ error: "Invalid priority" });
      }
      update.priority = priority;
    }
    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === "") {
        update.dueDate = null;
      } else {
        const d = new Date(dueDate);
        if (isNaN(d.getTime())) return res.status(400).json({ error: "Invalid due date" });
        update.dueDate = d;
      }
    }

    const task = await Task.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!task) return res.status(404).json({ error: "Task not found" });

    req.io.to(task.boardId).emit("task:updated", task);
    res.json(task);
  } catch {
    res.status(500).json({ error: "Failed to update task" });
  }
});

// PUT move a task to a different column (or reorder)
router.put("/:id/move", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }

    const { column, order } = req.body;

    if (!column || !["todo", "in-progress", "done"].includes(column)) {
      return res.status(400).json({ error: "Invalid column" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const oldColumn = task.column;
    const oldOrder = task.order;
    const newOrder = typeof order === "number" && order >= 0 ? Math.floor(order) : 0;

    // If moving within the same column
    if (oldColumn === column) {
      if (newOrder > oldOrder) {
        await Task.updateMany(
          {
            boardId: task.boardId,
            column,
            order: { $gt: oldOrder, $lte: newOrder },
          },
          { $inc: { order: -1 } }
        );
      } else if (newOrder < oldOrder) {
        await Task.updateMany(
          {
            boardId: task.boardId,
            column,
            order: { $gte: newOrder, $lt: oldOrder },
          },
          { $inc: { order: 1 } }
        );
      }
    } else {
      // Moving to a different column
      // Close the gap in the old column
      await Task.updateMany(
        { boardId: task.boardId, column: oldColumn, order: { $gt: oldOrder } },
        { $inc: { order: -1 } }
      );
      // Make space in the new column
      await Task.updateMany(
        { boardId: task.boardId, column, order: { $gte: newOrder } },
        { $inc: { order: 1 } }
      );
    }

    task.column = column;
    task.order = newOrder;
    await task.save();

    // Return all tasks so every client can re-render the whole board
    const allTasks = await Task.find({ boardId: task.boardId }).sort({
      order: 1,
    });

    req.io.to(task.boardId).emit("board:updated", allTasks);
    res.json(allTasks);
  } catch (err) {
    res.status(500).json({ error: "Failed to move task" });
  }
});

// DELETE a task
router.delete("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }

    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    // Close the gap
    await Task.updateMany(
      {
        boardId: task.boardId,
        column: task.column,
        order: { $gt: task.order },
      },
      { $inc: { order: -1 } }
    );

    req.io.to(task.boardId).emit("task:deleted", { id: task._id, boardId: task.boardId });
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

module.exports = router;
