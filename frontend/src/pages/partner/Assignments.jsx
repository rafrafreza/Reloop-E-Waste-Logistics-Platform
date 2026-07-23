import { useEffect, useState } from "react";
import { partnerApi } from "../../api/endpoints";
import { PageLoader, EmptyState } from "../../components/ui/Primitives";
import RequestCard from "../../components/RequestCard";
import PaginatedList from "../../components/PaginatedList";

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

      <div className="mt-6">
        <PaginatedList
          items={requests}
          searchFields={['id', 'status', r => r.address?.city, r => r.address?.street, r => r.items?.map(i => i.category_name).join(" ")]}
          renderItem={(r) => <RequestCard key={r.id} request={r} basePath="/partner/requests" />}
          emptyState={<EmptyState title="No active assignments" description="New pickups assigned to you by a centre will show up here." />}
          itemsPerPage={4}
        />
      </div>
    </div>
  );
}
