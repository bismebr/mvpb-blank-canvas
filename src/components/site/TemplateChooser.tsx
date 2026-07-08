import { useEffect, useState, type CSSProperties } from "react";
import { TEMPLATE_PREVIEWS } from "@/config/assets";
import {
  SITE_TEMPLATES,
  type SiteTemplate,
  type SiteTemplateId,
} from "@/lib/siteTemplates";

const TEMPLATE_PREVIEW_IMAGES: Record<SiteTemplateId, string> = TEMPLATE_PREVIEWS;


/**
 * Shared template chooser used in BOTH:
 *  - Onboarding (step "Escolha o modelo do seu site")
 *  - Admin > Meu Site > Modelos
 *
 * Any visual change to the preview thumbnails or selection card MUST live here
 * so that both surfaces stay in sync.
 */

const FONT =
  'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

type Variant = "classic" | "modern" | "premium" | "minimal" | "dark";

function variantFor(id: SiteTemplateId): Variant {
  switch (id) {
    case "moderno":
      return "modern";
    case "premium":
      return "premium";
    case "minimalista":
      return "minimal";
    case "escuro":
      return "dark";
    default:
      return "classic";
  }
}

function hexToRgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/* ---------------- Realistic mini home preview ---------------- */

export function TemplatePreviewFrame({ tpl }: { tpl: SiteTemplate }) {
  const primary = tpl.palette[0];
  const variant = variantFor(tpl.id);
  const p = tpl.preview;

  const radius = variant === "modern" ? 12 : variant === "minimal" ? 4 : 8;
  const btnRadius = variant === "modern" ? 999 : variant === "minimal" ? 4 : 8;
  const cardRadius = variant === "modern" ? 10 : variant === "minimal" ? 4 : 7;
  const serviceCardBg =
    variant === "modern"
      ? hexToRgba(primary, 0.07)
      : variant === "dark"
        ? "#262626"
        : "#FFFFFF";
  const serviceBorder =
    variant === "minimal"
      ? "#EAEAEA"
      : variant === "modern"
        ? "transparent"
        : p.border;
  const chipBg = variant === "minimal" ? "#FFFFFF" : hexToRgba(primary, 0.12);
  const chipFg = primary;
  const chipBorder = variant === "minimal" ? "#E5E7EB" : "transparent";
  const ctaBg =
    variant === "minimal"
      ? "#FFFFFF"
      : variant === "modern"
        ? `linear-gradient(135deg, ${primary}, ${hexToRgba(primary, 0.7)})`
        : primary;
  const ctaFg = variant === "minimal" ? p.text : "#FFFFFF";
  const ctaBorder =
    variant === "minimal"
      ? `1px solid ${p.text}`
      : variant === "classic"
        ? `1px solid ${primary}`
        : "none";

  const frameStyle: CSSProperties = {
    background: p.cardBg,
    border: `1px solid ${p.border}`,
    borderRadius: radius,
    overflow: "hidden",
    aspectRatio: "3 / 4",
    display: "flex",
    flexDirection: "column",
  };

  const previewImage = TEMPLATE_PREVIEW_IMAGES[tpl.id];
  if (previewImage) {
    return (
      <div style={{ ...frameStyle, border: "none", background: "#F5F5F4", overflow: "hidden" }}>
        <img
          src={previewImage}
          alt={`Prévia do ${tpl.name}`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top center",
            display: "block",
          }}
          loading="eager"
        />
      </div>
    );
  }



  return (
    <div style={frameStyle}>
      {/* Banner */}
      <div style={{ position: "relative", height: "30%", background: p.coverBg }}>
        {(variant === "premium" || variant === "modern") && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(0,0,0,0.0) 60%)",
            }}
          />
        )}
        {/* Logo */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: -18,
            transform: "translateX(-50%)",
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: p.logoBg,
            border: `2px solid ${p.cardBg}`,
            boxShadow: "0 4px 10px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 14,
              height: 4,
              borderRadius: 2,
              background: primary,
              opacity: 0.9,
            }}
          />
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          padding: "24px 10px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {/* Business name */}
        <div
          style={{
            height: 7,
            width: "62%",
            margin: "0 auto",
            background: p.text,
            borderRadius: 3,
            opacity: 0.9,
          }}
        />
        {/* Stars */}
        <div
          style={{
            display: "flex",
            gap: 1.5,
            justifyContent: "center",
            marginTop: 1,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} color={variant === "premium" ? "#D4A437" : primary} />
          ))}
          <span
            style={{
              marginLeft: 3,
              height: 4,
              width: 14,
              borderRadius: 2,
              background: p.textMuted,
              opacity: 0.7,
              alignSelf: "center",
            }}
          />
        </div>
        {/* Address line */}
        <div
          style={{
            height: 3.5,
            width: "48%",
            margin: "2px auto 0",
            background: p.textMuted,
            borderRadius: 2,
            opacity: 0.6,
          }}
        />

        {/* Action icons */}
        <div
          style={{
            display: "flex",
            gap: 5,
            justifyContent: "center",
            marginTop: 5,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: chipBg,
                border:
                  chipBorder === "transparent"
                    ? "none"
                    : `1px solid ${chipBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: chipFg,
                }}
              />
            </span>
          ))}
        </div>

        {/* Service cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 5,
            marginTop: 6,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: serviceCardBg,
                border:
                  serviceBorder === "transparent"
                    ? "none"
                    : `1px solid ${serviceBorder}`,
                borderRadius: cardRadius,
                padding: "4px 5px",
                display: "flex",
                flexDirection: "column",
                gap: 3,
                boxShadow:
                  variant === "premium"
                    ? "0 1px 2px rgba(91,58,30,0.08)"
                    : variant === "modern" || variant === "minimal"
                      ? "none"
                      : "0 1px 1px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  height: 3.5,
                  width: "75%",
                  background: p.text,
                  opacity: 0.75,
                  borderRadius: 2,
                }}
              />
              <div
                style={{
                  height: 2.5,
                  width: "45%",
                  background: p.textMuted,
                  opacity: 0.55,
                  borderRadius: 2,
                }}
              />
              <div
                style={{
                  marginTop: 1,
                  alignSelf: "flex-end",
                  fontSize: 0,
                  height: 8,
                  minWidth: 18,
                  borderRadius: btnRadius,
                  background:
                    variant === "minimal" ? "transparent" : (ctaBg as string),
                  border: ctaBorder === "none" ? "none" : ctaBorder,
                  color: ctaFg,
                  padding: "0 4px",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Star({ color }: { color: string }) {
  return (
    <svg width="6" height="6" viewBox="0 0 24 24" fill={color} stroke="none">
      <polygon points="12 2 15 9 22 9.5 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.5 9 9" />
    </svg>
  );
}

/* ---------------- Selectable card (preview + name + palette + state) ---------------- */

export interface TemplateChooserGridProps {
  /** Currently highlighted choice (local UI state). */
  selectedId: SiteTemplateId | null;
  /** Model currently applied to the site (drives the "Modelo atual" label). */
  currentId?: SiteTemplateId | null;
  onSelect: (id: SiteTemplateId) => void;
  /** Override list of templates (defaults to SITE_TEMPLATES). */
  templates?: SiteTemplate[];
  /** Optional container style override. */
  style?: CSSProperties;
}

export function TemplateChooserGrid({
  selectedId,
  currentId,
  onSelect,
  templates = SITE_TEMPLATES,
  style,
}: TemplateChooserGridProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const urls = templates
      .map((t) => TEMPLATE_PREVIEW_IMAGES[t.id])
      .filter(Boolean) as string[];
    if (urls.length === 0) { setLoaded(true); return; }
    let cancelled = false;
    let remaining = urls.length;
    const done = () => {
      remaining -= 1;
      if (remaining <= 0 && !cancelled) setLoaded(true);
    };
    urls.forEach((src) => {
      const img = new Image();
      img.onload = done;
      img.onerror = done;
      img.src = src;
    });
    // Fallback: nunca travar mais de 5s
    const fallback = window.setTimeout(() => { if (!cancelled) setLoaded(true); }, 5000);
    return () => { cancelled = true; window.clearTimeout(fallback); };
  }, [templates]);

  if (!loaded) {
    return (
      <div
        style={{
          minHeight: 320,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          padding: 24,
          fontFamily: FONT,
        }}
        role="status"
        aria-live="polite"
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            border: "3px solid #F1F1F1",
            borderTopColor: "#5690f5",
            animation: "bismeTplSpin 800ms linear infinite",
          }}
        />
        <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 600 }}>
          Carregando modelos…
        </div>
        <style>{`@keyframes bismeTplSpin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0,1fr))",
        gap: 14,
        ...style,
      }}
    >
      {templates.map((tpl) => {
        const isSelected = selectedId === tpl.id;
        const isCurrent = currentId === tpl.id;
        const primary = tpl.palette[0];
        const statusLabel = isCurrent ? "Modelo atual" : null;
        return (
          <div key={tpl.id} style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: FONT }}>
            <button
              type="button"
              onClick={() => onSelect(tpl.id)}
              aria-pressed={isSelected}
              style={{
                position: "relative",
                background: "#FFFFFF",
                border: isSelected
                  ? `2px solid ${primary}`
                  : `1px solid #E5E7EB`,
                borderRadius: 14,
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: FONT,
                boxShadow: isSelected
                  ? `0 6px 18px ${primary}26, 0 1px 3px rgba(0,0,0,0.04)`
                  : "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.04)",
                transition: "border-color 150ms, box-shadow 150ms, transform 150ms",
                display: "block",
                overflow: "hidden",
                lineHeight: 0,
              }}
            >
              {isSelected && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: primary,
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 2px 6px ${primary}55`,
                    zIndex: 2,
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}

              <TemplatePreviewFrame tpl={tpl} />
            </button>

            <div style={{ padding: "0 2px", lineHeight: 1.3 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--adm-text-primary, #111111)",
                  letterSpacing: -0.1,
                }}
              >
                {tpl.name}
              </div>
              {statusLabel && (
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    fontWeight: 700,
                    color: primary,
                    letterSpacing: 0.2,
                  }}
                >
                  {statusLabel}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>

  );
}
