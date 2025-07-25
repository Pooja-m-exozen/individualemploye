import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

export function showToast({ message, type = "info", duration = 3000 }: ToastOptions) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.className = `fixed z-50 top-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded shadow-lg text-white font-semibold transition-opacity opacity-0 toast-${type}`;
  toast.style.background =
    type === "success"
      ? "#22c55e"
      : type === "error"
      ? "#ef4444"
      : "#2563eb";
  document.body.appendChild(toast);
  setTimeout(() => (toast.style.opacity = "1"), 10);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => document.body.removeChild(toast), 500);
  }, duration);
}

export function ToastStyles() {
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .toast-success { background: #22c55e; }
      .toast-error { background: #ef4444; }
      .toast-info { background: #2563eb; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);
  return null;
}
