import { useEffect, useState } from "react";
import { adminApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { PageLoader, Banner, EmptyState } from "../../components/ui/Primitives";

export default function PartnerBalances() {
  const [partners, setPartners] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingOn, setActingOn] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listPartners();
      // Only show partners with a pending balance
      setPartners(res.data.filter(p => p.total_earnings > 0));
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load partner balances"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleProcessPayout = async (userId, amount) => {
    if (!confirm(`Process a payout of ₹${amount.toFixed(2)} to this partner?`)) return;
    
    setActingOn(userId);
    setError("");
    setSuccessMsg("");
    
    try {
      await adminApi.processPartnerPayout(userId);
      setSuccessMsg("Payout processed successfully!");
      await load();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to process payout"));
    } finally {
      setActingOn(null);
    }
  };

  if (!partners && loading) return <PageLoader />;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Partner Balances</h1>
      <p className="mt-1 text-sm text-inkfaint">Process payouts for pickup partners with pending wallet balances.</p>

      {error && <div className="mt-4"><Banner kind="error">{error}</Banner></div>}
      {successMsg && <div className="mt-4"><Banner kind="success">{successMsg}</Banner></div>}

      <div className="mt-6">
        {partners && partners.length === 0 ? (
          <EmptyState title="No pending balances" description="All partners have been paid out." />
        ) : (
          <div className="overflow-x-auto rounded border border-ink/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-paperdim">
                  <th className="px-4 py-3 field-label">Partner</th>
                  <th className="px-4 py-3 field-label">UPI ID</th>
                  <th className="px-4 py-3 field-label text-right">Pending Balance</th>
                  <th className="px-4 py-3 field-label">Action</th>
                </tr>
              </thead>
              <tbody>
                {partners && partners.map((p) => (
                  <tr key={p.id} className="border-b border-ink/5 last:border-0 hover:bg-paperdim/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{p.full_name}</div>
                      <div className="text-xs text-inkfaint">{p.phone}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-inkfaint">
                      {p.upi_id || <span className="text-brick italic text-xs">Not provided</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-circuit font-medium">
                      ₹{p.total_earnings.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={actingOn === p.user_id || !p.upi_id}
                        onClick={() => handleProcessPayout(p.user_id, p.total_earnings)}
                        className="btn-primary py-1 px-3 text-xs w-full sm:w-auto"
                      >
                        {actingOn === p.user_id ? "Processing..." : "Process Payout"}
                      </button>
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
