import { Link } from "react-router-dom";

const STEPS = [
  { n: "01", title: "Schedule a pickup", body: "Log what you're discarding — laptops, phones, appliances — and pick an address and date." },
  { n: "02", title: "Get a fair quote", body: "Your nearest segregation centre values the materials and sends a transparent quotation." },
  { n: "03", title: "Verified handover", body: "A pickup partner collects your items with an OTP handover, so nothing goes missing." },
  { n: "04", title: "Certified recycling", body: "Materials are logged into centre inventory and processed responsibly." },
];

const CATEGORIES = [
  { icon: "📱", label: "Mobile phones" },
  { icon: "💻", label: "Laptops" },
  { icon: "🖥", label: "Desktops" },
  { icon: "📺", label: "TVs" },
  { icon: "🧊", label: "Refrigerators" },
  { icon: "🌀", label: "Washing machines" },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 md:pb-24 md:pt-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <p className="field-label text-copper">Request → Quote → Pickup → Recycle</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-ink md:text-5xl">
              Turn old electronics into a paper trail you can trust.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-inkfaint">
              Reloop connects households with local segregation centres and verified
              pickup partners — every handover logged, weighed, and quoted before a single
              device leaves your door.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary px-6 py-3 text-base">
                Schedule a pickup
              </Link>
              <Link to="/how-it-works" className="btn-secondary px-6 py-3 text-base">
                See how it works
              </Link>
            </div>
          </div>

          {/* Signature ticket/manifest visual */}
          <div className="mx-auto w-full max-w-sm">
            <div className="ticket p-5">
              <div className="flex items-center justify-between">
                <p className="field-label">Manifest #00214</p>
                <span className="stamp border-circuit text-circuit" style={{ borderStyle: "double" }}>
                  Quoted
                </span>
              </div>
              <div className="ticket-divider my-4" />
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-inkfaint">Laptop (Dell, 14")</span>
                  <span className="font-mono text-ink">2.4 kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-inkfaint">Mobile phone ×2</span>
                  <span className="font-mono text-ink">0.6 kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-inkfaint">LED monitor</span>
                  <span className="font-mono text-ink">3.1 kg</span>
                </div>
              </div>
              <div className="ticket-divider my-4" />
              <div className="flex items-center justify-between">
                <span className="field-label">Payout</span>
                <span className="font-mono text-2xl font-semibold text-circuit">₹512.00</span>
              </div>
              <p className="mt-3 field-label">Pickup OTP required at handover</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories strip */}
      <section className="border-y border-ink/10 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-5">
          {CATEGORIES.map((c) => (
            <div key={c.label} className="flex items-center gap-2 text-sm text-inkfaint">
              <span className="text-lg">{c.icon}</span>
              {c.label}
            </div>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="field-label text-copper">The process</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Four stages, fully tracked.</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="border-t-2 border-ink/15 pt-4">
              <span className="font-mono text-sm text-copper">{s.n}</span>
              <h3 className="mt-2 font-medium text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-inkfaint">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Role cards */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="field-label text-copper">Three roles, one ledger</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Built for the whole chain of custody.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="card p-6">
              <h3 className="font-medium text-ink">Consumers</h3>
              <p className="mt-2 text-sm leading-relaxed text-inkfaint">
                Schedule pickups, review quotations, and track every request from request to payout.
              </p>
            </div>
            <div className="card p-6">
              <h3 className="font-medium text-ink">Pickup partners</h3>
              <p className="mt-2 text-sm leading-relaxed text-inkfaint">
                Get assigned nearby jobs, verify handovers with OTP, and log actual item weights on the spot.
              </p>
            </div>
            <div className="card p-6">
              <h3 className="font-medium text-ink">Segregation centres</h3>
              <p className="mt-2 text-sm leading-relaxed text-inkfaint">
                Quote incoming requests, dispatch partners, and manage warehouse inventory in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20 text-center">
        <h2 className="text-2xl font-semibold text-ink md:text-3xl">Ready to clear out old electronics?</h2>
        <p className="mx-auto mt-3 max-w-md text-inkfaint">
          Create a free account and schedule your first pickup in under two minutes.
        </p>
        <Link to="/register" className="btn-primary mt-6 inline-flex px-6 py-3 text-base">
          Get started
        </Link>
      </section>
    </div>
  );
}
