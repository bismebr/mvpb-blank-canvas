// Helpers de assinatura (Bisme). Puro cálculo, sem I/O.

export type SubscriptionStatus = "none" | "trial" | "active" | "past_due" | "canceled";

export interface SubscriptionLike {
  status: SubscriptionStatus | string | null;
  plan?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  canceled_at?: string | null;
}

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Dias restantes até a data (arredondado pra cima). Negativo se já passou. */
export function getDaysLeft(iso: string | null | undefined, now: number = Date.now()): number {
  const t = toMs(iso);
  if (t === null) return 0;
  return Math.ceil((t - now) / 86400000);
}

/** Trial ainda válido (não expirou). */
export function isTrialActive(sub: SubscriptionLike | null | undefined, now: number = Date.now()): boolean {
  if (!sub || sub.status !== "trial") return false;
  const end = toMs(sub.trial_ends_at);
  return end !== null && end > now;
}

/** Assinatura paga válida (active, ou canceled ainda dentro do período pago). */
export function isPaidActive(sub: SubscriptionLike | null | undefined, now: number = Date.now()): boolean {
  if (!sub) return false;
  const end = toMs(sub.current_period_end);
  if (sub.status === "active") {
    // active sem period_end ainda conta como ativo (ex.: em provisionamento)
    return end === null || end > now;
  }
  if (sub.status === "canceled") {
    return end !== null && end > now;
  }
  return false;
}

/** Painel deve ser bloqueado? Considera trial e período pago. */
export function isSubscriptionBlocked(sub: SubscriptionLike | null | undefined, now: number = Date.now()): boolean {
  if (!sub) return false; // ainda carregando: não bloqueia por segurança
  if (isTrialActive(sub, now)) return false;
  if (isPaidActive(sub, now)) return false;
  return true;
}

/** Label curta pro badge da UI. */
export function formatSubscriptionStatus(sub: SubscriptionLike | null | undefined): string {
  if (!sub) return "—";
  if (isTrialActive(sub)) return "Teste grátis";
  if (sub.status === "trial") return "Teste expirado";
  if (sub.status === "active") return "Plano ativo";
  if (sub.status === "past_due") return "Pagamento pendente";
  if (sub.status === "canceled") return isPaidActive(sub) ? "Cancelado (acesso ativo)" : "Cancelado";
  return "Sem plano";
}
