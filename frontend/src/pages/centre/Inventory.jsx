import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { centreApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { PageLoader, EmptyState, Banner, Modal } from "../../components/ui/Primitives";
import { formatDate } from "../../utils/date";

const STATUS_STYLE = {
  IN_STORAGE: "text-slate bg-paperdim border-slate/30",
  DISPATCHED: "text-amber bg-amberlight border-amber/40",
  RECYCLED: "text-circuit bg-circuitlight border-circuit/40",
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "IN_STORAGE", label: "In storage" },
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "RECYCLED", label: "Recycled" },
];

export default function Inventory() {
  const [items, setItems] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get("filter") || "";
  const setFilter = (val) => {
    if (val) searchParams.set("filter", val);
    else searchParams.delete("filter");
    setSearchParams(searchParams);
  };
  const [capacity, setCapacity] = useState(null);
  const [selected, setSelected] = useState([]);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [recyclerName, setRecyclerName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => centreApi.inventory(filter || undefined).then((res) => setItems(res.data));

  useEffect(() => {
    setItems(null);
    setSelected([]);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    centreApi.capacity().then((res) => setCapacity(res.data));
  }, []);

  if (!items || !capacity) return <PageLoader />;

  const totalWeight = items.reduce((sum, i) => sum + i.weight_kg, 0);
  const selectedItems = items.filter((i) => selected.includes(i.id));
  const canDispatch = selectedItems.length > 0 && selectedItems.every((i) => i.status === "IN_STORAGE");
  const canRecycle = selectedItems.length > 0 && selectedItems.every((i) => i.status === "DISPATCHED");

  const toggleSelect = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleSelectAll = () => {
    const selectableIds = items.filter((i) => i.status !== "RECYCLED").map((i) => i.id);
    setSelected((s) => (s.length === selectableIds.length ? [] : selectableIds));
  };

  const openDispatch = () => {
    setRecyclerName("");
    setError("");
    setDispatchOpen(true);
  };

  const submitDispatch = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await centreApi.dispatchInventory(selected, recyclerName);
      setDispatchOpen(false);
      setSelected([]);
      await load();
      centreApi.capacity().then((res) => setCapacity(res.data));
    } catch (err) {
      setError(apiErrorMessage(err, "Could not dispatch items"));
    } finally {
      setSaving(false);
    }
  };

  const handleRecycle = async () => {
    if (!confirm(`Mark ${selected.length} item(s) as recycled?`)) return;
    try {
      await centreApi.recycleInventory(selected);
      setSelected([]);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err, "Could not mark items recycled"));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Warehouse</h1>
          <p className="mt-1 text-sm text-inkfaint">Track items from arrival through dispatch to a licensed recycler.</p>
        </div>
        <div className="text-right">
          <p className="field-label">Total in warehouse</p>
          <p className="font-mono text-xl font-semibold text-ink">{totalWeight.toFixed(1)} kg</p>
        </div>
      </div>

      <div className="mt-4 card p-4">
        <div className="flex justify-between text-sm">
          <span className="text-inkfaint">Storage capacity used</span>
          <span className="font-mono text-ink">{capacity.used_kg} / {capacity.capacity_kg} kg ({capacity.percent_used}%)</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paperdim">
          <div
            className={`h-full rounded-full transition-all ${capacity.percent_used > 85 ? "bg-brick" : capacity.percent_used > 60 ? "bg-amber" : "bg-circuit"}`}
            style={{ width: `${Math.min(100, capacity.percent_used)}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`shrink-0 rounded px-3 py-1.5 font-mono text-xs uppercase tracking-wide ${
                filter === f.value ? "bg-ink text-white" : "bg-white text-inkfaint border border-ink/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {selected.length > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="field-label">{selected.length} selected</span>
            {canDispatch && <button onClick={openDispatch} className="btn-primary text-xs">Mark dispatched</button>}
            {canRecycle && <button onClick={handleRecycle} className="btn-primary text-xs">Mark recycled</button>}
          </div>
        )}
      </div>

      <div className="mt-4">
        {items.length === 0 ? (
          <EmptyState title="Nothing here" description="Items appear once a pickup partner delivers a request to your centre." />
        ) : (
          <div className="overflow-x-auto rounded border border-ink/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-paperdim">
                  <th className="px-4 py-3">
                    <input type="checkbox" onChange={toggleSelectAll} checked={selected.length > 0 && selected.length === items.filter((i) => i.status !== "RECYCLED").length} />
                  </th>
                  <th className="px-4 py-3 field-label">Request</th>
                  <th className="px-4 py-3 field-label">Category</th>
                  <th className="px-4 py-3 field-label text-right">Weight</th>
                  <th className="px-4 py-3 field-label">Status</th>
                  <th className="px-4 py-3 field-label">Recycler</th>
                  <th className="px-4 py-3 field-label">Received</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        disabled={i.status === "RECYCLED"}
                        checked={selected.includes(i.id)}
                        onChange={() => toggleSelect(i.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-inkfaint">#{String(i.request_id).padStart(5, "0")}</td>
                    <td className="px-4 py-3 text-ink">{i.category_name}</td>
                    <td className="px-4 py-3 text-right font-mono text-ink">{i.weight_kg} kg</td>
                    <td className="px-4 py-3">
                      <span className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase ${STATUS_STYLE[i.status]}`}>{i.status.replace("_", " ")}</span>
                    </td>
                    <td className="px-4 py-3 text-inkfaint">{i.dispatched_to || "—"}</td>
                    <td className="px-4 py-3 text-inkfaint">{formatDate(i.received_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={dispatchOpen} onClose={() => setDispatchOpen(false)} title={`Dispatch ${selected.length} item(s)`}>
        <form onSubmit={submitDispatch} className="space-y-3">
          {error && <Banner kind="error">{error}</Banner>}
          <div>
            <label className="label">Licensed recycler / dismantler</label>
            <input required className="input" value={recyclerName} onChange={(e) => setRecyclerName(e.target.value)} placeholder="e.g. GreenCycle Recyclers Pvt Ltd" />
          </div>
          <p className="field-label">This records the chain of custody for these items beyond your warehouse.</p>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Saving..." : "Confirm dispatch"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
