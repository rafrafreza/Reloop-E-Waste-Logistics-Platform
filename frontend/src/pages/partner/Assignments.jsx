import { useEffect, useState } from "react";
import { partnerApi } from "../../api/endpoints";
import { PageLoader, EmptyState } from "../../components/ui/Primitives";
import RequestCard from "../../components/RequestCard";

export default function Assignments() {
  const [requests, setRequests] = useState(null);

  useEffect(() => {
    partnerApi.listRequests("active").then((res) => setRequests(res.data));
  }, []);

  if (!requests) return <PageLoader />;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Assignments</h1>
      <p className="mt-1 text-sm text-inkfaint">Pickups assigned to you that are still in progress.</p>

      <div className="mt-6 space-y-4">
        {requests.length === 0 ? (
          <EmptyState title="No active assignments" description="New pickups assigned to you by a centre will show up here." />
        ) : (
          requests.map((r) => <RequestCard key={r.id} request={r} basePath="/partner/requests" />)
        )}
      </div>
    </div>
  );
}
