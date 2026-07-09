import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { createPortal } from "react-dom";
import { COLORS, FONT } from "./ui";

interface Props {
  open: boolean;
  src: string | null;
  aspect?: number;
  outputSize?: { w: number; h: number };
  title?: string;
  circular?: boolean;
  /** "admin" follows admin theme (light/dark). "onboarding" always light. */
  variant?: "admin" | "onboarding";
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}

/**
 * Cropper estilo Instagram: zoom (slider + pinça) + arrastar.
 * Tela cheia limpa, com fundo dependendo do variant.
 */
export function ImageCropper({
  open,
  src,
  aspect = 1,
  outputSize,
  title = "Ajustar imagem",
  circular = false,
  variant = "admin",
  onCancel,
  onConfirm,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);

  const CW = 320;
  const CH = Math.round(CW / aspect);

  useEffect(() => {
    if (open) {
      setZoom(1);
      setTx(0);
      setTy(0);
      pointersRef.current.clear();
      pinchRef.current = null;
      dragRef.current = null;
    }
  }, [open, src]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !src) return null;

  const baseFit =
    natural && natural.w > 0 && natural.h > 0
      ? Math.max(CW / natural.w, CH / natural.h)
      : 1;
  const displayScale = baseFit * zoom;

  const clamp = (val: number, max: number) => Math.max(-max, Math.min(max, val));
  const maxTx = natural ? Math.max(0, (natural.w * displayScale - CW) / 2) : 0;
  const maxTy = natural ? Math.max(0, (natural.h * displayScale - CH) / 2) : 0;
  const cTx = clamp(tx, maxTx);
  const cTy = clamp(ty, maxTy);

  function onPointerDown(e: RPointerEvent<HTMLDivElement>) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchRef.current = { startDist: dist, startZoom: zoom };
      dragRef.current = null;
    } else if (pointersRef.current.size === 1) {
      dragRef.current = { startX: e.clientX, startY: e.clientY, tx: cTx, ty: cTy };
    }
  }
  function onPointerMove(e: RPointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchRef.current && pointersRef.current.size >= 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = dist / pinchRef.current.startDist;
      const next = Math.min(4, Math.max(1, pinchRef.current.startZoom * ratio));
      setZoom(next);
      return;
    }
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setTx(clamp(dragRef.current.tx + dx, maxTx));
    setTy(clamp(dragRef.current.ty + dy, maxTy));
  }
  function onPointerUp(e: RPointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) dragRef.current = null;
  }

  function handleConfirm() {
    if (!natural || !imgRef.current) return;
    const outW = outputSize?.w ?? Math.round(CW * 2.5);
    const outH = outputSize?.h ?? Math.round(CH * 2.5);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgLeftCont = CW / 2 + cTx - (natural.w * displayScale) / 2;
    const imgTopCont = CH / 2 + cTy - (natural.h * displayScale) / 2;
    const sx = (0 - imgLeftCont) / displayScale;
    const sy = (0 - imgTopCont) / displayScale;
    const sw = CW / displayScale;
    const sh = CH / displayScale;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, outW, outH);

    const isPng = !!src && (src.startsWith("data:image/png") || src.endsWith(".png"));
    const dataUrl = canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.92);
    onConfirm(dataUrl);
  }

  // Theme
  const isOnboarding = variant === "onboarding";
  // Detect admin theme directly because the cropper is portaled to <body>
  // (outside the [data-admin-theme] subtree, so CSS variables don't apply).
  const adminTheme =
    typeof document !== "undefined"
      ? document.querySelector("[data-admin-theme]")?.getAttribute("data-admin-theme") ?? "light"
      : "light";
  const isDarkAdmin = !isOnboarding && adminTheme === "dark";
  const bgPage = isOnboarding ? "#FFFFFF" : isDarkAdmin ? "#0F0F10" : "#f2f1f6";
  const textColor = isOnboarding ? "#1A1A1A" : isDarkAdmin ? "#F4F4F5" : "#1A1A1A";
  const mutedColor = isOnboarding ? "#888888" : isDarkAdmin ? "#A1A1AA" : "#888888";
  const sliderAccent = isOnboarding ? "#BBBBBB" : "#5690f5";
  const cancelBorder = isOnboarding ? "#DDDDDD" : isDarkAdmin ? "#2A2A2F" : "#EEEEEE";
  const cropBg = isOnboarding ? "#F5F5F5" : isDarkAdmin ? "#1F1F23" : "#EFEFEF";

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: bgPage,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 16px",
        fontFamily: FONT,
        overflow: "hidden",
      }}
      onTouchMove={(e) => e.preventDefault()}
    >
      <h3
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 700,
          color: textColor,
          textAlign: "center",
          width: "100%",
        }}
      >
        {title}
      </h3>

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 18,
        }}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            width: CW,
            height: CH,
            margin: "0 auto",
            position: "relative",
            overflow: "hidden",
            borderRadius: 12,
            background: cropBg,
            cursor: "grab",
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
          }}
        >
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img
            ref={imgRef}
            src={src}
            crossOrigin="anonymous"
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget;
              setNatural({ w: el.naturalWidth, h: el.naturalHeight });
            }}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) translate(${cTx}px, ${cTy}px) scale(${displayScale})`,
              transformOrigin: "center center",
              pointerEvents: "none",
              maxWidth: "none",
              maxHeight: "none",
              display: "block",
              userSelect: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
              backgroundSize: `${CW / 3}px ${CH / 3}px`,
            }}
          />
          {circular && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
                boxShadow: `0 0 0 9999px ${isOnboarding ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.6)"}`,
                borderRadius: "50%",
              }}
            />
          )}
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, color: mutedColor, marginBottom: 8, fontWeight: 600 }}>
            Zoom
          </label>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{
              width: "100%",
              accentColor: sliderAccent,
              height: 4,
            }}
          />
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 420, display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 12,
            background: "transparent",
            border: `1.5px solid ${cancelBorder}`,
            color: textColor,
            fontWeight: 600,
            fontSize: 15,
            cursor: "pointer",
            fontFamily: FONT,
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          style={{
            flex: 2,
            height: 48,
            borderRadius: 12,
            background: COLORS.accentLight,
            border: "none",
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            fontFamily: FONT,
            boxShadow: "0 4px 12px rgba(86, 144, 245,0.25)",
          }}
        >
          Salvar imagem
        </button>
      </div>
    </div>
  );

  if (typeof document === "undefined") return node;
  return createPortal(node, document.body);
}