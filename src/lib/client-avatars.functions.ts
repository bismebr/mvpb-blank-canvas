import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ============================================================
   Avatars de clientes finais para o painel administrativo.

   Objetivo único: dado um conjunto de customer_user_id, devolver
   um mapa { customer_user_id -> signedUrl } com a foto real do
   cliente (bucket profile-avatars), APENAS para clientes que
   tenham agendamento na empresa do empresário logado.

   Segurança:
   - requireSupabaseAuth garante empresário autenticado.
   - A associação empresa<->empresário é validada em company_members.
   - Só retornamos avatar de clientes com agendamento na empresa
     (filtro via appointments), evitando vazamento entre empresas.
   - service_role (supabaseAdmin) é carregado apenas dentro do
     handler, no servidor. Nunca no bundle do cliente.
   - Retornamos apenas a Signed URL temporária. Nenhum outro dado
     de Auth (e-mail, telefone, metadata completa) é exposto.
   - Signed URL NÃO é persistida em lugar nenhum.
   ============================================================ */

const inputSchema = z.object({
  companyId: z.string().uuid().optional(),
  customerUserIds: z.array(z.string().uuid()).max(500).default([]),
});

export const getCompanyClientAvatars = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<Record<string, string>> => {
    const ids = Array.from(new Set(data.customerUserIds.filter(Boolean)));
    if (ids.length === 0) return {};

    // 1) Resolve/valida a empresa do empresário logado.
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
      if (!companyId) return {};
    }

    // 2) Filtra os ids: só clientes que têm agendamento nesta empresa.
    //    Usa o client autenticado (RLS), então só enxerga a própria empresa.
    const { data: apptRows, error: aErr } = await context.supabase
      .from("appointments")
      .select("customer_user_id")
      .eq("company_id", companyId)
      .in("customer_user_id", ids);
    if (aErr) throw new Error(`Falha ao validar clientes: ${aErr.message}`);

    const allowedIds = Array.from(
      new Set(
        (apptRows ?? [])
          .map((r) => r.customer_user_id)
          .filter((v): v is string => typeof v === "string" && v.length > 0),
      ),
    );
    if (allowedIds.length === 0) return {};

    // 3) Para cada cliente permitido, lê avatarPath (Auth) e gera Signed URL.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result: Record<string, string> = {};

    await Promise.all(
      allowedIds.map(async (uid) => {
        try {
          const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(uid);
          const meta = (userRes?.user?.user_metadata ?? {}) as Record<string, unknown>;
          const path = typeof meta.avatarPath === "string" ? meta.avatarPath : "";
          if (!path) return;
          const { data: signed } = await supabaseAdmin.storage
            .from("profile-avatars")
            .createSignedUrl(path, 60 * 60);
          if (signed?.signedUrl) result[uid] = signed.signedUrl;
        } catch {
          // Silencioso: cliente sem foto ou erro pontual -> avatar padrão.
        }
      }),
    );

    return result;
  });
