import { useEffect, useState } from "react";
import { consumerApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { PageLoader, EmptyState, Banner, Modal } from "../../components/ui/Primitives";
import useServiceCities from "../../hooks/useServiceCities";
import MapPicker from "../../components/MapPicker";

const EMPTY_FORM = { label: "Home", street: "", city: "", state: "", pincode: "", is_default: false, lat: null, lng: null };

export default function Addresses() {
  const cities = useServiceCities();
  const [addresses, setAddresses] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => consumerApi.listAddresses().then((res) => setAddresses(res.data));

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (addr) => {
    setEditing(addr);
    setForm({ label: addr.label, street: addr.street, city: addr.city, state: addr.state, pincode: addr.pincode, is_default: addr.is_default, lat: addr.lat, lng: addr.lng });
    setError("");
    setModalOpen(true);
  };

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await consumerApi.updateAddress(editing.id, form);
      } else {
        await consumerApi.createAddress(form);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save address"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this address?")) return;
    try {
      await consumerApi.deleteAddress(id);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err, "Could not delete address"));
    }
  };

  if (!addresses) return <PageLoader />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Addresses</h1>
          <p className="mt-1 text-sm text-inkfaint">Saved pickup locations for your requests.</p>
        </div>
        <button onClick={openNew} className="btn-primary">+ Add address</button>
      </div>

      <div className="mt-6">
        {addresses.length === 0 ? (
          <EmptyState title="No addresses yet" description="Add a pickup address to get started with your first request." action={<button onClick={openNew} className="btn-primary">Add address</button>} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {addresses.map((a) => (
              <div key={a.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-ink">{a.label} {a.is_default && <span className="ml-1 field-label text-circuit">Default</span>}</p>
                    <p className="mt-1 text-sm text-inkfaint">{a.street}</p>
                    <p className="text-sm text-inkfaint">{a.city}, {a.state} {a.pincode}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => openEdit(a)} className="btn-secondary text-xs">Edit</button>
                  <button onClick={() => handleDelete(a.id)} className="btn-ghost text-xs text-brick">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit address" : "Add address"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <Banner kind="error">{error}</Banner>}
          <div>
            <label className="label">Label</label>
            <input required className="input" value={form.label} onChange={update("label")} placeholder="Home, Office..." />
          </div>
          <div>
            <label className="label">Street</label>
            <input required className="input" value={form.street} onChange={update("street")} placeholder="House no., street" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">City</label>
              <select required className="input" value={form.city} onChange={update("city")}>
                <option value="">{cities ? "Select a city" : "Loading cities..."}</option>
                {cities && form.city && !cities.includes(form.city) && (
                  <option value={form.city}>{form.city} (no longer serviceable)</option>
                )}
                {(cities || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">State</label>
              <input required className="input" value={form.state} onChange={update("state")} placeholder="Bihar" />
            </div>
          </div>
          <div>
            <label className="label">Pincode</label>
            <input required className="input" value={form.pincode} onChange={update("pincode")} placeholder="800001" />
          </div>
          <label className="flex items-center gap-2 text-sm text-inkfaint">
            <input type="checkbox" checked={form.is_default} onChange={update("is_default")} />
            Set as default address
          </label>
          <div className="pt-2">
            <label className="label">Pin Location</label>
            <MapPicker lat={form.lat} lng={form.lng} onChange={(lat, lng) => setForm(f => ({ ...f, lat, lng }))} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full mt-4">
            {saving ? "Saving..." : "Save address"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
