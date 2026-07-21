import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { consumerApi, commonApi } from "../../api/endpoints";
import { apiErrorMessage } from "../../api/client";
import { PageLoader, Banner } from "../../components/ui/Primitives";

const STEPS = ["Address", "Items", "Schedule & review"];

function emptyItem(categoryId) {
  return { key: Math.random().toString(36).slice(2), category_id: categoryId, description: "", quantity: 1, estimated_weight_kg: 1 };
}

export default function NewRequest() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState(null);
  const [categories, setCategories] = useState(null);
  const [addressId, setAddressId] = useState(null);
  const [items, setItems] = useState([]);
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([consumerApi.listAddresses(), commonApi.categories()]).then(([addrRes, catRes]) => {
      setAddresses(addrRes.data);
      setCategories(catRes.data);
      const def = addrRes.data.find((a) => a.is_default) || addrRes.data[0];
      if (def) setAddressId(def.id);
      if (catRes.data.length) setItems([emptyItem(catRes.data[0].id)]);
    });
  }, []);

  if (!addresses || !categories) return <PageLoader />;

  const catName = (id) => categories.find((c) => c.id === id)?.name || "";
  const catRate = (id) => categories.find((c) => c.id === id)?.base_price_per_kg || 0;

  const addItem = () => setItems((prev) => [...prev, emptyItem(categories[0].id)]);
  const removeItem = (key) => setItems((prev) => prev.filter((i) => i.key !== key));
  const updateItem = (key, field, value) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)));

  const estimatedTotal = items.reduce((sum, i) => sum + i.estimated_weight_kg * catRate(i.category_id), 0);

  const canProceedStep0 = addressId !== null;
  const canProceedStep1 = items.length > 0 && items.every((i) => i.estimated_weight_kg > 0 && i.quantity > 0);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        address_id: addressId,
        preferred_date: preferredDate ? new Date(preferredDate).toISOString() : null,
        notes: notes || null,
        items: items.map((i) => ({
          category_id: i.category_id,
          description: i.description || null,
          quantity: Number(i.quantity),
          estimated_weight_kg: Number(i.estimated_weight_kg),
        })),
      };
      const res = await consumerApi.createRequest(payload);
      navigate(`/consumer/requests/${res.data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not create request"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-ink">Schedule a pickup</h1>

      <div className="mt-5 flex items-center gap-2">
        {STEPS.map((s, idx) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs ${
              idx <= step ? "bg-circuit text-white" : "bg-paperdim text-inkfaint"
            }`}>
              {idx + 1}
            </div>
            <span className={`hidden text-sm sm:block ${idx === step ? "text-ink font-medium" : "text-inkfaint"}`}>{s}</span>
            {idx < STEPS.length - 1 && <div className="h-px flex-1 bg-ink/10" />}
          </div>
        ))}
      </div>

      <div className="ticket mt-6 p-6">
        {error && <div className="mb-4"><Banner kind="error">{error}</Banner></div>}

        {step === 0 && (
          <div>
            <h2 className="font-medium text-ink">Where should we pick up?</h2>
            {addresses.length === 0 ? (
              <p className="mt-3 text-sm text-inkfaint">
                You don't have any saved addresses yet. <a href="/consumer/addresses" className="text-circuit hover:underline">Add one first</a>.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {addresses.map((a) => (
                  <label key={a.id} className={`flex cursor-pointer items-start gap-3 rounded border p-3 ${addressId === a.id ? "border-circuit bg-circuitlight" : "border-ink/10"}`}>
                    <input type="radio" className="mt-1" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                    <div>
                      <p className="text-sm font-medium text-ink">{a.label}</p>
                      <p className="text-sm text-inkfaint">{a.street}, {a.city}, {a.state} {a.pincode}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="font-medium text-ink">What are you discarding?</h2>
            <div className="mt-4 space-y-4">
              {items.map((item) => (
                <div key={item.key} className="rounded border border-ink/10 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <select className="input" value={item.category_id} onChange={(e) => updateItem(item.key, "category_id", Number(e.target.value))}>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </select>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(item.key)} className="btn-ghost px-2 text-brick" aria-label="Remove item">✕</button>
                    )}
                  </div>
                  <input
                    className="input mt-2"
                    placeholder="Description (optional) — e.g. Dell laptop, cracked screen"
                    value={item.description}
                    onChange={(e) => updateItem(item.key, "description", e.target.value)}
                  />
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Quantity</label>
                      <input type="number" min={1} className="input" value={item.quantity} onChange={(e) => updateItem(item.key, "quantity", e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Est. weight (kg)</label>
                      <input type="number" min={0.1} step={0.1} className="input" value={item.estimated_weight_kg} onChange={(e) => updateItem(item.key, "estimated_weight_kg", e.target.value)} />
                    </div>
                  </div>
                  <p className="mt-2 field-label">{catName(item.category_id)} · ₹{catRate(item.category_id)}/kg</p>
                </div>
              ))}
            </div>
            <button onClick={addItem} className="btn-secondary mt-3 text-sm">+ Add another item</button>
            <div className="ticket-divider my-4" />
            <div className="flex justify-between text-sm">
              <span className="text-inkfaint">Estimated material value</span>
              <span className="font-mono font-medium text-ink">₹{estimatedTotal.toFixed(2)}</span>
            </div>
            <p className="field-label mt-1">Final quotation (after handling &amp; pickup charges) comes from your centre.</p>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-medium text-ink">Schedule &amp; review</h2>
            <div className="mt-4">
              <label className="label">Preferred pickup date (optional)</label>
              <input type="date" className="input" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="mt-3">
              <label className="label">Notes for the partner (optional)</label>
              <textarea rows={3} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, best time to call, etc." />
            </div>

            <div className="ticket-divider my-4" />
            <p className="field-label">Summary</p>
            <ul className="mt-2 space-y-1 text-sm text-ink">
              {items.map((i) => (
                <li key={i.key} className="flex justify-between">
                  <span>{catName(i.category_id)} × {i.quantity}</span>
                  <span className="font-mono text-inkfaint">{i.estimated_weight_kg} kg</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-between">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn-secondary">
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={(step === 0 && !canProceedStep0) || (step === 1 && !canProceedStep1)}
            className="btn-primary"
          >
            Continue
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
            {submitting ? "Submitting..." : "Submit request"}
          </button>
        )}
      </div>
    </div>
  );
}
