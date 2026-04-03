import { AlertTriangle, RefreshCcw, WifiOff } from "lucide-react";

export default function InlineAlert({
  title = "Something went wrong",
  message,
  onRetry,
  variant = "error",
  className = "",
}) {
  const isOffline = variant === "offline";
  const Icon = isOffline ? WifiOff : AlertTriangle;

  return (
    <div
      className={`rounded-[24px] border px-5 py-4 ${
        isOffline
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-[#e0b8b8] bg-[#fff3f2] text-[#7f1d1d]"
      } ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-2xl bg-white p-2 shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          {message && <p className="mt-1 text-sm text-[#5c564e]">{message}</p>}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#d8d0c5] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#111111] transition hover:bg-[#f5efe7]"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
