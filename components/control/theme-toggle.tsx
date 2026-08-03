"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Dark or light, per person, remembered.
 *
 * Not a second brand — the same chartreuse, the same faces, the same
 * structure, on a different ground. Ben writes plans on a laptop by a window;
 * the athlete opens the app in a dark gym at six in the morning. Neither
 * should have to put up with the other's preference.
 *
 * The theme lives on the DOM, not in React state. ThemeScript sets it before
 * first paint — a React effect runs *after* paint and would flash the wrong
 * ground on every navigation. So the attribute is the source of truth and this
 * button subscribes to it, which is exactly what useSyncExternalStore is for:
 * it also gives hydration a separate server snapshot instead of a mismatch.
 */

const KEY = "suth.theme";
type Theme = "dark" | "light";

function surfaces() {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-surface="control"]'),
  );
}

const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function readTheme(): Theme {
  const first = surfaces()[0];
  return first?.getAttribute("data-theme") === "light" ? "light" : "dark";
}

/** The server has no DOM and no stored preference. Dark is the default. */
function serverTheme(): Theme {
  return "dark";
}

function setTheme(next: Theme) {
  surfaces().forEach((el) => {
    if (next === "light") el.setAttribute("data-theme", "light");
    else el.removeAttribute("data-theme");
  });
  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    /* storage blocked — the preference holds for this page and no longer */
  }
  listeners.forEach((fn) => fn());
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);
  const toggle = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme],
  );

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === "light"}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minHeight: 44,
        minWidth: 44,
        padding: compact ? 0 : "0 14px",
        borderRadius: 999,
        border: "1px solid var(--border-strong)",
        background: "var(--surface)",
        color: "var(--text-muted)",
        fontSize: "var(--text-sm)",
        fontWeight: 650,
        cursor: "pointer",
      }}
    >
      <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>
        {theme === "dark" ? "☀" : "☾"}
      </span>
      {compact ? null : theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
