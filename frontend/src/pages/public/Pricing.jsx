import { useEffect, useState } from "react";
import { commonApi } from "../../api/endpoints";
import { PageLoader } from "../../components/ui/Primitives";

export default function Pricing() {
  const [categories, setCategories] = useState(null);

  useEffect(() => {
    commonApi.categories().then((res) => setCategories(res.data));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <p className="field-label text-copper">Pricing</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink md:text-4xl">Indicative material rates.</h1>
      <p className="mt-4 max-w-2xl text-inkfaint">
        Segregation centres price each request from live category rates plus a small handling
        and pickup charge. Your final quotation may vary based on condition and actual weight.
      </p>

      {!categories ? (
        <PageLoader />
      ) : (
        <div className="mt-10 overflow-hidden rounded border border-ink/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 bg-paperdim">
                <th className="px-5 py-3 field-label">Category</th>
                <th className="px-5 py-3 field-label text-right">Rate (₹ / kg)</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-ink/5 last:border-0">
                  <td className="px-5 py-3 text-ink">
                    <span className="mr-2">{c.icon}</span>
                    {c.name}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-ink">₹{c.base_price_per_kg.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 field-label">
        Handling and pickup charges are set per-request by your segregation centre and shown before you accept.
      </p>
    </div>
  );
}
