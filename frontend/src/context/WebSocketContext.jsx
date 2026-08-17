import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { commonApi } from "../api/endpoints";

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestNotification, setLatestNotification] = useState(null);
  
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const backoffRef = useRef(1000);

  const connect = useCallback(() => {
    const token = localStorage.getItem("reloop_token");
    if (!token) return;

    // Determine WebSocket URL — must match the backend, not the Vite dev server
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const host = apiUrl.replace(/^http(s?):\/\//, `ws$1://`);
      
    const wsUrl = `${host}/ws/notifications`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      backoffRef.current = 1000; // reset backoff
      ws.send(JSON.stringify({ token }));

      // Fetch missed notifications on successful reconnect
      commonApi.notifications().then((res) => {
         // This is a side-effect, we can just trigger a state change so listeners know to refetch
         // Actually, let's just emit a special event for recovery
         setLatestNotification({ type: "RECOVERY", data: res.data });
      }).catch(() => {});

      heartbeatIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send("ping");
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "pong") return; // ignore heartbeat responses
        if (data.type === "auth_success") return; // ignore auth ack
        if (data.type === "error") {
          console.error("WebSocket error:", data.message);
          return;
        }
        // It's a real notification
        setLatestNotification(data);
      } catch (err) {
        console.error("Failed to parse WebSocket message", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      clearInterval(heartbeatIntervalRef.current);
      
      // Attempt reconnect with exponential backoff
      if (user) {
        reconnectTimeoutRef.current = setTimeout(() => {
          backoffRef.current = Math.min(backoffRef.current * 2, 30000);
          connect();
        }, backoffRef.current);
      }
    };

    ws.onerror = () => {
      // Close event will handle reconnect
      ws.close();
    };

    setSocket(ws);
  }, [user]);

  useEffect(() => {
    if (user) {
      connect();
    } else {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
      clearTimeout(reconnectTimeoutRef.current);
      clearInterval(heartbeatIntervalRef.current);
    }

    return () => {
      if (socketRef.current) socketRef.current.close();
      clearTimeout(reconnectTimeoutRef.current);
      clearInterval(heartbeatIntervalRef.current);
    };
  }, [user, connect]);

  return (
    <WebSocketContext.Provider value={{ socket, isConnected, latestNotification }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
