import { useEffect, useState } from "react";
import { adminApi } from "../../api/endpoints";
import { PageLoader, EmptyState } from "../../components/ui/Primitives";
import { formatDateTime } from "../../utils/date";

const ACTION_LABEL = {
  USER_ACTIVATED: "User activated",
  USER_DEACTIVATED: "User deactivated",
  CATEGORY_CREATED: "Category created",
  CATEGORY_UPDATED: "Category updated",
  CATEGORY_REMOVED: "Category removed",
  SETTING_UPDATED: "Setting updated",
  SUPPORT_TICKET_UPDATED: "Support ticket updated",
};

export default function AuditLog() {
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    adminApi.auditLog().then((res) => setLogs(res.data));
  }, []);

  if (!logs) return <PageLoader />;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Activity Log</h1>
      <p className="mt-1 text-sm text-inkfaint">Accountability trail for admin actions — who changed what, and when.</p>

      <div className="mt-6">
        {logs.length === 0 ? (
          <EmptyState title="No activity yet" description="Admin actions like approvals and setting changes will show up here." />
        ) : (
          <div className="overflow-x-auto rounded border border-ink/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-paperdim">
                  <th className="px-4 py-3 field-label">Action</th>
                  <th className="px-4 py-3 field-label">Details</th>
                  <th className="px-4 py-3 field-label">By</th>
                  <th className="px-4 py-3 field-label">When</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-4 py-3">
                      <span className="rounded border border-ink/10 bg-paperdim px-2 py-0.5 font-mono text-[11px] uppercase text-inkfaint">
                        {ACTION_LABEL[l.action] || l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink">{l.details || "—"}</td>
                    <td className="px-4 py-3 text-inkfaint">{l.actor_name || "System"}</td>
                    <td className="px-4 py-3 text-inkfaint">{formatDateTime(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
