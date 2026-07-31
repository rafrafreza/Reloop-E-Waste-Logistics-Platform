import { useEffect, useState } from "react";
import { centreApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { PageLoader, EmptyState, Banner } from "../../components/ui/Primitives";
import RequestCard from "../../components/RequestCard";
import PaginatedList from "../../components/PaginatedList";

export default function ActiveRequests() {
  const [requests, setRequests] = useState(null);

  const load = () => centreApi.listRequests("active").then((res) => setRequests(res.data));

  useEffect(() => {
    load();
  }, []);



  const complete = async (req) => {
    if (!confirm(`Mark request #${req.id} as completed?`)) return;
    try {
      await centreApi.completeRequest(req.id);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err, "Could not complete request"));
    }
  };

  if (!requests) return <PageLoader />;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Active Pipeline</h1>
      <p className="mt-1 text-sm text-inkfaint">Requests your centre owns, from acceptance to arrival.</p>

      <div className="mt-6">
        <PaginatedList
          items={requests}
          searchFields={['id', 'status', r => r.address?.city, r => r.address?.street, r => r.items?.map(i => i.category_name).join(" ")]}
          renderItem={(r) => (
            <RequestCard
              key={r.id}
              request={r}
              basePath="/centre/requests"
                r.status === "AT_CENTRE" ? (
                  <button onClick={() => complete(r)} className="btn-primary">Complete</button>
                ) : null
            />
          )}
          emptyState={<EmptyState title="Nothing active right now" description="Requests move here once a consumer accepts your quotation." />}
          itemsPerPage={4}
        />
      </div>


    </div>
  );
}
