import { SITE_TEMPLATES, type SiteTemplateId } from "@/lib/siteTemplates";

const THEME_DISPLAY_NAMES: Record<SiteTemplateId, string> = {
  "classico": "Laranja",
  "moderno": "Vermelho",
  "premium": "Escuro",
  "minimalista": "Verde",
  "escuro": "Rosa",
  "vermelho-classico": "Azul",
};

function GenericAvatar({ bg, fg }: { bg: string; fg: string }) {
  return (
    <div
      style={{
        width: 56, height: 56, borderRadius: "50%",
        background: bg, display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
      }}
    >
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </svg>
    </div>
  );
}

export function ThemePreviewCard({
  tpl,
  selected,
  onSelect,
}: {
  tpl: typeof SITE_TEMPLATES[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const primary = tpl.palette[0];
  const isDark = tpl.id === "premium";
  const bg = isDark ? "#1A1A1A" : "#FFFFFF";
  const surface = isDark ? "#262626" : "#F5F5F7";
  const lineSoft = isDark ? "#2E2E2E" : "#ECECEE";
  const lineStrong = isDark ? "#3A3A3A" : "#DCDCE0";
  const avatarBg = isDark ? "#2E2E2E" : `${primary}1A`;
  const avatarFg = isDark ? "#9A9A9A" : primary;
  // Accent for selection visuals = primary do tema selecionado
  const accent = primary;

  return (
    <div
      onClick={onSelect}
      role="button"
      aria-pressed={selected}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      style={{
        position: "relative",
        background: "#FFFFFF",
        border: selected ? `2px solid ${accent}` : "1px solid #ECECEE",
        borderRadius: 18,
        cursor: "pointer",
        boxShadow: selected
          ? `0 10px 24px ${accent}33, 0 1px 3px rgba(16,24,40,0.05)`
          : "0 4px 12px rgba(16,24,40,0.05), 0 1px 2px rgba(16,24,40,0.03)",
        transition: "all 180ms ease",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: "inherit",
        userSelect: "none",
      }}
    >
      {selected && (
        <span
          aria-hidden
          style={{
            position: "absolute", top: 8, right: 8, zIndex: 3,
            width: 22, height: 22, borderRadius: "50%",
            background: accent, color: "#FFFFFF",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 2px 6px ${accent}66`,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}

      <div style={{ position: "relative", background: bg, padding: "16px 14px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 38,
          background: `linear-gradient(135deg, ${primary} 0%, ${primary}b3 100%)`,
          opacity: isDark ? 0.35 : 0.2,
        }} />

        <div style={{ position: "relative", zIndex: 1, marginTop: 8 }}>
          <GenericAvatar bg={avatarBg} fg={avatarFg} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, width: "100%" }}>
          <div style={{ height: 7, width: "55%", borderRadius: 4, background: lineStrong }} />
          <div style={{ height: 5, width: "70%", borderRadius: 3, background: lineSoft }} />
        </div>

        <div style={{
          height: 24, width: "100%", borderRadius: 7, background: primary,
          marginTop: 2,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ height: 4, width: "40%", borderRadius: 2, background: "rgba(255,255,255,0.9)" }} />
        </div>

        <div style={{
          width: "100%", padding: 8, borderRadius: 9,
          background: surface, border: `1px solid ${lineSoft}`,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, background: `${primary}26`, border: `1px solid ${primary}55` }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ height: 4, width: "70%", borderRadius: 2, background: lineStrong }} />
            <div style={{ height: 3, width: "45%", borderRadius: 2, background: lineSoft }} />
          </div>
        </div>
      </div>

      <div style={{
        padding: "10px 14px 12px",
        borderTop: "1px solid #F2F2F4",
        background: "#FFFFFF",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111", letterSpacing: -0.2 }}>
          {THEME_DISPLAY_NAMES[tpl.id]}
        </div>
      </div>
    </div>
  );
}

export function ThemeChooserGrid({
  selectedId,
  onSelect,
}: {
  selectedId: SiteTemplateId | null;
  onSelect: (id: SiteTemplateId) => void;
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 14,
    }}>
      {SITE_TEMPLATES.map((tpl) => (
        <ThemePreviewCard
          key={tpl.id}
          tpl={tpl}
          selected={selectedId === tpl.id}
          onSelect={() => onSelect(tpl.id)}
        />
      ))}
    </div>
  );
}

export { THEME_DISPLAY_NAMES };
