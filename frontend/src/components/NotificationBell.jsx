import { useEffect, useRef, useState } from "react";
import { commonApi } from "../api/endpoints";
import { timeAgo } from "../utils/date";

export default function NotificationBell({ openUpward = false }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  const refreshCount = () => {
    commonApi
      .unreadCount()
      .then((res) => setCount(res.data.count))
      .catch(() => {});
  };

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      const res = await commonApi.notifications();
      setNotifications(res.data);
    }
  };

  const markAll = async () => {
    await commonApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setCount(0);
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
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-copper px-1 font-mono text-[10px] text-white">
            {count > 9 ? "9+" : count}
          </span>
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
