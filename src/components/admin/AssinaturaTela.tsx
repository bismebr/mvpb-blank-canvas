import { useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { COLORS, FONT, PageHeader } from "./ui";
import { supabase } from "@/integrations/supabase/client";
import { createStripeCheckoutSession } from "@/lib/stripe.functions";
import { syncStripeSubscription } from "@/lib/stripe-sync.functions";
import {
  getDaysLeft,
  isPaidActive,
  isTrialActive,
  isSubscriptionBlocked,
  type SubscriptionLike,
  type SubscriptionStatus,
} from "@/lib/subscription";

type CheckoutFlash = { tone: "success" | "cancel"; message: string } | null;

function readCheckoutFlash(): CheckoutFlash {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const v = params.get("checkout");
  if (v !== "success" && v !== "cancel") return null;
  // limpa da URL sem recarregar
  params.delete("checkout");
  params.delete("session_id");
  const qs = params.toString();
  const newUrl = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
  window.history.replaceState(null, "", newUrl);
  return v === "success"
    ? {
        tone: "success",
        message:
          "Recebemos o retorno do checkout. Assim que o pagamento for confirmado, seu plano será atualizado nesta tela.",
      }
    : {
        tone: "cancel",
        message: "Checkout cancelado. Você pode escolher um plano novamente quando quiser.",
      };
}

const PRECO_MENSAL = 29.9;
const PRECO_ANUAL = 239.9;
const ECONOMIA_ANUAL = PRECO_MENSAL * 12 - PRECO_ANUAL;

function brl(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

function fmtBRfromISO(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function labelDiasRestantes(dias: number): string {
  if (dias < 0) return "Teste expirado";
  if (dias === 0) return "Vence hoje";
  if (dias === 1) return "1 dia restante";
  return `${dias} dias restantes`;
}

interface Props {
  companyId?: string | null;
  /** Quando true, mostra aviso "acesso pausado" e enfatiza CTA de assinar. */
  blocked?: boolean;
}

export function AssinaturaTela({ companyId, blocked = false }: Props) {
  const [sub, setSub] = useState<SubscriptionLike | null>(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<CheckoutFlash>(null);

  useEffect(() => {
    setFlash(readCheckoutFlash());
  }, []);

  useEffect(() => {


    let cancelled = false;
    async function load() {
      if (!companyId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("subscriptions")
        .select(
          "plan,status,trial_started_at,trial_ends_at,current_period_start,current_period_end,canceled_at,updated_at",
        )
        .eq("company_id", companyId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("[assinatura] falha ao carregar subscription:", error);
        setSub(null);
      } else {
        setSub(data as SubscriptionLike | null);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  // Polling leve após checkout=success: aguarda o webhook confirmar active.
  useEffect(() => {
    if (!companyId || flash?.tone !== "success") return;
    if (sub?.status === "active") return;
    let cancelled = false;
    let tries = 0;
    const maxTries = 10; // ~20s
    const timer = setInterval(async () => {
      tries += 1;
      const { data } = await supabase
        .from("subscriptions")
        .select(
          "plan,status,trial_started_at,trial_ends_at,current_period_start,current_period_end,canceled_at,updated_at",
        )
        .eq("company_id", companyId)
        .maybeSingle();
      if (cancelled) return;
      if (data) setSub(data as SubscriptionLike);
      if ((data && (data as SubscriptionLike).status === "active") || tries >= maxTries) {
        clearInterval(timer);
      }
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [companyId, flash?.tone, sub?.status]);

  // Esconde o banner de checkout assim que a assinatura vira active.
  useEffect(() => {
    if (sub?.status === "active" && flash?.tone === "success") {
      setFlash(null);
    }
  }, [sub?.status, flash?.tone]);

  // Backfill: se está active mas current_period_end está vazio, sincroniza da Stripe.
  const syncFn = useServerFn(syncStripeSubscription);
  useEffect(() => {
    if (!companyId) return;
    if (sub?.status !== "active") return;
    if (sub?.current_period_end) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await syncFn({ data: { companyId } });
        if (cancelled || !res?.updated) return;
        const { data } = await supabase
          .from("subscriptions")
          .select(
            "plan,status,trial_started_at,trial_ends_at,current_period_start,current_period_end,canceled_at,updated_at",
          )
          .eq("company_id", companyId)
          .maybeSingle();
        if (!cancelled && data) setSub(data as SubscriptionLike);
      } catch (e) {
        console.warn("[assinatura] falha ao sincronizar subscription:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, sub?.status, sub?.current_period_end, syncFn]);


  const status = (sub?.status ?? "none") as SubscriptionStatus;
  const trialAtivo = isTrialActive(sub);
  const pagoAtivo = isPaidActive(sub);
  const painelBloqueado = blocked || isSubscriptionBlocked(sub);

  return (
    <div
      style={{
        padding: "28px 16px 24px",
        background: COLORS.bgBase,
        minHeight: "calc(100vh - 56px)",
        fontFamily: FONT,
        maxWidth: 1080,
        margin: "0 auto",
      }}
    >
      <PageHeader
        title="Assinatura"
        subtitle="Gerencie seu plano, período de teste e opções de assinatura."
      />

      {loading && (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            color: COLORS.textMuted,
            fontSize: 13,
          }}
        >
          Carregando...
        </div>
      )}

      {!loading && painelBloqueado && <AcessoPausadoBanner />}
      {flash && <CheckoutFlashBanner flash={flash} onClose={() => setFlash(null)} />}

      {!loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 16,
          }}
          className="bisme-assinatura-grid"
        >
          <StatusCard sub={sub} status={status} trialAtivo={trialAtivo} pagoAtivo={pagoAtivo} />
          <PlanosCard status={status} pagoAtivo={pagoAtivo} companyId={companyId ?? null} />
        </div>
      )}


      {!loading && (
        <Sec titulo="Histórico de pagamentos">
          <EmptyState
            titulo="Nenhum pagamento registrado ainda"
            descricao="Quando você realizar seu primeiro pagamento, ele aparecerá aqui."
          />
        </Sec>
      )}

      <style>{`
        @media (min-width: 900px) {
          .bisme-assinatura-grid {
            grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr) !important;
            align-items: start;
          }
        }
      `}</style>
    </div>
  );
}

/* ============================================================ */

function CheckoutFlashBanner({
  flash,
  onClose,
}: {
  flash: NonNullable<CheckoutFlash>;
  onClose: () => void;
}) {
  const success = flash.tone === "success";
  return (
    <div
      role="status"
      style={{
        borderRadius: 12,
        padding: "12px 14px",
        marginBottom: 16,
        background: success ? "#ECFDF5" : COLORS.bgElevated,
        border: `1.5px solid ${success ? "#86EFAC" : COLORS.border}`,
        color: COLORS.textPrimary,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 13.5, lineHeight: 1.5, flex: 1 }}>{flash.message}</div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        style={{
          background: "transparent",
          border: "none",
          color: COLORS.textMuted,
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          padding: 4,
        }}
      >
        ×
      </button>
    </div>
  );
}

/* ============================================================ */



function AcessoPausadoBanner() {
  return (
    <div
      role="alert"
      style={{
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 16,
        background: COLORS.dangerBg,
        border: `1.5px solid ${COLORS.dangerBorder}`,
        color: COLORS.textPrimary,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.danger, letterSpacing: 0.3, textTransform: "uppercase" }}>
        Seu acesso está pausado
      </div>
      <div style={{ fontSize: 13.5, color: COLORS.textPrimary, marginTop: 6, lineHeight: 1.5 }}>
        Seu teste grátis terminou. Escolha um plano para continuar usando a Bisme. Enquanto isso, apenas esta tela e o botão de sair estão disponíveis.
      </div>
    </div>
  );
}

/* ============================================================ */

function StatusCard({
  sub,
  status,
  trialAtivo,
  pagoAtivo,
}: {
  sub: SubscriptionLike | null;
  status: SubscriptionStatus;
  trialAtivo: boolean;
  pagoAtivo: boolean;
}) {
  // 1) Sem trial iniciado ainda
  if (status === "none") {
    return (
      <Card>
        <Badge tone="neutral">Sem plano</Badge>
        <Titulo>Preparando seu teste grátis</Titulo>
        <Texto>Assim que você acessar o painel, seu teste grátis de 7 dias será ativado automaticamente.</Texto>
      </Card>
    );
  }

  // 2) Trial (ativo ou expirado)
  if (status === "trial") {
    const dias = getDaysLeft(sub?.trial_ends_at);
    const expirado = !trialAtivo;
    // duração real do trial em dias (para não mostrar "7 de 7" quando o period é de 30)
    return (
      <Card highlight={expirado ? "danger" : "accent"}>
        <Badge tone={expirado ? "danger" : "accent"}>
          {expirado ? "Teste expirado" : "Teste grátis"}
        </Badge>
        <Titulo>
          {expirado ? "Seu período de teste terminou" : "Seu teste grátis está ativo"}
        </Titulo>
        <Texto>
          {expirado
            ? "Escolha um plano abaixo para continuar usando o painel."
            : "Você pode usar a Bisme normalmente durante o período de teste."}
        </Texto>

        <TrialProgress
          inicio={sub?.trial_started_at ?? null}
          fim={sub?.trial_ends_at ?? null}
          dias={dias}
          expirado={expirado}
        />

        <InfoRow
          items={[
            { label: "Início", valor: fmtBRfromISO(sub?.trial_started_at) },
            { label: "Válido até", valor: fmtBRfromISO(sub?.trial_ends_at) },
          ]}
        />
      </Card>
    );
  }

  // 3) Active
  if (status === "active") {
    const nome = planoNome(sub?.plan);
    const preco = planoPreco(sub?.plan);
    const dias = getDaysLeft(sub?.current_period_end);
    return (
      <Card highlight="accent">
        <Badge tone="success">Plano ativo</Badge>
        <Titulo>{nome}</Titulo>
        <Texto>
          {preco !== null ? `${brl(preco)} ${sub?.plan === "anual" ? "/ ano" : "/ mês"}` : "Assinatura ativa."}
        </Texto>
        <InfoRow
          items={[
            { label: "Próxima renovação", valor: fmtBRfromISO(sub?.current_period_end) },
            { label: "Faltam", valor: dias > 0 ? `${dias} dias` : "hoje" },
          ]}
        />
      </Card>
    );
  }

  // 4) past_due
  if (status === "past_due") {
    return (
      <Card highlight="warning">
        <Badge tone="warning">Pagamento pendente</Badge>
        <Titulo>Regularize sua assinatura</Titulo>
        <Texto>
          Detectamos um problema no seu último pagamento. Atualize sua forma de pagamento para manter o acesso ao painel.
        </Texto>
      </Card>
    );
  }

  // 5) canceled
  if (status === "canceled") {
    const acessoAtivo = pagoAtivo;
    return (
      <Card highlight={acessoAtivo ? "accent" : "danger"}>
        <Badge tone={acessoAtivo ? "neutral" : "danger"}>Cancelado</Badge>
        <Titulo>
          {acessoAtivo ? "Assinatura cancelada" : "Assinatura encerrada"}
        </Titulo>
        <Texto>
          {acessoAtivo
            ? "Você mantém acesso até o fim do período pago. Depois disso, o painel será pausado."
            : "O período pago acabou. Escolha um plano para voltar a usar a Bisme."}
        </Texto>
        {acessoAtivo && (
          <InfoRow
            items={[
              { label: "Acesso até", valor: fmtBRfromISO(sub?.current_period_end) },
            ]}
          />
        )}
      </Card>
    );
  }

  return null;
}

function planoNome(plan: string | null | undefined): string {
  if (plan === "mensal") return "Plano Mensal";
  if (plan === "anual") return "Plano Anual";
  return "Plano ativo";
}
function planoPreco(plan: string | null | undefined): number | null {
  if (plan === "mensal") return PRECO_MENSAL;
  if (plan === "anual") return PRECO_ANUAL;
  return null;
}

/* ============================================================ */

function TrialProgress({
  inicio,
  fim,
  dias,
  expirado,
}: {
  inicio: string | null;
  fim: string | null;
  dias: number;
  expirado: boolean;
}) {
  // Duração real do trial em dias (pode ser 7, ou 30 no caso de contas antigas backfill).
  let total = 7;
  const ini = inicio ? new Date(inicio).getTime() : NaN;
  const end = fim ? new Date(fim).getTime() : NaN;
  if (Number.isFinite(ini) && Number.isFinite(end) && end > ini) {
    total = Math.max(1, Math.round((end - ini) / 86400000));
  }
  const restClamped = Math.max(0, Math.min(total, dias));
  const pct = expirado ? 100 : Math.max(2, Math.min(100, ((total - restClamped) / total) * 100));

  return (
    <div style={{ margin: "18px 0 4px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: expirado ? COLORS.danger : COLORS.textPrimary,
          }}
        >
          {labelDiasRestantes(dias)}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted }}>
          {fmtBRfromISO(inicio)} — {fmtBRfromISO(fim)}
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: COLORS.bgElevated,
          overflow: "hidden",
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: expirado ? COLORS.danger : COLORS.accentLight,
            transition: "width 300ms ease",
          }}
        />
      </div>
    </div>
  );
}

/* ============================================================ */

function PlanosCard({
  status,
  pagoAtivo,
  companyId,
}: {
  status: SubscriptionStatus;
  pagoAtivo: boolean;
  companyId: string | null;
}) {
  const semAssinaturaAtiva = !pagoAtivo && status !== "active";
  const podeAssinar = semAssinaturaAtiva && !!companyId;

  const checkoutFn = useServerFn(createStripeCheckoutSession);
  const [loadingPlan, setLoadingPlan] = useState<"mensal" | "anual" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function iniciarCheckout(plan: "mensal" | "anual") {
    if (!companyId || loadingPlan) return;
    setErro(null);
    setLoadingPlan(plan);
    try {
      const res = await checkoutFn({ data: { plan, companyId } });
      if (res?.url) {
        window.location.assign(res.url);
        return;
      }
      throw new Error("URL de checkout indisponível");
    } catch (e) {
      console.warn("[assinatura] falha no checkout:", e);
      setErro("Não foi possível iniciar o checkout. Tente novamente em instantes.");
      setLoadingPlan(null);
    }
  }

  return (
    <Card>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.textPrimary, letterSpacing: -0.2 }}>
          Planos disponíveis
        </div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4, lineHeight: 1.5 }}>
          {semAssinaturaAtiva
            ? "Escolha o plano que melhor se encaixa no seu negócio."
            : "Você já possui um plano ativo."}
        </div>
      </div>

      {erro && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 10,
            background: COLORS.dangerBg,
            border: `1px solid ${COLORS.dangerBorder}`,
            color: COLORS.danger,
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          {erro}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 12,
          marginTop: 14,
        }}
      >
        <PlanoItem
          nome="Plano Mensal"
          preco={PRECO_MENSAL}
          ciclo="/ mês"
          descricao="Renovação mensal automática. Cancele quando quiser."
          beneficios={[
            "Site de agendamentos próprio",
            "Agendamentos ilimitados",
            "Suporte por WhatsApp",
          ]}
          ctaDisabled={!podeAssinar}
          ctaLoading={loadingPlan === "mensal"}
          ctaLabel={podeAssinar ? "Assinar mensal" : "Indisponível"}
          onCta={() => iniciarCheckout("mensal")}
        />
        <PlanoItem
          nome="Plano Anual"
          preco={PRECO_ANUAL}
          ciclo="/ ano"
          descricao={`Economize ${brl(ECONOMIA_ANUAL)} por ano em relação ao mensal.`}
          destaque
          beneficios={[
            "Tudo do Plano Mensal",
            "2 meses de economia no ano",
            "Prioridade no suporte",
          ]}
          ctaDisabled={!podeAssinar}
          ctaLoading={loadingPlan === "anual"}
          ctaLabel={podeAssinar ? "Assinar anual" : "Indisponível"}
          onCta={() => iniciarCheckout("anual")}
        />
      </div>
    </Card>
  );
}

function PlanoItem({
  nome,
  preco,
  ciclo,
  descricao,
  destaque,
  beneficios,
  ctaDisabled,
  ctaLoading,
  ctaLabel,
  onCta,
}: {
  nome: string;
  preco: number;
  ciclo: string;
  descricao: string;
  destaque?: boolean;
  beneficios: string[];
  ctaDisabled: boolean;
  ctaLoading: boolean;
  ctaLabel: string;
  onCta: () => void;
}) {
  const disabled = ctaDisabled || ctaLoading;
  return (
    <div
      style={{
        borderRadius: 12,
        padding: 16,
        border: `1.5px solid ${destaque ? COLORS.accentLight : COLORS.border}`,
        background: COLORS.bgSurface,
        position: "relative",
      }}
    >
      {destaque && (
        <span
          style={{
            position: "absolute",
            top: -10,
            right: 14,
            background: COLORS.accentLight,
            color: "#fff",
            fontSize: 10,
            fontWeight: 800,
            padding: "4px 10px",
            borderRadius: 999,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          Recomendado
        </span>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.textPrimary }}>{nome}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: COLORS.textPrimary, letterSpacing: -0.5 }}>
            {brl(preco)}
          </span>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>{ciclo}</span>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: COLORS.textMuted, lineHeight: 1.5, margin: "8px 0 12px" }}>
        {descricao}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        {beneficios.map((b) => (
          <li
            key={b}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: COLORS.textPrimary,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: `${COLORS.accentLight}22`,
                color: COLORS.accentLight,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            {b}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onCta}
        disabled={disabled}
        aria-disabled={disabled}
        style={{
          width: "100%",
          height: 44,
          fontSize: 14,
          fontWeight: 700,
          fontFamily: FONT,
          cursor: disabled ? "not-allowed" : "pointer",
          background: destaque ? COLORS.accentLight : "transparent",
          color: destaque ? "#fff" : COLORS.textPrimary,
          border: destaque ? "none" : `1.5px solid ${COLORS.border}`,
          borderRadius: 10,
          opacity: disabled ? 0.6 : 1,
          transition: "opacity 150ms ease",
        }}
      >
        {ctaLoading ? "Redirecionando..." : ctaLabel}
      </button>

    </div>
  );
}

/* ============================================================ */

function Card({
  children,
  highlight,
}: {
  children: ReactNode;
  highlight?: "accent" | "danger" | "warning";
}) {
  let border = COLORS.border;
  if (highlight === "accent") border = COLORS.accentLight;
  if (highlight === "danger") border = COLORS.dangerBorder;
  if (highlight === "warning") border = "#F59E0B";
  return (
    <section
      style={{
        background: COLORS.bgSurface,
        border: `1.5px solid ${border}`,
        borderRadius: 14,
        padding: 20,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      {children}
    </section>
  );
}

function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "neutral" | "accent" | "success" | "warning" | "danger";
}) {
  const map = {
    neutral: { bg: COLORS.bgElevated, color: COLORS.textMuted, border: COLORS.border },
    accent: { bg: `${COLORS.accentLight}15`, color: COLORS.accentLight, border: `${COLORS.accentLight}55` },
    success: { bg: "#DCFCE7", color: "#166534", border: "#86EFAC" },
    warning: { bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
    danger: { bg: COLORS.dangerBg, color: COLORS.danger, border: COLORS.dangerBorder },
  }[tone];
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        padding: "4px 10px",
        borderRadius: 999,
        background: map.bg,
        color: map.color,
        border: `1px solid ${map.border}`,
      }}
    >
      {children}
    </span>
  );
}

function Titulo({ children }: { children: ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 20,
        fontWeight: 800,
        color: COLORS.textPrimary,
        margin: "12px 0 4px",
        letterSpacing: -0.3,
      }}
    >
      {children}
    </h3>
  );
}

function Texto({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontSize: 13.5, color: COLORS.textMuted, margin: 0, lineHeight: 1.5 }}>
      {children}
    </p>
  );
}

function InfoRow({ items }: { items: { label: string; valor: string }[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        gap: 10,
        marginTop: 16,
      }}
    >
      {items.map((it) => (
        <div
          key={it.label}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: COLORS.bgElevated,
            border: `1px solid ${COLORS.border}`,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: COLORS.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            {it.label}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: COLORS.textPrimary,
              marginTop: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {it.valor}
          </div>
        </div>
      ))}
    </div>
  );
}

function Sec({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section
      style={{
        background: COLORS.bgSurface,
        border: `1.5px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: 20,
        marginTop: 16,
      }}
    >
      <h3
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: COLORS.textPrimary,
          margin: "0 0 12px",
          letterSpacing: -0.2,
        }}
      >
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function EmptyState({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div
      style={{
        padding: "28px 16px",
        textAlign: "center",
        borderRadius: 12,
        border: `1.5px dashed ${COLORS.border}`,
        background: COLORS.bgElevated,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>{titulo}</div>
      <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginTop: 4, lineHeight: 1.5 }}>
        {descricao}
      </div>
    </div>
  );
}
