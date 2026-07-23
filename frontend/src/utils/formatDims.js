/** Formats an item's dimensions for display, or returns null if none were provided. */
export function formatDims(item) {
  if (!item.length_cm && !item.breadth_cm && !item.height_cm) return null;
  const l = item.length_cm ?? "?";
  const b = item.breadth_cm ?? "?";
  const h = item.height_cm ?? "?";
  return `${l} × ${b} × ${h} cm`;
}
