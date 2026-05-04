import { useEffect, useRef } from "react";

/**
 * Calls onOutside when a mousedown happens outside ref.current.
 * @param {React.RefObject<HTMLElement | null>} ref
 * @param {() => void} onOutside
 * @param {boolean} active Only listen while true (e.g. popover open).
 */
export function useClickOutside(ref, onOutside, active) {
  const handlerRef = useRef(onOutside);
  handlerRef.current = onOutside;

  useEffect(() => {
    if (!active) return;

    function onMouseDown(e) {
      const el = ref.current;
      if (!el || el.contains(e.target)) return;
      handlerRef.current();
    }

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [ref, active]);
}
