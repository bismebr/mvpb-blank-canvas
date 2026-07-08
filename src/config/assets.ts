/**
 * ============================================================================
 * BISME — Assets Fixos do Sistema
 * ============================================================================
 *
 * Este arquivo é a ÚNICA fonte de verdade para imagens fixas do projeto
 * (logos da Bisme, previews de modelos/temas, imagens institucionais,
 * onboarding, página de venda, header/footer).
 *
 * REGRAS OBRIGATÓRIAS (não violar — quebra build/export):
 *
 *   1. Toda imagem fixa DEVE ser um arquivo real dentro de `src/assets/`
 *      e ser importada via Vite (`import x from "@/assets/foo.png"`).
 *   2. NÃO usar `*.asset.json`.
 *   3. NÃO usar URLs do CDN interno (`/__l5e/assets-v1/...`).
 *   4. NÃO usar `blob:` ou URLs temporárias da Lovable.
 *   5. NÃO usar strings cruas `"/src/assets/..."` em JSX/CSS — sempre import.
 *   6. NÃO depender de imagens externas (CDNs de terceiros) para assets fixos.
 *
 * Imagens DINÂMICAS de proprietários/clientes (logo do estabelecimento,
 * banner, fotos de serviços, galeria "Nosso trabalho", fotos de
 * funcionários) NÃO pertencem aqui — elas vêm do Supabase Storage / banco
 * e seguem o fluxo normal de upload do proprietário.
 * ============================================================================
 */

// --- Logos Bisme ---------------------------------------------------------
import bismeLogoUserUrl from "@/assets/bisme-user-logo.svg?url";
import bismeLogoEmpresarioHeaderUrl from "@/assets/bisme-empresario-header.svg?url";
import bismeLogoFooterUrl from "@/assets/bisme-footer.svg?url";

// --- Previews dos Modelos/Temas -----------------------------------------
import modeloClassicoPreview from "@/assets/modelo-classico-preview.png?url";
import modeloModernoPreview from "@/assets/modelo-moderno-preview.png?url";
import modeloPremiumPreview from "@/assets/modelo-premium-preview.png?url";
import modeloMinimalistaPreview from "@/assets/modelo-minimalista-preview.png?url";
import modeloEscuroPreview from "@/assets/modelo-escuro-preview.png?url";
import modeloVermelhoClassicoPreview from "@/assets/modelo-vermelho-classico-preview.png?url";

// --- Onboarding / Página de venda / Benefícios --------------------------
import megaphoneNewUrl from "@/assets/megaphone-new.svg?url";
import benefitAgenda from "@/assets/bisme-landing/benefit-agenda.jpg";
import benefitGestao from "@/assets/bisme-landing/benefit-gestao.jpg";
import benefitLink from "@/assets/bisme-landing/benefit-link.jpg";
import benefitWhatsapp from "@/assets/bisme-landing/benefit-whatsapp.jpg";
import heroMockup from "@/assets/bisme-landing/hero-mockup.jpg";
import heroSalon from "@/assets/bisme-landing/hero-salon.png";
import benefitAgendaPerson from "@/assets/bisme-landing/benefit-agenda-person.png";
import heroBarbearia from "@/assets/bisme-landing/hero-barbearia.png";
import heroFutebol from "@/assets/bisme-landing/hero-futebol.png";
import heroPsicologia from "@/assets/bisme-landing/hero-psicologia.png";
import heroRealce from "@/assets/hero-realce.png";

/** Logos fixas Bisme — usadas em telas do sistema (login cliente, login
 *  empresário, header empresário, painel admin, footer). */
export const BISME_LOGOS = {
  /** Logo Bisme usada no login/cadastro do cliente final e no footer da página pública. */
  user: bismeLogoUserUrl,
  /** Logo Bisme usada no header do empresário (login/cadastro/onboarding). */
  empresarioHeader: bismeLogoEmpresarioHeaderUrl,
  /** Logo Bisme usada no painel administrativo / footer institucional. */
  footer: bismeLogoFooterUrl,
} as const;

/** Previews dos modelos/temas — fonte única usada tanto no onboarding
 *  quanto no painel administrativo (Meu Site → Modelos). */
export const TEMPLATE_PREVIEWS = {
  classico: modeloClassicoPreview,
  moderno: modeloModernoPreview,
  premium: modeloPremiumPreview,
  minimalista: modeloMinimalistaPreview,
  escuro: modeloEscuroPreview,
  "vermelho-classico": modeloVermelhoClassicoPreview,
} as const;

/** Imagens institucionais / página de venda / onboarding. */
export const LANDING_ASSETS = {
  megaphone: megaphoneNewUrl,
  benefitAgenda,
  benefitGestao,
  benefitLink,
  benefitWhatsapp,
  heroMockup,
  heroSalon,
  benefitAgendaPerson,
  heroBarbearia,
  heroFutebol,
  heroPsicologia,
  heroRealce,
} as const;

export type TemplatePreviewId = keyof typeof TEMPLATE_PREVIEWS;
