import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import logoBarbearia from "@/assets/logo-barbearia.jpg";
import heroBarbearia from "@/assets/hero-barbearia.png";
import certificadoImg from "@/assets/certificado-sr-eli.jpg";
import work1 from "@/assets/work-1.jpg";
import work2 from "@/assets/work-2.jpg";
import work3 from "@/assets/work-3.jpg";
import work4 from "@/assets/work-4.jpg";
import work5 from "@/assets/work-5.jpg";
import work6 from "@/assets/work-6.jpg";
import work7 from "@/assets/work-7.jpg";
import { DEFAULT_TEMPLATE_ID, type SiteTemplateId } from "@/lib/siteTemplates";

/**
 * REGRA DEFINITIVA (preparada para integração futura com Supabase):
 *
 * Existem TRÊS origens de dados, completamente separadas:
 *
 *  1) DEMO_SITE_CONFIG — dados completos e fictícios do modelo/demo.
 *     Usado apenas para:
 *       - site modelo (rota pública `/`, `/avaliacoes`, `/meus-agendamentos`)
 *       - pré-visualização de templates
 *       - divulgação / screenshots
 *     NUNCA pode ser usado como fallback de dados reais de um proprietário.
 *
 *  2) EMPTY_OWNER_CONFIG — config inicial do proprietário real.
 *     Todos os campos configuráveis começam vazios, com placeholder no painel.
 *     Exceções permitidas (já preenchidas):
 *       - `aboutText`: texto padrão da seção "Sobre nós" do segmento.
 *       - Avaliações modelo (vivem em `src/components/barbearia/data.ts`)
 *         e são lidas diretamente pelos componentes de exibição.
 *     Usado em: painel administrativo (`/admin`) e onboarding
 *     (`/empresario/onboarding`).
 *
 *  3) Dados reais do tenant (futuro Supabase) — quando conectado, cada
 *     proprietário carrega APENAS os próprios dados. Sem dados salvos,
 *     o campo permanece vazio (sem fallback para DEMO_SITE_CONFIG).
 */

export type Segmento = "barbearia" | "salao" | "clinica" | "outros";

export interface SiteConfig {
  tenantId: string;
  segmento: Segmento;
  username: string;
  logo: string;
  coverImage: string;
  businessName: string;
  /** Endereço completo formatado: "Rua, número, cidade - Estado". Derivado dos campos abaixo. */
  address: string;
  addressStreet: string;
  addressNumber: string;
  addressCity: string;
  addressState: string;
  reviewsCount: number;
  ratingAverage: number;
  whatsapp: string;
  instagram: string;
  googleMapsLink: string;
  tiktok: string;
  facebook: string;
  youtube: string;
  site: string;
  aboutImage: string;
  aboutText: string;
  workGallery: string[];
  /** Exibir botão "Ver mais no Google" na seção de avaliações. */
  showGoogleReviewsButton: boolean;
  /** Exibe o endereço para os clientes finais (tela inicial, meus agendamentos, localização). */
  showAddress: boolean;
  /** Modelo visual aplicado à página inicial do cliente final. */
  template: SiteTemplateId;
  /** IDs das comodidades selecionadas para exibir na página inicial. */
  comodidades: string[];
  /**
   * Marca se o proprietário já completou todos os campos obrigatórios do site
   * pelo menos uma vez. Usado para exibir a tela de parabenização apenas na
   * primeira vez. Persistir no Supabase quando a integração estiver ativa.
   */
  siteCompleted: boolean;
}

/** Monta "Rua, número, cidade - Estado" (sem número se vazio). */
export function formatAddressParts(parts: {
  addressStreet?: string;
  addressNumber?: string;
  addressCity?: string;
  addressState?: string;
}): string {
  const street = (parts.addressStreet ?? "").trim();
  const number = (parts.addressNumber ?? "").trim();
  const city = (parts.addressCity ?? "").trim();
  const state = (parts.addressState ?? "").trim();
  const left = [street, number, city].filter(Boolean).join(", ");
  if (!left && !state) return "";
  if (!state) return left;
  if (!left) return state;
  return `${left} - ${state}`;
}

export const SITE_PUBLIC_BASE = "bisme.com.br/";

export const TEXTOS_SEGMENTO: Record<Segmento, string> = {
  barbearia:
    "Somos uma barbearia que une tradição e modernidade, oferecendo cortes de alta qualidade em um ambiente acolhedor. Cada atendimento é feito com técnica, atenção aos detalhes e respeito ao estilo de cada cliente — porque cuidar bem de você é o nosso compromisso.",
  salao:
    "Nosso salão é um espaço dedicado à beleza, ao bem-estar e à autoestima. Profissionais experientes trabalham com carinho para realçar o seu melhor, em um ambiente confortável e elegante. Aqui, cada visita é uma experiência única.",
  clinica:
    "Somos uma clínica comprometida com o cuidado, a saúde e o bem-estar de cada paciente. Nossa equipe trabalha com profissionalismo, ética e tecnologia para oferecer o melhor atendimento, sempre com atenção, segurança e acolhimento.",
  outros:
    "Trabalhamos com dedicação para oferecer um serviço de qualidade, com atendimento próximo e foco total na experiência do cliente. Conheça nosso espaço e descubra por que tantas pessoas escolhem estar com a gente.",
};

/**
 * Texto padrão da seção "Sobre nós" — aceito como dado pré-preenchido tanto
 * no demo quanto no config de um novo proprietário.
 */
const DEFAULT_ABOUT_TEXT =
  "Compromisso, cuidado e dedicação fazem parte de cada detalhe. Nosso objetivo é oferecer um atendimento de qualidade, proporcionando uma experiência simples, agradável e confiável para cada cliente.";

/**
 * DEMO_SITE_CONFIG — mantido apenas como alias do config vazio.
 * Sem dados fictícios: o site público exibe estados vazios até o
 * proprietário configurar os campos no painel.
 */
export const DEMO_SITE_CONFIG: SiteConfig = {
  tenantId: "",
  segmento: "barbearia",
  username: "",
  logo: "",
  coverImage: "",
  businessName: "",
  address: "",
  addressStreet: "",
  addressNumber: "",
  addressCity: "",
  addressState: "",
  reviewsCount: 0,
  ratingAverage: 0,
  whatsapp: "",
  instagram: "",
  googleMapsLink: "",
  tiktok: "",
  facebook: "",
  youtube: "",
  site: "",
  aboutImage: "",
  aboutText: DEFAULT_ABOUT_TEXT,
  workGallery: [],
  showGoogleReviewsButton: false,
  showAddress: false,
  template: DEFAULT_TEMPLATE_ID,
  comodidades: [],
  siteCompleted: false,
};


/**
 * EMPTY_OWNER_CONFIG — estado inicial de um proprietário real.
 * Todos os campos configuráveis começam vazios; o painel administrativo
 * exibe apenas placeholders. Quando o Supabase for conectado, hidratar
 * APENAS com dados reais do tenant logado — sem fallback para o demo.
 */
export const EMPTY_OWNER_CONFIG: SiteConfig = {
  tenantId: "",
  segmento: "barbearia",
  username: "",
  logo: "",
  coverImage: "",
  businessName: "",
  address: "",
  addressStreet: "",
  addressNumber: "",
  addressCity: "",
  addressState: "",
  reviewsCount: 0,
  ratingAverage: 0,
  whatsapp: "",
  instagram: "",
  googleMapsLink: "",
  tiktok: "",
  facebook: "",
  youtube: "",
  site: "",
  aboutImage: "",
  aboutText: DEFAULT_ABOUT_TEXT,
  workGallery: [],
  showGoogleReviewsButton: false,
  showAddress: false,
  template: DEFAULT_TEMPLATE_ID,
  comodidades: [],
  siteCompleted: false,
};

interface Ctx {
  config: SiteConfig;
  updateConfig: (patch: Partial<SiteConfig>) => void;
  resetConfig: () => void;
}

const SiteConfigCtx = createContext<Ctx | null>(null);

/**
 * Provider do SiteConfig.
 *
 * - Sem `initialConfig`: assume o DEMO_SITE_CONFIG. É o que o `__root.tsx`
 *   usa para o site modelo público.
 * - Com `initialConfig={EMPTY_OWNER_CONFIG}`: usado nas rotas do
 *   proprietário (`/admin`, `/empresario/onboarding`) para garantir que
 *   nenhum dado do demo vaze para o painel real.
 *
 * Providers podem ser aninhados — o mais interno sobrescreve o externo.
 */
export function SiteConfigProvider({
  children,
  initialConfig = DEMO_SITE_CONFIG,
}: {
  children: ReactNode;
  initialConfig?: SiteConfig;
}) {
  const [config, setConfig] = useState<SiteConfig>(initialConfig);

  const updateConfig = useCallback((patch: Partial<SiteConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetConfig = useCallback(() => setConfig(initialConfig), [initialConfig]);

  const value = useMemo(() => ({ config, updateConfig, resetConfig }), [config, updateConfig, resetConfig]);

  return <SiteConfigCtx.Provider value={value}>{children}</SiteConfigCtx.Provider>;
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigCtx);
  if (!ctx) throw new Error("useSiteConfig must be used within SiteConfigProvider");
  return ctx;
}

/** Helper para gerar link do Google Maps a partir de um endereço. */
export function buildGoogleMapsLink(address: string) {
  if (!address.trim()) return "";
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address);
}

/** Helper para WhatsApp link a partir de número (apenas dígitos). */
export function buildWhatsappLink(numero: string) {
  const clean = numero.replace(/\D+/g, "");
  if (!clean) return "#";
  return `https://wa.me/${clean}`;
}

export function buildInstagramLink(user: string) {
  const raw = user.trim();
  if (!raw) return "#";
  if (/^https?:\/\//i.test(raw)) return raw;
  const u = raw.replace(/^@/, "");
  return `https://instagram.com/${u}`;
}

export function buildTiktokLink(user: string) {
  const raw = user.trim();
  if (!raw) return "#";
  if (/^https?:\/\//i.test(raw)) return raw;
  const u = raw.replace(/^@/, "");
  return `https://www.tiktok.com/@${u}`;
}
