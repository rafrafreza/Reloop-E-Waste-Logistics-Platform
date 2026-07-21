import { useEffect, useState } from "react";
import { centreApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { PageLoader, EmptyState, Banner, Modal } from "../../components/ui/Primitives";
import RequestCard from "../../components/RequestCard";
import useDefaultCharges from "../../hooks/useDefaultCharges";

export default function IncomingRequests() {
  const defaults = useDefaultCharges();
  const [requests, setRequests] = useState(null);
  const [quoting, setQuoting] = useState(null);
  const [handling, setHandling] = useState(defaults.handling);
  const [pickup, setPickup] = useState(defaults.pickup);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => centreApi.listRequests("pending").then((res) => setRequests(res.data));

  useEffect(() => {
    load();
  }, []);

  const openQuote = (req) => {
    setQuoting(req);
    setHandling(defaults.handling);
    setPickup(defaults.pickup);
    setError("");
  };

  const submitQuote = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await centreApi.quote(quoting.id, { handling_charge: Number(handling), pickup_charge: Number(pickup) });
      setQuoting(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not submit quotation"));
    } finally {
      setSaving(false);
    }
  };

  if (!requests) return <PageLoader />;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Incoming Requests</h1>
      <p className="mt-1 text-sm text-inkfaint">Pending pickup requests in your service city, awaiting a quotation.</p>

      <div className="mt-6 space-y-4">
        {requests.length === 0 ? (
          <EmptyState title="No pending requests" description="New requests from your city will show up here." />
        ) : (
          requests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              basePath="/centre/requests"
              extra={<button onClick={() => openQuote(r)} className="btn-primary">Quote</button>}
            />
          ))
        )}
      </div>

      <Modal open={!!quoting} onClose={() => setQuoting(null)} title={quoting ? `Quote request #${quoting.id}` : ""}>
        {quoting && (
          <form onSubmit={submitQuote} className="space-y-4">
            {error && <Banner kind="error">{error}</Banner>}
            <div>
              <p className="field-label">Items</p>
              <ul className="mt-2 space-y-1 text-sm text-ink">
                {quoting.items.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span>{i.category_name} × {i.quantity}</span>
                    <span className="font-mono text-inkfaint">{i.estimated_weight_kg} kg</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Handling charge (₹)</label>
                <input type="number" min={0} className="input" value={handling} onChange={(e) => setHandling(e.target.value)} />
              </div>
              <div>
                <label className="label">Pickup charge (₹)</label>
                <input type="number" min={0} className="input" value={pickup} onChange={(e) => setPickup(e.target.value)} />
              </div>
            </div>
            <p className="field-label">
              Material value is computed automatically from item categories &amp; estimated weight on submit.
            </p>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? "Submitting..." : "Submit quotation"}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
