import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { adminApi } from "../../api/endpoints";
import { PageLoader, StatTile } from "../../components/ui/Primitives";
import { useIsMobile } from "../../hooks/useIsMobile";

const CHART_COLORS = {
  material: "#7C8B90",
  handling: "#2E6B4C",
  payouts: "#A6501C",
  commission: "#C1791F",
};

function CurrencyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-ink/10 bg-white p-3 text-xs shadow-stamp">
      <p className="field-label mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: ₹{p.value.toFixed(2)}</p>
      ))}
    </div>
  );
}

export default function Revenue() {
  const isMobile = useIsMobile();
  const [revenue, setRevenue] = useState(null);

  useEffect(() => {
    adminApi.revenue().then((res) => setRevenue(res.data));
  }, []);

  if (!revenue) return <PageLoader />;

  const monthData = revenue.by_period.map((b) => ({
    label: b.label,
    "Material value": b.material_value,
    "Handling revenue": b.handling_revenue + b.pickup_pool,
    "Partner payouts": b.partner_payouts,
    "Platform commission": b.platform_commission,
  }));

  const cityData = revenue.by_city.map((b) => ({
    label: b.label,
    "Material value": b.material_value,
    "Handling revenue": b.handling_revenue + b.pickup_pool,
    "Partner payouts": b.partner_payouts,
    "Platform commission": b.platform_commission,
  }));

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Revenue</h1>
      <p className="mt-1 text-sm text-inkfaint">Financial breakdown across every completed request.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Material value" value={`₹${revenue.total_material_value.toFixed(0)}`} accent="text-slate" />
        <StatTile label="Handling revenue" value={`₹${revenue.total_handling_revenue.toFixed(0)}`} accent="text-circuit" />
        <StatTile label="Partner payouts" value={`₹${revenue.total_partner_payouts.toFixed(0)}`} accent="text-copper" />
        <StatTile label="Platform commission" value={`₹${revenue.total_platform_commission.toFixed(0)}`} accent="text-amber" />
      </div>
      <p className="mt-2 field-label">
        {revenue.completed_count} completed request{revenue.completed_count !== 1 ? "s" : ""} in total. Platform
        commission is an informational estimate (% of material value) and doesn't change consumer payouts.
      </p>

      {monthData.length > 0 && (
        <div className="ticket mt-8 p-3.5 sm:p-6">
          <p className="field-label">Revenue by month</p>
          <div className="mt-4 h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthData} margin={{ top: 10, right: isMobile ? 5 : 30, left: isMobile ? -20 : 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,34,29,0.08)" />
                <XAxis dataKey="label" tick={{ fontSize: isMobile ? 9 : 11, fill: "#4B5B53" }} />
                <YAxis tick={{ fontSize: isMobile ? 9 : 11, fill: "#4B5B53" }} />
                <Tooltip content={<CurrencyTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                <Bar dataKey="Material value" fill={CHART_COLORS.material} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Handling revenue" fill={CHART_COLORS.handling} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Partner payouts" fill={CHART_COLORS.payouts} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Platform commission" fill={CHART_COLORS.commission} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {cityData.length > 0 && (
        <div className="ticket mt-6 p-3.5 sm:p-6">
          <p className="field-label">Revenue by city</p>
          <div className="mt-4 h-60 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityData} layout="vertical" margin={{ top: 10, right: isMobile ? 5 : 30, left: isMobile ? -15 : 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,34,29,0.08)" />
                <XAxis type="number" tick={{ fontSize: isMobile ? 9 : 11, fill: "#4B5B53" }} />
                <YAxis dataKey="label" type="category" tick={{ fontSize: isMobile ? 9 : 11, fill: "#4B5B53" }} width={isMobile ? 65 : 80} />
                <Tooltip content={<CurrencyTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                <Bar dataKey="Material value" fill={CHART_COLORS.material} radius={[0, 2, 2, 0]} />
                <Bar dataKey="Handling revenue" fill={CHART_COLORS.handling} radius={[0, 2, 2, 0]} />
                <Bar dataKey="Partner payouts" fill={CHART_COLORS.payouts} radius={[0, 2, 2, 0]} />
                <Bar dataKey="Platform commission" fill={CHART_COLORS.commission} radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {monthData.length === 0 && (
        <div className="ticket mt-8 p-6 text-center text-sm text-inkfaint">
          No completed requests yet — charts will populate as requests finish processing.
        </div>
      )}
    </div>
  );
}
