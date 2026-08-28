"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

const STORAGE_KEY = "ft-amounts-hidden";
const CHANGE_EVENT = "ft-amounts-hidden-change";

const AmountVisibilityContext = createContext<{ hidden: boolean; toggle: () => void } | null>(null);

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

function getServerSnapshot() {
  return false;
}

export function AmountVisibilityProvider({ children }: { children: React.ReactNode }) {
  const hidden = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next = localStorage.getItem(STORAGE_KEY) !== "1";
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return <AmountVisibilityContext.Provider value={{ hidden, toggle }}>{children}</AmountVisibilityContext.Provider>;
}

function useAmountVisibility() {
  const ctx = useContext(AmountVisibilityContext);
  if (!ctx) throw new Error("useAmountVisibility must be used within AmountVisibilityProvider");
  return ctx;
}

function maskText(text: string): string {
  return text.replace(/[0-9]/g, "•");
}

// Wraps a formatted amount string; renders it masked when the eye toggle is off.
export function Amount({ children, className }: { children: string | (string | number)[]; className?: string }) {
  const { hidden } = useAmountVisibility();
  const text = Array.isArray(children) ? children.join("") : children;
  return <span className={className}>{hidden ? maskText(text) : text}</span>;
}

const EyeIcon = (
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
    <path
      d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const EyeOffIcon = (
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
    <path
      d="M2.5 2.5l15 15M8.36 8.44a2.25 2.25 0 0 0 3.2 3.2M6.24 6.32C3.9 7.6 2.5 10 2.5 10s3 6 8.5 6c1.6 0 2.94-.5 4.02-1.18M9.9 4.02c.4-.02.07-.02.1-.02 5.5 0 8.5 6 8.5 6-.34.68-.98 1.7-1.94 2.68"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function AmountVisibilityToggle({ className }: { className?: string }) {
  const { hidden, toggle } = useAmountVisibility();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={hidden ? "Show amounts" : "Hide amounts"}
      title={hidden ? "Show amounts" : "Hide amounts"}
      className={
        className ??
        "cursor-pointer rounded-md border border-border bg-background px-2.5 py-2 text-sm outline-none transition-colors duration-150 hover:bg-muted-hover focus:ring-2 focus:ring-ring"
      }
    >
      {hidden ? EyeOffIcon : EyeIcon}
    </button>
  );
}
