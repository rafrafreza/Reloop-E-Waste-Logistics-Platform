import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authApi, centreApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { PageLoader, EmptyState, StatTile } from "../../components/ui/Primitives";
import RequestCard from "../../components/RequestCard";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    centreApi.dashboard().then((res) => setStats(res.data));
    centreApi.listRequests("pending").then((res) => setPending(res.data));
    centreApi.capacity().then((res) => setCapacity(res.data));
    authApi.profile().then((res) => setProfile(res.data));
  }, []);

  if (!stats || !pending || !capacity || !profile) return <PageLoader />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{user.full_name}</h1>
          <p className="mt-1 text-sm text-inkfaint">Operations overview for your centre.</p>
        </div>
        {profile.rating_count > 0 && (
          <div className="text-right">
            <p className="field-label">Your rating</p>
            <p className="text-sm">
              <span className="text-amber">{"★".repeat(Math.round(profile.avg_rating))}</span>
              <span className="text-ink/15">{"★".repeat(5 - Math.round(profile.avg_rating))}</span>
              <span className="ml-1 text-inkfaint">({profile.rating_count})</span>
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Pending quotes" value={stats.pending_requests} accent="text-amber" />
        <StatTile label="Active pipeline" value={stats.active_requests} accent="text-copper" />
        <StatTile label="Completed" value={stats.completed_requests} accent="text-circuit" />
        <StatTile label="Total processed" value={stats.total_weight_kg} suffix="kg" accent="text-ink" />
      </div>

      <div className="mt-4 card p-4">
        <div className="flex justify-between text-sm">
          <span className="text-inkfaint">Warehouse capacity used</span>
          <span className="font-mono text-ink">{capacity.used_kg} / {capacity.capacity_kg} kg ({capacity.percent_used}%)</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paperdim">
          <div
            className={`h-full rounded-full transition-all ${capacity.percent_used > 85 ? "bg-brick" : capacity.percent_used > 60 ? "bg-amber" : "bg-circuit"}`}
            style={{ width: `${Math.min(100, capacity.percent_used)}%` }}
          />
        </div>
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
