import { Link, NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { ROLE_HOME } from "../../context/AuthContext";

const LINKS = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/impact", label: "Our Impact" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
];

export default function PublicLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-ink text-circuit">
              <svg width="16" height="16" viewBox="0 0 32 32">
                <path d="M16 6 L24 11 V21 L16 26 L8 21 V11 Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="16" cy="16" r="3" fill="currentColor" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-ink">Reloop</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `text-sm ${isActive ? "text-ink font-medium" : "text-inkfaint hover:text-ink"}`}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <Link to={ROLE_HOME[user.role]} className="btn-primary">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary">
                  Get started
                </Link>
              </>
            )}
          </div>

          <button className="text-ink md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>

        {open && (
          <div className="border-t border-ink/10 bg-white px-5 py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              {LINKS.map((l) => (
                <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className="text-sm text-inkfaint">
                  {l.label}
                </NavLink>
              ))}
              <div className="mt-2 flex gap-2">
                {user ? (
                  <Link to={ROLE_HOME[user.role]} className="btn-primary flex-1">
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link to="/login" className="btn-secondary flex-1">
                      Sign in
                    </Link>
                    <Link to="/register" className="btn-primary flex-1">
                      Get started
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-ink/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-ink text-circuit">
                  <svg width="14" height="14" viewBox="0 0 32 32">
                    <path d="M16 6 L24 11 V21 L16 26 L8 21 V11 Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="16" cy="16" r="3" fill="currentColor" />
                  </svg>
                </div>
                <span className="font-semibold text-ink">Reloop</span>
              </div>
              <p className="mt-3 text-sm text-inkfaint">
                Scheduled e-waste pickup, verified segregation, and transparent payouts.
              </p>
            </div>
            <div>
              <p className="field-label">Platform</p>
              <ul className="mt-3 space-y-2 text-sm text-inkfaint">
                <li><Link to="/how-it-works" className="hover:text-ink">How it works</Link></li>
                <li><Link to="/pricing" className="hover:text-ink">Pricing</Link></li>
                <li><Link to="/faq" className="hover:text-ink">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <p className="field-label">Company</p>
              <ul className="mt-3 space-y-2 text-sm text-inkfaint">
                <li><Link to="/contact" className="hover:text-ink">Contact</Link></li>
                <li><Link to="/privacy" className="hover:text-ink">Privacy policy</Link></li>
                <li><Link to="/terms" className="hover:text-ink">Terms of service</Link></li>
              </ul>
            </div>
            <div>
              <p className="field-label">Get started</p>
              <ul className="mt-3 space-y-2 text-sm text-inkfaint">
                <li><Link to="/register" className="hover:text-ink">Create an account</Link></li>
                <li><Link to="/login" className="hover:text-ink">Sign in</Link></li>
              </ul>
            </div>
          </div>
          <p className="mt-8 border-t border-ink/10 pt-6 font-mono text-xs text-inkfaint">
            © {new Date().getFullYear()} Reloop. College demonstration project — not a live commercial service.
          </p>
        </div>
      </footer>
    </div>
  );
}
