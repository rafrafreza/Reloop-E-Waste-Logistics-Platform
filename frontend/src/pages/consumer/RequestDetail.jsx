import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { consumerApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { PageLoader, Banner } from "../../components/ui/Primitives";
import StatusBadge from "../../components/ui/StatusBadge";
import Stamp from "../../components/ui/Stamp";
import Timeline from "../../components/Timeline";
import ItemPhotos from "../../components/ItemPhotos";
import { formatDims } from "../../utils/formatDims";

export default function RequestDetail() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);

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

        <div className="ticket-divider my-4" />
        <div className="flex flex-wrap gap-2">
          {request.status === "QUOTED" && (
            <>
              <button disabled={acting} onClick={() => act(() => consumerApi.acceptQuote(id))} className="btn-primary">Accept quotation</button>
              <button disabled={acting} onClick={() => act(() => consumerApi.rejectQuote(id), "Reject this quotation?")} className="btn-danger">Reject</button>
            </>
          )}
          {["PENDING", "QUOTED"].includes(request.status) && (
            <button disabled={acting} onClick={() => act(() => consumerApi.cancelRequest(id), "Cancel this request?")} className="btn-secondary">
              Cancel request
            </button>
          )}
        </div>
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
