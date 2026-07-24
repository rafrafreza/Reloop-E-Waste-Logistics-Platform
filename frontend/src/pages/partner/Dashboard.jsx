import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authApi, partnerApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { PageLoader, EmptyState, StatTile, Banner } from "../../components/ui/Primitives";
import RequestCard from "../../components/RequestCard";

const STATUS_META = {
  AVAILABLE: { label: "Available for jobs", dot: "bg-circuit", text: "text-circuit" },
  OFFLINE: { label: "Offline", dot: "bg-slate", text: "text-slate" },
  BUSY: { label: "On a job", dot: "bg-copper", text: "text-copper" },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [active, setActive] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");

  const loadAvailability = () => authApi.profile().then((res) => setAvailability(res.data.status));

  useEffect(() => {
    partnerApi.dashboard().then((res) => setStats(res.data));
    partnerApi.listRequests("active").then((res) => setActive(res.data));
    partnerApi.earnings().then((res) => setEarnings(res.data));
    loadAvailability();
  }, []);

  const toggleAvailability = async () => {
    setToggling(true);
    setError("");
    try {
      const goingAvailable = availability !== "AVAILABLE";
      await partnerApi.setAvailability(goingAvailable);
      await loadAvailability();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not update availability"));
    } finally {
      setToggling(false);
    }
  };

  if (!stats || !active || !earnings || !availability) return <PageLoader />;

  const meta = STATUS_META[availability] || STATUS_META.OFFLINE;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Welcome, {user.full_name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-inkfaint">Your pickup jobs at a glance.</p>
        </div>

        <button
          onClick={toggleAvailability}
          disabled={toggling || availability === "BUSY"}
          className={`flex items-center gap-2 rounded border px-4 py-2 text-sm font-medium transition-colors ${
            availability === "AVAILABLE" ? "border-circuit/40 bg-circuitlight text-circuitdark" : "border-ink/15 bg-white text-inkfaint"
          } disabled:opacity-60`}
        >
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
          {meta.label}
          {availability !== "BUSY" && <span className="field-label ml-1">(tap to toggle)</span>}
        </button>
      </div>

      {error && <div className="mt-3"><Banner kind="error">{error}</Banner></div>}

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Active jobs" value={stats.active_requests} accent="text-amber" />
        <StatTile label="Completed" value={stats.completed_requests} accent="text-circuit" />
        <StatTile label="Total collected" value={stats.total_weight_kg} suffix="kg" accent="text-ink" />
        <StatTile label="Total earnings" value={`₹${earnings.total_earnings.toFixed(0)}`} accent="text-copper" />
      </div>

      <Link to="/partner/earnings" className="mt-3 inline-block text-sm text-circuit hover:underline">
        View earnings & payout history →
      </Link>

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
