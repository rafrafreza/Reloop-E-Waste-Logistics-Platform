import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { partnerApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { PageLoader, EmptyState, StatTile } from "../../components/ui/Primitives";
import RequestCard from "../../components/RequestCard";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [active, setActive] = useState(null);

  useEffect(() => {
    partnerApi.dashboard().then((res) => setStats(res.data));
    partnerApi.listRequests("active").then((res) => setActive(res.data));
  }, []);

  if (!stats || !active) return <PageLoader />;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Welcome, {user.full_name.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-inkfaint">Your pickup jobs at a glance.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Active jobs" value={stats.active_requests} accent="text-amber" />
        <StatTile label="Completed" value={stats.completed_requests} accent="text-circuit" />
        <StatTile label="Total collected" value={stats.total_weight_kg} suffix="kg" accent="text-ink" />
        <StatTile label="All-time jobs" value={stats.total_requests} accent="text-ink" />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-medium text-ink">Active assignments</h2>
        <Link to="/partner/assignments" className="text-sm text-circuit hover:underline">View all →</Link>
      </div>

      <div className="mt-4 space-y-4">
        {active.length === 0 ? (
          <EmptyState title="No active assignments" description="You're all caught up. New jobs will appear here once a centre assigns them." />
        ) : (
          active.slice(0, 5).map((r) => <RequestCard key={r.id} request={r} basePath="/partner/requests" />)
        )}
      </div>
    </div>
  );
}
