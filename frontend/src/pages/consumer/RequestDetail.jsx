import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { consumerApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { PageLoader, Banner } from "../../components/ui/Primitives";
import StatusBadge from "../../components/ui/StatusBadge";
import Stamp from "../../components/ui/Stamp";
import Timeline from "../../components/Timeline";
import ItemPhotos from "../../components/ItemPhotos";
import { formatDims } from "../../utils/formatDims";
import { formatDate } from "../../utils/date";

const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED", "REJECTED"];

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-2xl leading-none ${n <= value ? "text-amber" : "text-ink/15"}`}
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ value }) {
  return (
    <span className="text-amber">
      {"★".repeat(value)}
      <span className="text-ink/15">{"★".repeat(5 - value)}</span>
    </span>
  );
}

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [partnerRating, setPartnerRating] = useState(0);
  const [centreRating, setCentreRating] = useState(0);
  const [partnerReview, setPartnerReview] = useState("");
  const [centreReview, setCentreReview] = useState("");

  const [showAcceptForm, setShowAcceptForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("ONLINE");
  const [upiId, setUpiId] = useState("");

  const load = () => consumerApi.getRequest(id).then((res) => setRequest(res.data));

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

  const handleReorder = () => {
    const prefillItems = request.items.map((i) => ({
      category_id: i.category_id,
      description: i.description || "",
      quantity: i.quantity,
      estimated_weight_kg: i.actual_weight_kg || i.estimated_weight_kg,
      length_cm: i.length_cm ?? "",
      breadth_cm: i.breadth_cm ?? "",
      height_cm: i.height_cm ?? "",
    }));
    navigate("/consumer/new-request", { state: { prefillItems } });
  };

  const submitRating = async (e) => {
    e.preventDefault();
    if (!partnerRating && !centreRating) {
      setError("Pick at least one rating before submitting.");
      return;
    }
    await act(() =>
      consumerApi.rateRequest(id, {
        partner_rating: partnerRating || null,
        partner_review: partnerReview || null,
        centre_rating: centreRating || null,
        centre_review: centreReview || null,
      })
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/consumer/requests" className="text-sm text-inkfaint hover:text-ink">← Back to requests</Link>

      {error && <div className="mt-4"><Banner kind="error">{error}</Banner></div>}

      <div className="ticket relative mt-4 p-6">
        <div className="absolute right-6 top-6">
          <Stamp status={request.status} />
        </div>
        <p className="field-label">Manifest #{String(request.id).padStart(5, "0")}</p>
        <div className="mt-2 flex items-center gap-2">
          <StatusBadge status={request.status} />
        </div>

        {request.address && (
          <p className="mt-4 text-sm text-inkfaint">
            <span className="font-medium text-ink">Pickup address: </span>
            {request.address.street}, {request.address.city}, {request.address.state} {request.address.pincode}
          </p>
        )}
        {request.preferred_date && (
          <p className="mt-1 text-sm text-inkfaint"><span className="font-medium text-ink">Preferred pickup date: </span><span className="font-medium text-circuit">{formatDate(request.preferred_date)}</span></p>
        )}
        {request.centre_name && <p className="mt-1 text-sm text-inkfaint"><span className="font-medium text-ink">Centre: </span>{request.centre_name}</p>}
        {request.notes && <p className="mt-1 text-sm text-inkfaint"><span className="font-medium text-ink">Notes: </span>{request.notes}</p>}

        <div className="ticket-divider my-4" />

        <p className="field-label">Items</p>
        <div className="mt-2 space-y-3">
          {request.items.map((i) => (
            <div key={i.id} className="flex justify-between text-sm">
              <div>
                <span className="text-ink">{i.category_name} {i.description && <span className="text-inkfaint">— {i.description}</span>} × {i.quantity}</span>
                {formatDims(i) && <p className="field-label mt-0.5">{formatDims(i)}</p>}
                <ItemPhotos urls={i.image_urls} />
              </div>
              <span className="shrink-0 font-mono text-inkfaint">
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
          <>
            <div className="ticket-divider my-4" />
            <div className="rounded border border-copper/40 bg-copperlight p-3">
              <p className="field-label text-copper">Handover OTP — share only with your pickup partner</p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-widest text-copper">{request.pickup_otp}</p>
            </div>
          </>
        )}

        {request.assignment && (
          <p className="mt-4 text-sm text-inkfaint">
            <span className="font-medium text-ink">Pickup partner: </span>
            {request.assignment.partner_name} {request.assignment.partner_phone && `· ${request.assignment.partner_phone}`}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {request.status === "QUOTED" && !showAcceptForm && (
            <>
              <button disabled={acting} onClick={() => setShowAcceptForm(true)} className="btn-primary">Accept quotation</button>
              <button disabled={acting} onClick={() => act(() => consumerApi.rejectQuote(id), "Reject this quotation?")} className="btn-danger">Reject</button>
            </>
          )}
          {request.status === "QUOTED" && showAcceptForm && (
            <div className="w-full rounded border border-ink/10 bg-paperdim p-4">
              <p className="field-label mb-3">Choose payout method</p>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                  <input type="radio" name="payment_method" value="ONLINE" checked={paymentMethod === "ONLINE"} onChange={() => setPaymentMethod("ONLINE")} className="accent-circuit" />
                  Online (UPI)
                </label>
                <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                  <input type="radio" name="payment_method" value="CASH" checked={paymentMethod === "CASH"} onChange={() => setPaymentMethod("CASH")} className="accent-circuit" />
                  Cash on Pickup
                </label>
              </div>
              
              {paymentMethod === "ONLINE" && (
                <div className="mb-4 max-w-sm">
                  <label className="label">UPI ID</label>
                  <input type="text" className="input" placeholder="e.g. 9876543210@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                </div>
              )}
              
              <div className="flex gap-2">
                <button 
                  disabled={acting || (paymentMethod === "ONLINE" && !upiId)} 
                  onClick={() => act(() => consumerApi.acceptQuote(id, { payment_method: paymentMethod, upi_id: paymentMethod === "ONLINE" ? upiId : null }))} 
                  className="btn-primary"
                >
                  Confirm acceptance
                </button>
                <button disabled={acting} onClick={() => setShowAcceptForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}
          {["PENDING", "QUOTED"].includes(request.status) && !showAcceptForm && (
            <button disabled={acting} onClick={() => act(() => consumerApi.cancelRequest(id), "Cancel this request?")} className="btn-secondary">
              Cancel request
            </button>
          )}
          {request.status === "COMPLETED" && (
            <Link to={`/consumer/requests/${id}/certificate`} className="btn-secondary">
              View certificate
            </Link>
          )}
          {TERMINAL_STATUSES.includes(request.status) && (
            <button onClick={handleReorder} className="btn-secondary">
              Reorder these items
            </button>
          )}
        </div>
      </div>

      {request.status === "COMPLETED" && (
        <div className="ticket mt-6 p-6">
          <p className="field-label">Rate your experience</p>
          {request.rating ? (
            <div className="mt-3 space-y-3 text-sm">
              {request.rating.partner_rating != null && (
                <div>
                  <p className="text-ink">Pickup partner <StarDisplay value={request.rating.partner_rating} /></p>
                  {request.rating.partner_review && <p className="mt-1 text-inkfaint">"{request.rating.partner_review}"</p>}
                </div>
              )}
              {request.rating.centre_rating != null && (
                <div>
                  <p className="text-ink">Segregation centre <StarDisplay value={request.rating.centre_rating} /></p>
                  {request.rating.centre_review && <p className="mt-1 text-inkfaint">"{request.rating.centre_review}"</p>}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={submitRating} className="mt-3 space-y-4">
              {request.assignment && (
                <div>
                  <label className="label">Pickup partner ({request.assignment.partner_name})</label>
                  <StarPicker value={partnerRating} onChange={setPartnerRating} />
                  <input className="input mt-2" placeholder="Optional review" value={partnerReview} onChange={(e) => setPartnerReview(e.target.value)} />
                </div>
              )}
              <div>
                <label className="label">Segregation centre ({request.centre_name})</label>
                <StarPicker value={centreRating} onChange={setCentreRating} />
                <input className="input mt-2" placeholder="Optional review" value={centreReview} onChange={(e) => setCentreReview(e.target.value)} />
              </div>
              <button type="submit" disabled={acting} className="btn-primary">
                Submit rating
              </button>
            </form>
          )}
        </div>
      )}

      <div className="ticket mt-6 p-6">
        <p className="field-label">Timeline</p>
        <div className="mt-4">
          <Timeline history={request.history} />
        </div>
      </div>
    </div>
  );
}
