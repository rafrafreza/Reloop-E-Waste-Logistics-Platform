import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/endpoints";
import { PageLoader, StatTile } from "../../components/ui/Primitives";
import { useIsMobile } from "../../hooks/useIsMobile";
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

const STATUS_COLOR_MAP = {
  PENDING: "#C1791F",
  QUOTED: "#7C8B90",
  ACCEPTED: "#44535B",
  ASSIGNED: "#A6501C",
  OUT_FOR_PICKUP: "#A6501C",
  PICKED_UP: "#2E6B4C",
  AT_CENTRE: "#1F4C36",
  COMPLETED: "#2E6B4C",
  REJECTED: "#AE3B32",
  CANCELLED: "#888888",
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
  const isMobile = useIsMobile();
  const [stats, setStats] = useState(null);
  const [openTickets, setOpenTickets] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.dashboard(),
      adminApi.analytics(),
      adminApi.listTickets("OPEN")
    ])
      .then(([resStats, resAnalytics, resTickets]) => {
        setStats(resStats.data);
        setAnalytics(resAnalytics.data);
        setOpenTickets(resTickets.data.length);
      })
      .catch((err) => console.error("Failed to load dashboard data", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats || !analytics || openTickets === null) return <PageLoader />;

  // Filter out 0 count items for Pie slices to prevent zero-slice label overlapping
  const activeStatusDist = analytics.request_status_distribution.filter(
    (item) => item.count > 0
  );

  const activeUserRoles = analytics.user_role_distribution.filter(
    (item) => item.count > 0
  );

  const formattedInventory = analytics.inventory_status_breakdown.map((item) => ({
    ...item,
    statusLabel: formatLabel(item.status),
  }));

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-ink">Admin Analytics & Overview</h1>
        <p className="mt-1 text-sm text-inkfaint">
          Real-time operational metrics, collection trends, and platform performance.
        </p>
      </div>

      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Total Users" value={stats.total_users} />
        <StatTile label="Consumers" value={stats.total_consumers} accent="text-ink" />
        <StatTile label="Pickup Partners" value={stats.total_partners} accent="text-copper" />
        <StatTile label="Segregation Centres" value={stats.total_centres} accent="text-circuit" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Pending Requests" value={stats.pending_requests} accent="text-amber" />
        <StatTile label="Active Pipeline" value={stats.active_requests} accent="text-copper" />
        <StatTile label="Completed Requests" value={stats.completed_requests} accent="text-circuit" />
        <StatTile label="Total Requests" value={stats.total_requests} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatTile
          label="Total E-Waste Weight Processed"
          value={stats.total_weight_kg}
          suffix="kg"
          accent="text-circuit"
        />
        <StatTile
          label="Total Platform Operating Revenue"
          value={`₹${stats.total_revenue.toFixed(0)}`}
          accent="text-ink"
        />
      </div>

      {/* GRAPH ROW 1: Request Status & Revenue Trends */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Graph 1: Request Status Breakdown */}
        <div className="flex flex-col rounded-lg border border-paperdim bg-white p-3.5 sm:p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-paperdim pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">1. Request Lifecycle & Status</h2>
              <p className="text-xs text-inkfaint">Distribution of collection requests by current stage</p>
            </div>
            <span className="rounded bg-circuitlight px-2 py-0.5 text-xs font-medium text-circuitdark">
              Pipeline Snapshot
            </span>
          </div>

          <div className="mt-4 h-56 sm:h-64 w-full">
            {activeStatusDist.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-inkfaint">
                No active request data recorded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeStatusDist}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 35 : 55}
                    outerRadius={isMobile ? 65 : 80}
                    paddingAngle={4}
                    label={isMobile ? false : ({ status, count }) => `${formatLabel(status)}: ${count}`}
                  >
                    {activeStatusDist.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLOR_MAP[entry.status] || COLORS[0]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} requests`, formatLabel(name)]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Clean status badge legend */}
          <div className="mt-3 flex flex-wrap justify-center gap-1.5 border-t border-paperdim pt-3">
            {analytics.request_status_distribution.map((item) => (
              <div
                key={item.status}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  item.count > 0
                    ? "bg-paperdim text-ink"
                    : "bg-paper/60 text-slatelight opacity-50"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: STATUS_COLOR_MAP[item.status] || "#7C8B90",
                  }}
                />
                <span>{formatLabel(item.status)}:</span>
                <span className="font-bold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Graph 2: Collection & Revenue Trends */}
        <div className="flex flex-col rounded-lg border border-paperdim bg-white p-3.5 sm:p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-paperdim pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">2. Collection & Revenue Trends</h2>
              <p className="text-xs text-inkfaint">Daily e-waste weight (kg) and revenue generated (₹)</p>
            </div>
            <span className="rounded bg-copperlight px-2 py-0.5 text-xs font-medium text-copper">
              Time Series
            </span>
          </div>

          <div className="mt-4 h-64 sm:h-80 w-full">
            {analytics.collection_revenue_trends.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-inkfaint">
                No time series data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analytics.collection_revenue_trends}
                  margin={{ top: 10, right: isMobile ? 10 : 30, left: isMobile ? -20 : 10, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2E6B4C" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#2E6B4C" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A6501C" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#A6501C" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7EAE2" />
                  <XAxis dataKey="date" stroke="#4B5B53" fontSize={isMobile ? 9 : 11} />
                  <YAxis yAxisId="left" stroke="#2E6B4C" fontSize={isMobile ? 9 : 11} unit="₹" />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#A6501C"
                    fontSize={isMobile ? 9 : 11}
                    unit="kg"
                  />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue (₹)"
                    stroke="#2E6B4C"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="weight_kg"
                    name="Weight (kg)"
                    stroke="#A6501C"
                    fillOpacity={1}
                    fill="url(#colorWeight)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* GRAPH ROW 2: Category Breakdown & City Performance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Graph 3: E-Waste Category Breakdown */}
        <div className="flex flex-col rounded-lg border border-paperdim bg-white p-3.5 sm:p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-paperdim pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">3. E-Waste Volume by Category</h2>
              <p className="text-xs text-inkfaint">Total weight (kg) collected per item category</p>
            </div>
            <span className="rounded bg-amberlight px-2 py-0.5 text-xs font-medium text-amber">
              Material Analysis
            </span>
          </div>

          <div className="mt-4 h-64 sm:h-80 w-full">
            {analytics.category_breakdown.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-inkfaint">
                No category items recorded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={analytics.category_breakdown}
                  margin={{ top: 10, right: isMobile ? 15 : 30, left: isMobile ? -10 : 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E7EAE2" />
                  <XAxis type="number" stroke="#4B5B53" fontSize={isMobile ? 9 : 11} unit="kg" />
                  <YAxis
                    dataKey="category_name"
                    type="category"
                    stroke="#16221D"
                    fontSize={isMobile ? 9 : 11}
                    width={isMobile ? 85 : 125}
                  />
                  <Tooltip formatter={(val) => [`${val} kg`, "Weight"]} />
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

        {/* Graph 4: City-Wise Performance */}
        <div className="flex flex-col rounded-lg border border-paperdim bg-white p-3.5 sm:p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-paperdim pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">4. City-Wise Logistics & Coverage</h2>
              <p className="text-xs text-inkfaint">Request volume, centres, and partners per city</p>
            </div>
            <span className="rounded bg-circuitlight px-2 py-0.5 text-xs font-medium text-circuitdark">
              Regional Coverage
            </span>
          </div>

          <div className="mt-4 h-64 sm:h-80 w-full">
            {analytics.city_breakdown.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-inkfaint">
                No city data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.city_breakdown}
                  margin={{ top: 10, right: isMobile ? 10 : 30, left: isMobile ? -20 : 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7EAE2" />
                  <XAxis dataKey="city" stroke="#4B5B53" fontSize={isMobile ? 9 : 11} />
                  <YAxis stroke="#4B5B53" fontSize={isMobile ? 9 : 11} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                  <Bar dataKey="requests" name="Total Requests" fill="#2E6B4C" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="weight_kg" name="Weight (kg)" fill="#A6501C" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="partners" name="Partners" fill="#C1791F" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="centres" name="Centres" fill="#44535B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* GRAPH ROW 3: User Role Distribution & Inventory Disposition */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Graph 5: User Role Distribution */}
        <div className="flex flex-col rounded-lg border border-paperdim bg-white p-3.5 sm:p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-paperdim pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">5. User Role Distribution</h2>
              <p className="text-xs text-inkfaint">Proportion of Consumers, Partners, and Centres</p>
            </div>
            <span className="rounded bg-paperdim px-2 py-0.5 text-xs font-medium text-slate">
              Demographics
            </span>
          </div>

          <div className="mt-4 h-56 sm:h-64 w-full">
            {activeUserRoles.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-inkfaint">
                No user data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeUserRoles}
                    dataKey="count"
                    nameKey="role"
                    cx="50%"
                    cy="50%"
                    outerRadius={isMobile ? 65 : 80}
                    label={isMobile ? false : ({ role, count }) => `${formatLabel(role)}: ${count}`}
                  >
                    {activeUserRoles.map((entry, index) => (
                      <Cell
                        key={`user-cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} accounts`, formatLabel(name)]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-2 border-t border-paperdim pt-3">
            {analytics.user_role_distribution.map((item, index) => (
              <div
                key={item.role}
                className="inline-flex items-center gap-1.5 rounded-full bg-paperdim px-3 py-1 text-xs font-medium text-ink"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span>{formatLabel(item.role)}:</span>
                <span className="font-bold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Graph 6: Inventory Status Disposition */}
        <div className="flex flex-col rounded-lg border border-paperdim bg-white p-3.5 sm:p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-paperdim pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">6. Recycling Inventory Disposition</h2>
              <p className="text-xs text-inkfaint">Weight in storage vs dispatched vs recycled</p>
            </div>
            <span className="rounded bg-circuitlight px-2 py-0.5 text-xs font-medium text-circuitdark">
              Storage Health
            </span>
          </div>

          <div className="mt-4 h-56 sm:h-64 w-full">
            {formattedInventory.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-inkfaint">
                No inventory items recorded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={formattedInventory}
                  margin={{ top: 10, right: isMobile ? 10 : 30, left: isMobile ? -20 : 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7EAE2" />
                  <XAxis dataKey="statusLabel" stroke="#4B5B53" fontSize={isMobile ? 9 : 11} />
                  <YAxis stroke="#4B5B53" fontSize={isMobile ? 9 : 11} unit="kg" />
                  <Tooltip formatter={(val) => [`${val} kg`, "Total Weight"]} />
                  <Bar dataKey="weight_kg" name="Weight (kg)" fill="#2E6B4C" radius={[4, 4, 0, 0]}>
                    {formattedInventory.map((entry, index) => (
                      <Cell
                        key={`inv-cell-${index}`}
                        fill={
                          entry.status === "RECYCLED"
                            ? "#2E6B4C"
                            : entry.status === "IN_STORAGE"
                            ? "#C1791F"
                            : "#44535B"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
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
