import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ============================================================
   Painel Master Bisme — server functions (server-side only)
   - Toda a lógica sensível roda no servidor.
   - service_role (supabaseAdmin) é carregado apenas dentro dos
     handlers, nunca no bundle do cliente.
   - A autorização master é validada contra o Runtime Secret
     BISME_MASTER_ADMIN_EMAILS (lista separada por vírgula),
     lido apenas no servidor.
   ============================================================ */

// Preços de referência para ESTIMATIVA de receita (em reais).
// NÃO são cobrados aqui — a cobrança real é feita pelo Stripe.
// Ajuste estes valores caso os preços dos planos mudem.
const PLAN_PRICES_BRL = { mensal: 49.9, anual: 499.0 };

type MasterContext = { email: string };

async function assertMaster(userId: string, claimEmail?: unknown) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const raw = process.env.BISME_MASTER_ADMIN_EMAILS || "";
  const allow = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  let email = typeof claimEmail === "string" ? claimEmail.toLowerCase() : "";
  if (!email) {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    email = (data?.user?.email || "").toLowerCase();
  }

  if (!email || allow.length === 0 || !allow.includes(email)) {
    throw new Error("Acesso não autorizado");
  }
  return { supabaseAdmin, email };
}

/* ---------- Status: quem é o usuário atual? ---------- */
export const getMasterStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ authenticated: true; isMaster: boolean; email: string }> => {
    const raw = process.env.BISME_MASTER_ADMIN_EMAILS || "";
    const allow = raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    const claimEmail = (context.claims as { email?: string })?.email;
    let email = typeof claimEmail === "string" ? claimEmail.toLowerCase() : "";
    if (!email) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      email = (data?.user?.email || "").toLowerCase();
    }
    return { authenticated: true, isMaster: allow.includes(email), email };
  });

/* ---------- Visão geral ---------- */
export const getMasterOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await assertMaster(context.userId, (context.claims as { email?: string })?.email);

    const [companiesRes, subsRes, apptRes] = await Promise.all([
      supabaseAdmin.from("companies").select("id, created_at"),
      supabaseAdmin.from("subscriptions").select("status, plan"),
      supabaseAdmin.from("appointments").select("id", { count: "exact", head: true }),
    ]);

    const companies = companiesRes.data || [];
    const subs = subsRes.data || [];

    const byStatus = { trial: 0, active: 0, past_due: 0, canceled: 0, none: 0 };
    for (const s of subs) {
      const st = (s.status as keyof typeof byStatus) || "none";
      if (st in byStatus) byStatus[st] += 1;
    }
    const totalCompanies = companies.length;
    const companiesWithSub = subs.length;
    const noSub = Math.max(0, totalCompanies - companiesWithSub);
    byStatus.none += noSub;

    // Receita mensal estimada: soma dos planos ativos.
    let monthly = 0;
    for (const s of subs) {
      if (s.status !== "active") continue;
      if (s.plan === "mensal") monthly += PLAN_PRICES_BRL.mensal;
      else if (s.plan === "anual") monthly += PLAN_PRICES_BRL.anual / 12;
    }

    const now = Date.now();
    const last7 = companies.filter(
      (c) => c.created_at && now - new Date(c.created_at).getTime() <= 7 * 864e5,
    ).length;

    return {
      totalCompanies,
      trial: byStatus.trial,
      active: byStatus.active,
      pastDue: byStatus.past_due,
      canceled: byStatus.canceled,
      none: byStatus.none,
      monthlyRevenue: Math.round(monthly * 100) / 100,
      yearlyRevenue: Math.round(monthly * 12 * 100) / 100,
      newLast7Days: last7,
      totalAppointments: apptRes.count ?? 0,
      revenueIsEstimate: true,
    };
  });

/* ---------- Lista de empresas ---------- */
export const listMasterCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await assertMaster(context.userId, (context.claims as { email?: string })?.email);

    const [companiesRes, subsRes, membersRes] = await Promise.all([
      supabaseAdmin.from("companies").select("id, name, slug, timezone, created_at"),
      supabaseAdmin.from("subscriptions").select("*"),
      supabaseAdmin.from("company_members").select("company_id, user_id, role, created_at"),
    ]);

    const subs = subsRes.data || [];
    const members = membersRes.data || [];

    // E-mails dos responsáveis via profiles (sem expor auth diretamente).
    const ownerIds = Array.from(new Set(members.filter((m) => m.role === "owner").map((m) => m.user_id)));
    const profilesById = new Map<string, { email: string | null; full_name: string | null }>();
    if (ownerIds.length) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name")
        .in("id", ownerIds);
      for (const p of profiles || []) profilesById.set(p.id, { email: p.email, full_name: p.full_name });
    }

    const subByCompany = new Map(subs.map((s) => [s.company_id, s]));
    const ownerByCompany = new Map<string, { user_id: string }>();
    for (const m of members) if (m.role === "owner" && !ownerByCompany.has(m.company_id)) ownerByCompany.set(m.company_id, m);

    return (companiesRes.data || []).map((c) => {
      const sub = subByCompany.get(c.id);
      const owner = ownerByCompany.get(c.id);
      const prof = owner ? profilesById.get(owner.user_id) : undefined;
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        timezone: c.timezone,
        createdAt: c.created_at,
        ownerName: prof?.full_name ?? null,
        ownerEmail: prof?.email ?? null,
        plan: sub?.plan ?? null,
        status: sub?.status ?? "none",
        trialEndsAt: sub?.trial_ends_at ?? null,
        currentPeriodEnd: sub?.current_period_end ?? null,
        stripeCustomerId: sub?.stripe_customer_id ?? null,
      };
    });
  });

/* ---------- Detalhes de uma empresa ---------- */
export const getMasterCompanyDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ companyId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await assertMaster(context.userId, (context.claims as { email?: string })?.email);
    const companyId = data.companyId;

    const [companyRes, subRes, membersRes, apptCount, clientCount, serviceCount, profCount] =
      await Promise.all([
        supabaseAdmin.from("companies").select("*").eq("id", companyId).maybeSingle(),
        supabaseAdmin.from("subscriptions").select("*").eq("company_id", companyId).maybeSingle(),
        supabaseAdmin.from("company_members").select("user_id, role, created_at").eq("company_id", companyId),
        supabaseAdmin.from("appointments").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        supabaseAdmin.from("clients").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        supabaseAdmin.from("services").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        supabaseAdmin.from("professionals").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      ]);

    if (!companyRes.data) throw new Error("Empresa não encontrada");

    // E-mail real do Auth para cada membro (via Admin API, server-side).
    const members = membersRes.data || [];
    const membersDetailed = await Promise.all(
      members.map(async (m) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
        return {
          userId: m.user_id,
          role: m.role,
          createdAt: m.created_at,
          email: u?.user?.email ?? null,
        };
      }),
    );

    return {
      company: companyRes.data,
      subscription: subRes.data ?? null,
      members: membersDetailed,
      counts: {
        appointments: apptCount.count ?? 0,
        clients: clientCount.count ?? 0,
        services: serviceCount.count ?? 0,
        professionals: profCount.count ?? 0,
      },
    };
  });

/* ---------- Entrega de acesso: trocar e-mail/senha do empresário ---------- */
export const changeEmpresarioAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      companyId: z.string().uuid(),
      userId: z.string().uuid(),
      newEmail: z.string().trim().email().max(255),
      newPassword: z.string().min(6).max(72),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await assertMaster(context.userId, (context.claims as { email?: string })?.email);

    // Confirma que o usuário é membro da empresa selecionada.
    const { data: membership } = await supabaseAdmin
      .from("company_members")
      .select("user_id, role")
      .eq("company_id", data.companyId)
      .eq("user_id", data.userId)
      .maybeSingle();

    if (!membership) {
      throw new Error("O usuário informado não é membro desta empresa.");
    }

    // Altera SOMENTE o Auth user existente. Mesmo user_id.
    // email_confirm: true => empresário não precisa confirmar o e-mail.
    const { data: updated, error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email: data.newEmail,
      password: data.newPassword,
      email_confirm: true,
    });

    if (error || !updated?.user) {
      // Nunca logar a senha provisória.
      console.error("[bisme-admin] changeEmpresarioAccess falhou", {
        company_id: data.companyId,
        user_id: data.userId,
        supabase_error: error?.message,
      });
      throw new Error("Não foi possível atualizar o acesso. Verifique se o e-mail já está em uso.");
    }

    // Mantém profiles.email sincronizado (não afeta company_members).
    await supabaseAdmin.from("profiles").update({ email: data.newEmail }).eq("id", data.userId);

    return { ok: true as const, userId: data.userId, newEmail: data.newEmail };
  });
