import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export const COLORS = {
  bgBase: "var(--adm-bg-base)",
  bgSurface: "var(--adm-bg-surface)",
  bgElevated: "var(--adm-bg-elevated)",
  border: "var(--adm-border)",
  textPrimary: "var(--adm-text-primary)",
  textMuted: "var(--adm-text-muted)",
  accent: "var(--adm-accent)",
  accentHover: "var(--adm-accent-hover)",
  accentLight: "#5690f5",
  danger: "#ef4444",
  dangerBg: "var(--adm-danger-bg)",
  dangerBorder: "#ef4444",
  success: "#22C55E",
  successBg: "var(--adm-success-bg)",
  successBorder: "var(--adm-success-border)",
  save: "#00BE70",
  saveHover: "#00A862",
};

export const FONT = "'Inter', system-ui, sans-serif";

export const cardStyle: CSSProperties = {
  background: COLORS.bgSurface,
  border: `1.5px solid ${COLORS.border}`,
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};

export const inputStyle: CSSProperties = {
  background: "#FFFFFF",
  border: "1.5px solid #E4E4E4",
  borderRadius: 8,
  padding: "14px 14px",
  color: "#111111",
  fontSize: 16,
  width: "100%",
  fontFamily: FONT,
  outline: "none",
  boxSizing: "border-box",
  WebkitAppearance: "none",
  appearance: "none",
};

export const primaryBtn: CSSProperties = {
  background: COLORS.accentLight,
  color: "#FFFFFF",
  fontWeight: 700,
  borderRadius: 10,
  border: "none",
  height: 48,
  fontSize: 15,
  cursor: "pointer",
  fontFamily: FONT,
};

export const saveBtn: CSSProperties = {
  background: COLORS.accentLight,
  color: "#FFFFFF",
  fontWeight: 700,
  borderRadius: 10,
  border: "none",
  height: 48,
  fontSize: 15,
  cursor: "pointer",
  fontFamily: FONT,
};

export const addBtn: CSSProperties = {
  background: COLORS.accentLight,
  color: "#FFFFFF",
  border: "none",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  minHeight: 44,
  fontFamily: FONT,
};

export const secondaryBtn: CSSProperties = {
  background: "transparent",
  border: `1.5px solid ${COLORS.border}`,
  color: COLORS.textPrimary,
  borderRadius: 10,
  height: 48,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: FONT,
};

export function Label({ children }: { children: ReactNode }) {
  return (
    <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.textMuted, fontFamily: FONT, display: "block", marginBottom: 6 }}>
      {children}
    </label>
  );
}

export function BottomSheet({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [drag, setDrag] = useState(0);
  const sheetRef = useBottomSheetCloseOnScrollUp(open && visible, onClose, setDrag);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setDrag(0);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    } else if (mounted) {
      setVisible(false);
      const t = window.setTimeout(() => { setMounted(false); setDrag(0); }, 320);
      return () => window.clearTimeout(t);
    }
  }, [open, mounted]);

  // Body scroll lock while the sheet is mounted (covers both opening anim and full open)
  useEffect(() => {
    if (!mounted) return;
    const cls = "bisme-no-scroll";
    document.body.classList.add(cls);
    return () => {
      // Only release if no other sheet/modal is open
      const stillOpen = document.querySelectorAll("[data-bisme-modal-open='true']").length;
      if (stillOpen <= 1) document.body.classList.remove(cls);
    };
  }, [mounted]);

  if (!mounted) return null;

  const translate = visible ? `translateY(${drag}px)` : "translateY(100%)";
  const overlayOpacity = visible ? Math.max(0, 1 - drag / 400) : 0;

  return (
    <div data-bisme-modal-open="true" style={{ position: "fixed", inset: 0, zIndex: 300, fontFamily: FONT, pointerEvents: visible ? "auto" : "none" }}>
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
          opacity: overlayOpacity,
          transition: drag === 0 ? "opacity 320ms ease" : "none",
        }}
      />
      <div ref={sheetRef} style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: COLORS.bgSurface, borderRadius: "20px 20px 0 0",
        padding: "20px 16px", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
        transform: translate,
        transition: drag === 0 ? "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)" : "none",
        willChange: "transform",
      }}>
        <div className="bisme-sheet-handle" style={{ width: 40, height: 4, background: COLORS.border, borderRadius: 2, margin: "0 auto 16px" }} />
        <h2 style={{ fontWeight: 700, fontSize: 18, color: COLORS.textPrimary, margin: "0 0 16px" }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: on ? COLORS.save : "var(--adm-toggle-off)",
        border: "none", padding: 0, position: "relative", cursor: "pointer",
        transition: "background 200ms",
      }}
      aria-pressed={on}
    >
      <span style={{
        position: "absolute", top: 2, left: on ? 22 : 2, width: 20, height: 20,
        background: "#FFFFFF", borderRadius: "50%", transition: "left 200ms",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

/**
 * Fecha a BottomSheet quando o usuário rola a página/painel para cima.
 * Funciona tanto rolando o body quanto rolando o próprio conteúdo da sheet.
 */
function useBottomSheetCloseOnScrollUp(open: boolean, onClose: () => void, setDrag?: (n: number) => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    if (!node) return;
    let touchStartY = 0;
    let dragging = false;
    let currentDrag = 0;

    function onTouchStart(e: TouchEvent) {
      touchStartY = e.touches[0]?.clientY ?? 0;
      dragging = (node?.scrollTop ?? 0) <= 0;
      currentDrag = 0;
    }
    function onTouchMove(e: TouchEvent) {
      if (!dragging) return;
      const y = e.touches[0]?.clientY ?? 0;
      const dy = y - touchStartY;
      if (dy > 0) {
        currentDrag = dy;
        setDrag?.(dy);
      } else {
        currentDrag = 0;
        setDrag?.(0);
      }
    }
    function onTouchEnd() {
      if (!dragging) return;
      dragging = false;
      if (currentDrag > 120) {
        onClose();
      } else {
        setDrag?.(0);
      }
      currentDrag = 0;
    }
    function onWheel(e: WheelEvent) {
      const atTop = (node?.scrollTop ?? 0) <= 0;
      if (atTop && e.deltaY < -30) onClose();
    }

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: true });
    node.addEventListener("touchend", onTouchEnd, { passive: true });
    node.addEventListener("touchcancel", onTouchEnd, { passive: true });
    node.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchEnd);
      node.removeEventListener("wheel", onWheel);
    };
  }, [open, onClose]);
  return ref;
}

/** Header padronizado para todas as telas do painel administrativo. */
export function PageHeader({ title, subtitle, compact }: { title: string; subtitle?: string; compact?: boolean }) {
  return (
    <div style={{ textAlign: "center", marginBottom: compact ? 0 : 20 }}>
      <h2
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 700,
          color: COLORS.textPrimary,
          fontFamily: FONT,
          letterSpacing: -0.2,
          lineHeight: 1.3,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            margin: "4px auto 0",
            fontSize: 14,
            color: COLORS.textMuted,
            fontFamily: FONT,
            lineHeight: 1.5,
            maxWidth: 520,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
