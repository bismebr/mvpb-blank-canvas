import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TablesUpdate } from "@/integrations/supabase/types";

const InputSchema = z.object({ companyId: z.string().uuid() });

function toIso(seconds: number | null | undefined): string | null {
  if (!seconds || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

function mapPriceToPlan(
  priceId: string | null | undefined,
  monthly: string,
  yearly: string,
): "mensal" | "anual" | null {
  if (!priceId) return null;
  if (priceId === monthly) return "mensal";
  if (priceId === yearly) return "anual";
  return null;
}

/**
 * Backfill/sincroniza a subscription no Supabase a partir da Stripe.
 * Roda server-side, validando que o usuário é membro da company.
 */
export const syncStripeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: membership, error: mErr } = await context.supabase
      .from("company_members")
      .select("company_id")
      .eq("company_id", data.companyId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (mErr) throw new Error(`membership check: ${mErr.message}`);
    if (!membership) throw new Error("Sem acesso a esta empresa");

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const priceMonthly = process.env.STRIPE_PRICE_MONTHLY;
    const priceYearly = process.env.STRIPE_PRICE_YEARLY;
    if (!secretKey || !priceMonthly || !priceYearly) {
      throw new Error("Stripe secrets ausentes");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: rErr } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id,stripe_price_id,status,current_period_end")
      .eq("company_id", data.companyId)
      .maybeSingle();
    if (rErr) throw new Error(`subscription read: ${rErr.message}`);
    if (!row?.stripe_subscription_id) {
      return { updated: false, reason: "no_stripe_subscription" as const };
    }

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });
    const subscription = await stripe.subscriptions.retrieve(row.stripe_subscription_id);

    const items = subscription.items?.data ?? [];
    const existingPriceId = row.stripe_price_id ?? null;
    const matchedItem =
      (existingPriceId ? items.find((it) => it.price?.id === existingPriceId) : undefined) ??
      items[0] ??
      null;
    const priceId = matchedItem?.price?.id ?? existingPriceId ?? null;

    type WithPeriod = { current_period_start?: number | null; current_period_end?: number | null };
    const subLevel = subscription as unknown as WithPeriod;
    const itemLevel = (matchedItem ?? {}) as unknown as WithPeriod;
    const cps = toIso(subLevel.current_period_start ?? itemLevel.current_period_start);
    const cpe = toIso(subLevel.current_period_end ?? itemLevel.current_period_end);
    const source = subLevel.current_period_start
      ? "top-level"
      : itemLevel.current_period_start
        ? "item"
        : "none";

    const plan = mapPriceToPlan(priceId, priceMonthly, priceYearly);

    const update: TablesUpdate<"subscriptions"> = {
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString(),
    };
    if (priceId) update.stripe_price_id = priceId;
    if (plan) update.plan = plan;
    if (cps) update.current_period_start = cps;
    if (cpe) update.current_period_end = cpe;

    const { error: uErr } = await supabaseAdmin
      .from("subscriptions")
      .update(update)
      .eq("company_id", data.companyId);
    if (uErr) throw new Error(`subscription update: ${uErr.message}`);

    console.log("[stripe-sync] backfilled", {
      subscription_id: subscription.id,
      price_id: priceId,
      period_source: source,
      current_period_start: cps,
      current_period_end: cpe,
    });

    return {
      updated: true,
      current_period_start: cps,
      current_period_end: cpe,
      source,
    };
  });
