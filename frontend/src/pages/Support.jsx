import { useEffect, useState } from "react";
import { supportApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import { PageLoader, EmptyState, Banner, Modal } from "../components/ui/Primitives";

const STATUS_STYLE = {
  OPEN: "text-amber bg-amberlight border-amber/40",
  IN_PROGRESS: "text-copper bg-copperlight border-copper/40",
  RESOLVED: "text-circuit bg-circuitlight border-circuit/40",
  CLOSED: "text-slate bg-paperdim border-slate/30",
};

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function Support() {
  const [tickets, setTickets] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = () => supportApi.listMine().then((res) => setTickets(res.data));

  useEffect(() => {
    load();
  }, []);

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
                  <p className="text-sm text-ink">{t.message}</p>
                  {t.admin_response ? (
                    <div className="mt-3 rounded border border-circuit/30 bg-circuitlight p-3">
                      <p className="field-label text-circuitdark">Reloop support response</p>
                      <p className="mt-1 text-sm text-ink">{t.admin_response}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-inkfaint">No response yet — our team typically responds within a day.</p>
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
