import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth, ROLE_HOME } from "../../context/AuthContext";
import { apiErrorMessage } from "../../api/client";
import { Banner } from "../../components/ui/Primitives";
import PendingApprovalNotice from "../../components/PendingApprovalNotice";

const DEMO_LOGINS = [
  { label: "Consumer", email: "consumer@reloop.com" },
  { label: "Pickup Partner", email: "partner@reloop.com" },
  { label: "Segregation Centre", email: "centre@reloop.com" },
  { label: "Admin", email: "admin@reloop.com" },
];

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname;

  // Navigate only once the auth context actually has the logged-in user -
  // avoids a race where we'd navigate to a protected route a render before
  // the context state (and therefore ProtectedRoute) has caught up.
  useEffect(() => {
    if (user) {
      navigate(from || ROLE_HOME[user.role], { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setPending(false);
    setLoading(true);
    try {
      await login(email, password);
      // Redirect happens in the effect above once `user` updates.
    } catch (err) {
      if (err.response?.data?.detail === "PENDING_APPROVAL") {
        setPending(true);
      } else {
        setError(apiErrorMessage(err, "Login failed"));
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    const pwd = demoEmail.split("@")[0].split(".")[0] + "123";
    setPassword(pwd);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-md flex-col justify-center px-5 py-16">
      <p className="field-label text-copper">Welcome back</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">Sign in to Reloop</h1>

      {pending ? (
        <div className="mt-8">
          <PendingApprovalNotice />
          <button onClick={() => setPending(false)} className="btn-secondary mt-4 w-full">
            Back to sign in
          </button>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="ticket mt-8 space-y-4 p-6">
            {error && <Banner kind="error">{error}</Banner>}
            <div>
              <label className="label">Email</label>
              <input required type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <input required type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Signing in..." : "Sign in"}
            </button>
            <p className="text-center text-sm text-inkfaint">
              Don't have an account?{" "}
              <Link to="/register" className="text-circuit hover:underline">
                Register
              </Link>
            </p>
          </form>

          <div className="mt-6">
            <p className="field-label">Try a demo account (password auto-filled)</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {DEMO_LOGINS.map((d) => (
                <button key={d.email} onClick={() => fillDemo(d.email)} className="btn-secondary text-xs">
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
