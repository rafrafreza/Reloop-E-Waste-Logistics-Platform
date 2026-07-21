import { useEffect, useState } from "react";
import { adminApi } from "../../api/endpoints";
import { PageLoader, Banner } from "../../components/ui/Primitives";

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [savedKey, setSavedKey] = useState("");

  const load = () =>
    adminApi.listSettings().then((res) => {
      setSettings(res.data);
      const d = {};
      res.data.forEach((s) => (d[s.key] = s.value));
      setDrafts(d);
    });

  useEffect(() => {
    load();
  }, []);

  const save = async (key) => {
    await adminApi.updateSetting(key, drafts[key]);
    setSavedKey(key);
    setTimeout(() => setSavedKey(""), 1500);
    await load();
  };

  if (!settings) return <PageLoader />;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Platform Settings</h1>
      <p className="mt-1 text-sm text-inkfaint">Configuration used across the storefront and operations.</p>

      <div className="mt-6 space-y-4">
        {settings.map((s) => (
          <div key={s.key} className="card p-4">
            <p className="field-label">{s.key}</p>
            {s.description && <p className="mt-0.5 text-xs text-inkfaint">{s.description}</p>}
            <div className="mt-2 flex gap-2">
              <input
                className="input"
                value={drafts[s.key] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
              />
              <button onClick={() => save(s.key)} className="btn-secondary shrink-0">
                Save
              </button>
            </div>
            {savedKey === s.key && <div className="mt-2"><Banner kind="success">Saved</Banner></div>}
          </div>
        ))}
      </div>
    </div>
  );
}
