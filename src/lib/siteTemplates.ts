/**
 * Catálogo de modelos visuais aplicáveis à página inicial do cliente final.
 * Cada modelo define quais aspectos visuais ele altera. Por padrão, um modelo
 * altera apenas os elementos primários (botões, destaques). Modelos podem
 * opcionalmente alterar também o fundo da página inicial (`applyBackground`).
 *
 * A personalização nunca afeta o footer, o painel administrativo nem as telas
 * de login/cadastro do cliente final.
 */

export type SiteTemplateId =
  | "classico"
  | "moderno"
  | "premium"
  | "minimalista"
  | "escuro"
  | "vermelho-classico";

export interface SiteTemplate {
  id: SiteTemplateId;
  name: string;
  /** [primary, secondary, tertiary, accent] — primeira cor é a principal. */
  palette: string[];
  /** Cor de fundo da página inicial, se o modelo definir alterar o fundo. */
  background?: string;
  /** Se true, aplica `background` na página inicial. */
  applyBackground?: boolean;
  /** Se true, aplica também na tela de login do cliente final. */
  applyLoginScreen?: boolean;
  preview: {
    coverBg: string;
    cardBg: string;
    text: string;
    textMuted: string;
    logoBg: string;
    chipBg: string;
    chipText: string;
    chipBorder: string;
    border: string;
  };
}

export const SITE_TEMPLATES: SiteTemplate[] = [
  {
    // Antigo "Modelo Clássico" — mantém as cores originais
    id: "classico",
    name: "Tema Laranja",
    palette: ["#F6671B", "#FFFFFF", "#111111", "#EFEFEF"],
    preview: { coverBg: "linear-gradient(135deg,#F6671B,#FFB089)", cardBg: "#FFFFFF", text: "#111111", textMuted: "#6F6F6F", logoBg: "#FFFFFF", chipBg: "#FFF1E8", chipText: "#F6671B", chipBorder: "#F6671B", border: "#EFEFEF" },
  },
  {
    // Antigo "Modelo Moderno" — passa a usar #cc0000 como cor principal
    id: "moderno",
    name: "Tema Vermelho",
    palette: ["#cc0000", "#FFFFFF", "#111111", "#FBE5E5"],
    preview: { coverBg: "linear-gradient(135deg,#cc0000,#ff5b5b)", cardBg: "#FFFFFF", text: "#111111", textMuted: "#6F6F6F", logoBg: "#FFFFFF", chipBg: "#FBE5E5", chipText: "#cc0000", chipBorder: "#cc0000", border: "#EFEFEF" },
  },
  {
    // Antigo "Modelo Premium" — vira o Tema Escuro de verdade
    id: "premium",
    name: "Tema Escuro",
    palette: ["#F5B324", "#1A1A1A", "#FFFFFF", "#2A2A2A"],
    background: "#0E0E0E",
    applyBackground: true,
    preview: { coverBg: "linear-gradient(135deg,#1F1F1F,#3A2A10)", cardBg: "#1A1A1A", text: "#F5F5F5", textMuted: "#B5B5B5", logoBg: "#262626", chipBg: "#262626", chipText: "#F5B324", chipBorder: "#F5B324", border: "#2A2A2A" },
  },
  {
    // Antigo "Modelo Minimalista" — passa a usar verde #074e36
    id: "minimalista",
    name: "Tema Verde",
    palette: ["#074e36", "#FFFFFF", "#111111", "#E3EFEA"],
    preview: { coverBg: "linear-gradient(135deg,#074e36,#1f8a63)", cardBg: "#FFFFFF", text: "#111111", textMuted: "#6F6F6F", logoBg: "#FFFFFF", chipBg: "#E3EFEA", chipText: "#074e36", chipBorder: "#074e36", border: "#E3EFEA" },
  },
  {
    // Antigo "Modelo Escuro" — vira o Tema Rosa (NÃO é mais um tema escuro)
    id: "escuro",
    name: "Tema Rosa",
    palette: ["#ff186b", "#FFFFFF", "#111111", "#FFE3EE"],
    preview: { coverBg: "linear-gradient(135deg,#ff186b,#ff77a4)", cardBg: "#FFFFFF", text: "#111111", textMuted: "#6F6F6F", logoBg: "#FFFFFF", chipBg: "#FFE3EE", chipText: "#ff186b", chipBorder: "#ff186b", border: "#FFE3EE" },
  },
  {
    // Antigo "Modelo Vermelho Clássico" — passa a ser o Tema Azul
    id: "vermelho-classico",
    name: "Tema Azul",
    palette: ["#1f80ff", "#FFFFFF", "#111111", "#E1EEFF"],
    preview: { coverBg: "linear-gradient(135deg,#1f80ff,#69aaff)", cardBg: "#FFFFFF", text: "#111111", textMuted: "#6F6F6F", logoBg: "#FFFFFF", chipBg: "#E1EEFF", chipText: "#1f80ff", chipBorder: "#1f80ff", border: "#E1EEFF" },
  },
];

export const DEFAULT_TEMPLATE_ID: SiteTemplateId = "classico";

export function getTemplate(id: SiteTemplateId | null | undefined): SiteTemplate {
  return (
    SITE_TEMPLATES.find((t) => t.id === id) ??
    SITE_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)!
  );
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h.split("").map((c) => c + c).join("")
      : h.length === 6
        ? h
        : "F6671B";
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
}

/**
 * Gera CSS escopado em `.sreli-root` para aplicar o modelo selecionado.
 * Não afeta o footer (deixamos as cores do footer hardcoded em Footer.tsx)
 * nem o painel administrativo (que vive em outra árvore de rotas).
 */
export function buildTemplateCss(template: SiteTemplate): string {
  const primary = template.palette[0] ?? "#F6671B";
  const secondary = template.palette[1] ?? "#FFFFFF";
  const rgb = hexToRgb(primary);
  // Detecta se o fundo aplicado é escuro para adaptar cor de texto/seções.
  const bg = template.applyBackground && template.background ? template.background : "#FFFFFF";
  const isDark = (() => {
    const h = bg.replace("#", "");
    if (h.length !== 6) return false;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum < 0.5;
  })();
  const onBg = isDark ? "#F5F5F5" : "#1A1A1A";
  const onBgMuted = isDark ? "#B5B5B5" : "#888888";
  const sectionBg = isDark ? "#1A1A1A" : "#f8f8f8";
  const sectionBorder = isDark ? "#2A2A2A" : "#EEEEEE";
  const bgRule =
    template.applyBackground && template.background
      ? `.sreli-root { background: ${template.background} !important; }`
      : "";
  return `
.sreli-root {
  --site-primary: ${primary};
  --site-primary-rgb: ${rgb};
  --site-secondary: ${secondary};
  --site-on-bg: ${onBg};
  --site-on-bg-muted: ${onBgMuted};
  --site-section-bg: ${sectionBg};
  --site-section-border: ${sectionBorder};
}
${bgRule}
`.trim();
}
