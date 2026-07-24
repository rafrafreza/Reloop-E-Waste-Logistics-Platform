import { useEffect, useState } from "react";
import { centreApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { PageLoader, EmptyState, Banner, Modal } from "../../components/ui/Primitives";
import RequestCard from "../../components/RequestCard";

export default function ActiveRequests() {
  const [requests, setRequests] = useState(null);
  const [partners, setPartners] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => centreApi.listRequests("active").then((res) => setRequests(res.data));

  useEffect(() => {
    load();
    centreApi.listPartners().then((res) => setPartners(res.data));
  }, []);

  const openAssign = (req) => {
    setAssigning(req);
    setSelectedPartner("");
    setError("");
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    if (!selectedPartner) return;
    setSaving(true);
    setError("");
    try {
      await centreApi.assignPartner(assigning.id, Number(selectedPartner));
      setAssigning(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not assign partner"));
    } finally {
      setSaving(false);
    }
  };

  const complete = async (req) => {
    if (!confirm(`Mark request #${req.id} as completed?`)) return;
    try {
      await centreApi.completeRequest(req.id);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err, "Could not complete request"));
    }
  };

  if (!requests || !partners) return <PageLoader />;

  const availablePartners = partners.filter((p) => p.status === "AVAILABLE");

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Active Pipeline</h1>
      <p className="mt-1 text-sm text-inkfaint">Requests your centre owns, from acceptance to arrival.</p>

      <div className="mt-6 space-y-4">
        {requests.length === 0 ? (
          <EmptyState title="Nothing active right now" description="Requests move here once a consumer accepts your quotation." />
        ) : (
          requests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              basePath="/centre/requests"
              extra={
                r.status === "ACCEPTED" ? (
                  <button onClick={() => openAssign(r)} className="btn-primary">Assign partner</button>
                ) : r.status === "AT_CENTRE" ? (
                  <button onClick={() => complete(r)} className="btn-primary">Complete</button>
                ) : null
              }
            />
          ))
        )}
      </div>

      <Modal open={!!assigning} onClose={() => setAssigning(null)} title={assigning ? `Assign partner — request #${assigning.id}` : ""}>
        {assigning && (
          <form onSubmit={submitAssign} className="space-y-4">
            {error && <Banner kind="error">{error}</Banner>}
            {availablePartners.length === 0 ? (
              <Banner kind="info">No available partners in your city right now.</Banner>
            ) : (
              <div className="space-y-2">
                {availablePartners.map((p) => (
                  <label key={p.id} className={`flex cursor-pointer items-center justify-between rounded border p-3 ${selectedPartner === String(p.user_id) ? "border-circuit bg-circuitlight" : "border-ink/10"}`}>
                    <div>
                      <p className="text-sm font-medium text-ink">{p.full_name}</p>
                      <p className="text-xs text-inkfaint">{p.vehicle_number || "No vehicle on file"} {p.phone && `· ${p.phone}`}</p>
                      {p.rating_count > 0 && (
                        <p className="text-xs text-amber">{"★".repeat(Math.round(p.avg_rating))}<span className="text-ink/15">{"★".repeat(5 - Math.round(p.avg_rating))}</span> <span className="text-inkfaint">({p.rating_count})</span></p>
                      )}
                    </div>
                    <input type="radio" checked={selectedPartner === String(p.user_id)} onChange={() => setSelectedPartner(String(p.user_id))} />
                  </label>
                ))}
              </div>
            )}
            <button type="submit" disabled={saving || !selectedPartner} className="btn-primary w-full">
              {saving ? "Assigning..." : "Assign & generate OTP"}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
