import React from "react";
import { ArrowLeft, RefreshCcw, ShieldAlert } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React error boundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleBack = () => {
    window.history.back();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="surface-grid flex min-h-screen items-center justify-center px-4 py-10">
        <div className="glass-panel w-full max-w-2xl border border-white/14 p-8 text-white shadow-[0_30px_120px_rgba(8,47,73,0.26)] sm:p-10">
          <div className="inline-flex rounded-[28px] border border-rose-300/20 bg-rose-400/10 p-4">
            <ShieldAlert className="h-8 w-8 text-rose-200" />
          </div>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-200/70">
            Unexpected Error
          </p>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
            This screen hit an issue before it could finish loading.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200/76">
            The app stayed up, but this part of the interface needs to be refreshed.
            Try loading the page again or go back to the previous screen.
          </p>

          {this.state.error?.message && (
            <div className="mt-6 rounded-[24px] border border-white/12 bg-slate-950/35 px-5 py-4 text-sm text-slate-300/82">
              {this.state.error.message}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={this.handleReload} className="glass-button">
              <RefreshCcw className="h-4 w-4" />
              Reload
            </button>
            <button type="button" onClick={this.handleBack} className="glass-button-secondary">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }
}
