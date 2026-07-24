import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, ROLE_HOME } from "../../context/AuthContext";
import { apiErrorMessage } from "../../api/client";
import { Banner } from "../../components/ui/Primitives";
import PendingApprovalNotice from "../../components/PendingApprovalNotice";
import useServiceCities from "../../hooks/useServiceCities";

const ROLES = [
  { value: "CONSUMER", label: "Consumer", desc: "Schedule pickups for your own e-waste" },
  { value: "PARTNER", label: "Pickup Partner", desc: "Collect items assigned by a centre" },
  { value: "CENTRE", label: "Segregation Centre", desc: "Quote requests and manage inventory" },
];

export default function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const cities = useServiceCities();
  const [role, setRole] = useState("CONSUMER");
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    city: "",
    vehicle_number: "",
    centre_name: "",
    address: "",
    referral_code: searchParams.get("ref") || "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingResult, setPendingResult] = useState(null);

  // Navigate only once the auth context actually has the logged-in user -
  // this stays untouched (no navigation) for accounts pending approval,
  // since AuthContext.register() doesn't persist a session for those.
  useEffect(() => {
    if (user) {
      navigate(ROLE_HOME[user.role], { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = { ...form, role };
      const registeredUser = await register(payload);
      if (!registeredUser.is_active) {
        setPendingResult(registeredUser);
      }
      // If active, the effect above redirects once context updates.
    } catch (err) {
      setError(apiErrorMessage(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  if (pendingResult) {
    return (
      <div className="mx-auto flex max-w-lg flex-col justify-center px-5 py-16">
        <p className="field-label text-copper">Almost there, {pendingResult.full_name.split(" ")[0]}</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Account created</h1>
        <div className="mt-6">
          <PendingApprovalNotice />
        </div>
        <Link to="/login" className="btn-secondary mt-4 w-full text-center">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col justify-center px-5 py-16">
      <p className="field-label text-copper">Join Reloop</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">Create an account</h1>

      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setRole(r.value)}
            className={`rounded border p-3 text-left transition-colors ${
              role === r.value ? "border-circuit bg-circuitlight" : "border-ink/10 bg-white hover:border-ink/25"
            }`}
          >
            <p className="text-sm font-medium text-ink">{r.label}</p>
            <p className="mt-0.5 text-xs text-inkfaint">{r.desc}</p>
          </button>
        ))}
      </div>

      {(role === "PARTNER" || role === "CENTRE") && (
        <div className="mt-4">
          <Banner kind="info">
            {role === "PARTNER" ? "Pickup partner" : "Segregation centre"} accounts are reviewed
            and approved by an admin before you can sign in and start working.
          </Banner>
        </div>
      )}

      <form onSubmit={handleSubmit} className="ticket mt-6 space-y-4 p-6">
        {error && <Banner kind="error">{error}</Banner>}

        <div>
          <label className="label">Full name</label>
          <input required className="input" value={form.full_name} onChange={update("full_name")} placeholder="Jane Doe" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Email</label>
            <input required type="email" className="input" value={form.email} onChange={update("email")} placeholder="you@example.com" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={update("phone")} placeholder="9XXXXXXXXX" />
          </div>
        </div>
        <div>
          <label className="label">Password</label>
          <input required type="password" minLength={6} className="input" value={form.password} onChange={update("password")} placeholder="At least 6 characters" />
        </div>
        <div>
          <label className="label">Referral code (optional)</label>
          <input className="input font-mono uppercase" value={form.referral_code} onChange={update("referral_code")} placeholder="e.g. 7YT6HLK" maxLength={12} />
          <p className="field-label mt-1">Got a code from a friend? You'll both earn bonus points.</p>
        </div>

        {(role === "PARTNER" || role === "CENTRE") && (
          <div>
            <label className="label">Service city</label>
            <select required className="input" value={form.city} onChange={update("city")}>
              <option value="">{cities ? "Select a city" : "Loading cities..."}</option>
              {(cities || []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {role === "PARTNER" && (
          <div>
            <label className="label">Vehicle number (optional)</label>
            <input className="input" value={form.vehicle_number} onChange={update("vehicle_number")} placeholder="BR-01-AB-1234" />
          </div>
        )}

        {role === "CENTRE" && (
          <>
            <div>
              <label className="label">Centre name</label>
              <input required className="input" value={form.centre_name} onChange={update("centre_name")} placeholder="GreenLoop Segregation Centre" />
            </div>
            <div>
              <label className="label">Centre address</label>
              <input className="input" value={form.address} onChange={update("address")} placeholder="Street, area" />
            </div>
          </>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating account..." : "Create account"}
        </button>
        <p className="text-center text-sm text-inkfaint">
          Already have an account?{" "}
          <Link to="/login" className="text-circuit hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
