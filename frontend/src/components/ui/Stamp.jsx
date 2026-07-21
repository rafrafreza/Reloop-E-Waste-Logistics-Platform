const STAMP_STYLES = {
  COMPLETED: "border-circuit text-circuit",
  CANCELLED: "border-brick text-brick",
  REJECTED: "border-brick text-brick",
  AT_CENTRE: "border-slate text-slate",
};

const STAMP_TEXT = {
  COMPLETED: "Recycled ✓",
  CANCELLED: "Cancelled",
  REJECTED: "Quote rejected",
  AT_CENTRE: "Received",
};

/** Only renders for terminal / notable statuses — used as the design's signature element. */
export default function Stamp({ status }) {
  if (!STAMP_TEXT[status]) return null;
  return (
    <div
      className={`stamp animate-stamp ${STAMP_STYLES[status]}`}
      style={{ borderStyle: "double" }}
    >
      {STAMP_TEXT[status]}
    </div>
  );
}
