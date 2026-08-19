import { useEffect, useRef, useState } from "react";
import { commonApi } from "../api/endpoints";
import { timeAgo } from "../utils/date";
import { useWebSocket } from "../context/WebSocketContext";

export default function NotificationBell({ openUpward = false }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasUnseen, setHasUnseen] = useState(false);
  const ref = useRef(null);
  
  const { latestNotification } = useWebSocket();

  const refreshData = async () => {
    try {
      const notifRes = await commonApi.notifications();
      setNotifications(notifRes.data);
      
      const hasNew = notifRes.data.some(n => !n.is_read);
      setHasUnseen(hasNew);
    } catch (err) {}
  };

  useEffect(() => {
    refreshData();
  }, []);

  const processedRef = useRef(new Set());

  useEffect(() => {
    if (latestNotification) {
      if (latestNotification.type === "RECOVERY") {
        refreshData();
        if (latestNotification.data && Array.isArray(latestNotification.data)) {
          processedRef.current = new Set(latestNotification.data.map(n => n.id));
        }
      } else if (!processedRef.current.has(latestNotification.id)) {
        processedRef.current.add(latestNotification.id);
        setNotifications((prev) => [latestNotification, ...prev]);
        setHasUnseen(true);
      }
    }
  }, [latestNotification]);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const toggle = () => {
    setOpen(!open);
  };

  const markAll = async () => {
    await commonApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setHasUnseen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded border border-ink/10 bg-white text-ink hover:border-ink/25"
        aria-label="Notifications"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {hasUnseen && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-copper ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div
          className={`absolute right-0 z-40 w-80 max-w-[88vw] animate-rise rounded border border-ink/10 bg-white shadow-stamp ${
            openUpward ? "bottom-full mb-2" : "mt-2"
          }`}
        >
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {notifications.some((n) => !n.is_read) && (
              <button onClick={markAll} className="text-xs text-circuit hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-inkfaint">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`border-b border-ink/5 px-4 py-3 last:border-0 ${!n.is_read ? "bg-circuitlight/40" : ""}`}>
                  <p className="text-sm font-medium text-ink">{n.title}</p>
                  <p className="mt-0.5 text-sm text-inkfaint">{n.message}</p>
                  <p className="field-label mt-1">{timeAgo(n.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
