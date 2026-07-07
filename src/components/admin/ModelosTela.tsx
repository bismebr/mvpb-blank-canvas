import { useState } from "react";
import { COLORS, FONT, saveBtn, PageHeader } from "./ui";
import { useSiteConfig } from "./SiteConfigContext";
import { type SiteTemplateId } from "@/lib/siteTemplates";
import { ThemeChooserGrid } from "@/components/site/ThemeChooserGrid";

export function ModelosTela() {
  const { config, updateConfig } = useSiteConfig();
  const [selected, setSelected] = useState<SiteTemplateId>(config.template);
  const [saved, setSaved] = useState(false);
  const [applying, setApplying] = useState(false);

  const dirty = selected !== config.template;

  function handleSave() {
    setApplying(true);
    // Pequeno atraso para a transição visual ser perceptível e profissional
    window.setTimeout(() => {
      updateConfig({ template: selected });
      setApplying(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    }, 900);
  }

  return (
    <div
      style={{
        padding: "30px 16px 8px",
        fontFamily: FONT,
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <PageHeader
        title="Modelos visuais"
        subtitle="Escolha o visual do seu site de agendamento. Essa alteração será aplicada apenas na página que seus clientes acessam, mantendo o painel administrativo sem mudanças."
      />

      <ThemeChooserGrid
        selectedId={selected}
        onSelect={setSelected}
      />


      <div style={{ marginTop: 20 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || applying}
          style={{
            ...saveBtn,
            width: "100%",
            opacity: dirty && !applying ? 1 : 0.5,
            cursor: dirty && !applying ? "pointer" : "not-allowed",
          }}
        >
          {saved ? "Modelo aplicado ✓" : "Salvar modelo"}
        </button>
        {saved && (
          <p
            style={{
              fontSize: 12,
              color: COLORS.textMuted,
              textAlign: "center",
              marginTop: 10,
            }}
          >
            As alterações já aparecem na sua página inicial.
          </p>
        )}
      </div>

      {applying && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(15,15,20,0.55)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT,
            animation: "bismeModelOverlay 200ms ease",
          }}
        >
          <style>{`
            @keyframes bismeModelOverlay { from { opacity: 0 } to { opacity: 1 } }
            @keyframes bismeModelSpin { to { transform: rotate(360deg) } }
            @keyframes bismeModelPop {
              0% { opacity: 0; transform: scale(0.94) translateY(6px); }
              100% { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
          <div
            style={{
              background: COLORS.bgSurface,
              color: COLORS.textPrimary,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 18,
              padding: "26px 30px",
              minWidth: 240,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              boxShadow: "0 24px 60px -16px rgba(0,0,0,0.45)",
              animation: "bismeModelPop 260ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "3px solid rgba(86, 144, 245,0.18)",
                borderTopColor: COLORS.accentLight,
                animation: "bismeModelSpin 800ms linear infinite",
              }}
            />
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.1 }}>
              Aplicando novo modelo…
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, textAlign: "center" }}>
              Atualizando a página do seu site de agendamento.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
