import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminApi, supportApi } from "../../api/endpoints";
import { PageLoader, EmptyState } from "../../components/ui/Primitives";

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

  const load = () => adminApi.listTickets(status || undefined).then((res) => setTickets(res.data));

  useEffect(() => {
    setTickets(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const submitStatus = async (ticketId, newStatus) => {
    try {
      await adminApi.respondToTicket(ticketId, { status: newStatus });
      await load();
    } catch (err) {
      alert("Could not update status");
    }
  };

  const handleReply = async (ticketId, message) => {
    try {
      await supportApi.addMessage(ticketId, { message });
      await load();
    } catch (err) {
      alert("Could not send reply");
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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-inkfaint">#{t.id}</span>
                    <span className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase ${STATUS_STYLE[t.status]}`}>{t.status.replace("_", " ")}</span>
                    <span className="field-label">{t.user_name} · {t.user_role}</span>
                    {t.request_id && <span className="field-label">Request #{String(t.request_id).padStart(5, "0")}</span>}
                  </div>
                  <p className="mt-1.5 font-medium text-ink">{t.subject}</p>
                  
                  <div className="ticket-divider mt-4 pt-4 space-y-3">
                    <div className="rounded border border-ink/10 bg-paper p-3">
                      <p className="field-label text-ink">{t.user_name} ({t.user_role})</p>
                      <p className="mt-1 text-sm text-ink">{t.message}</p>
                    </div>
                    {t.messages && t.messages.map(m => (
                      <div key={m.id} className={`rounded border p-3 ${m.sender_role === 'ADMIN' ? 'border-circuit/30 bg-circuitlight' : 'border-ink/10 bg-paper'}`}>
                        <p className={`field-label ${m.sender_role === 'ADMIN' ? 'text-circuitdark' : 'text-ink'}`}>{m.sender_role === 'ADMIN' ? 'You' : `${m.sender_name} (${m.sender_role})`}</p>
                        <p className="mt-1 text-sm text-ink">{m.message}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const input = e.target.elements.reply;
                    const msg = input.value;
                    if (!msg.trim()) return;
                    input.disabled = true;
                    try {
                      await handleReply(t.id, msg);
                      input.value = "";
                    } finally {
                      input.disabled = false;
                    }
                  }} className="mt-4 flex gap-2">
                    <input name="reply" type="text" placeholder="Type a reply..." className="input flex-1" required />
                    <button type="submit" className="btn-secondary">Reply</button>
                  </form>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                  <p className="field-label mb-1 hidden sm:block">Status</p>
                  <select 
                    className="input py-1 text-sm h-8" 
                    value={t.status}
                    onChange={(e) => submitStatus(t.id, e.target.value)}
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
