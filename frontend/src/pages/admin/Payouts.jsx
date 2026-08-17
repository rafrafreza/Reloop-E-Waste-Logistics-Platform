import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { PageLoader, Banner } from "../../components/ui/Primitives";
import { formatDate } from "../../utils/date";

export default function Payouts() {
  const [payouts, setPayouts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "ALL";
  const typeFilter = searchParams.get("type") || "ALL";
  const setStatusFilter = (val) => {
    if (val && val !== "ALL") searchParams.set("status", val);
    else searchParams.delete("status");
    setSearchParams(searchParams);
  };
  const setTypeFilter = (val) => {
    if (val && val !== "ALL") searchParams.set("type", val);
    else searchParams.delete("type");
    setSearchParams(searchParams);
  };
  
  const [searchQuery, setSearchQuery] = useState("");
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listPayouts(
        statusFilter === "ALL" ? "" : statusFilter,
        typeFilter === "ALL" ? "" : typeFilter
      );
      setPayouts(res.data);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load payouts"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter, typeFilter]);

  // Auto-dismiss error notification after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const NON_RETRYABLE_CODES = [
    "INVALID_ACCOUNT_FAIL",
    "INVALID_VPA",
    "INVALID_ACCOUNT",
    "BENEFICIARY_OR_VPA_NOT_RESOLVED",
    "ACCOUNT_DOES_NOT_EXIST",
    "INVALID_BENEFICIARY_DETAILS"
  ];

  const handleRetry = async (payout) => {
    setError("");
    if (payout.cashfree_status_code && NON_RETRYABLE_CODES.includes(payout.cashfree_status_code.toUpperCase())) {
      setError(`Cashfree error '${payout.cashfree_status_code}'`);
      return;
    }

    if (!confirm(`Retry payout #${payout.id}?`)) return;
    setActing(true);
    try {
      await adminApi.retryPayout(payout.id);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to retry payout"));
    } finally {
      setActing(false);
    }
  };

  const handleCheckStatus = async (id) => {
    setActing(true);
    try {
      await adminApi.checkPayoutStatus(id);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to check payout status"));
    } finally {
      setActing(false);
    }
  };

  if (!payouts && loading) return <PageLoader />;

  const filteredPayouts = (payouts || []).filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.transfer_id && p.transfer_id.toLowerCase().includes(q)) ||
      (p.user_name && p.user_name.toLowerCase().includes(q)) ||
      (p.upi_id && p.upi_id.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-semibold text-ink">Payouts</h1>
          <p className="mt-1 text-sm text-inkfaint">Manage consumer and partner payouts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input 
            type="text" 
            placeholder="Search transfer ID, name or UPI..." 
            className="input w-full sm:w-auto py-1.5"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select 
            className="input w-auto py-1.5" 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="CONSUMER">Consumer</option>
            <option value="PARTNER">Partner</option>
          </select>
          <select 
            className="input w-auto py-1.5" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="CASH_COLLECTED">Cash Collected</option>
          </select>
        </div>
      </div>

      {error && <div className="mt-4"><Banner kind="error">{error}</Banner></div>}

      <div className="ticket mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink/10 bg-paperdim text-xs font-medium text-inkfaint uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Transfer ID</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {filteredPayouts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-inkfaint">No payouts found matching filters.</td>
                </tr>
              ) : (
                filteredPayouts.map((p) => {
                  let statusColor = "bg-ink/10 text-ink";
                  if (p.status === "SUCCESS") statusColor = "bg-circuitlight text-circuitdark";
                  else if (p.status === "FAILED") statusColor = "bg-bricklight text-brick";
                  else if (p.status === "PROCESSING") statusColor = "bg-amber/20 text-amber";
                  else if (p.status === "CASH_COLLECTED") statusColor = "bg-sky/20 text-sky-700";

                  return (
                    <tr key={p.id} className="hover:bg-paperdim/50">
                      <td className="px-4 py-3 font-mono text-xs text-inkfaint">{p.transfer_id || "-"}</td>
                      <td className="px-4 py-3 font-medium text-ink">{p.user_name}</td>
                      <td className="px-4 py-3 text-inkfaint text-xs">{p.user_role}</td>
                      <td className="px-4 py-3 font-mono text-circuit">₹{p.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-inkfaint">
                        {p.payment_method}
                        {p.payment_method === "ONLINE" && p.upi_id && (
                          <span className="block text-xs font-mono">{p.upi_id}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                          {p.status}
                        </span>
                        {p.cashfree_status_code && (
                          <span className="block text-[10px] mt-1 text-inkfaint font-mono truncate max-w-[120px]">
                            {p.cashfree_status_code}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-inkfaint whitespace-nowrap">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {p.status === "FAILED" && (
                          <button 
                            disabled={acting} 
                            onClick={() => handleRetry(p)} 
                            className="text-xs font-medium text-circuit hover:underline"
                          >
                            Retry
                          </button>
                        )}
                        {p.status === "PROCESSING" && (
                          <button 
                            disabled={acting} 
                            onClick={() => handleCheckStatus(p.id)} 
                            className="text-xs font-medium text-ink hover:underline"
                          >
                            Check
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
