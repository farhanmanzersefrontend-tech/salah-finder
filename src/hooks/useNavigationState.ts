import { useCallback, useRef, useSyncExternalStore } from "react";
import type { SetStateAction } from "react";

const changeEvent = "salah-navigation";
type NavigationEntry = { depth: number; values: Record<string, unknown> };

function entry(): NavigationEntry | undefined {
  return window.history.state?.salahNavigation;
}

function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(changeEvent, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(changeEvent, listener);
  };
}

/** Store navigation in real browser history so device Back and Forward work too. */
export function useNavigationState<T>(key: string, initial: T, resetChildren = false) {
  const fallback = useRef(initial).current;
  const getSnapshot = useCallback(() => (entry()?.values[key] as T | undefined) ?? fallback, [key, fallback]);
  const value = useSyncExternalStore(subscribe, getSnapshot, () => fallback);

  const navigate = useCallback((action: SetStateAction<T>, replace = false) => {
    const previous = entry();
    const current = (previous?.values[key] as T | undefined) ?? fallback;
    const next = typeof action === "function" ? (action as (value: T) => T)(current) : action;
    if (JSON.stringify(next) === JSON.stringify(current)) return;
    // Seed this entry before pushing so Back can restore the initial screen.
    if (!previous) window.history.replaceState({ ...window.history.state, salahNavigation: { depth: 0, values: { [key]: current } } }, "");
    const base = entry()!;
    const values = resetChildren ? { [key]: next } : { ...base.values, [key]: next };
    window.history[replace ? "replaceState" : "pushState"]({
      ...window.history.state,
      salahNavigation: { depth: base.depth + (replace ? 0 : 1), values },
    }, "");
    window.dispatchEvent(new Event(changeEvent));
  }, [key, fallback, resetChildren]);

  const back = useCallback((otherwise: T) => {
    if ((entry()?.depth ?? 0) > 0) window.history.back();
    else navigate(otherwise, true);
  }, [navigate]);

  return [value, navigate, back] as const;
}
