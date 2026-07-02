import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";
import type { TablesUpdate } from "@/integrations/supabase/types";

type SubscriptionUpdate = TablesUpdate<"subscriptions">;

/**
 * Stripe Webhook — endpoint público protegido por assinatura Stripe.
 *
 * URL: {SITE_URL}/api/public/stripe/webhook
 *
 * Secrets obrigatórios (runtime, nunca no frontend):
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET (whsec_...)
 * - STRIPE_PRICE_MONTHLY
 * - STRIPE_PRICE_YEARLY
 *
 * Fonte de verdade do status da assinatura da Bisme.
 * O frontend nunca marca active. Só este webhook atualiza `public.subscriptions`.
 */

const BISME_STATUS = {
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
} as const;

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function mapStripePriceToPlan(
  priceId: string | null | undefined,
  env: { monthly: string; yearly: string },
): "mensal" | "anual" | null {
  if (!priceId) return null;
  if (priceId === env.monthly) return "mensal";
  if (priceId === env.yearly) return "anual";
  return null;
}

function mapStripeStatus(
  status: Stripe.Subscription.Status,
): "active" | "past_due" | "canceled" | null {
  switch (status) {
    case "active":
    case "trialing":
      return BISME_STATUS.ACTIVE;
    case "past_due":
    case "unpaid":
    case "incomplete":
      return BISME_STATUS.PAST_DUE;
    case "incomplete_expired":
    case "canceled":
      return BISME_STATUS.CANCELED;
    default:
      return null;
  }
}

function toIso(seconds: number | null | undefined): string | null {
  if (!seconds || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

type SubscriptionRow = {
  company_id: string;
  status: string | null;
  plan: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  last_stripe_event_at: string | null;
  canceled_at: string | null;
  current_period_end: string | null;
};

async function findSubscriptionRow(
  admin: ReturnType<typeof getAdmin>,
  by: {
    companyId?: string | null;
    stripeSubscriptionId?: string | null;
    stripeCustomerId?: string | null;
  },
): Promise<SubscriptionRow | null> {
  const client = await admin;
  const cols =
    "company_id,status,plan,stripe_customer_id,stripe_subscription_id,last_stripe_event_at,canceled_at,current_period_end";

  if (by.companyId) {
    const { data } = await client
      .from("subscriptions")
      .select(cols)
      .eq("company_id", by.companyId)
      .maybeSingle();
    if (data) return data as SubscriptionRow;
  }
  if (by.stripeSubscriptionId) {
    const { data } = await client
      .from("subscriptions")
      .select(cols)
      .eq("stripe_subscription_id", by.stripeSubscriptionId)
      .maybeSingle();
    if (data) return data as SubscriptionRow;
  }
  if (by.stripeCustomerId) {
    const { data } = await client
      .from("subscriptions")
      .select(cols)
      .eq("stripe_customer_id", by.stripeCustomerId)
      .maybeSingle();
    if (data) return data as SubscriptionRow;
  }
  return null;
}

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function handleSubscriptionUpsert(
  admin: ReturnType<typeof getAdmin>,
  subscription: Stripe.Subscription,
  eventCreatedIso: string,
  env: { monthly: string; yearly: string },
) {
  const companyIdMeta = (subscription.metadata?.company_id as string | undefined) ?? null;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : (subscription.customer?.id ?? null);

  const row = await findSubscriptionRow(admin, {
    companyId: companyIdMeta,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
  });

  if (!row) {
    console.warn("[stripe-webhook] subscription row não encontrada", {
      sub: subscription.id,
      customer: customerId,
      hasCompanyMeta: !!companyIdMeta,
    });
    return { ignored: true, reason: "row_not_found" };
  }

  // Idempotência / ordem
  if (row.last_stripe_event_at && row.last_stripe_event_at >= eventCreatedIso) {
    return { ignored: true, reason: "older_event" };
  }

  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const plan = mapStripePriceToPlan(priceId, env);
  const bismeStatus = mapStripeStatus(subscription.status);

  // A partir de versões novas da API Stripe, current_period_* pode vir apenas
  // no item da subscription. Buscamos com fallback: top-level → item por priceId → primeiro item.
  type WithPeriod = { current_period_start?: number | null; current_period_end?: number | null };
  const items = subscription.items?.data ?? [];
  const matchedItem =
    (priceId ? items.find((it) => it.price?.id === priceId) : undefined) ?? items[0] ?? null;
  const subLevel = subscription as unknown as WithPeriod;
  const itemLevel = (matchedItem ?? {}) as unknown as WithPeriod;
  const cpsRaw = subLevel.current_period_start ?? itemLevel.current_period_start ?? null;
  const cpeRaw = subLevel.current_period_end ?? itemLevel.current_period_end ?? null;
  const periodSource = subLevel.current_period_start
    ? "top-level"
    : itemLevel.current_period_start
      ? "item"
      : "none";


  if (!bismeStatus) {
    console.warn("[stripe-webhook] status Stripe não mapeado", subscription.status);
    return { ignored: true, reason: "unmapped_status" };
  }

  // Se ficaria active mas o price é desconhecido, não ativa por segurança.
  if (bismeStatus === "active" && !plan) {
    console.warn("[stripe-webhook] price desconhecido, não ativando", { priceId });
    return { ignored: true, reason: "unknown_price" };
  }

  const currentPeriodStart = toIso(cpsRaw);
  const currentPeriodEnd = toIso(cpeRaw);
  const cancelAtPeriodEnd = subscription.cancel_at_period_end ?? false;

  console.log("[stripe-webhook] subscription upsert", {
    subscription_id: subscription.id,
    price_id: priceId,
    period_source: periodSource,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
  });

  const update: SubscriptionUpdate = {
    status: bismeStatus,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    cancel_at_period_end: cancelAtPeriodEnd,
    last_stripe_event_at: eventCreatedIso,
    updated_at: new Date().toISOString(),
  };
  if (plan) update.plan = plan;
  if (currentPeriodStart) update.current_period_start = currentPeriodStart;
  if (currentPeriodEnd) update.current_period_end = currentPeriodEnd;


  if (bismeStatus === "active") {
    update.canceled_at = null;
  } else if (bismeStatus === "canceled") {
    update.canceled_at = row.canceled_at ?? new Date().toISOString();
  }

  const client = await admin;
  const { error } = await client
    .from("subscriptions")
    .update(update)
    .eq("company_id", row.company_id);

  if (error) throw new Error(`update subscriptions falhou: ${error.message}`);
  return { ignored: false, companyId: row.company_id };
}

async function handleSubscriptionDeleted(
  admin: ReturnType<typeof getAdmin>,
  subscription: Stripe.Subscription,
  eventCreatedIso: string,
) {
  const row = await findSubscriptionRow(admin, {
    stripeSubscriptionId: subscription.id,
    stripeCustomerId:
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
  });
  if (!row) return { ignored: true, reason: "row_not_found" };
  if (row.last_stripe_event_at && row.last_stripe_event_at >= eventCreatedIso) {
    return { ignored: true, reason: "older_event" };
  }
  const currentPeriodEnd = toIso(
    (subscription as unknown as { current_period_end?: number }).current_period_end,
  );

  const update: SubscriptionUpdate = {
    status: BISME_STATUS.CANCELED,
    cancel_at_period_end: true,
    canceled_at: row.canceled_at ?? new Date().toISOString(),
    last_stripe_event_at: eventCreatedIso,
    updated_at: new Date().toISOString(),
  };
  if (currentPeriodEnd) update.current_period_end = currentPeriodEnd;

  const client = await admin;
  const { error } = await client
    .from("subscriptions")
    .update(update)
    .eq("company_id", row.company_id);
  if (error) throw new Error(`update (deleted) falhou: ${error.message}`);
  return { ignored: false, companyId: row.company_id };
}

async function handleInvoicePaymentFailed(
  admin: ReturnType<typeof getAdmin>,
  invoice: Stripe.Invoice,
  eventCreatedIso: string,
) {
  const subscriptionId =
    typeof (invoice as unknown as { subscription?: string | Stripe.Subscription }).subscription ===
    "string"
      ? ((invoice as unknown as { subscription: string }).subscription)
      : ((invoice as unknown as { subscription?: Stripe.Subscription }).subscription?.id ?? null);
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : (invoice.customer?.id ?? null);

  const row = await findSubscriptionRow(admin, {
    stripeSubscriptionId: subscriptionId,
    stripeCustomerId: customerId,
  });
  if (!row) return { ignored: true, reason: "row_not_found" };
  if (row.last_stripe_event_at && row.last_stripe_event_at >= eventCreatedIso) {
    return { ignored: true, reason: "older_event" };
  }

  const client = await admin;
  const { error } = await client
    .from("subscriptions")
    .update({
      status: BISME_STATUS.PAST_DUE,
      last_stripe_event_at: eventCreatedIso,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", row.company_id);
  if (error) throw new Error(`update (past_due) falhou: ${error.message}`);
  return { ignored: false, companyId: row.company_id };
}

async function handleCheckoutCompleted(
  admin: ReturnType<typeof getAdmin>,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  eventCreatedIso: string,
  env: { monthly: string; yearly: string },
) {
  if (session.mode !== "subscription") {
    return { ignored: true, reason: "not_subscription_mode" };
  }
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription?.id ?? null);
  if (!subscriptionId) return { ignored: true, reason: "no_subscription" };

  // Busca detalhes da subscription para ter status/period corretos.
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Garante metadata company_id no objeto para o upsert.
  if (!subscription.metadata?.company_id) {
    const companyIdFromSession =
      (session.metadata?.company_id as string | undefined) ??
      session.client_reference_id ??
      null;
    if (companyIdFromSession) {
      subscription.metadata = { ...(subscription.metadata ?? {}), company_id: companyIdFromSession };
    }
  }

  return handleSubscriptionUpsert(admin, subscription, eventCreatedIso, env);
}

export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        const priceMonthly = process.env.STRIPE_PRICE_MONTHLY;
        const priceYearly = process.env.STRIPE_PRICE_YEARLY;

        if (!secretKey || !webhookSecret || !priceMonthly || !priceYearly) {
          const missing = [
            !secretKey && "STRIPE_SECRET_KEY",
            !webhookSecret && "STRIPE_WEBHOOK_SECRET",
            !priceMonthly && "STRIPE_PRICE_MONTHLY",
            !priceYearly && "STRIPE_PRICE_YEARLY",
          ].filter(Boolean);
          console.error("[stripe-webhook] secrets ausentes:", missing.join(","));
          return jsonResponse(500, { error: "webhook not configured" });
        }

        const signature = request.headers.get("stripe-signature");
        if (!signature) {
          return jsonResponse(400, { error: "missing signature" });
        }

        // Raw body é obrigatório para verificação da assinatura.
        const rawBody = await request.text();

        const { default: Stripe } = await import("stripe");
        const stripe = new Stripe(secretKey, {
          // Compatível com Cloudflare Workers.
          httpClient: Stripe.createFetchHttpClient(),
        });

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(
            rawBody,
            signature,
            webhookSecret,
          );
        } catch (err) {
          console.warn(
            "[stripe-webhook] assinatura inválida:",
            err instanceof Error ? err.message : String(err),
          );
          return jsonResponse(400, { error: "invalid signature" });
        }

        const eventCreatedIso = new Date(event.created * 1000).toISOString();
        const priceEnv = { monthly: priceMonthly, yearly: priceYearly };
        const admin = getAdmin();

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const res = await handleCheckoutCompleted(
                admin,
                stripe,
                event.data.object as Stripe.Checkout.Session,
                eventCreatedIso,
                priceEnv,
              );
              return jsonResponse(200, { received: true, ...res });
            }
            case "customer.subscription.created":
            case "customer.subscription.updated": {
              const res = await handleSubscriptionUpsert(
                admin,
                event.data.object as Stripe.Subscription,
                eventCreatedIso,
                priceEnv,
              );
              return jsonResponse(200, { received: true, ...res });
            }
            case "customer.subscription.deleted": {
              const res = await handleSubscriptionDeleted(
                admin,
                event.data.object as Stripe.Subscription,
                eventCreatedIso,
              );
              return jsonResponse(200, { received: true, ...res });
            }
            case "invoice.payment_failed": {
              const res = await handleInvoicePaymentFailed(
                admin,
                event.data.object as Stripe.Invoice,
                eventCreatedIso,
              );
              return jsonResponse(200, { received: true, ...res });
            }
            default:
              // Aceita e ignora eventos não relevantes.
              return jsonResponse(200, { received: true, ignored: true, type: event.type });
          }
        } catch (err) {
          console.error("[stripe-webhook] erro ao processar evento", event.type, err);
          // Retornar 500 faz a Stripe reentregar — desejado.
          return jsonResponse(500, { error: "processing_failed" });
        }
      },
    },
  },
});
