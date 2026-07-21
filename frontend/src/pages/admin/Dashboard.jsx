import { useEffect, useState } from "react";
import { adminApi } from "../../api/endpoints";
import { PageLoader, StatTile } from "../../components/ui/Primitives";

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminApi.dashboard().then((res) => setStats(res.data));
  }, []);

  if (!stats) return <PageLoader />;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Platform overview</h1>
      <p className="mt-1 text-sm text-inkfaint">Aggregate activity across every role.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Total users" value={stats.total_users} />
        <StatTile label="Consumers" value={stats.total_consumers} accent="text-ink" />
        <StatTile label="Pickup partners" value={stats.total_partners} accent="text-copper" />
        <StatTile label="Centres" value={stats.total_centres} accent="text-circuit" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Pending requests" value={stats.pending_requests} accent="text-amber" />
        <StatTile label="Active pipeline" value={stats.active_requests} accent="text-copper" />
        <StatTile label="Completed" value={stats.completed_requests} accent="text-circuit" />
        <StatTile label="All-time requests" value={stats.total_requests} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-2">
        <StatTile label="Total weight processed" value={stats.total_weight_kg} suffix="kg" accent="text-circuit" />
        <StatTile label="Total operating revenue" value={`₹${stats.total_revenue.toFixed(0)}`} accent="text-ink" />
      </div>
    </div>
  );
}
