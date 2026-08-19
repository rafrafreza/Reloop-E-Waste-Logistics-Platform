import { useEffect, useState } from "react";
import { adminApi } from "../../api/endpoints";
import { PageLoader, Banner } from "../../components/ui/Primitives";
import { apiErrorMessage } from "../../api/client";

const EXPECTED_SETTINGS = [
  { key: "platform_name", description: "Displayed name of the platform" },
  { key: "support_email", description: "Public support email" },
  { key: "support_phone", description: "Public support phone number" },
  { key: "service_cities", description: "Comma-separated list of serviceable cities" },
  { key: "default_pickup_charge", description: "Default pickup charge (Rs.) suggested to centres" },
  { key: "default_handling_charge", description: "Default handling charge (Rs.) suggested to centres" },
  { key: "platform_fee_percent", description: "Platform commission (%) of material value, for revenue reporting" },
  { key: "partner_pickup_fee", description: "Flat fee (Rs.) paid to a pickup partner per completed job" },
];

export default function Settings() {
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [savedKey, setSavedKey] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    adminApi.listSettings().then((res) => {
      const d = {};
      // Initialize with empty strings for all expected settings
      EXPECTED_SETTINGS.forEach((s) => {
        d[s.key] = "";
      });
      // Override with actual values from DB
      res.data.forEach((s) => {
        d[s.key] = s.value;
      });
      setDrafts(d);
      setSettingsLoaded(true);
    });

  useEffect(() => {
    load();
  }, []);

  const save = async (key) => {
    setError("");
    try {
      await adminApi.updateSetting(key, drafts[key]);
      setSavedKey(key);
      setTimeout(() => setSavedKey(""), 1500);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, `Failed to save ${key}`));
    }
  };

  if (!settingsLoaded) return <PageLoader />;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Platform Settings</h1>
      <p className="mt-1 text-sm text-inkfaint">Configuration used across the storefront and operations.</p>
      
      {error && <div className="mt-4"><Banner kind="error">{error}</Banner></div>}

      <div className="mt-6 space-y-4">
        {EXPECTED_SETTINGS.map((s) => (
          <div key={s.key} className="card p-4">
            <p className="field-label">{s.key}</p>
            {s.description && <p className="mt-0.5 text-xs text-inkfaint">{s.description}</p>}
            <div className="mt-2 flex gap-2">
              <input
                className="input"
                value={drafts[s.key] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
                placeholder="Not set"
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
