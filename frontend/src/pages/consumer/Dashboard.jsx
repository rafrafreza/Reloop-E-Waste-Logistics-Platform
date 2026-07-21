import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { consumerApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { PageLoader, EmptyState, StatTile } from "../../components/ui/Primitives";
import RequestCard from "../../components/RequestCard";

const ACTIVE = ["PENDING", "QUOTED", "ACCEPTED", "ASSIGNED", "OUT_FOR_PICKUP", "PICKED_UP", "AT_CENTRE"];

export default function Dashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState(null);

  useEffect(() => {
    consumerApi.listRequests().then((res) => setRequests(res.data));
  }, []);

  if (!requests) return <PageLoader />;

  const active = requests.filter((r) => ACTIVE.includes(r.status));
  const completed = requests.filter((r) => r.status === "COMPLETED");
  const totalPayout = completed.reduce((sum, r) => sum + (r.quotation?.total_amount || 0), 0);

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Welcome back, {user.full_name.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-inkfaint">Here's where your requests stand.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Active requests" value={active.length} accent="text-amber" />
        <StatTile label="Completed" value={completed.length} accent="text-circuit" />
        <StatTile label="Total payout" value={`₹${totalPayout.toFixed(0)}`} accent="text-ink" />
        <StatTile label="All-time requests" value={requests.length} accent="text-ink" />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-medium text-ink">Active requests</h2>
        <Link to="/consumer/new-request" className="btn-primary">+ New request</Link>
      </div>

      <div className="mt-4 space-y-4">
        {active.length === 0 ? (
          <EmptyState title="No active requests" description="Schedule a pickup to get started." action={<Link to="/consumer/new-request" className="btn-primary">Schedule a pickup</Link>} />
        ) : (
          active.slice(0, 5).map((r) => <RequestCard key={r.id} request={r} basePath="/consumer/requests" />)
        )}
      </div>

      {active.length > 5 && (
        <Link to="/consumer/requests" className="mt-4 inline-block text-sm text-circuit hover:underline">
          View all requests →
        </Link>
      )}
    </div>
  );
}
