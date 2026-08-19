import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import NotificationBell from "../NotificationBell";
import AIChatDrawer from "../AIChatDrawer";

const NAV_ITEMS = {
  CONSUMER: [
    { to: "/consumer", label: "Dashboard", icon: "grid", end: true },
    { to: "/consumer/requests", label: "My Requests", icon: "list" },
    { to: "/consumer/new-request", label: "Schedule Pickup", icon: "plus" },
    { to: "/consumer/addresses", label: "Addresses", icon: "pin" },
    { to: "/consumer/impact", label: "My Impact", icon: "leaf" },
    { to: "/consumer/support", label: "Support", icon: "help" },
    { to: "/consumer/profile", label: "Profile", icon: "user" },
  ],
  PARTNER: [
    { to: "/partner", label: "Dashboard", icon: "grid", end: true },
    { to: "/partner/assignments", label: "Assignments", icon: "truck" },
    { to: "/partner/my-items", label: "My Items", icon: "box" },
    { to: "/partner/earnings", label: "Earnings", icon: "money" },
    { to: "/partner/history", label: "History", icon: "list" },
    { to: "/partner/support", label: "Support", icon: "help" },
    { to: "/partner/profile", label: "Profile", icon: "user" },
  ],
  CENTRE: [
    { to: "/centre", label: "Dashboard", icon: "grid", end: true },
    { to: "/centre/incoming", label: "Incoming Requests", icon: "inbox" },
    { to: "/centre/active", label: "Active Pipeline", icon: "truck" },
    { to: "/centre/inventory", label: "Warehouse", icon: "box" },
    { to: "/centre/history", label: "History", icon: "list" },
    { to: "/centre/finance", label: "Finance Ledger", icon: "trending" },
    { to: "/centre/support", label: "Support", icon: "help" },
    { to: "/centre/profile", label: "Profile", icon: "user" },
  ],
  ADMIN: [
    { to: "/admin", label: "Dashboard", icon: "grid", end: true },
    { to: "/admin/requests", label: "Requests", icon: "list" },
    { to: "/admin/users", label: "Users", icon: "users" },
    { to: "/admin/categories", label: "Categories & Pricing", icon: "tag" },
    { to: "/admin/settings", label: "Settings", icon: "settings" },
    { to: "/admin/revenue", label: "Revenue", icon: "trending" },
    { to: "/admin/payouts", label: "Payouts History", icon: "money" },
    { to: "/admin/partner-balances", label: "Partner Balances", icon: "users" },
    { to: "/admin/audit-log", label: "Audit Log", icon: "clipboard" },
    { to: "/admin/support", label: "Support Inbox", icon: "help" },
    { to: "/admin/profile", label: "Profile", icon: "user" },
  ],
};

// The mobile bottom bar shows at most 5 buttons. If a role has more than 5
// nav items, the first 4 are shown directly and the rest are tucked behind
// a "Menu" button (the 5th slot).
const MAX_BOTTOM_BUTTONS = 5;

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
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
  leaf: "M20 4C10 4 4 10 4 20c8 0 14-6 14-16z M4 20l8-8",
  money: "M12 2v20 M16.5 6.5C16.5 4.84 14.5 4 12 4S7.5 4.84 7.5 6.5 9.5 9 12 9s4.5 1.34 4.5 3-2 3-4.5 3-4.5-.84-4.5-2.5",
  trending: "M3 17l6-6 4 4 8-8 M15 7h6v6",
  clipboard: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 4.5A1.5 1.5 0 0110.5 3h3A1.5 1.5 0 0115 4.5v1A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5z M9 12h6 M9 16h6",
  help: "M12 22a10 10 0 100-20 10 10 0 000 20z M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5 M12 17h.01",
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

function BrandMark({ small = false }) {
  const boxClass = small ? "h-6 w-6" : "h-7 w-7";
  const iconSize = small ? 14 : 16;
  return (
    <div className={`flex ${boxClass} items-center justify-center rounded bg-ink text-circuit`}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 32 32">
        <path d="M16 6 L24 11 V21 L16 26 L8 21 V11 Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16" cy="16" r="3" fill="currentColor" />
      </svg>
    </div>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const items = NAV_ITEMS[user.role] || [];
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const hasOverflow = items.length > MAX_BOTTOM_BUTTONS;
  const primaryItems = hasOverflow ? items.slice(0, MAX_BOTTOM_BUTTONS - 1) : items;
  const overflowItems = hasOverflow ? items.slice(MAX_BOTTOM_BUTTONS - 1) : [];
  const isOverflowActive = overflowItems.some((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-dvh bg-paper overflow-hidden">
      {/* Desktop sidebar - unchanged, hidden below md */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-ink/10 bg-white md:flex">
        <Link to="/" className="flex items-center gap-2 border-b border-ink/10 px-5 py-4">
          <BrandMark />
          <span className="font-semibold text-ink">Reloop</span>
        </Link>

        <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
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

      <div className="flex flex-1 flex-col min-w-0">
        {/* Top header: brand top-left on mobile, role label top-left on desktop.
            Desktop top-right has AI Chat, Theme toggle (sun/moon), NotificationBell. */}
        <header className="shrink-0 z-20 flex items-center justify-between border-b border-ink/10 bg-white/90 backdrop-blur-md px-4 py-3 md:px-8">
          <Link to="/" className="flex items-center gap-2 md:hidden">
            <BrandMark small />
            <span className="text-sm font-semibold text-ink">Reloop</span>
          </Link>
          <p className="hidden field-label md:block">{ROLE_LABEL[user.role]}</p>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setChatOpen(true)}
              className="flex items-center gap-2 rounded-full bg-circuitlight/40 px-3 py-1.5 text-sm font-medium text-circuit hover:bg-circuitlight transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="hidden md:inline">AI Chat</span>
            </button>

            {/* Desktop Theme Toggle Button (Between AI Chat and Notification Bell) */}
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
              className="hidden md:flex h-9 w-9 items-center justify-center rounded border border-ink/10 bg-white text-ink hover:border-ink/25 transition-colors"
            >
              {theme === "dark" ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <NotificationBell />

            {/* Mobile Sign Out button (h-9 w-9) */}
            <button
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded border border-ink/10 bg-white text-ink hover:border-brick/30 hover:bg-brick/5 hover:text-brick transition-colors md:hidden"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-24 pt-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom bar: up to 5 direct nav buttons, or 4 + Menu for
          roles with more destinations - hidden on desktop. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-ink/10 bg-white md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {primaryItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-center ${
                isActive ? "text-circuitdark" : "text-inkfaint"
              }`
            }
          >
            <Icon name={item.icon} className="h-5 w-5 shrink-0" />
            <span className="text-[10px] font-medium leading-tight">{item.label}</span>
          </NavLink>
        ))}

        {hasOverflow && (
          <button
            onClick={() => setMenuOpen(true)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-center ${
              isOverflowActive ? "text-circuitdark" : "text-inkfaint"
            }`}
          >
            <Icon name="menu" className="h-5 w-5 shrink-0" />
            <span className="text-[10px] font-medium leading-tight">Menu</span>
          </button>
        )}
      </nav>

      {/* Overflow drawer (bottom sheet) - only used when a role has more
          than 5 nav destinations. */}
      {hasOverflow && menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-lg bg-white shadow-stamp animate-rise">
            <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
              <span className="font-semibold text-ink">More</span>
              <button onClick={() => setMenuOpen(false)} className="text-inkfaint" aria-label="Close menu">
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <nav className="p-3">
              {overflowItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded px-4 py-3 text-sm ${
                      isActive ? "bg-circuitlight text-circuitdark font-medium" : "text-ink"
                    }`
                  }
                >
                  <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="border-t border-ink/10 p-3">
              <div className="flex items-center justify-between px-4 py-2">
                <div>
                  <p className="text-sm font-medium text-ink">{user.full_name}</p>
                  <p className="field-label">{ROLE_LABEL[user.role]}</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="flex h-9 w-9 items-center justify-center rounded border border-ink/10 bg-white text-ink hover:border-ink/25 transition-colors"
                  title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  )}
                </button>
              </div>
              <button onClick={handleLogout} className="btn-ghost w-full justify-start px-4">
                <Icon name="settings" className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <AIChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}

