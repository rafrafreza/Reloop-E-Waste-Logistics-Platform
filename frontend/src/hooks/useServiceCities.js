import { useEffect, useState } from "react";
import { commonApi } from "../api/endpoints";

/**
 * Returns the list of serviceable cities configured by the admin
 * (Settings -> service_cities), or null while still loading.
 */
export default function useServiceCities() {
  const [cities, setCities] = useState(null);

  useEffect(() => {
    let cancelled = false;
    commonApi
      .publicSettings()
      .then((res) => {
        if (cancelled) return;
        const raw = res.data.service_cities || "";
        const parsed = raw
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
        setCities(parsed);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return cities;
}
