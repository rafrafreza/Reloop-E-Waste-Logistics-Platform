import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { centreApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { PageLoader, Banner } from "../../components/ui/Primitives";
import StatusBadge from "../../components/ui/StatusBadge";
import Stamp from "../../components/ui/Stamp";
import Timeline from "../../components/Timeline";
import useDefaultCharges from "../../hooks/useDefaultCharges";

export default function CentreRequestDetail() {
  const { id } = useParams();
  const defaults = useDefaultCharges();
  const [request, setRequest] = useState(null);
  const [partners, setPartners] = useState(null);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [handling, setHandling] = useState(defaults.handling);
  const [pickup, setPickup] = useState(defaults.pickup);
  const [selectedPartner, setSelectedPartner] = useState("");

  const load = () => centreApi.getRequest(id).then((res) => setRequest(res.data));

  useEffect(() => {
    load();
    centreApi.listPartners().then((res) => setPartners(res.data));
  }, [id]);

  // Sync the quote form defaults once the admin-configured charges load
  // (initial render still uses a sensible fallback, see useDefaultCharges).
  useEffect(() => {
    setHandling(defaults.handling);
    setPickup(defaults.pickup);
  }, [defaults.handling, defaults.pickup]);

  if (!request || !partners) return <PageLoader />;

  const act = async (fn, confirmMsg) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setActing(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const submitQuote = (e) => {
    e.preventDefault();
    act(() => centreApi.quote(id, { handling_charge: Number(handling), pickup_charge: Number(pickup) }));
  };

  const submitAssign = (e) => {
    e.preventDefault();
    if (!selectedPartner) return;
    act(() => centreApi.assignPartner(id, Number(selectedPartner)));
  };

  const availablePartners = partners.filter((p) => p.status === "AVAILABLE");

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/centre/incoming" className="text-sm text-inkfaint hover:text-ink">← Back</Link>

      {error && <div className="mt-4"><Banner kind="error">{error}</Banner></div>}

      <div className="ticket relative mt-4 p-6">
        <div className="absolute right-6 top-6">
          <Stamp status={request.status} />
        </div>
        <p className="field-label">Manifest #{String(request.id).padStart(5, "0")}</p>
        <StatusBadge status={request.status} className="mt-2" />

        <div className="mt-4 space-y-1 text-sm">
          <p><span className="font-medium text-ink">Consumer: </span><span className="text-inkfaint">{request.consumer_name} {request.consumer_phone && `· ${request.consumer_phone}`}</span></p>
          {request.address && (
            <p><span className="font-medium text-ink">Address: </span><span className="text-inkfaint">{request.address.street}, {request.address.city}, {request.address.state} {request.address.pincode}</span></p>
          )}
          {request.notes && <p><span className="font-medium text-ink">Notes: </span><span className="text-inkfaint">{request.notes}</span></p>}
        </div>

        <div className="ticket-divider my-4" />
        <p className="field-label">Items</p>
        <div className="mt-2 space-y-2">
          {request.items.map((i) => (
            <div key={i.id} className="flex justify-between text-sm">
              <span className="text-ink">{i.category_name} {i.description && <span className="text-inkfaint">— {i.description}</span>} × {i.quantity}</span>
              <span className="font-mono text-inkfaint">
                {i.actual_weight_kg ? `${i.actual_weight_kg} kg (actual)` : `${i.estimated_weight_kg} kg (est.)`}
              </span>
            </div>
          ))}
        </div>

        {request.quotation && (
          <>
            <div className="ticket-divider my-4" />
            <p className="field-label">Quotation</p>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-inkfaint">Material value</span><span className="font-mono text-ink">₹{request.quotation.material_value.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-inkfaint">Handling charge</span><span className="font-mono text-ink">− ₹{request.quotation.handling_charge.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-inkfaint">Pickup charge</span><span className="font-mono text-ink">− ₹{request.quotation.pickup_charge.toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-ink/10 pt-1 font-medium"><span className="text-ink">Total payout</span><span className="font-mono text-lg text-circuit">₹{request.quotation.total_amount.toFixed(2)}</span></div>
            </div>
          </>
        )}

        {request.pickup_otp && ["ASSIGNED", "OUT_FOR_PICKUP"].includes(request.status) && (
          <p className="mt-4 text-sm text-inkfaint"><span className="font-medium text-ink">Handover OTP: </span><span className="font-mono text-copper">{request.pickup_otp}</span></p>
        )}
        {request.assignment && (
          <p className="mt-1 text-sm text-inkfaint"><span className="font-medium text-ink">Partner: </span>{request.assignment.partner_name} {request.assignment.partner_phone && `· ${request.assignment.partner_phone}`}</p>
        )}

        <div className="ticket-divider my-4" />

        {request.status === "PENDING" && (
          <form onSubmit={submitQuote} className="space-y-3">
            <p className="field-label">Generate quotation</p>
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
            <button type="submit" disabled={acting} className="btn-primary w-full">Submit quotation</button>
          </form>
        )}

        {request.status === "ACCEPTED" && (
          <form onSubmit={submitAssign} className="space-y-3">
            <p className="field-label">Assign a pickup partner</p>
            {availablePartners.length === 0 ? (
              <Banner kind="info">No available partners in your city right now.</Banner>
            ) : (
              <div className="space-y-2">
                {availablePartners.map((p) => (
                  <label key={p.id} className={`flex cursor-pointer items-center justify-between rounded border p-3 ${selectedPartner === String(p.user_id) ? "border-circuit bg-circuitlight" : "border-ink/10"}`}>
                    <div>
                      <p className="text-sm font-medium text-ink">{p.full_name}</p>
                      <p className="text-xs text-inkfaint">{p.vehicle_number || "No vehicle on file"}</p>
                    </div>
                    <input type="radio" checked={selectedPartner === String(p.user_id)} onChange={() => setSelectedPartner(String(p.user_id))} />
                  </label>
                ))}
              </div>
            )}
            <button type="submit" disabled={acting || !selectedPartner} className="btn-primary w-full">Assign partner</button>
          </form>
        )}

        {request.status === "AT_CENTRE" && (
          <button disabled={acting} onClick={() => act(() => centreApi.completeRequest(id), "Mark this request as completed?")} className="btn-primary w-full">
            Complete request
          </button>
        )}
      </div>

      <div className="ticket mt-6 p-6">
        <p className="field-label">Timeline</p>
        <div className="mt-4">
          <Timeline history={request.history} />
        </div>
      </div>
    </div>
  );
}
