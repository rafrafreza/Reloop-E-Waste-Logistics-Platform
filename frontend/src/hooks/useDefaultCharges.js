import { useEffect, useState } from "react";
import { commonApi } from "../api/endpoints";

/**
 * Returns the admin-configured default handling/pickup charge (Settings
 * page) as numbers, used to pre-fill the centre quotation form. Falls back
 * to { handling: 30, pickup: 50 } while loading or if parsing fails.
 */
export default function useDefaultCharges() {
  const [charges, setCharges] = useState({ handling: 30, pickup: 50 });

  useEffect(() => {
    let cancelled = false;
    commonApi
      .publicSettings()
      .then((res) => {
        if (cancelled) return;
        const handling = Number(res.data.default_handling_charge);
        const pickup = Number(res.data.default_pickup_charge);
        setCharges({
          handling: Number.isFinite(handling) ? handling : 30,
          pickup: Number.isFinite(pickup) ? pickup : 50,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return charges;
}
