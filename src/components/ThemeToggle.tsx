"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_STORAGE_KEY } from "@/lib/theme";

const THEME_EVENT = "caderno-theme-change";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    function sync() {
      const current = document.documentElement.getAttribute("data-theme");
      setTheme(current === "light" ? "light" : "dark");
    }
    sync();
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  function toggle() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore (e.g. private browsing storage restrictions)
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return { theme, toggle };
}

export function ThemeToggle({
  className = "",
  withLabel = false,
}: {
  className?: string;
  withLabel?: boolean;
}) {
  const { theme, toggle } = useTheme();
  const label = theme === "dark" ? "Modo claro" : "Modo escuro";

  return (
    <button onClick={toggle} aria-label={`Ativar ${label.toLowerCase()}`} className={className}>
      {theme === "dark" ? (
        <Sun size={18} strokeWidth={1.75} />
      ) : (
        <Moon size={18} strokeWidth={1.75} />
      )}
      {withLabel && label}
    </button>
  );
}
