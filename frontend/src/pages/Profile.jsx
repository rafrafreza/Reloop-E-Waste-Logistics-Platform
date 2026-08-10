import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PageLoader, Banner } from "../components/ui/Primitives";
import useServiceCities from "../hooks/useServiceCities";

const ROLE_LABEL = {
  CONSUMER: "Consumer",
  PARTNER: "Pickup Partner",
  CENTRE: "Segregation Centre",
  ADMIN: "Admin",
};

export default function Profile() {
  const { updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const cities = useServiceCities();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const load = () =>
    authApi.profile().then((res) => {
      setProfile(res.data);
      setForm({
        full_name: res.data.full_name || "",
        phone: res.data.phone || "",
        vehicle_number: res.data.vehicle_number || "",
        centre_name: res.data.centre_name || "",
        address: res.data.address || "",
        city: res.data.city || "",
        upi_id: res.data.upi_id || "",
      });
    });

  useEffect(() => {
    load();
  }, []);

  if (!profile || !form) return <PageLoader />;

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const res = await authApi.updateProfile(form);
      setProfile(res.data);
      updateUser({ full_name: res.data.full_name, phone: res.data.phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not update profile"));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwSaved(false);
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError("New password and confirmation do not match");
      return;
    }
    setPwSaving(true);
    try {
      await authApi.changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2500);
    } catch (err) {
      setPwError(apiErrorMessage(err, "Could not change password"));
    } finally {
      setPwSaving(false);
    }
  };

  const isPartner = profile.role === "PARTNER";
  const isCentre = profile.role === "CENTRE";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-ink">Profile</h1>
      <p className="mt-1 text-sm text-inkfaint">
        {ROLE_LABEL[profile.role]} · {profile.email}
      </p>

      <div className="ticket mt-6 grid grid-cols-2 gap-4 p-6 sm:grid-cols-3">
        <div>
          <p className="field-label">Reward points</p>
          <p className="mt-1 font-mono text-xl font-semibold text-copper">{profile.reward_points}</p>
        </div>
        <div>
          <p className="field-label">Referral code</p>
          <p className="mt-1 font-mono text-lg tracking-wide text-ink">{profile.referral_code}</p>
        </div>
        <div>
          <p className="field-label">Referrals made</p>
          <p className="mt-1 font-mono text-xl font-semibold text-ink">{profile.referral_count}</p>
        </div>
        {(isPartner || isCentre) && profile.rating_count > 0 && (
          <div>
            <p className="field-label">Rating</p>
            <p className="mt-1 text-sm">
              <span className="text-amber">{"★".repeat(Math.round(profile.avg_rating))}</span>
              <span className="text-ink/15">{"★".repeat(5 - Math.round(profile.avg_rating))}</span>
              <span className="ml-1 text-inkfaint">({profile.rating_count})</span>
            </p>
          </div>
        )}
        {isPartner && (
          <div>
            <p className="field-label">Total earnings</p>
            <p className="mt-1 font-mono text-xl font-semibold text-circuit">₹{(profile.total_earnings || 0).toFixed(0)}</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="ticket mt-6 space-y-4 p-6">
        <p className="field-label">Account details</p>
        {error && <Banner kind="error">{error}</Banner>}
        {saved && <Banner kind="success">Profile updated</Banner>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Full name</label>
            <input required className="input" value={form.full_name} onChange={update("full_name")} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={update("phone")} placeholder="9XXXXXXXXX" />
          </div>
        </div>

        <div>
          <label className="label">Email</label>
          <input disabled className="input bg-paperdim text-inkfaint" value={profile.email} />
          <p className="field-label mt-1">Email can't be changed from here.</p>
        </div>

        {isPartner && (
          <>
            <div className="ticket-divider" />
            <p className="field-label">Pickup partner details</p>
            <div>
              <label className="label">Vehicle number</label>
              <input className="input" value={form.vehicle_number} onChange={update("vehicle_number")} placeholder="BR-01-AB-1234" />
            </div>
            <div>
              <label className="label">Service city</label>
              <select className="input" value={form.city} onChange={update("city")}>
                <option value="">{cities ? "Select a city" : "Loading cities..."}</option>
                {(cities || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">UPI ID (for payouts)</label>
              <input className="input" value={form.upi_id} onChange={update("upi_id")} placeholder="example@upi" />
            </div>
          </>
        )}

        {isCentre && (
          <>
            <div className="ticket-divider" />
            <p className="field-label">Segregation centre details</p>
            <div>
              <label className="label">Centre name</label>
              <input className="input" value={form.centre_name} onChange={update("centre_name")} />
            </div>
            <div>
              <label className="label">Centre address</label>
              <input className="input" value={form.address} onChange={update("address")} />
            </div>
            <div>
              <label className="label">Service city</label>
              <select className="input" value={form.city} onChange={update("city")}>
                <option value="">{cities ? "Select a city" : "Loading cities..."}</option>
                {(cities || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="ticket mt-6 space-y-4 p-6">
        <p className="field-label">Change password</p>
        {pwError && <Banner kind="error">{pwError}</Banner>}
        {pwSaved && <Banner kind="success">Password updated</Banner>}

        <div>
          <label className="label">Current password</label>
          <input
            required
            type="password"
            className="input"
            value={pwForm.current_password}
            onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">New password</label>
            <input
              required
              type="password"
              minLength={6}
              className="input"
              value={pwForm.new_password}
              onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              required
              type="password"
              minLength={6}
              className="input"
              value={pwForm.confirm_password}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm_password: e.target.value }))}
            />
          </div>
        </div>
        <button type="submit" disabled={pwSaving} className="btn-secondary w-full">
          {pwSaving ? "Updating..." : "Update password"}
        </button>
      </form>

      {/* Desktop already has "Sign out" in the sidebar; this is the mobile
          equivalent, since the bottom nav bar doesn't always have room for
          a separate account menu. */}
      <div className="mt-6 md:hidden">
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="btn-secondary w-full text-brick"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
