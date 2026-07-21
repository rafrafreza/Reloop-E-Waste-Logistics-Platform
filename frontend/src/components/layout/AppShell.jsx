import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../NotificationBell";

const NAV_ITEMS = {
  CONSUMER: [
    { to: "/consumer", label: "Dashboard", icon: "grid", end: true },
    { to: "/consumer/requests", label: "My Requests", icon: "list" },
    { to: "/consumer/new-request", label: "Schedule Pickup", icon: "plus" },
    { to: "/consumer/addresses", label: "Addresses", icon: "pin" },
    { to: "/consumer/profile", label: "Profile", icon: "user" },
  ],
  PARTNER: [
    { to: "/partner", label: "Dashboard", icon: "grid", end: true },
    { to: "/partner/assignments", label: "Assignments", icon: "truck" },
    { to: "/partner/history", label: "History", icon: "list" },
    { to: "/partner/profile", label: "Profile", icon: "user" },
  ],
  CENTRE: [
    { to: "/centre", label: "Dashboard", icon: "grid", end: true },
    { to: "/centre/incoming", label: "Incoming Requests", icon: "inbox" },
    { to: "/centre/active", label: "Active Pipeline", icon: "truck" },
    { to: "/centre/inventory", label: "Warehouse", icon: "box" },
    { to: "/centre/history", label: "History", icon: "list" },
    { to: "/centre/profile", label: "Profile", icon: "user" },
  ],
  ADMIN: [
    { to: "/admin", label: "Dashboard", icon: "grid", end: true },
    { to: "/admin/requests", label: "Requests", icon: "list" },
    { to: "/admin/users", label: "Users", icon: "users" },
    { to: "/admin/categories", label: "Categories & Pricing", icon: "tag" },
    { to: "/admin/settings", label: "Settings", icon: "settings" },
    { to: "/admin/profile", label: "Profile", icon: "user" },
  ],
};

const ICONS = {
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  list: "M4 6h16M4 12h16M4 18h10",
  plus: "M12 5v14M5 12h14",
  pin: "M12 22s7-7.58 7-12A7 7 0 105 10c0 4.42 7 12 7 12z",
  truck: "M3 7h11v8H3zM14 10h4l3 3v2h-7zM6.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  inbox: "M4 12h4l2 3h4l2-3h4M4 12l1.5-6.5A1 1 0 016.47 4h11.06a1 1 0 01.97 1.5L20 12M4 12v6a1 1 0 001 1h14a1 1 0 001-1v-6",
  box: "M21 8L12 3 3 8l9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8",
  users: "M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M11 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  tag: "M20.59 13.41L11 3.83A2 2 0 009.59 3.24L3 3v6.59a2 2 0 00.59 1.41l9.59 9.59a2 2 0 002.82 0l4.59-4.59a2 2 0 000-2.82zM7 7h.01",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.14.36.39.68.71.92",
};

function Icon({ name, className = "" }) {
  const path = ICONS[name] || ICONS.grid;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={path} />
    </svg>
  );
}

const ROLE_LABEL = {
  CONSUMER: "Consumer Portal",
  PARTNER: "Pickup Partner",
  CENTRE: "Segregation Centre",
  ADMIN: "Admin Console",
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV_ITEMS[user.role] || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink/10 bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-ink/10 px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-ink text-circuit">
            <svg width="16" height="16" viewBox="0 0 32 32">
              <path d="M16 6 L24 11 V21 L16 26 L8 21 V11 Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="16" cy="16" r="3" fill="currentColor" />
            </svg>
          </div>
          <span className="font-semibold text-ink">Reloop</span>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors ${
                  isActive ? "bg-circuitlight text-circuitdark font-medium" : "text-inkfaint hover:bg-paperdim hover:text-ink"
                }`
              }
            >
              <Icon name={item.icon} className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-ink/10 px-3 py-4">
          <div className="mb-2 px-3">
            <p className="text-sm font-medium text-ink">{user.full_name}</p>
            <p className="field-label">{ROLE_LABEL[user.role]}</p>
          </div>
          <button onClick={handleLogout} className="btn-ghost w-full justify-start px-3">
            <Icon name="settings" className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ink/10 bg-white px-4 py-3 md:px-8">
          <p className="field-label md:hidden">Reloop</p>
          <p className="hidden field-label md:block">{ROLE_LABEL[user.role]}</p>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button onClick={handleLogout} className="text-sm text-inkfaint hover:text-ink md:hidden">
              Sign out
            </button>
          </div>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-ink/10 bg-white px-4 py-2 md:hidden">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `shrink-0 rounded px-3 py-1.5 text-xs font-medium ${
                  isActive ? "bg-circuitlight text-circuitdark" : "text-inkfaint"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
