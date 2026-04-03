import { ApiError } from "./api.js";

export function getFriendlyErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;

  if (error instanceof ApiError) {
    return error.userMessage || error.message || fallback;
  }

  if (typeof error === "string") return error;
  if (error.message) return error.message;
  return fallback;
}

export function focusAndScrollToField(fieldName) {
  if (!fieldName || typeof document === "undefined") return;

  const target = document.querySelector(`[data-field="${fieldName}"]`);
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => {
    target.focus?.();
  }, 180);
}
