import { useEffect, useState } from "react";
import { centreApi } from "../../api/endpoints";
import { PageLoader, EmptyState } from "../../components/ui/Primitives";
import RequestCard from "../../components/RequestCard";

export default function History() {
  const [requests, setRequests] = useState(null);

  useEffect(() => {
    centreApi.listRequests("history").then((res) => setRequests(res.data));
  }, []);

  if (!requests) return <PageLoader />;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">History</h1>
      <p className="mt-1 text-sm text-inkfaint">Completed, cancelled and rejected requests.</p>

      <div className="mt-6 space-y-4">
        {requests.length === 0 ? (
          <EmptyState title="No history yet" description="Finished requests will show up here." />
        ) : (
          requests.map((r) => <RequestCard key={r.id} request={r} basePath="/centre/requests" />)
        )}
      </div>
    </div>
  );
}
