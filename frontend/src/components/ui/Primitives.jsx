export function Spinner({ className = "" }) {
  return (
    <div className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-ink/15 border-t-circuit ${className}`} />
  );
}

export function PageLoader() {
  return (
    <div className="flex h-64 w-full items-center justify-center">
      <Spinner />
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-dashed border-ink/15 bg-white/50 px-6 py-16 text-center">
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-inkfaint">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatTile({ label, value, accent = "text-ink", suffix = "" }) {
  return (
    <div className="card p-4">
      <p className="field-label">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold ${accent}`}>
        {value}
        {suffix && <span className="ml-1 text-sm font-normal text-inkfaint">{suffix}</span>}
      </p>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, className = "max-w-md" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className={`relative z-10 w-full animate-rise rounded bg-white shadow-stamp ${className}`}>
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="text-inkfaint hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink/10 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Banner({ kind = "error", children }) {
  const styles = {
    error: "bg-bricklight border-brick/30 text-brick",
    success: "bg-circuitlight border-circuit/30 text-circuitdark",
    info: "bg-paperdim border-ink/15 text-inkfaint",
  };
  return (
    <div className={`rounded border px-3 py-2 text-sm ${styles[kind]}`}>{children}</div>
  );
}
