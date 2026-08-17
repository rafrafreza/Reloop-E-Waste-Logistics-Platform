import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { PageLoader, EmptyState, Banner, Modal } from "../../components/ui/Primitives";
import { formatDateTime } from "../../utils/date";

const STATUS_STYLE = {
  OPEN: "text-amber bg-amberlight border-amber/40",
  IN_PROGRESS: "text-copper bg-copperlight border-copper/40",
  RESOLVED: "text-circuit bg-circuitlight border-circuit/40",
  CLOSED: "text-slate bg-paperdim border-slate/30",
};

const FILTERS = ["", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function AdminSupport() {
  const [tickets, setTickets] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") || "";
  const setStatus = (val) => {
    if (val) searchParams.set("status", val);
    else searchParams.delete("status");
    setSearchParams(searchParams);
  };
  const [replying, setReplying] = useState(null);
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState("IN_PROGRESS");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => adminApi.listTickets(status || undefined).then((res) => setTickets(res.data));

  useEffect(() => {
    setTickets(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const openReply = (ticket) => {
    setReplying(ticket);
    setResponse(ticket.admin_response || "");
    setNewStatus(ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status);
    setError("");
  };

  const submitReply = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await adminApi.respondToTicket(replying.id, { status: newStatus, admin_response: response || null });
      setReplying(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not update ticket"));
    } finally {
      setSaving(false);
    }
  };

  if (!tickets) return <PageLoader />;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Support Inbox</h1>
      <p className="mt-1 text-sm text-inkfaint">Tickets raised by consumers, partners, and centres.</p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatus(f)}
            className={`shrink-0 rounded px-3 py-1.5 font-mono text-xs uppercase tracking-wide ${
              status === f ? "bg-ink text-white" : "bg-white text-inkfaint border border-ink/10"
            }`}
          >
            {f || "All"}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {tickets.length === 0 ? (
          <EmptyState title="No tickets" description="Nothing matches this filter." />
        ) : (
          tickets.map((t) => (
            <div key={t.id} className="ticket p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-inkfaint">#{t.id}</span>
                    <span className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase ${STATUS_STYLE[t.status]}`}>{t.status.replace("_", " ")}</span>
                    <span className="field-label">{t.user_name} · {t.user_role}</span>
                    {t.request_id && <span className="field-label">Request #{String(t.request_id).padStart(5, "0")}</span>}
                  </div>
                  <p className="mt-1.5 font-medium text-ink">{t.subject}</p>
                  <p className="mt-1 text-sm text-inkfaint">{t.message}</p>
                  {t.admin_response && (
                    <div className="mt-2 rounded border border-circuit/30 bg-circuitlight p-2">
                      <p className="text-sm text-ink">{t.admin_response}</p>
                    </div>
                  )}
                  <p className="field-label mt-2">{formatDateTime(t.created_at)}</p>
                </div>
                <button onClick={() => openReply(t)} className="btn-secondary shrink-0 text-xs">
                  {t.admin_response ? "Update" : "Respond"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={!!replying} onClose={() => setReplying(null)} title={replying ? `Respond to ticket #${replying.id}` : ""}>
        {replying && (
          <form onSubmit={submitReply} className="space-y-3">
            {error && <Banner kind="error">{error}</Banner>}
            <div>
              <p className="field-label">Original message</p>
              <p className="mt-1 text-sm text-inkfaint">{replying.message}</p>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="label">Response</label>
              <textarea rows={3} className="input" value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Your reply..." />
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? "Saving..." : "Save"}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
