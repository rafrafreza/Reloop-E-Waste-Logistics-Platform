import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { centreApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { PageLoader, EmptyState, StatTile } from "../../components/ui/Primitives";
import RequestCard from "../../components/RequestCard";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

const COLORS = [
  "#2E6B4C", // circuit green
  "#A6501C", // copper
  "#C1791F", // amber
  "#44535B", // slate
  "#AE3B32", // brick
  "#6B4C2E", // brown
  "#16221D", // ink
];

const INVENTORY_COLOR_MAP = {
  IN_STORAGE: "#C1791F",
  DISPATCHED: "#44535B",
  RECYCLED: "#2E6B4C",
};

const PARTNER_COLOR_MAP = {
  AVAILABLE: "#2E6B4C",
  BUSY: "#A6501C",
  INACTIVE: "#888888",
};

const formatLabel = (str) =>
  str
    ? str
        .toLowerCase()
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      centreApi.dashboard(),
      centreApi.analytics(),
      centreApi.listRequests("pending"),
    ])
      .then(([resStats, resAnalytics, resPending]) => {
        setStats(resStats.data);
        setAnalytics(resAnalytics.data);
        setPending(resPending.data);
      })
      .catch((err) => console.error("Failed to load centre dashboard data", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats || !analytics || !pending) return <PageLoader />;

  const activeInv = analytics.inventory_status_breakdown.filter((item) => item.count > 0);
  const activePartners = analytics.partner_status_distribution.filter((item) => item.count > 0);

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-ink">{user.full_name || "Segregation Centre"}</h1>
        <p className="mt-1 text-sm text-inkfaint">
          Real-time operations overview, inventory breakdown, and logistics status for your facility.
        </p>
      </div>

      {/* Primary KPI Tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Pending quotes" value={stats.pending_requests} accent="text-amber" />
        <StatTile label="Active pipeline" value={stats.active_requests} accent="text-copper" />
        <StatTile label="Completed requests" value={stats.completed_requests} accent="text-circuit" />
        <StatTile label="Total processed" value={stats.total_weight_kg} suffix="kg" accent="text-ink" />
      </div>

      {/* Secondary Metrics: Partners & Revenue */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatTile
          label="Assigned Service City Partners"
          value={stats.total_partners}
          accent="text-circuit"
        />
        <StatTile
          label="Centre Service Revenue Earned"
          value={`₹${stats.total_revenue.toFixed(0)}`}
          accent="text-ink"
        />
      </div>

      {/* Pending Requests Action Queue */}
      <div className="mt-8">
        <div className="flex items-center justify-between border-b border-paperdim pb-3">
          <div>
            <h2 className="text-lg font-medium text-ink">Awaiting Your Quotation</h2>
            <p className="text-xs text-inkfaint">Incoming collection requests requiring pricing setup</p>
          </div>
          <Link to="/centre/incoming" className="text-sm font-medium text-circuit hover:underline">
            View all incoming →
          </Link>
        </div>

        <div className="mt-4 space-y-4">
          {pending.length === 0 ? (
            <EmptyState title="Queue is clear" description="No pending requests right now." />
          ) : (
            pending
              .slice(0, 5)
              .map((r) => <RequestCard key={r.id} request={r} basePath="/centre/requests" />)
          )}
        </div>
      </div>

      {/* CHARTS SECTION (POSITIONED AT THE BOTTOM) */}
      {/* GRAPH ROW 1: Inventory Disposition & E-Waste Categories */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Graph 1: Inventory Disposition */}
        <div className="flex flex-col rounded-lg border border-paperdim bg-white p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-paperdim pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">1. Facility Inventory Disposition</h2>
              <p className="text-xs text-inkfaint">Holding status of received e-waste items</p>
            </div>
            <span className="rounded bg-circuitlight px-2 py-0.5 text-xs font-medium text-circuitdark">
              Warehouse Health
            </span>
          </div>

          <div className="mt-4 h-64 w-full">
            {activeInv.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-inkfaint">
                No inventory records found
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeInv}
                    dataKey="weight_kg"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    label={({ status, weight_kg }) => `${formatLabel(status)}: ${weight_kg}kg`}
                  >
                    {activeInv.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={INVENTORY_COLOR_MAP[entry.status] || COLORS[0]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} kg`, formatLabel(name)]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-2 border-t border-paperdim pt-3">
            {analytics.inventory_status_breakdown.map((item) => (
              <div
                key={item.status}
                className="inline-flex items-center gap-1.5 rounded-full bg-paperdim px-3 py-1 text-xs font-medium text-ink"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: INVENTORY_COLOR_MAP[item.status] || "#7C8B90",
                  }}
                />
                <span>{formatLabel(item.status)}:</span>
                <span className="font-bold">{item.weight_kg} kg ({item.count} items)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Graph 2: Material Category Volume */}
        <div className="flex flex-col rounded-lg border border-paperdim bg-white p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-paperdim pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">2. E-Waste Volume by Category</h2>
              <p className="text-xs text-inkfaint">Processed and incoming weight (kg) per category</p>
            </div>
            <span className="rounded bg-amberlight px-2 py-0.5 text-xs font-medium text-amber">
              Material Stream
            </span>
          </div>

          <div className="mt-4 h-64 w-full">
            {analytics.category_breakdown.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-inkfaint">
                No category breakdown available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={analytics.category_breakdown}
                  margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E7EAE2" />
                  <XAxis type="number" stroke="#4B5B53" fontSize={11} unit="kg" />
                  <YAxis
                    dataKey="category_name"
                    type="category"
                    stroke="#16221D"
                    fontSize={11}
                    width={120}
                  />
                  <Tooltip formatter={(val) => [`${val} kg`, "Total Weight"]} />
                  <Bar
                    dataKey="weight_kg"
                    name="Weight (kg)"
                    fill="#2E6B4C"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* GRAPH ROW 2: Intake & Revenue Trends + Logistics Partner Availability */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Graph 3: Daily Intake & Revenue Trends */}
        <div className="flex flex-col rounded-lg border border-paperdim bg-white p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-paperdim pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">3. Daily E-Waste Intake & Revenue</h2>
              <p className="text-xs text-inkfaint">Timeline of weight received and service charges</p>
            </div>
            <span className="rounded bg-copperlight px-2 py-0.5 text-xs font-medium text-copper">
              Operational Time-Series
            </span>
          </div>

          <div className="mt-4 h-72 w-full">
            {analytics.processing_trends.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-inkfaint">
                No processing trend data recorded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analytics.processing_trends}
                  margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="colorRevenueCentre" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2E6B4C" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#2E6B4C" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorWeightCentre" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A6501C" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#A6501C" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7EAE2" />
                  <XAxis dataKey="date" stroke="#4B5B53" fontSize={11} />
                  <YAxis yAxisId="left" stroke="#2E6B4C" fontSize={11} unit="₹" />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#A6501C"
                    fontSize={11}
                    unit="kg"
                  />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="Service Revenue (₹)"
                    stroke="#2E6B4C"
                    fillOpacity={1}
                    fill="url(#colorRevenueCentre)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="weight_kg"
                    name="Weight (kg)"
                    stroke="#A6501C"
                    fillOpacity={1}
                    fill="url(#colorWeightCentre)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Graph 4: Pickup Partner Fleet Availability */}
        <div className="flex flex-col rounded-lg border border-paperdim bg-white p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-paperdim pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">4. Logistics Partner Fleet Status</h2>
              <p className="text-xs text-inkfaint">Availability of partners in your service area</p>
            </div>
            <span className="rounded bg-circuitlight px-2 py-0.5 text-xs font-medium text-circuitdark">
              Fleet Overview
            </span>
          </div>

          <div className="mt-4 h-64 w-full">
            {activePartners.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-inkfaint">
                No pickup partners found in this city
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activePartners}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ status, count }) => `${formatLabel(status)}: ${count}`}
                  >
                    {activePartners.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={PARTNER_COLOR_MAP[entry.status] || COLORS[0]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} partners`, formatLabel(name)]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-2 border-t border-paperdim pt-3">
            {analytics.partner_status_distribution.map((item) => (
              <div
                key={item.status}
                className="inline-flex items-center gap-1.5 rounded-full bg-paperdim px-3 py-1 text-xs font-medium text-ink"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: PARTNER_COLOR_MAP[item.status] || "#7C8B90",
                  }}
                />
                <span>{formatLabel(item.status)}:</span>
                <span className="font-bold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
