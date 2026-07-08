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
    background: "#0f0f10",
    applyBackground: true,
    preview: { coverBg: "linear-gradient(135deg,#1F1F1F,#3A2A10)", cardBg: "#18181b", text: "#F5F5F5", textMuted: "#B5B5B5", logoBg: "#262626", chipBg: "#262626", chipText: "#F5B324", chipBorder: "#F5B324", border: "#2A2A2A" },
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
  const sectionBg = isDark ? "#0f0f10" : "#f8f8f8";
  const sectionBorder = isDark ? "#2a2a2f" : "#EEEEEE";
  const pageBg = isDark ? "#0f0f10" : "#FFFFFF";
  const cardBg = isDark ? "#0f0f10" : "#FFFFFF";
  const cardBgAlt = isDark ? "#18181b" : "#f2f1f6";
  const softBg = isDark ? "#0f0f10" : "#f8f8f8";
  const divider = isDark ? "#2a2a2f" : "#EEEEEE";
  const bgRule =
    template.applyBackground && template.background
      ? `.sreli-root { background: ${template.background} !important; }`
      : "";
  // Rede de segurança: aplica cores escuras a QUALQUER estilo inline branco/claro
  // remanescente dentro do modelo escuro do site de agendamento. Excluímos a
  // tela de login/cadastro do cliente (`.sreli-login-overlay`) para preservar
  // seu visual claro original. Não afeta painel administrativo, footer,
  // landing /venda, /admin, /bisme-admin.
  const NOT_LOGIN = ":not(.sreli-login-overlay *):not(.sreli-login-overlay)";
  const darkOverrides = isDark
    ? `
.sreli-root { color: ${onBg}; }

/* Fundos brancos e "off-white" → fundo escuro principal (#0f0f10) */
.sreli-root [style*="background: rgb(255, 255, 255)"]${NOT_LOGIN},
.sreli-root [style*="background:rgb(255, 255, 255)"]${NOT_LOGIN},
.sreli-root [style*="background: #FFFFFF"]${NOT_LOGIN},
.sreli-root [style*="background:#FFFFFF"]${NOT_LOGIN},
.sreli-root [style*="background: #ffffff"]${NOT_LOGIN},
.sreli-root [style*="background:#ffffff"]${NOT_LOGIN},
.sreli-root [style*="background-color: rgb(255, 255, 255)"]${NOT_LOGIN},
.sreli-root [style*="background-color:rgb(255, 255, 255)"]${NOT_LOGIN},
.sreli-root [style*="background: rgb(248, 248, 248)"]${NOT_LOGIN},
.sreli-root [style*="background: #f8f8f8"]${NOT_LOGIN},
.sreli-root [style*="background:#f8f8f8"]${NOT_LOGIN} {
  background-color: ${cardBg} !important;
  background-image: none !important;
}

/* Cinzas suaves de cards internos (resumo, horários, nota, campo desabilitado) → #18181b */
.sreli-root [style*="background: rgb(242, 241, 246)"]${NOT_LOGIN},
.sreli-root [style*="background: #f2f1f6"]${NOT_LOGIN},
.sreli-root [style*="background:#f2f1f6"]${NOT_LOGIN},
.sreli-root [style*="background: rgb(245, 245, 245)"]${NOT_LOGIN},
.sreli-root [style*="background: #F5F5F5"]${NOT_LOGIN},
.sreli-root [style*="background:#F5F5F5"]${NOT_LOGIN} {
  background-color: ${cardBgAlt} !important;
  background-image: none !important;
}

/* Divisórias horizontais (elementos usados como linha) */
.sreli-root [style*="background: rgb(240, 240, 240)"]${NOT_LOGIN},
.sreli-root [style*="background: #F0F0F0"]${NOT_LOGIN},
.sreli-root [style*="background: rgb(229, 229, 226)"]${NOT_LOGIN},
.sreli-root [style*="background: #E5E5E2"]${NOT_LOGIN},
.sreli-root [style*="background: rgb(238, 238, 238)"]${NOT_LOGIN},
.sreli-root [style*="background: #EEEEEE"]${NOT_LOGIN} {
  background-color: ${divider} !important;
}

/* Textos escuros → claros */
.sreli-root [style*="color: rgb(26, 26, 26)"]${NOT_LOGIN},
.sreli-root [style*="color:rgb(26, 26, 26)"]${NOT_LOGIN},
.sreli-root [style*="color: #1A1A1A"]${NOT_LOGIN},
.sreli-root [style*="color:#1A1A1A"]${NOT_LOGIN},
.sreli-root [style*="color: rgb(17, 17, 17)"]${NOT_LOGIN},
.sreli-root [style*="color: #111111"]${NOT_LOGIN},
.sreli-root [style*="color: #111"]${NOT_LOGIN},
.sreli-root [style*="color: rgb(0, 0, 0)"]${NOT_LOGIN},
.sreli-root [style*="color: #000000"]${NOT_LOGIN},
.sreli-root [style*="color: #000"]${NOT_LOGIN} {
  color: ${onBg} !important;
}

/* Textos "muted" → cinza claro no escuro */
.sreli-root [style*="color: rgb(102, 102, 102)"]${NOT_LOGIN},
.sreli-root [style*="color: rgb(136, 136, 136)"]${NOT_LOGIN},
.sreli-root [style*="color: rgb(68, 68, 68)"]${NOT_LOGIN},
.sreli-root [style*="color: #666"]${NOT_LOGIN},
.sreli-root [style*="color: #888"]${NOT_LOGIN},
.sreli-root [style*="color: #444"]${NOT_LOGIN} {
  color: ${onBgMuted} !important;
}

/* Bordas divisórias → #2a2a2f
   Fallback amplo: qualquer inline style que contenha uma cor cinza clara
   comum tem sua border-color forçada para o divisor escuro. Cobre todas
   as variações de shorthand (border, border-top/bottom/left/right,
   border-color) sem depender da largura (1px / 1.5px / 2px). Necessário
   porque no mobile alguns elementos sticky/sheet renderizam com strings
   de estilo que não batiam nas regras específicas de largura fixa. */
.sreli-root [style*="rgb(238, 238, 238)"]${NOT_LOGIN},
.sreli-root [style*="rgb(239, 239, 239)"]${NOT_LOGIN},
.sreli-root [style*="rgb(240, 240, 240)"]${NOT_LOGIN},
.sreli-root [style*="rgb(224, 224, 224)"]${NOT_LOGIN},
.sreli-root [style*="rgb(221, 221, 221)"]${NOT_LOGIN},
.sreli-root [style*="rgb(228, 228, 228)"]${NOT_LOGIN},
.sreli-root [style*="rgb(229, 229, 229)"]${NOT_LOGIN},
.sreli-root [style*="rgb(212, 212, 216)"]${NOT_LOGIN},
.sreli-root [style*="rgb(229, 231, 235)"]${NOT_LOGIN},
.sreli-root [style*="rgb(229, 229, 226)"]${NOT_LOGIN} {
  border-color: ${divider} !important;
}

/* Borda 3px branca em volta da logo/foto do negócio → #18181b */
.sreli-root [style*="border: 3px solid rgb(255, 255, 255)"]${NOT_LOGIN},
.sreli-root [style*="border: 3px solid #FFFFFF"]${NOT_LOGIN},
.sreli-root [style*="border:3px solid #FFFFFF"]${NOT_LOGIN} {
  border-color: #18181b !important;
}

/* Borda 1.5px branca (cards de serviços com border igual ao bg) → #18181b */
.sreli-root [style*="border: 1.5px solid rgb(255, 255, 255)"]${NOT_LOGIN},
.sreli-root [style*="border: 1.5px solid #FFFFFF"]${NOT_LOGIN} {
  border-color: #18181b !important;
}
`
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
  --site-page-bg: ${pageBg};
  --site-card-bg: ${cardBg};
  --site-soft-bg: ${softBg};
}
${bgRule}
${darkOverrides}
`.trim();
}


