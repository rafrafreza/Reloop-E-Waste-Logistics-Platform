import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { partnerApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { PageLoader, Banner } from "../../components/ui/Primitives";
import StatusBadge from "../../components/ui/StatusBadge";
import Stamp from "../../components/ui/Stamp";
import Timeline from "../../components/Timeline";
import ItemPhotos from "../../components/ItemPhotos";
import { formatDims } from "../../utils/formatDims";
import { formatDate } from "../../utils/date";
import MapViewer from "../../components/MapViewer";

export default function PartnerRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
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

  const handleUpdateWeights = async (e) => {
    e.preventDefault();
    await act(() =>
      partnerApi.updateWeights(id, {
        items: request.items.map((i) => ({ item_id: i.id, actual_weight_kg: Number(weights[i.id]) })),
      })
    );
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    await act(() =>
      partnerApi.verifyOtp(id, {
        otp: otpInput,
      })
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/partner/assignments')} className="text-sm text-inkfaint hover:text-ink">← Back to assignments</button>

      {error && <div className="mt-4"><Banner kind="error">{error}</Banner></div>}

      <div className="ticket relative mt-4 p-6">
        <div className="absolute right-6 top-6">
          <Stamp status={request.status} />
        </div>
        <p className="field-label">Manifest #{String(request.id).padStart(5, "0")}</p>
        <StatusBadge status={request.status} className="mt-2" />

        <div className="mt-4 space-y-1 text-sm">
          <p><span className="font-medium text-ink">Consumer: </span><span className="text-inkfaint">{request.consumer_name} {request.consumer_phone && `· ${request.consumer_phone}`}</span></p>
          <p><span className="font-medium text-ink">Request Type: </span>{request.request_type}</p>
          {request.sla_deadline && (
            <p><span className="font-medium text-ink">SLA Deadline: </span><span className={new Date(request.sla_deadline) < new Date(Date.now() + 4 * 3600 * 1000) ? 'text-copper font-medium' : ''}>{formatDate(request.sla_deadline)}</span></p>
          )}
          {request.address && (
            <div>
              <p><span className="font-medium text-ink">Address: </span><span className="text-inkfaint">{request.address.street}, {request.address.city}, {request.address.state} {request.address.pincode}</span></p>
              {request.address.lat && request.address.lng && (
                <>
                  <MapViewer lat={request.address.lat} lng={request.address.lng} />
                  {["ACCEPTED", "ASSIGNED", "OUT_FOR_PICKUP"].includes(request.status) && (
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${request.address.lat},${request.address.lng}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-secondary w-full mt-3 flex justify-center items-center gap-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                      Open in Google Maps Navigation
                    </a>
                  )}
                </>
              )}
            </div>
          )}
          {request.notes && <p><span className="font-medium text-ink">Notes: </span><span className="text-inkfaint">{request.notes}</span></p>}
        </div>

        <div className="ticket-divider my-4" />
        <p className="field-label">Items to collect</p>
        <div className="mt-2 space-y-3">
          {request.items.map((i) => (
            <div key={i.id} className="flex justify-between text-sm">
              <div>
                <span className="text-ink">{i.category_name} {i.description && <span className="text-inkfaint">— {i.description}</span>} × {i.quantity}</span>
                {formatDims(i) && <p className="field-label mt-0.5 text-copper">{formatDims(i)}</p>}
                <ItemPhotos urls={i.image_urls} />
              </div>
              <span className="shrink-0 font-mono text-inkfaint">
                {i.actual_weight_kg ? `${i.actual_weight_kg} kg (actual)` : `~${i.estimated_weight_kg} kg`}
              </span>
            </div>
          ))}
        </div>

        <div className="ticket-divider my-4" />
        
        {request.assignment && (
          <div className="rounded border border-circuit/30 bg-circuitlight p-4 mb-4">
            <p className="field-label text-circuitdark">Your Earnings</p>
            <p className="mt-1 font-mono text-2xl text-circuit">₹{request.assignment.pickup_fee.toFixed(2)}</p>
          </div>
        )}
        
        {request.status !== "ACCEPTED" && request.status !== "PENDING" && request.status !== "QUOTED" && request.quotation && (
          <div className="rounded border border-ink/10 bg-paperdim p-4 mb-4 space-y-2 text-sm">
            <p className="field-label">Consumer Payout Info</p>
            <div className="flex justify-between">
              <span className="text-inkfaint">Payment Method</span>
              <span className="font-mono text-ink font-medium">{request.payment_method === "CASH" ? "CASH (Pay at door)" : "ONLINE (UPI)"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-inkfaint">{request.quotation.final_total_amount !== null ? "Final Amount" : "Estimated Amount"}</span>
              <span className="font-mono text-ink text-lg text-circuit">
                ₹{request.quotation.final_total_amount !== null ? request.quotation.final_total_amount.toFixed(2) : request.quotation.total_amount.toFixed(2)}
              </span>
            </div>
            {request.payment_method === "CASH" && (
              <p className="text-xs text-copper mt-2 pt-2 border-t border-ink/10 font-medium">
                You must pay this amount in cash to the consumer. It will be added to your wallet balance for reimbursement.
              </p>
            )}
          </div>
        )}

        <div className="ticket-divider my-4" />

        {request.status === "ACCEPTED" && (
          <button disabled={acting} onClick={() => act(() => partnerApi.acceptRequest(id), "Accept this request and begin the assignment?")} className="btn-circuit w-full bg-circuit text-white hover:bg-circuitdark py-3 rounded font-medium shadow-sm">
            Accept Assignment
          </button>
        )}

        {request.status === "ASSIGNED" && (
          <button disabled={acting} onClick={() => act(() => partnerApi.startPickup(id))} className="btn-primary w-full">
            Start pickup — heading to address
          </button>
        )}

        {request.status === "OUT_FOR_PICKUP" && (
          <div className="space-y-6 mt-6">
            <form onSubmit={handleUpdateWeights} className="space-y-4 rounded border border-ink/10 p-5 bg-paperdim">
              <p className="field-label text-copper">1. Record Actual Weights</p>
              <p className="text-sm text-inkfaint mb-4">Enter actual weights to calculate final payout for consumer review.</p>
              <div className="space-y-3">
                {request.items.map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-ink">{i.category_name}</span>
                    <input
                      type="number"
                      step={0.1}
                      min={0.1}
                      required
                      className="input w-28 bg-white"
                      value={weights[i.id] ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*\.?\d*$/.test(val)) {
                          setWeights((w) => ({ ...w, [i.id]: val }));
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
              <button type="submit" disabled={acting} className="btn-secondary w-full bg-white">
                Calculate & Update Final Payout
              </button>
            </form>

            <form onSubmit={handleVerifyOtp} className={`space-y-4 rounded border p-5 ${request.quotation?.final_total_amount !== null ? "border-circuit/30 bg-circuitlight/30" : "border-ink/10 bg-paperdim opacity-50 pointer-events-none"}`}>
              <p className="field-label text-circuitdark">2. Consumer Approval & Handover OTP</p>
              <p className="text-sm text-inkfaint mb-4">Ask the consumer to review the final payout on their app and provide their OTP.</p>
              <input
                required
                className="input font-mono text-lg tracking-widest bg-white"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="6-digit OTP"
                disabled={request.quotation?.final_total_amount === null}
              />
              <button type="submit" disabled={acting || request.quotation?.final_total_amount === null} className="btn-primary w-full shadow-sm">
                Verify OTP & Confirm Collection
              </button>
            </form>
          </div>
        )}

        {request.status === "PICKED_UP" && (
          <div className="space-y-4">
            <div>
              <p className="field-label text-copper">Drop-off at Centre</p>
              <p className="font-medium text-ink mt-1">{request.centre_name}</p>
              {request.centre_address && (
                <p className="text-sm text-inkfaint">{request.centre_address}</p>
              )}
            </div>
            
            {request.centre_address && (
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.centre_name + ' ' + request.centre_address)}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-secondary w-full flex justify-center items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                Navigate to Centre
              </a>
            )}

            <button disabled={acting} onClick={() => act(() => partnerApi.deliver(id), "Confirm items have been delivered to the centre?")} className="btn-primary w-full">
              Mark delivered to centre
            </button>
          </div>
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
