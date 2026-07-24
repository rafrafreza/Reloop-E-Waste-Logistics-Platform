import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/endpoints";
import { PageLoader, StatTile } from "../../components/ui/Primitives";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [openTickets, setOpenTickets] = useState(null);

  useEffect(() => {
    adminApi.dashboard().then((res) => setStats(res.data));
    adminApi.listTickets("OPEN").then((res) => setOpenTickets(res.data.length));
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

      <p className="mt-8 field-label">Quick links</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Link to="/admin/revenue" className="card p-4 hover:border-ink/25">
          <p className="font-medium text-ink">Revenue analytics</p>
          <p className="mt-1 text-sm text-inkfaint">Commission, payouts &amp; trends</p>
        </Link>
        <Link to="/admin/support" className="card p-4 hover:border-ink/25">
          <p className="font-medium text-ink">Support inbox {openTickets > 0 && <span className="ml-1 rounded-full bg-copper px-2 py-0.5 text-xs text-white">{openTickets} open</span>}</p>
          <p className="mt-1 text-sm text-inkfaint">Respond to raised tickets</p>
        </Link>
        <Link to="/admin/audit-log" className="card p-4 hover:border-ink/25">
          <p className="font-medium text-ink">Activity log</p>
          <p className="mt-1 text-sm text-inkfaint">Accountability trail</p>
        </Link>
      </div>
    </div>
  );
}
