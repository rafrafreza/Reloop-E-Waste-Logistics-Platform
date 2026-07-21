import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { partnerApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { PageLoader, Banner } from "../../components/ui/Primitives";
import StatusBadge from "../../components/ui/StatusBadge";
import Stamp from "../../components/ui/Stamp";
import Timeline from "../../components/Timeline";

export default function PartnerRequestDetail() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [weights, setWeights] = useState({});

  const load = () =>
    partnerApi.getRequest(id).then((res) => {
      setRequest(res.data);
      const initial = {};
      res.data.items.forEach((i) => {
        initial[i.id] = i.estimated_weight_kg;
      });
      setWeights((prev) => (Object.keys(prev).length ? prev : initial));
    });

  useEffect(() => {
    load();
  }, [id]);

  if (!request) return <PageLoader />;

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

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    await act(() =>
      partnerApi.verifyOtp(id, {
        otp: otpInput,
        items: request.items.map((i) => ({ item_id: i.id, actual_weight_kg: Number(weights[i.id]) })),
      })
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/partner/assignments" className="text-sm text-inkfaint hover:text-ink">← Back to assignments</Link>

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
        <p className="field-label">Items to collect</p>
        <div className="mt-2 space-y-2">
          {request.items.map((i) => (
            <div key={i.id} className="flex justify-between text-sm">
              <span className="text-ink">{i.category_name} {i.description && <span className="text-inkfaint">— {i.description}</span>} × {i.quantity}</span>
              <span className="font-mono text-inkfaint">
                {i.actual_weight_kg ? `${i.actual_weight_kg} kg (actual)` : `~${i.estimated_weight_kg} kg`}
              </span>
            </div>
          ))}
        </div>

        <div className="ticket-divider my-4" />

        {request.status === "ASSIGNED" && (
          <button disabled={acting} onClick={() => act(() => partnerApi.startPickup(id))} className="btn-primary w-full">
            Start pickup — heading to address
          </button>
        )}

        {request.status === "OUT_FOR_PICKUP" && (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <p className="field-label text-copper">Ask the consumer for their handover OTP</p>
            <input
              required
              className="input font-mono text-lg tracking-widest"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              placeholder="6-digit OTP"
            />
            <p className="field-label">Confirm actual weight collected per item</p>
            {request.items.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink">{i.category_name}</span>
                <input
                  type="number"
                  step={0.1}
                  min={0.1}
                  required
                  className="input w-28"
                  value={weights[i.id] ?? ""}
                  onChange={(e) => setWeights((w) => ({ ...w, [i.id]: e.target.value }))}
                />
              </div>
            ))}
            <button type="submit" disabled={acting} className="btn-primary w-full">
              Verify OTP &amp; confirm collection
            </button>
          </form>
        )}

        {request.status === "PICKED_UP" && (
          <button disabled={acting} onClick={() => act(() => partnerApi.deliver(id), "Confirm items have been delivered to the centre?")} className="btn-primary w-full">
            Mark delivered to centre
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
