import { useEffect, useState } from "react";
import { partnerApi } from "../../api/endpoints";
import { PageLoader, EmptyState } from "../../components/ui/Primitives";
import RequestCard from "../../components/RequestCard";
import PaginatedList from "../../components/PaginatedList";

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

      <div className="mt-6">
        <PaginatedList
          items={requests}
          searchFields={['id', 'status', r => r.address?.city, r => r.address?.street, r => r.items?.map(i => i.category_name).join(" ")]}
          renderItem={(r) => <RequestCard key={r.id} request={r} basePath="/partner/requests" />}
          emptyState={<EmptyState title="No history yet" description="Completed pickups will appear here." />}
          itemsPerPage={4}
        />
      </div>
    </div>
  );
}
