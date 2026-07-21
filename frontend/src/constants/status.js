// Central definition of the CollectionRequest status machine so every page
// (consumer / partner / centre / admin) renders it identically.

export const STATUS_FLOW = [
  "PENDING",
  "QUOTED",
  "ACCEPTED",
  "ASSIGNED",
  "OUT_FOR_PICKUP",
  "PICKED_UP",
  "AT_CENTRE",
  "COMPLETED",
];

export const STATUS_META = {
  PENDING: { label: "Pending review", color: "text-slate", bg: "bg-paperdim", border: "border-slate/30" },
  QUOTED: { label: "Quoted", color: "text-amber", bg: "bg-amberlight", border: "border-amber/40" },
  ACCEPTED: { label: "Accepted", color: "text-circuit", bg: "bg-circuitlight", border: "border-circuit/40" },
  ASSIGNED: { label: "Partner assigned", color: "text-copper", bg: "bg-copperlight", border: "border-copper/40" },
  OUT_FOR_PICKUP: { label: "Out for pickup", color: "text-amber", bg: "bg-amberlight", border: "border-amber/40" },
  PICKED_UP: { label: "Picked up", color: "text-circuit", bg: "bg-circuitlight", border: "border-circuit/40" },
  AT_CENTRE: { label: "At centre", color: "text-slate", bg: "bg-paperdim", border: "border-slate/30" },
  COMPLETED: { label: "Completed", color: "text-circuit", bg: "bg-circuitlight", border: "border-circuit/40" },
  CANCELLED: { label: "Cancelled", color: "text-brick", bg: "bg-bricklight", border: "border-brick/40" },
  REJECTED: { label: "Rejected", color: "text-brick", bg: "bg-bricklight", border: "border-brick/40" },
};

export function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.PENDING;
}
