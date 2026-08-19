import { Link } from "react-router-dom";
import StatusBadge from "./ui/StatusBadge";
import { formatDate } from "../utils/date";

export default function RequestCard({ request, basePath, extra }) {
  const itemCount = request.items.reduce((sum, i) => sum + i.quantity, 0);
  const categories = [...new Set(request.items.map((i) => i.category_name))].filter(Boolean);

  return (
    <div className="ticket flex flex-col overflow-hidden sm:flex-row">
      <div className="flex-1 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-inkfaint">#{String(request.id).padStart(5, "0")}</span>
          <StatusBadge status={request.status} />
        </div>

        <p className="mt-2 text-sm text-ink">
          {categories.slice(0, 3).join(", ")}
          {categories.length > 3 ? ` +${categories.length - 3} more` : ""}
          <span className="text-inkfaint"> · {itemCount} item{itemCount !== 1 ? "s" : ""}</span>
        </p>

        {request.address && (
          <p className="mt-1 text-sm text-inkfaint">
            {request.address.street}, {request.address.city}
          </p>
        )}

        <div className="mt-1 flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${request.request_type === 'PRIORITY' ? 'bg-circuitlight text-circuitdark' : 'bg-paperdim text-inkfaint'}`}>
            {request.request_type}
          </span>
          {request.sla_deadline && (
            <span className={`text-xs ${new Date(request.sla_deadline) < new Date(Date.now() + 4 * 3600 * 1000) ? 'text-copper font-medium' : 'text-inkfaint'}`}>
              SLA: {formatDate(request.sla_deadline)}
            </span>
          )}
        </div>

        <p className="mt-2 field-label">Logged {formatDate(request.created_at)}</p>
      </div>

      <div className="ticket-divider flex shrink-0 flex-row items-center justify-between gap-3 p-4 sm:w-56 sm:flex-col sm:items-end sm:border-t-0 sm:border-l sm:border-dashed sm:border-ink/15">
        {request.quotation ? (
          <div className="text-left sm:text-right">
            <p className="field-label">Quoted amount</p>
            <p className="font-mono text-lg font-semibold text-ink">₹{request.quotation.total_amount.toFixed(2)}</p>
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          {extra}
          <Link to={`${basePath}/${request.id}`} className="btn-secondary">
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
