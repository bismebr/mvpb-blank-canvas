import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Wraps a tab's content and shows a small "Alteração salva" toast whenever
 * an input/textarea/select inside it loses focus AFTER its value changed.
 *
 * Modals (anything inside `[data-bisme-modal-open]`) are ignored.
 */
export function SavedOnBlurScope({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const initial = useRef<WeakMap<Element, string>>(new WeakMap());
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const unmountTimer = useRef<number | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    function isTrackable(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
      if (!el || !(el instanceof HTMLElement)) return false;
      if (el.closest("[data-bisme-modal-open]")) return false;
      const tag = el.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") return false;
      // skip non-editable inputs
      if (tag === "INPUT") {
        const type = (el as HTMLInputElement).type;
        if (type === "button" || type === "submit" || type === "reset" || type === "file" || type === "hidden") return false;
      }
      return true;
    }

    function readValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        return el.checked ? "1" : "0";
      }
      return el.value;
    }

    function onFocusIn(e: FocusEvent) {
      if (!isTrackable(e.target)) return;
      initial.current.set(e.target, readValue(e.target));
    }

    function onFocusOut(e: FocusEvent) {
      if (!isTrackable(e.target)) return;
      const prev = initial.current.get(e.target);
      const now = readValue(e.target);
      initial.current.delete(e.target);
      if (prev === undefined || prev === now) return;
      show();
    }

    function show() {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (unmountTimer.current) window.clearTimeout(unmountTimer.current);
      setMounted(true);
      // next frame -> visible for transition
      requestAnimationFrame(() => setVisible(true));
      hideTimer.current = window.setTimeout(() => {
        setVisible(false);
        unmountTimer.current = window.setTimeout(() => setMounted(false), 280);
      }, 1800);
    }

    root.addEventListener("focusin", onFocusIn, true);
    root.addEventListener("focusout", onFocusOut, true);
    return () => {
      root.removeEventListener("focusin", onFocusIn, true);
      root.removeEventListener("focusout", onFocusOut, true);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (unmountTimer.current) window.clearTimeout(unmountTimer.current);
    };
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {children}
      {mounted && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: `translate(-50%, ${visible ? "0" : "-12px"})`,
            opacity: visible ? 1 : 0,
            transition: "opacity 260ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
            zIndex: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            background: "#ECFDF5",
            color: "#047857",
            border: "1px solid #A7F3D0",
            borderRadius: 999,
            boxShadow: "0 6px 20px rgba(4, 120, 87, 0.15)",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="#10B981" />
            <path d="M7.5 12.5l3 3 6-6.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Alteração salva
        </div>
      )}
    </div>
  );
}
