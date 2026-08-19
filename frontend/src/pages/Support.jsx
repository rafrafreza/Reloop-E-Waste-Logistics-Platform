import { useEffect, useState } from "react";
import { supportApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import { PageLoader, EmptyState, Banner, Modal } from "../components/ui/Primitives";
import { formatDateTime } from "../utils/date";
import { useWebSocket } from "../context/WebSocketContext";

const STATUS_STYLE = {
  OPEN: "text-amber bg-amberlight border-amber/40",
  IN_PROGRESS: "text-copper bg-copperlight border-copper/40",
  RESOLVED: "text-circuit bg-circuitlight border-circuit/40",
  CLOSED: "text-slate bg-paperdim border-slate/30",
};

export default function Support() {
  const [tickets, setTickets] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const { latestNotification } = useWebSocket();

  const load = () => supportApi.listMine().then((res) => setTickets(res.data));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (latestNotification && latestNotification.link?.includes("support")) {
      load();
    }
  }, [latestNotification]);

  const openNew = () => {
    setForm({ subject: "", message: "" });
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await supportApi.create(form);
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not submit ticket"));
    } finally {
      setSaving(false);
    }
  };

  if (!tickets) return <PageLoader />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Support</h1>
          <p className="mt-1 text-sm text-inkfaint">Questions or issues? Raise a ticket and we'll get back to you.</p>
        </div>
        <button onClick={openNew} className="btn-primary">+ New ticket</button>
      </div>

      <div className="mt-6 space-y-3">
        {tickets.length === 0 ? (
          <EmptyState title="No support tickets yet" description="Raised a question? It'll show up here." action={<button onClick={openNew} className="btn-primary">Raise a ticket</button>} />
        ) : (
          tickets.map((t) => (
            <div key={t.id} className="ticket p-4">
              <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-inkfaint">#{t.id}</span>
                    <span className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase ${STATUS_STYLE[t.status]}`}>{t.status.replace("_", " ")}</span>
                    {t.request_id && <span className="field-label">Request #{String(t.request_id).padStart(5, "0")}</span>}
                  </div>
                  <p className="mt-1.5 font-medium text-ink">{t.subject}</p>
                  <p className="field-label mt-1">{formatDateTime(t.created_at)}</p>
                </div>
                <span className="shrink-0 text-inkfaint">{expanded === t.id ? "−" : "+"}</span>
              </button>

              {expanded === t.id && (
                <div className="ticket-divider mt-3 pt-3">
                  <div className="space-y-3">
                    <div className="rounded border border-ink/10 bg-paper p-3">
                      <p className="field-label text-ink">You</p>
                      <p className="mt-1 text-sm text-ink">{t.message}</p>
                    </div>
                    {t.messages && t.messages.map(m => (
                      <div key={m.id} className={`rounded border p-3 ${m.sender_role === 'ADMIN' ? 'border-circuit/30 bg-circuitlight' : 'border-ink/10 bg-paper'}`}>
                        <p className={`field-label ${m.sender_role === 'ADMIN' ? 'text-circuitdark' : 'text-ink'}`}>{m.sender_role === 'ADMIN' ? 'Reloop Support' : 'You'}</p>
                        <p className="mt-1 text-sm text-ink">{m.message}</p>
                      </div>
                    ))}
                  </div>
                  
                  {t.status !== 'CLOSED' && (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const input = e.target.elements.reply;
                      const msg = input.value;
                      if (!msg.trim()) return;
                      input.disabled = true;
                      try {
                        await supportApi.addMessage(t.id, { message: msg });
                        input.value = "";
                        await load();
                      } catch (err) {
                        alert("Could not send message");
                      } finally {
                        input.disabled = false;
                      }
                    }} className="mt-4 flex gap-2">
                      <input name="reply" type="text" placeholder="Type a reply..." className="input flex-1" required />
                      <button type="submit" className="btn-secondary">Send</button>
                    </form>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Raise a support ticket">
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <Banner kind="error">{error}</Banner>}
          <div>
            <label className="label">Subject</label>
            <input required className="input" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Brief summary of your issue" />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea required rows={4} className="input" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="Describe what's going on..." />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Submitting..." : "Submit ticket"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
