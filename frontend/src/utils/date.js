/**
 * Utility functions for parsing ISO date strings and formatting them in IST (Asia/Kolkata).
 */

export function parseISO(iso) {
  if (!iso) return null;
  if (iso instanceof Date) return iso;
  const str = String(iso);
  // Ensure ISO strings without timezone offsets are treated as UTC so they convert accurately to IST
  const hasTimezone = str.endsWith("Z") || str.includes("+") || (str.lastIndexOf("-") > 10);
  const normalized = hasTimezone ? str : str + "Z";
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? new Date(iso) : date;
}

export function formatDate(iso, options = {}) {
  const d = parseISO(iso);
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  });
}

export function formatDateTime(iso, options = {}) {
  const d = parseISO(iso);
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...options,
  });
}

export function timeAgo(iso) {
  const d = parseISO(iso);
  if (!d || isNaN(d.getTime())) return "";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
