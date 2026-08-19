import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { centreApi } from "../../api/endpoints";
import { PageLoader, EmptyState, StatTile } from "../../components/ui/Primitives";
import { formatDate } from "../../utils/date";

export default function CentreFinance() {
  const [requests, setRequests] = useState(null);

  useEffect(() => {
    // We fetch completed requests for this centre
    centreApi.listRequests("history").then((res) => setRequests(res.data));
  }, []);

  if (!requests) return <PageLoader />;

  const completed = requests.filter(r => r.status === "COMPLETED");

  const totalHandlingEarnings = completed.reduce((sum, r) => sum + (r.quotation?.handling_charge || 0), 0);
  const totalPartnerPayouts = completed.reduce((sum, r) => sum + (r.assignment?.pickup_fee || 0), 0);
  const totalConsumerPayouts = completed.reduce((sum, r) => sum + (r.quotation?.final_total_amount !== null ? r.quotation?.final_total_amount : (r.quotation?.total_amount || 0)), 0);
  const totalMaterialValue = completed.reduce((sum, r) => sum + (r.quotation?.final_material_value !== null ? r.quotation?.final_material_value : (r.quotation?.material_value || 0)), 0);

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Centre Finance Ledger</h1>
      <p className="mt-1 text-sm text-inkfaint">Complete breakdown of every rupee across all processed requests.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Centre Handling Earnings" value={`₹${totalHandlingEarnings.toFixed(0)}`} accent="text-circuit" />
        <StatTile label="Partner Payouts" value={`₹${totalPartnerPayouts.toFixed(0)}`} accent="text-copper" />
        <StatTile label="Consumer Payouts" value={`₹${totalConsumerPayouts.toFixed(0)}`} accent="text-ink" />
        <StatTile label="Material Value" value={`₹${totalMaterialValue.toFixed(0)}`} accent="text-slate" />
      </div>

      <div className="mt-8">
        <h2 className="font-medium text-ink">Ledger History</h2>
        <div className="mt-4">
          {completed.length === 0 ? (
            <EmptyState title="No financial history yet" description="Completed requests and their financial breakdown will appear here." />
          ) : (
            <div className="overflow-x-auto rounded border border-ink/10 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/10 bg-paperdim">
                    <th className="px-4 py-3 field-label">Req #</th>
                    <th className="px-4 py-3 field-label">Date Completed</th>
                    <th className="px-4 py-3 field-label">Handling Earned</th>
                    <th className="px-4 py-3 field-label">Consumer Payout</th>
                    <th className="px-4 py-3 field-label">Partner Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {completed.map((r) => {
                    const finalAmount = r.quotation?.final_total_amount !== null ? r.quotation?.final_total_amount : r.quotation?.total_amount;
                    return (
                      <tr key={r.id} className="hover:bg-paperdim/50">
                        <td className="px-4 py-3 font-mono text-ink">
                          <Link to={`/centre/requests/${r.id}`} className="hover:underline">
                            {String(r.id).padStart(5, "0")}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-inkfaint">
                          {r.history.find(h => h.status === "COMPLETED") ? formatDate(r.history.find(h => h.status === "COMPLETED").created_at) : 'Unknown'}
                        </td>
                        <td className="px-4 py-3 font-mono text-circuit font-medium">+ ₹{(r.quotation?.handling_charge || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-ink">
                          <span className="font-mono">₹{finalAmount?.toFixed(2) || "0.00"}</span>
                          <span className="text-xs text-inkfaint ml-2 block">{r.payment_method}</span>
                        </td>
                        <td className="px-4 py-3 text-ink">
                          <span className="font-mono text-copper">₹{(r.assignment?.pickup_fee || 0).toFixed(2)}</span>
                          <span className="text-xs text-inkfaint ml-2 block">{r.assignment?.partner_name}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
