import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, WifiOff, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  offline: WifiOff,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  };

  const push = ({
    title,
    message,
    tone = "info",
    duration = 4200,
    actionLabel,
    onAction,
  }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextToast = { id, title, message, tone, actionLabel, onAction };

    setToasts((prev) => [...prev.slice(-2), nextToast]);

    if (duration > 0) {
      const timer = window.setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);
    }

    return id;
  };

  useEffect(() => {
    const handleOffline = () => {
      push({
        title: "You're offline",
        message: "We'll keep your place, but live requests may fail until your connection returns.",
        tone: "offline",
        duration: 5000,
      });
    };

    const handleOnline = () => {
      push({
        title: "Connection restored",
        message: "You're back online.",
        tone: "success",
        duration: 2600,
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const value = useMemo(
    () => ({
      push,
      dismiss,
      success: (title, message, options = {}) =>
        push({ title, message, tone: "success", ...options }),
      error: (title, message, options = {}) =>
        push({ title, message, tone: "error", ...options }),
      info: (title, message, options = {}) =>
        push({ title, message, tone: "info", ...options }),
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 top-4 z-[140] flex justify-center px-4">
        <div className="flex w-full max-w-xl flex-col gap-3">
          <AnimatePresence initial={false}>
            {toasts.map((toast) => {
              const Icon = ICONS[toast.tone] || ICONS.info;

              return (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, y: -18, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.96 }}
                  className="pointer-events-auto"
                >
                  <div className="flex items-start gap-3 rounded-[20px] border border-[#d8d0c5] bg-[#fbf8f2] px-4 py-4 shadow-[0_18px_36px_rgba(0,0,0,0.08)]">
                    <div className="rounded-2xl bg-white p-2 text-[#111111]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#111111]">{toast.title}</p>
                      {toast.message && (
                        <p className="mt-1 text-sm leading-6 text-[#5c564e]">{toast.message}</p>
                      )}
                      {toast.actionLabel && toast.onAction && (
                        <button
                          type="button"
                          onClick={() => {
                            toast.onAction();
                            dismiss(toast.id);
                          }}
                          className="mt-3 rounded-full border border-[#d8d0c5] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#111111] transition hover:bg-[#f5efe7]"
                        >
                          {toast.actionLabel}
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => dismiss(toast.id)}
                      className="rounded-full p-1.5 text-[#8a8174] transition hover:bg-[#f1ece4] hover:text-[#111111]"
                      aria-label="Dismiss notification"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider.");
  }

  return context;
}
