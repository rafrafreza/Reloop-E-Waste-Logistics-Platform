import { useEffect, useState } from "react";
import { commonApi } from "../../api/endpoints";

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    commonApi.publicSettings().then((res) => setSettings(res.data));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  const cities = settings?.service_cities
    ? settings.service_cities.split(",").map((c) => c.trim()).filter(Boolean).join(", ")
    : "—";

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="field-label text-copper">Contact</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink md:text-4xl">Get in touch.</h1>
      <p className="mt-4 max-w-xl text-inkfaint">
        Questions about a pickup, a centre partnership, or the platform itself — send a note below.
      </p>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <div className="space-y-4 text-sm">
          <div>
            <p className="field-label">Email</p>
            <p className="mt-1 text-ink">{settings?.support_email || "—"}</p>
          </div>
          <div>
            <p className="field-label">Phone</p>
            <p className="mt-1 text-ink">{settings?.support_phone || "—"}</p>
          </div>
          <div>
            <p className="field-label">Service cities</p>
            <p className="mt-1 text-ink">{cities}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="ticket space-y-4 p-5">
          {sent ? (
            <p className="text-sm text-circuit">Thanks — your message has been noted. We'll get back to you shortly.</p>
          ) : (
            <>
              <div>
                <label className="label">Name</label>
                <input required className="input" placeholder="Your name" />
              </div>
              <div>
                <label className="label">Email</label>
                <input required type="email" className="input" placeholder="you@example.com" />
              </div>
              <div>
                <label className="label">Message</label>
                <textarea required rows={4} className="input" placeholder="How can we help?" />
              </div>
              <button type="submit" className="btn-primary w-full">Send message</button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
