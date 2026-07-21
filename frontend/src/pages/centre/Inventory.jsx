import { useEffect, useState } from "react";
import { centreApi } from "../../api/endpoints";
import { PageLoader, EmptyState } from "../../components/ui/Primitives";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_STYLE = {
  IN_STORAGE: "text-slate bg-paperdim border-slate/30",
  DISPATCHED: "text-amber bg-amberlight border-amber/40",
  RECYCLED: "text-circuit bg-circuitlight border-circuit/40",
};

export default function Inventory() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    centreApi.inventory().then((res) => setItems(res.data));
  }, []);

  if (!items) return <PageLoader />;

  const totalWeight = items.reduce((sum, i) => sum + i.weight_kg, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Warehouse</h1>
          <p className="mt-1 text-sm text-inkfaint">Every item received from a completed pickup.</p>
        </div>
        <div className="text-right">
          <p className="field-label">Total in warehouse</p>
          <p className="font-mono text-xl font-semibold text-ink">{totalWeight.toFixed(1)} kg</p>
        </div>
      </div>

      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState title="Warehouse is empty" description="Items appear here once a pickup partner delivers a request to your centre." />
        ) : (
          <div className="overflow-hidden rounded border border-ink/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-paperdim">
                  <th className="px-4 py-3 field-label">Request</th>
                  <th className="px-4 py-3 field-label">Category</th>
                  <th className="px-4 py-3 field-label text-right">Weight</th>
                  <th className="px-4 py-3 field-label">Status</th>
                  <th className="px-4 py-3 field-label">Received</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-inkfaint">#{String(i.request_id).padStart(5, "0")}</td>
                    <td className="px-4 py-3 text-ink">{i.category_name}</td>
                    <td className="px-4 py-3 text-right font-mono text-ink">{i.weight_kg} kg</td>
                    <td className="px-4 py-3">
                      <span className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase ${STATUS_STYLE[i.status]}`}>{i.status.replace("_", " ")}</span>
                    </td>
                    <td className="px-4 py-3 text-inkfaint">{formatDate(i.received_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
