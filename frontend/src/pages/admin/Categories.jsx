import { useEffect, useState } from "react";
import { adminApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { PageLoader, Banner, Modal } from "../../components/ui/Primitives";

const EMPTY_FORM = { name: "", icon: "🔌", base_price_per_kg: 0, is_active: true, co2_factor_kg: 1.5 };

export default function Categories() {
  const [categories, setCategories] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => adminApi.listCategories().then((res) => setCategories(res.data));

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, icon: c.icon, base_price_per_kg: c.base_price_per_kg, is_active: c.is_active, co2_factor_kg: c.co2_factor_kg });
    setError("");
    setModalOpen(true);
  };

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, base_price_per_kg: Number(form.base_price_per_kg), co2_factor_kg: Number(form.co2_factor_kg) };
      if (editing) {
        await adminApi.updateCategory(editing.id, payload);
      } else {
        await adminApi.createCategory(payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save category"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`Remove "${c.name}"?`)) return;
    try {
      await adminApi.deleteCategory(c.id);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  };

  if (!categories) return <PageLoader />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Categories &amp; Pricing</h1>
          <p className="mt-1 text-sm text-inkfaint">Material rates used to compute quotations.</p>
        </div>
        <button onClick={openNew} className="btn-primary">+ Add category</button>
      </div>

      <div className="mt-6 overflow-x-auto rounded border border-ink/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-paperdim">
              <th className="px-4 py-3 field-label">Category</th>
              <th className="px-4 py-3 field-label text-right">Rate (₹/kg)</th>
              <th className="px-4 py-3 field-label text-right">CO2e (kg/kg)</th>
              <th className="px-4 py-3 field-label">Status</th>
              <th className="px-4 py-3 field-label"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-3 text-ink">{c.icon} {c.name}</td>
                <td className="px-4 py-3 text-right font-mono text-ink">₹{c.base_price_per_kg.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-mono text-inkfaint">{c.co2_factor_kg.toFixed(1)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase ${c.is_active ? "text-circuit bg-circuitlight border-circuit/40" : "text-brick bg-bricklight border-brick/40"}`}>
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 space-x-3">
                  <button onClick={() => openEdit(c)} className="text-xs text-circuit hover:underline">Edit</button>
                  <button onClick={() => handleDelete(c)} className="text-xs text-brick hover:underline">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit category" : "Add category"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <Banner kind="error">{error}</Banner>}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="label">Icon</label>
              <input className="input text-center" value={form.icon} onChange={update("icon")} />
            </div>
            <div className="col-span-3">
              <label className="label">Name</label>
              <input required className="input" value={form.name} onChange={update("name")} />
            </div>
          </div>
          <div>
            <label className="label">Rate (₹ per kg)</label>
            <input required type="number" min={0} step={0.5} className="input" value={form.base_price_per_kg} onChange={update("base_price_per_kg")} />
          </div>
          <div>
            <label className="label">Estimated CO2e saved (kg per kg recycled)</label>
            <input required type="number" min={0} step={0.1} className="input" value={form.co2_factor_kg} onChange={update("co2_factor_kg")} />
            <p className="field-label mt-1">Illustrative sustainability estimate shown to consumers - not a scientific measurement.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-inkfaint">
            <input type="checkbox" checked={form.is_active} onChange={update("is_active")} />
            Active (visible to consumers)
          </label>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Saving..." : "Save category"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
