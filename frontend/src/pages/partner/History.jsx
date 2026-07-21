import { useEffect, useState } from "react";
import { partnerApi } from "../../api/endpoints";
import { PageLoader, EmptyState } from "../../components/ui/Primitives";
import RequestCard from "../../components/RequestCard";

export default function History() {
  const [requests, setRequests] = useState(null);

  useEffect(() => {
    partnerApi.listRequests("history").then((res) => setRequests(res.data));
  }, []);

  if (!requests) return <PageLoader />;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Pickup history</h1>
      <p className="mt-1 text-sm text-inkfaint">Jobs you've delivered to the centre.</p>

      <div className="mt-6 space-y-4">
        {requests.length === 0 ? (
          <EmptyState title="No history yet" description="Completed pickups will appear here." />
        ) : (
          requests.map((r) => <RequestCard key={r.id} request={r} basePath="/partner/requests" />)
        )}
      </div>
    </div>
  );
}
