import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  plan: z.enum(["mensal", "anual"]),
  companyId: z.string().uuid().optional(),
});

/**
 * Cria uma Stripe Checkout Session (modo subscription) para o plano escolhido
 * e retorna a URL para redirecionamento no frontend.
 *
 * Requisitos server-side (secrets):
 * - STRIPE_SECRET_KEY
 * - STRIPE_PRICE_MONTHLY
 * - STRIPE_PRICE_YEARLY
 * - SITE_URL
 */
export const createStripeCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const priceMonthly = process.env.STRIPE_PRICE_MONTHLY;
    const priceYearly = process.env.STRIPE_PRICE_YEARLY;
    const siteUrl = process.env.SITE_URL;

    if (!secretKey) throw new Error("STRIPE_SECRET_KEY ausente");
    if (!priceMonthly || !priceYearly) throw new Error("STRIPE_PRICE_* ausente");
    if (!siteUrl) throw new Error("SITE_URL ausente");

    const priceId = data.plan === "anual" ? priceYearly : priceMonthly;

    // Resolve company_id: prioriza o informado, senão pega o primeiro do usuário.
    let companyId = data.companyId ?? null;
    if (companyId) {
      const { data: membership, error: mErr } = await context.supabase
        .from("company_members")
        .select("company_id")
        .eq("company_id", companyId)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (mErr) throw new Error(`Falha ao validar empresa: ${mErr.message}`);
      if (!membership) throw new Error("Sem acesso a esta empresa");
    } else {
      const { data: rows, error: qErr } = await context.supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", context.userId)
        .limit(1);
      if (qErr) throw new Error(`Falha ao localizar empresa: ${qErr.message}`);
      companyId = rows?.[0]?.company_id ?? null;
      if (!companyId) throw new Error("Nenhuma empresa vinculada a este usuário");
    }

    // E-mail do usuário para pré-preenchimento no Checkout
    const userEmail =
      (context.claims as { email?: string } | undefined)?.email ?? undefined;

    // Reaproveita stripe_customer_id se já existir na subscription
    const { data: subRow } = await context.supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("company_id", companyId)
      .maybeSingle();
    const existingCustomerId =
      (subRow as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? null;

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(secretKey);

    const successUrl = `${siteUrl}/admin?tab=assinatura&checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}/admin?tab=assinatura&checkout=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      client_reference_id: companyId,
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : userEmail
          ? { customer_email: userEmail }
          : {}),
      subscription_data: {
        metadata: {
          company_id: companyId,
          plan: data.plan,
        },
      },
      metadata: {
        company_id: companyId,
        plan: data.plan,
        user_id: context.userId,
      },
    });

    if (!session.url) throw new Error("Stripe não retornou URL de checkout");
    return { url: session.url };
  });
