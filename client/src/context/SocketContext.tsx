"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({
  boardId,
  userName,
  children,
}: {
  boardId: string;
  userName: string;
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

    const joinRoom = () => {
      socket.emit("board:join", { boardId, userName });
    };

    socket.on("connect", joinRoom);
    socket.connect();

    if (socket.connected) {
      joinRoom();
    }

    return () => {
      socket.off("connect", joinRoom);
      socket.disconnect();
    };
  }, [boardId, userName]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
