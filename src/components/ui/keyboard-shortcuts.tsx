"use client";
import { useEffect } from "react";

export interface ShortcutBindings {
  n?: () => void;
  j?: () => void;
  k?: () => void;
}

export function KeyboardShortcuts(bindings: ShortcutBindings) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore when typing in form fields
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (target.isContentEditable) return;
      // Ignore modifier-prefixed keys (e.g. cmd+k)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const fn = bindings[e.key as keyof ShortcutBindings];
      if (fn) {
        e.preventDefault();
        fn();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bindings]);

  return null;
}
