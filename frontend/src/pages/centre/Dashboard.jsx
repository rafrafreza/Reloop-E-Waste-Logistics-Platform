import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { centreApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { PageLoader, EmptyState, StatTile } from "../../components/ui/Primitives";
import RequestCard from "../../components/RequestCard";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState(null);

  useEffect(() => {
    centreApi.dashboard().then((res) => setStats(res.data));
    centreApi.listRequests("pending").then((res) => setPending(res.data));
  }, []);

  if (!stats || !pending) return <PageLoader />;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">{user.full_name}</h1>
      <p className="mt-1 text-sm text-inkfaint">Operations overview for your centre.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Pending quotes" value={stats.pending_requests} accent="text-amber" />
        <StatTile label="Active pipeline" value={stats.active_requests} accent="text-copper" />
        <StatTile label="Completed" value={stats.completed_requests} accent="text-circuit" />
        <StatTile label="Total processed" value={stats.total_weight_kg} suffix="kg" accent="text-ink" />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-medium text-ink">Awaiting your quotation</h2>
        <Link to="/centre/incoming" className="text-sm text-circuit hover:underline">View all →</Link>
      </div>

      <div className="mt-4 space-y-4">
        {pending.length === 0 ? (
          <EmptyState title="Queue is clear" description="No pending requests right now." />
        ) : (
          pending.slice(0, 5).map((r) => <RequestCard key={r.id} request={r} basePath="/centre/requests" />)
        )}
      </div>
    </div>
  );
}
