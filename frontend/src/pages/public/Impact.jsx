import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { commonApi } from "../../api/endpoints";
import { PageLoader } from "../../components/ui/Primitives";

export default function Impact() {
  const [impact, setImpact] = useState(null);

  useEffect(() => {
    commonApi.publicImpact().then((res) => setImpact(res.data));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <p className="field-label text-copper">Our impact</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink md:text-4xl">Real e-waste, responsibly recycled.</h1>
      <p className="mt-4 max-w-2xl text-inkfaint">
        Every number below comes from a completed pickup on Reloop — logged, weighed, and tracked
        through to a licensed recycler.
      </p>

      {!impact ? (
        <PageLoader />
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="ticket p-6 text-center">
            <p className="font-mono text-4xl font-semibold text-circuit">{impact.total_weight_kg}</p>
            <p className="field-label mt-2">kg of e-waste recycled</p>
          </div>
          <div className="ticket p-6 text-center">
            <p className="font-mono text-4xl font-semibold text-circuit">{impact.total_co2_saved_kg}</p>
            <p className="field-label mt-2">kg CO2e avoided (est.)</p>
          </div>
          <div className="ticket p-6 text-center">
            <p className="font-mono text-4xl font-semibold text-ink">{impact.total_requests_completed}</p>
            <p className="field-label mt-2">pickups completed</p>
          </div>
        </div>
      )}

      <p className="mt-6 field-label">
        CO2e figures are illustrative sustainability estimates based on typical WEEE recycling averages
        per material category, not lab-measured values.
      </p>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-semibold text-ink">Add your own impact.</h2>
        <p className="mx-auto mt-2 max-w-md text-inkfaint">
          Every device you recycle responsibly adds to this count.
        </p>
        <Link to="/register" className="btn-primary mt-6 inline-flex px-6 py-3 text-base">
          Get started
        </Link>
      </div>
    </div>
  );
}
