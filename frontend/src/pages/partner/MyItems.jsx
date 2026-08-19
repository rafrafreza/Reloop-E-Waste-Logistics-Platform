import { useEffect, useState } from "react";
import { partnerApi } from "../../api/endpoints";
import { PageLoader, EmptyState, Banner } from "../../components/ui/Primitives";
import RequestCard from "../../components/RequestCard";
import { apiErrorMessage } from "../../api/client";

export default function MyItems() {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("WITH_ME");

  useEffect(() => {
    partnerApi.listRequests("all")
      .then(res => setRequests(res.data))
      .catch(err => setError(apiErrorMessage(err, "Failed to load items")));
  }, []);

  if (!requests) return <PageLoader />;

  const withMe = requests.filter(r => r.status === "PICKED_UP");
  const assigned = requests.filter(r => r.status === "ASSIGNED" || r.status === "OUT_FOR_PICKUP");
  const delivered = requests.filter(r => r.status === "AT_CENTRE" || r.status === "COMPLETED");

  const TABS = [
    { key: "WITH_ME", label: `Currently with me (${withMe.length})`, data: withMe },
    { key: "ASSIGNED", label: `To be picked up (${assigned.length})`, data: assigned },
    { key: "DELIVERED", label: `Delivered/Completed (${delivered.length})`, data: delivered },
  ];

  const activeData = TABS.find(t => t.key === tab)?.data || [];

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-semibold text-ink mb-2">My Items</h1>
      <p className="text-inkfaint mb-6">Track all pickup requests associated with your account across their entire lifecycle.</p>
      
      {error && <Banner kind="error" className="mb-4">{error}</Banner>}

      <div className="flex border-b border-ink/10 mb-6 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-circuit text-circuit" : "border-transparent text-inkfaint hover:text-ink hover:border-ink/20"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {activeData.length === 0 ? (
          <EmptyState title="No items found" description={`No requests in this category.`} />
        ) : (
          activeData.map(r => (
            <RequestCard key={r.id} request={r} basePath="/partner/requests" />
          ))
        )}
      </div>
    </div>
  );
}
