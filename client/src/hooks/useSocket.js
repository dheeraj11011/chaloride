import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import useStore from "../store/useStore";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socketInstance = null;

export const useSocket = () => {
  const { accessToken, user } = useStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!accessToken || !user) return;

    // Reuse existing connection if already established
    if (socketInstance?.connected) {
      socketRef.current = socketInstance;
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.warn("⚠️ Socket connection error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
    });

    socketInstance = socket;
    socketRef.current = socket;

    return () => {
      // Don't disconnect on unmount — maintain persistent connection
      // Only disconnect on logout (handled separately)
    };
  }, [accessToken, user]);

  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const on = useCallback((event, handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  const joinRoom = useCallback((room) => {
    socketRef.current?.emit("join_ride_room", { rideId: room });
  }, []);

  const leaveRoom = useCallback((room) => {
    socketRef.current?.emit("leave_ride_room", { rideId: room });
  }, []);

  const trackDriver = useCallback((driverId) => {
    socketRef.current?.emit("passenger:track_driver", { driverId });
  }, []);

  const untrackDriver = useCallback((driverId) => {
    socketRef.current?.emit("passenger:untrack_driver", { driverId });
  }, []);

  const disconnect = useCallback(() => {
    socketInstance?.disconnect();
    socketInstance = null;
  }, []);

  return { socket: socketRef.current, emit, on, off, joinRoom, leaveRoom, trackDriver, untrackDriver, disconnect };
};

export default useSocket;
