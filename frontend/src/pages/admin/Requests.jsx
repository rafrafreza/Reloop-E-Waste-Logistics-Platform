import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminApi } from "../../api/endpoints";
import { PageLoader, EmptyState } from "../../components/ui/Primitives";
import StatusBadge from "../../components/ui/StatusBadge";
import PaginatedList from "../../components/PaginatedList";
import { formatDate } from "../../utils/date";

const STATUSES = ["", "PENDING", "QUOTED", "ACCEPTED", "ASSIGNED", "OUT_FOR_PICKUP", "PICKED_UP", "AT_CENTRE", "COMPLETED", "CANCELLED", "REJECTED"];

export default function Requests() {
  const [requests, setRequests] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") || "";
  const setStatus = (val) => {
    if (val) searchParams.set("status", val);
    else searchParams.delete("status");
    setSearchParams(searchParams);
  };

  useEffect(() => {
    setRequests(null);
    adminApi.listAllRequests(status || undefined).then((res) => setRequests(res.data));
  }, [status]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">All Requests</h1>
      <p className="mt-1 text-sm text-inkfaint">Platform-wide oversight of every pickup request.</p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`shrink-0 rounded px-3 py-1.5 font-mono text-xs uppercase tracking-wide ${
              status === s ? "bg-ink text-white" : "bg-white text-inkfaint border border-ink/10"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {!requests ? (
          <PageLoader />
        ) : (
          <PaginatedList
            items={requests}
            searchFields={['id', 'status', 'consumer_name', 'centre_name']}
            renderItem={(r) => (
              <tr key={r.id} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-inkfaint">#{String(r.id).padStart(5, "0")}</td>
                <td className="px-4 py-3 text-ink">{r.consumer_name}</td>
                <td className="px-4 py-3 text-inkfaint">{r.centre_name || "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-right font-mono text-ink">{r.quotation ? `₹${r.quotation.total_amount.toFixed(2)}` : "—"}</td>
                <td className="px-4 py-3 text-inkfaint">{formatDate(r.created_at)}</td>
              </tr>
            )}
            renderWrapper={(children) => (
              <div className="overflow-x-auto rounded border border-ink/10 bg-white">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 bg-paperdim">
                      <th className="px-4 py-3 field-label">ID</th>
                      <th className="px-4 py-3 field-label">Consumer</th>
                      <th className="px-4 py-3 field-label">Centre</th>
                      <th className="px-4 py-3 field-label">Status</th>
                      <th className="px-4 py-3 field-label text-right">Amount</th>
                      <th className="px-4 py-3 field-label">Created</th>
                    </tr>
                  </thead>
                  <tbody>{children}</tbody>
                </table>
              </div>
            )}
            emptyState={<EmptyState title="No requests found" />}
            itemsPerPage={10}
          />
        )}
      </div>
    </div>
  );
}
