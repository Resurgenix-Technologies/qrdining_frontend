export default function Spinner({ className = "", label = "Loading..." }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-sm font-semibold text-slate-700 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
