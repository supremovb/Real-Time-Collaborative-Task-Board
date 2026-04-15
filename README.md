# TaskBoard � Real-Time Collaborative Kanban

A full-stack real-time collaborative task board built from scratch. Create boards, manage tasks across columns, invite collaborators via a shareable link, and watch changes sync live � no refresh needed.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socket.io&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-00ed64?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

---

## Features

- **Real-time sync** � Task changes (create, edit, move, delete) broadcast instantly to every connected user via Socket.io
- **Drag & drop** � Move tasks between Todo / In Progress / Done columns using @dnd-kit
- **Board password protection** � Creators can lock a board; collaborators must verify before entering
- **Live presence** � See how many users are currently on the board
- **Dark / Light mode** � System-aware theme with manual toggle, persisted to localStorage
- **Shareable links** � Share a `?board=<id>` URL; recipients are prompted for the password if one is set
- **Task details** � Priority levels (low / medium / high), due dates, and descriptions
- **Filter & sort** � Filter by priority or column; sort by due date, priority, or creation time
- **Progress bar** � Visual completion percentage per board
- **Persistent refresh** � Board ID is stored in the URL so refreshing keeps you on the same board

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, CSS custom properties |
| Real-time | Socket.io 4 |
| Backend | Node.js + Express 4 |
| Database | MongoDB Atlas, Mongoose 8 |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |
| Security | helmet, express-rate-limit, express-mongo-sanitize, bcryptjs |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## Project Structure

```
real-time-collaborative-task-board/
+-- client/                    # Next.js 15 frontend
�   +-- src/
�   �   +-- app/               # App Router pages, layout, global CSS, favicon
�   �   +-- components/        # Board, Column, TaskCard, Modals, Icons ...
�   �   +-- context/           # ThemeContext
�   �   +-- lib/               # api.ts (REST + Socket helpers)
�   +-- public/                # Static assets
�   +-- .env.local.example
�   +-- vercel.json
�
+-- server/                    # Express + Socket.io backend
    +-- src/
    �   +-- models/            # Task.js, Board.js (Mongoose)
    �   +-- routes/            # tasks.js, boards.js
    �   +-- socket.js          # Socket.io event handlers
    �   +-- db.js              # MongoDB connection
    �   +-- index.js           # App entry point
    +-- .env.example
    +-- railway.json
```

---

## Getting Started (Local)

### Prerequisites
- Node.js = 18
- A MongoDB Atlas cluster (free tier works fine)

### 1. Clone

```bash
git clone https://github.com/supremovb/Real-Time-Collaborative-Task-Board.git
cd real-time-collaborative-task-board
```

### 2. Backend setup

```bash
cd server
npm install
cp .env.example .env
```

Fill in `server/.env`:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/taskboard?retryWrites=true&w=majority
PORT=4000
CLIENT_URL=http://localhost:3000
```

```bash
npm run dev    # http://localhost:4000
```

Verify: `http://localhost:4000/api/health` ? `{"status":"ok"}`

### 3. Frontend setup

```bash
cd ../client
npm install
cp .env.local.example .env.local
```

Fill in `client/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

```bash
npm run dev    # http://localhost:3000
```

---

## Deployment

### Frontend ? Vercel

1. Import this repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `client`
3. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL = https://your-railway-app.up.railway.app
   ```
4. Deploy � Vercel handles the Next.js build automatically.

### Backend ? Railway

1. New project on [railway.app](https://railway.app), connect this repo
2. Set **Root Directory** to `server`
3. Add environment variables:
   ```
   MONGODB_URI = your-atlas-connection-string
   PORT        = 4000
   CLIENT_URL  = https://your-vercel-app.vercel.app
   ```
4. Railway auto-detects Node.js and runs `npm start`.

---

## Environment Variables

### `server/.env`

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `PORT` | Server port (default `4000`) |
| `CLIENT_URL` | Allowed CORS origin � your Vercel URL. Comma-separated for multiple origins. |

### `client/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Full URL of the backend server |

---

## Security

- HTTP headers hardened with **helmet**
- NoSQL injection prevention via **express-mongo-sanitize**
- Rate limiting: 200 req / 15 min (general), 60 req / min (write ops), 10 req / 15 min (password verify)
- Board passwords hashed with **bcryptjs** (12 salt rounds)
- CORS restricted to configured client origin only
- Request body capped at 10 KB

---

## License

MIT © 2026 [Primo Velasquez](https://github.com/supremovb)
