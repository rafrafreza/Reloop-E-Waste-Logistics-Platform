import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { consumerApi, commonApi, uploadApi } from "../../api/endpoints";
import { apiErrorMessage, API_BASE } from "../../api/client";
import { PageLoader, Banner, Spinner } from "../../components/ui/Primitives";

const STEPS = ["Address", "Items", "Schedule & review"];

function emptyItem(categoryId) {
  return {
    key: Math.random().toString(36).slice(2),
    category_id: categoryId,
    description: "",
    quantity: 1,
    estimated_weight_kg: 1,
    length_cm: "",
    breadth_cm: "",
    height_cm: "",
    images: [],
  };
}

export default function NewRequest() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState(null);
  const [categories, setCategories] = useState(null);
  const [addressId, setAddressId] = useState(null);
  const [items, setItems] = useState([]);
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null);

  const prefillItems = location.state?.prefillItems;

  useEffect(() => {
    Promise.all([consumerApi.listAddresses(), commonApi.categories()]).then(([addrRes, catRes]) => {
      setAddresses(addrRes.data);
      setCategories(catRes.data);
      const def = addrRes.data.find((a) => a.is_default) || addrRes.data[0];
      if (def) setAddressId(def.id);

      if (prefillItems && prefillItems.length) {
        setItems(
          prefillItems.map((i) => ({
            key: Math.random().toString(36).slice(2),
            images: [],
            ...i,
          }))
        );
      } else if (catRes.data.length) {
        setItems([emptyItem(catRes.data[0].id)]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!addresses || !categories) return <PageLoader />;

  const catName = (id) => categories.find((c) => c.id === id)?.name || "";
  const catRate = (id) => categories.find((c) => c.id === id)?.base_price_per_kg || 0;

  const addItem = () => setItems((prev) => [...prev, emptyItem(categories[0].id)]);
  const removeItem = (key) => setItems((prev) => prev.filter((i) => i.key !== key));
  const updateItem = (key, field, value) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)));

  const handlePhotoSelect = async (key, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploadingKey(key);
    setError("");
    try {
      const uploaded = [];
      for (const file of files) {
        const res = await uploadApi.image(file);
        uploaded.push(res.data.url);
      }
      setItems((prev) => prev.map((i) => (i.key === key ? { ...i, images: [...i.images, ...uploaded] } : i)));
    } catch (err) {
      setError(apiErrorMessage(err, "Could not upload photo"));
    } finally {
      setUploadingKey(null);
    }
  };

  const removePhoto = (key, url) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, images: i.images.filter((u) => u !== url) } : i)));

  const estimatedTotal = items.reduce((sum, i) => sum + i.estimated_weight_kg * i.quantity * catRate(i.category_id), 0);

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
          length_cm: i.length_cm !== "" ? Number(i.length_cm) : null,
          breadth_cm: i.breadth_cm !== "" ? Number(i.breadth_cm) : null,
          height_cm: i.height_cm !== "" ? Number(i.height_cm) : null,
          image_urls: i.images,
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
      {prefillItems && prefillItems.length > 0 && (
        <p className="mt-1 text-sm text-circuit">Reordering items from a past request — feel free to adjust anything.</p>
      )}

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

      <div className="ticket mt-6 p-4 sm:p-6">
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
                      <input 
                        type="number" 
                        min={1} 
                        step={1} 
                        className="input" 
                        value={item.quantity} 
                        onChange={(e) => {
                          const val = e.target.value;
                          // only allow digits, no decimals or negatives
                          if (/^\d*$/.test(val)) {
                            updateItem(item.key, "quantity", val);
                          }
                        }} 
                      />
                    </div>
                    <div>
                      <label className="label">Est. weight (kg)</label>
                      <input 
                        type="number" 
                        min={0.1} 
                        step={0.1} 
                        className="input" 
                        value={item.estimated_weight_kg} 
                        onChange={(e) => {
                          const val = e.target.value;
                          // allow digits and decimal point, no negatives
                          if (/^\d*\.?\d*$/.test(val)) {
                            updateItem(item.key, "estimated_weight_kg", val);
                          }
                        }} 
                      />
                    </div>
                  </div>

                  <p className="label mt-3 mb-1.5">Dimensions (cm, optional) — helps us pick the right vehicle</p>
                  <div className="grid grid-cols-3 gap-2">
                    <input 
                      type="number" 
                      min={0.1} 
                      step={0.5} 
                      className="input" 
                      placeholder="Length" 
                      value={item.length_cm} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*\.?\d*$/.test(val)) updateItem(item.key, "length_cm", val);
                      }} 
                    />
                    <input 
                      type="number" 
                      min={0.1} 
                      step={0.5} 
                      className="input" 
                      placeholder="Breadth" 
                      value={item.breadth_cm} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*\.?\d*$/.test(val)) updateItem(item.key, "breadth_cm", val);
                      }} 
                    />
                    <input 
                      type="number" 
                      min={0.1} 
                      step={0.5} 
                      className="input" 
                      placeholder="Height" 
                      value={item.height_cm} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*\.?\d*$/.test(val)) updateItem(item.key, "height_cm", val);
                      }} 
                    />
                  </div>

                  <p className="label mt-3 mb-1.5">Photos (optional)</p>
                  <div className="flex flex-wrap gap-2">
                    {item.images.map((url) => (
                      <div key={url} className="group relative h-16 w-16 shrink-0 overflow-hidden rounded border border-ink/10">
                        <img src={`${API_BASE}${url}`} alt="Item" className="h-full w-full object-cover" />
                        <button
                          onClick={() => removePhoto(item.key, url)}
                          className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center bg-ink/60 text-xs text-white"
                          aria-label="Remove photo"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded border border-dashed border-ink/25 text-inkfaint hover:border-ink/45">
                      {uploadingKey === item.key ? (
                        <Spinner />
                      ) : (
                        <span className="text-xl leading-none">+</span>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={uploadingKey === item.key}
                        onChange={(e) => {
                          handlePhotoSelect(item.key, e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>

                  <p className="mt-3 field-label">{catName(item.category_id)} · ₹{catRate(item.category_id)}/kg</p>
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
            <ul className="mt-2 space-y-2 text-sm text-ink">
              {items.map((i) => (
                <li key={i.key} className="flex items-start justify-between gap-3">
                  <span>
                    {catName(i.category_id)} × {i.quantity}
                    {(i.length_cm || i.breadth_cm || i.height_cm) && (
                      <span className="block field-label">
                        {i.length_cm || "?"} × {i.breadth_cm || "?"} × {i.height_cm || "?"} cm
                      </span>
                    )}
                    {i.images.length > 0 && (
                      <span className="block field-label">{i.images.length} photo{i.images.length !== 1 ? "s" : ""} attached</span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-inkfaint">{i.estimated_weight_kg} kg</span>
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
