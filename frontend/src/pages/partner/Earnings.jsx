import { useEffect, useState } from "react";
import { partnerApi } from "../../api/endpoints";
import { PageLoader, EmptyState, StatTile } from "../../components/ui/Primitives";
import { formatDate } from "../../utils/date";

const PAYOUT_STYLE = {
  PENDING: "text-amber bg-amberlight border-amber/40",
  PAID: "text-circuit bg-circuitlight border-circuit/40",
};

export default function Earnings() {
  const [earnings, setEarnings] = useState(null);
  const [history, setHistory] = useState(null);

  useEffect(() => {
    partnerApi.earnings().then((res) => setEarnings(res.data));
    partnerApi.listRequests("history").then((res) => setHistory(res.data));
  }, []);

  if (!earnings || !history) return <PageLoader />;

  const paidJobs = history.filter((r) => r.assignment);

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Earnings</h1>
      <p className="mt-1 text-sm text-inkfaint">What you've made on Reloop, job by job.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Total earnings" value={`₹${earnings.total_earnings.toFixed(0)}`} accent="text-copper" />
        <StatTile label="Paid out" value={`₹${earnings.paid_earnings.toFixed(0)}`} accent="text-circuit" />
        <StatTile label="Pending" value={`₹${earnings.pending_earnings.toFixed(0)}`} accent="text-amber" />
        <StatTile label="Completed jobs" value={earnings.completed_jobs} accent="text-ink" />
      </div>

      <div className="mt-4 card p-4">
        <p className="field-label">Your rating</p>
        <p className="mt-1 text-sm text-ink">
          {earnings.rating_count > 0 ? (
            <>
              <span className="text-amber">{"★".repeat(Math.round(earnings.avg_rating))}</span>
              <span className="text-ink/15">{"★".repeat(5 - Math.round(earnings.avg_rating))}</span>
              <span className="ml-2 text-inkfaint">{earnings.avg_rating.toFixed(1)} ({earnings.rating_count} rating{earnings.rating_count !== 1 ? "s" : ""})</span>
            </>
          ) : (
            <span className="text-inkfaint">No ratings yet</span>
          )}
        </p>
      </div>

      <h2 className="mt-8 font-medium text-ink">Payout history</h2>
      <div className="mt-4">
        {paidJobs.length === 0 ? (
          <EmptyState title="No payouts yet" description="Completed jobs and their payouts will show up here." />
        ) : (
          <div className="overflow-x-auto rounded border border-ink/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-paperdim">
                  <th className="px-4 py-3 field-label">Request</th>
                  <th className="px-4 py-3 field-label">Date</th>
                  <th className="px-4 py-3 field-label text-right">Payout</th>
                  <th className="px-4 py-3 field-label">Status</th>
                </tr>
              </thead>
              <tbody>
                {paidJobs.map((r) => (
                  <tr key={r.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-inkfaint">#{String(r.id).padStart(5, "0")}</td>
                    <td className="px-4 py-3 text-inkfaint">{formatDate(r.updated_at)}</td>
                    <td className="px-4 py-3 text-right font-mono text-ink">₹{r.assignment.payout_amount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase ${PAYOUT_STYLE[r.assignment.payout_status]}`}>
                        {r.assignment.payout_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
