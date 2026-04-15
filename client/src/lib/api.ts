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

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  username: string;
  boards?: string[];
}

export async function authRegister(
  username: string,
  password: string
): Promise<{ user: AuthUser; token: string }> {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse(res);
}

export async function authLogin(
  username: string,
  password: string
): Promise<{ user: AuthUser; token: string }> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse(res);
}

export async function authMe(token: string): Promise<{ user: AuthUser }> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export interface UserBoard {
  boardId: string;
  ownerName: string | null;
  isOwner: boolean;
  protected: boolean;
}

export async function getMyBoards(token: string): Promise<{ boards: UserBoard[] }> {
  const res = await fetch(`${API_URL}/api/auth/my-boards`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function addMyBoard(token: string, boardId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/my-boards/${encodeURIComponent(boardId)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function removeMyBoard(token: string, boardId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/my-boards/${encodeURIComponent(boardId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}
