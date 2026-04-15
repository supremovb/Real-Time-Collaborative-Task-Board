"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({
  boardId,
  children,
}: {
  boardId: string;
  children: React.ReactNode;
}) {
  const socketRef = useRef<Socket | null>(null);

  if (!socketRef.current) {
    socketRef.current = io(API_URL, {
      autoConnect: false,
    });
  }

  useEffect(() => {
    const socket = socketRef.current!;
    socket.connect();
    socket.emit("board:join", boardId);

    return () => {
      socket.emit("board:leave", boardId);
      socket.disconnect();
    };
  }, [boardId]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
