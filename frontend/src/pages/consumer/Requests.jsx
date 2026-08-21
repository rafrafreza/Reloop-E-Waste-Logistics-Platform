import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { consumerApi } from "../../api/endpoints";
import { PageLoader, EmptyState, Banner } from "../../components/ui/Primitives";
import RequestCard from "../../components/RequestCard";
import PaginatedList from "../../components/PaginatedList";

const FILTERS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "QUOTED", label: "Quoted" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "OUT_FOR_PICKUP", label: "Out for pickup" },
  { value: "PICKED_UP", label: "Picked up" },
  { value: "AT_CENTRE", label: "At centre" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REJECTED", label: "Rejected" },
];

export default function Requests() {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get("filter") || "";
  const setFilter = (val) => {
    if (val) searchParams.set("filter", val);
    else searchParams.delete("filter");
    setSearchParams(searchParams);
  };

  useEffect(() => {
    setRequests(null);
    setError(null);
    consumerApi.listRequests(filter || undefined)
      .then((res) => setRequests(res.data))
      .catch(() => setError("We couldn't load your requests. Please try again."));
  }, [filter]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">My Requests</h1>
          <p className="mt-1 text-sm text-inkfaint">Every pickup you've scheduled, tracked end to end.</p>
        </div>
        <Link to="/consumer/new-request" className="btn-primary">+ New request</Link>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded px-3 py-1.5 font-mono text-xs uppercase tracking-wide ${
              filter === f.value ? "bg-ink text-white" : "bg-white text-inkfaint border border-ink/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {error ? (
          <Banner>{error}</Banner>
        ) : !requests ? (
          <PageLoader />
        ) : (
          <PaginatedList
            items={requests}
            searchFields={['id', 'status', r => r.address?.city, r => r.address?.street, r => r.items?.map(i => i.category_name).join(" ")]}
            renderItem={(r) => <RequestCard key={r.id} request={r} basePath="/consumer/requests" />}
            emptyState={<EmptyState title="No requests here" description="Try a different filter, or schedule your first pickup." action={<Link to="/consumer/new-request" className="btn-primary">Schedule a pickup</Link>} />}
            itemsPerPage={4}
          />
        )}
      </div>
    </div>
  );
}
