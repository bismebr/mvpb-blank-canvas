import { DotsSpinner } from "./DotsSpinner";
import {
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  type SiteTemplateId,
} from "@/lib/siteTemplates";

const CACHE_PREFIX = "sreli:tpl:";

function resolveTemplateId(slug?: string | null): SiteTemplateId {
  if (!slug) return DEFAULT_TEMPLATE_ID;
  try {
    if (typeof window === "undefined") return DEFAULT_TEMPLATE_ID;
    const raw = window.localStorage.getItem(CACHE_PREFIX + slug);
    return (raw as SiteTemplateId) || DEFAULT_TEMPLATE_ID;
  } catch {
    return DEFAULT_TEMPLATE_ID;
  }
}

/**
 * Overlay de loading do site de agendamento.
 *
 * Sempre resolve fundo + cor do spinner a partir do modelo visual do site,
 * mesmo quando renderizado ANTES do BarbeariaLayout aplicar `.sreli-root`
 * (evita flash branco/azul na entrada inicial, no reload e ao voltar de
 * "Meus agendamentos"). Usa cache local por slug (`sreli:tpl:<slug>`) —
 * puramente visual, sem dados sensíveis.
 *
 * `message` é ignorado por design (loadings do site não exibem texto).
 */
export function LoadingOverlay({
  slug,
  templateId,
}: { message?: string; slug?: string | null; templateId?: SiteTemplateId | null } = {}) {
  const tplId = templateId ?? resolveTemplateId(slug);
  const template = getTemplate(tplId);
  const isDark = !!template.applyBackground && !!template.background;
  const bg = isDark ? template.background! : "#FFFFFF";
  const spinnerColor = template.palette[0] ?? "#5690f5";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando"
      style={{
        position: "fixed",
        inset: 0,
        background: bg,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <DotsSpinner size={44} color={spinnerColor} />
    </div>
  );
}
