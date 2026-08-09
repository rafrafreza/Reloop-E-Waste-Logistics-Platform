import { statusMeta } from "../constants/status";
import { formatDateTime } from "../utils/date";

export default function Timeline({ history }) {
  if (!history?.length) return null;
  return (
    <ol className="space-y-0">
      {history.map((h, idx) => {
        const meta = statusMeta(h.status);
        const isLast = idx === history.length - 1;
        return (
          <li key={idx} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && <span className="absolute left-[5px] top-3 h-full w-px bg-ink/10" />}
            <span className={`relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${meta.color} bg-current`} />
            <div>
              <p className="text-sm font-medium text-ink">{meta.label}</p>
              {h.remarks && <p className="text-sm text-inkfaint">{h.remarks}</p>}
              <p className="field-label mt-0.5">{formatDateTime(h.created_at)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
