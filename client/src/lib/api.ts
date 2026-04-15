const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function handleResponse(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export async function fetchTasks(boardId: string) {
  const res = await fetch(`${API_URL}/api/tasks/${encodeURIComponent(boardId)}`);
  return handleResponse(res);
}

export async function createTask(body: {
  title: string;
  description?: string;
  column?: string;
  boardId: string;
  priority?: string;
  dueDate?: string | null;
}) {
  const res = await fetch(`${API_URL}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function updateTask(
  id: string,
  body: { title?: string; description?: string; priority?: string; dueDate?: string | null }
) {
  const res = await fetch(`${API_URL}/api/tasks/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function moveTask(id: string, body: { column: string; order: number }) {
  const res = await fetch(`${API_URL}/api/tasks/${encodeURIComponent(id)}/move`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function deleteTask(id: string) {
  const res = await fetch(`${API_URL}/api/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return handleResponse(res);
}

export async function getBoardStatus(boardId: string): Promise<{ protected: boolean; ownerName: string | null }> {
  const res = await fetch(`${API_URL}/api/boards/${encodeURIComponent(boardId)}/status`);
  return handleResponse(res);
}

export async function setupBoardPassword(boardId: string, password: string, ownerToken?: string | null): Promise<void> {
  const res = await fetch(`${API_URL}/api/boards/${encodeURIComponent(boardId)}/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, ownerToken }),
  });
  return handleResponse(res);
}

export async function verifyBoardPassword(boardId: string, password: string): Promise<{ valid: boolean }> {
  const res = await fetch(`${API_URL}/api/boards/${encodeURIComponent(boardId)}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return handleResponse(res);
}

export async function removeBoardPassword(boardId: string, password: string, ownerToken?: string | null): Promise<void> {
  const res = await fetch(`${API_URL}/api/boards/${encodeURIComponent(boardId)}/remove-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, ownerToken }),
  });
  return handleResponse(res);
}

export async function claimBoardOwner(
  boardId: string,
  ownerName: string,
  ownerToken?: string | null
): Promise<{ ownerName: string; claimed: boolean; isOwner: boolean; ownerToken?: string }> {
  const res = await fetch(`${API_URL}/api/boards/${encodeURIComponent(boardId)}/claim-owner`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerName, ownerToken }),
  });
  return handleResponse(res);
}
