import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  tone = "default",
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 p-4 backdrop-blur-[2px] sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={`relative w-full max-w-lg overflow-hidden border bg-[#fbf8f2] ${
              tone === "danger"
                ? "border-[#c53a30] shadow-[0_24px_60px_rgba(0,0,0,0.14)]"
                : "border-[#cdbfaa] shadow-[0_24px_60px_rgba(0,0,0,0.14)]"
            } p-6 sm:p-7`}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full border border-[#cdbfaa] bg-white p-2 text-[#554a3f] transition hover:bg-[#f2e9de] hover:text-[#111111]"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="pr-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#554a3f]">
                Attention
              </p>
              <h2 id="modal-title" className="mt-3 text-2xl font-semibold text-[#111111]">
                {title}
              </h2>
              {description && (
                <p className="mt-3 text-sm leading-6 text-[#473d34]">{description}</p>
              )}
            </div>

            {children && <div className="mt-5">{children}</div>}

            {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
