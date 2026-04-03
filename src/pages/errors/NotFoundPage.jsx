import { ArrowLeft, Home, SearchX } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="surface-grid flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass-panel relative w-full max-w-3xl overflow-hidden border border-white/14 p-8 text-white shadow-[0_35px_120px_rgba(8,47,73,0.34)] sm:p-10">
        <div className="pointer-events-none absolute right-[-40px] top-[-40px] h-40 w-40 rounded-full bg-cyan-300/12 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-24px] left-[-16px] h-36 w-36 rounded-full bg-fuchsia-400/10 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-3 rounded-full border border-cyan-200/18 bg-white/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100/84">
            <SearchX className="h-4 w-4" />
            404 - Page Not Found
          </div>

          <h1 className="mt-6 max-w-2xl text-4xl font-semibold sm:text-5xl">
            The page you are looking for doesn’t exist.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200/78 sm:text-base">
            The link may be outdated, the route may have changed, or the page may
            never have existed in this environment.
          </p>

          <div className="mt-10 grid gap-4 rounded-[30px] border border-white/12 bg-slate-950/28 p-5 sm:grid-cols-[1.2fr_0.8fr] sm:p-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-300/66">
                Quick Recovery
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-200/78">
                Return to the main experience or step back to the last valid page.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <button type="button" onClick={() => navigate("/")} className="glass-button w-full justify-center sm:w-auto">
                <Home className="h-4 w-4" />
                Go To Home
              </button>
              <button type="button" onClick={() => navigate(-1)} className="glass-button-secondary w-full justify-center sm:w-auto">
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
