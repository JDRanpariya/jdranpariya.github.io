"use client";

import { useEffect } from "react";

function currentTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeToggle() {
  useEffect(() => {
    const stored = window.localStorage.getItem("research-theme");
    const next =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  function toggle() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem("research-theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light and dark theme"
      className="inline-flex h-11 w-11 items-center justify-center rounded-md font-sans text-lg text-ink-muted transition-colors hover:bg-surface hover:text-accent"
    >
      <span aria-hidden="true">◐</span>
    </button>
  );
}
