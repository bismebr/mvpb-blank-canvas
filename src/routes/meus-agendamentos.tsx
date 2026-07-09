import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { LoginFullScreen } from "@/components/barbearia/LoginFullScreen";
import { DotsSpinner } from "@/components/barbearia/DotsSpinner";
import { initLocalStorage, type Usuario } from "@/components/barbearia/data";
import { useClientUser } from "@/components/barbearia/ClientUserContext";
import { type StatusAg } from "@/components/admin/AppContext";
import { LoadingOverlay } from "@/components/barbearia/LoadingOverlay";
import { CancelamentoModal, type SucessoInfo } from "@/components/barbearia/Modals";
import { useSiteConfig } from "@/components/admin/SiteConfigContext";
import { supabasePublic as supabase } from "@/integrations/supabase/client-public";
import { buildTemplateCss, getTemplate, DEFAULT_TEMPLATE_ID, type SiteTemplateId } from "@/lib/siteTemplates";

type SearchShape = { slug?: string };

export const Route = createFileRoute("/meus-agendamentos")({
  validateSearch: (search: Record<string, unknown>): SearchShape => {
    const s = typeof search.slug === "string" ? search.slug : undefined;
    return s ? { slug: s } : {};
  },
  head: () => ({
    meta: [
      { title: "Meus Agendamentos — Barbearia Sr. Eli" },
      { name: "description", content: "Veja e gerencie seus agendamentos na Barbearia Sr. Eli." },
    ],
  }),
  component: MeusAgendamentosPage,
});

const PRIMARY = "var(--site-primary, #5690f5)";
const PRIMARY_SOFT = "color-mix(in oklab, var(--site-primary, #5690f5) 10%, white)";

type CancelMotivo = "imprevisto" | "data_errada" | "outro";

function MeusAgendamentosPage() {
  const { usuario, setUsuario } = useClientUser();
  const { config } = useSiteConfig();
  const [loginOpen, setLoginOpen] = useState(false);
  const navigate = useNavigate();
  const { slug } = Route.useSearch();

  // Quando há slug, buscamos os dados públicos reais daquela empresa para
  // exibir corretamente "Local" conforme show_address e aplicar o template/cor.
  const [publicSite, setPublicSite] = useState<{
    companyId: string | null;
    showAddress: boolean;
    address: string;
    templateKey: SiteTemplateId;
    professionalsCount: number;
  } | null>(null);
  const [siteLoading, setSiteLoading] = useState<boolean>(!!slug);


  // Cache do template por slug para evitar flash branco/preto no carregamento.
  const CACHE_PREFIX = "sreli:tpl:";
  const cachedTemplateKey = useMemo<SiteTemplateId>(() => {
    if (!slug) return DEFAULT_TEMPLATE_ID;
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(CACHE_PREFIX + slug) : null;
      return (raw as SiteTemplateId) || DEFAULT_TEMPLATE_ID;
    } catch {
      return DEFAULT_TEMPLATE_ID;
    }
  }, [slug]);

  useEffect(() => {
    let active = true;
    if (!slug) {
      setPublicSite(null);
      setSiteLoading(false);
      return;
    }
    setSiteLoading(true);
    (async () => {
      const { getPublicSiteBySlug } = await import("@/lib/companySite");
      const data = await getPublicSiteBySlug(slug);
      if (!active) return;
      const tpl = (data?.site?.template_key as SiteTemplateId) || DEFAULT_TEMPLATE_ID;
      try {
        if (typeof window !== "undefined") window.localStorage.setItem(CACHE_PREFIX + slug, tpl);
      } catch { /* noop */ }
      setPublicSite({
        companyId: data?.company?.id ?? null,
        showAddress: data?.site?.show_address === true,
        address: data?.site?.address ?? "",
        templateKey: tpl,
        professionalsCount: Array.isArray(data?.professionals) ? data.professionals.length : 0,
      });
      setSiteLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  const themeCss = useMemo(() => {
    const tpl = getTemplate(publicSite?.templateKey ?? cachedTemplateKey);
    return buildTemplateCss(tpl);
  }, [publicSite?.templateKey, cachedTemplateKey]);

  // Safety net: libera qualquer trava de scroll deixada por modais/telas
  // desmontados abruptamente durante navegação (BookingScreen bloqueia
  // scroll via body.position=fixed + top=-Y + overflow=hidden em body e
  // documentElement). Sem esse reset, entrar em Meus Agendamentos vindo
  // da confirmação de agendamento pode chegar com body ainda travado.
  useEffect(() => {
    const body = document.body;
    if (body.style.position === "fixed") {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
    }
    if (body.style.overflow === "hidden") body.style.overflow = "";
    if (document.documentElement.style.overflow === "hidden") {
      document.documentElement.style.overflow = "";
    }
  }, []);

  useEffect(() => {
    initLocalStorage();
  }, []);

  const goBack = () => {
    if (slug) navigate({ to: "/$slug", params: { slug } });
    else navigate({ to: "/" });
  };

  return (
    <div className="sreli-root" style={{ background: "var(--site-page-bg, #FFFFFF)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      <header
        style={{
          background: "#FFFFFF",
          borderBottom: "1px solid #EEEEEE",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <button
          onClick={goBack}
          aria-label="Voltar"
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1px solid #EEEEEE",
            background: "#FFFFFF",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#1A1A1A",
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 style={{ fontWeight: 700, fontSize: 18, color: "#1A1A1A", margin: 0 }}>
          Meus Agendamentos
        </h1>
      </header>

      <main style={{ flex: 1 }}>
        <Conteudo
          usuario={usuario}
          slug={slug}
          companyId={publicSite?.companyId ?? null}
          abrirLogin={() => setLoginOpen(true)}
          enderecoFmt={publicSite && publicSite.showAddress ? publicSite.address : ""}
          professionalsCount={publicSite?.professionalsCount ?? null}
          siteLoading={siteLoading}
          onBack={goBack}
        />

      </main>


      <LoginFullScreen
        open={loginOpen}
        initialMode="cadastro"
        onClose={() => setLoginOpen(false)}
        onLogged={(u) => {
          setUsuario(u);
          setLoginOpen(false);
        }}
      />
    </div>
  );
}

function Conteudo({
  usuario,
  slug,
  companyId,
  abrirLogin,
  enderecoFmt,
  professionalsCount,
  siteLoading,
  onBack,
}: {
  usuario: Usuario | null;
  slug?: string;
  companyId: string | null;
  abrirLogin: () => void;
  enderecoFmt: string;
  professionalsCount: number | null;
  siteLoading: boolean;
  onBack: () => void;
}) {

  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<CancelMotivo | null>(null);
  const [sucessoOpen, setSucessoOpen] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [canceladoInfo, setCanceladoInfo] = useState<SucessoInfo | null>(null);
  const [storeTick, setStoreTick] = useState(0);

  type Row = {
    id: string;
    servicoNome: string;
    profissionalNome?: string;
    data: string;
    horario: string;
    status: StatusAg;
    cancelToken?: string | null;
  };


  // Itens reais do Supabase (RLS: customer_user_id = auth.uid())
  const [remoteRows, setRemoteRows] = useState<Row[] | null>(null);
  useEffect(() => {
    if (!usuario) {
      setRemoteRows(null);
      return;
    }
    // Se há slug mas o companyId real ainda não foi resolvido pela RPC,
    // aguardamos — nunca listamos sem restrição por company_id.
    if (slug && !companyId) {
      setRemoteRows(null);
      return;
    }
    let active = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const sessionUserId = sess.session?.user?.id ?? null;
      if (!sessionUserId) {
        setRemoteRows([]);
        return;
      }
      // RLS de appointments já restringe a customer_user_id = auth.uid().
      // Quando estamos dentro de um slug, filtramos adicionalmente pelo
      // company_id real vindo da RPC pública (fonte confiável, não local).
      let query = supabase
        .from("appointments")
        .select(
          "id, starts_at, status, service_name_snapshot, professional_name_snapshot, cancel_token, company_id",
        )
        .eq("customer_user_id", sessionUserId)
        .order("starts_at", { ascending: false });
      if (slug && companyId) {
        query = query.eq("company_id", companyId);
      }
      const { data, error } = await query;
      if (!active) return;
      if (error) {
        console.error("[Meus Agendamentos] erro Supabase:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        setRemoteRows([]);
        return;
      }
      const rows: Row[] = (data ?? []).map((r) => {
        const { date, time } = splitStartsAtBR(r.starts_at);
        return {
          id: r.id,
          servicoNome: r.service_name_snapshot ?? "Serviço",
          profissionalNome: r.professional_name_snapshot ?? undefined,
          data: date,
          horario: time,
          status: r.status as StatusAg,
          cancelToken: r.cancel_token ?? null,
        };
      });

      setRemoteRows(rows);
    })();
    return () => {
      active = false;
    };
  }, [usuario, slug, companyId, storeTick]);


  const meus: Row[] = useMemo(() => {
    const fromRemote = remoteRows ?? [];
    return [...fromRemote].sort((a, b) =>
      (b.data + b.horario).localeCompare(a.data + a.horario),
    );
  }, [remoteRows]);


  if (!usuario) {
    return (
      <section style={{ background: "#FFFFFF", padding: "32px 16px", textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "#888888", margin: "0 0 16px" }}>
          Entre para visualizar seus agendamentos.
        </p>
        <button onClick={abrirLogin} style={btnPrimary}>Entrar</button>
      </section>
    );
  }

  function fecharModal() {
    setCancelandoId(null);
    setMotivo(null);
  }

  async function confirmarCancelamento() {
    if (!cancelandoId || !motivo) return;
    const id = cancelandoId;
    const row = meus.find((r) => r.id === id);
    if (row) {
      setCanceladoInfo({ servico: row.servicoNome, data: row.data, horario: row.horario });
    }
    const motivoLabel: Record<CancelMotivo, string> = {
      imprevisto: "Apareceu um imprevisto",
      data_errada: "Escolhi a data ou horário errado",
      outro: "Outro motivo",
    };
    const motivoTxt = motivoLabel[motivo];
    setCancelando(true);
    fecharModal();

    try {
      const token = row?.cancelToken ?? null;
      if (token) {
        const { error } = await supabase.rpc("cancel_appointment_by_token", {
          _id: id,
          _reason: motivoTxt,
          _token: token,
        });
        if (error) throw error;
      } else {
        // Cliente autenticado: cancela via RLS por auth.uid()
        const { error } = await supabase.rpc("cancel_appointment_as_client", {
          _id: id,
          _reason: motivoTxt,
        });
        if (error) throw error;
      }
      // Refetch da fonte real (Supabase) — sem cache local.
      setStoreTick((n) => n + 1);
      setSucessoOpen(true);


    } catch (err) {
      console.error("[publicBooking] cancel_appointment_by_token", err);
      alert(
        err instanceof Error && err.message
          ? `Não foi possível cancelar: ${err.message}`
          : "Não foi possível cancelar o agendamento. Tente novamente.",
      );
    } finally {
      setCancelando(false);
    }
  }

  // Aguardamos dados remotos do Supabase e dados do site (template/show_address)
  // antes de renderizar os cards, para evitar flicker do botão Cancelar
  // e do campo Local.
  const isLoadingData = remoteRows === null || siteLoading;

  return (
    <section style={{ background: "#FFFFFF", padding: "16px 16px 32px" }}>
      {cancelando && <LoadingOverlay message="Cancelando seu agendamento..." />}
      {isLoadingData ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 16px" }}>
          <DotsSpinner size={40} />
        </div>
      ) : meus.length === 0 ? (
        <div
          style={{
            background: "#F5F5F3",
            borderRadius: 12,
            padding: "32px 16px",
            textAlign: "center",
            color: "#888888",
            fontSize: 14,
          }}
        >
          {slug
            ? "Você ainda não possui agendamentos neste estabelecimento. Quando você fizer seu primeiro agendamento aqui, ele aparecerá nesta lista."
            : "Você ainda não possui agendamentos."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {meus.map((a) => {
            const [y, m, d] = a.data.split("-");
            const dataFmt = `${d}/${m}/${y}`;
            return (
              <article
                key={a.id}
                style={{
                  background: "#FFFFFF",
                  border: "1.5px solid #EEEEEE",
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {(() => {
                  const past = isPast(a.data, a.horario);
                  const canceled = isCanceledStatus(a.status);
                  const showBadge = canceled || past;
                  const label = canceled ? "Cancelado" : "Concluído";
                  return (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#1A1A1A", flex: 1 }}>
                        {a.servicoNome}
                      </div>
                      {showBadge && <span style={badgeStyleFor(canceled)}>{label}</span>}
                    </div>
                  );
                })()}
                <div style={{ fontSize: 13, color: "#888888", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div><strong style={{ color: "#1A1A1A", fontWeight: 600 }}>Data:</strong> {dataFmt}</div>
                  <div><strong style={{ color: "#1A1A1A", fontWeight: 600 }}>Horário:</strong> {a.horario}</div>
                  {enderecoFmt ? (
                    <div>
                      <strong style={{ color: "#1A1A1A", fontWeight: 600 }}>Local:</strong>{" "}
                      <a
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        style={{
                          color: "inherit",
                          textDecoration: "none",
                          pointerEvents: "none",
                          cursor: "default",
                        }}
                      >
                        {enderecoFmt}
                      </a>
                    </div>
                  ) : null}
                  {a.profissionalNome && (professionalsCount == null || professionalsCount >= 2) ? (
                    <div><strong style={{ color: "#1A1A1A", fontWeight: 600 }}>Profissional:</strong> {a.profissionalNome}</div>
                  ) : null}

                </div>
                {!isCanceledStatus(a.status) && !isPast(a.data, a.horario) && (
                  <button
                    onClick={() => setCancelandoId(a.id)}
                    style={{
                      marginTop: 4,
                      background: PRIMARY,
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      minHeight: 44,
                    }}
                  >
                    Cancelar Agendamento
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {cancelandoId && (
        <ModalCentral onClose={fecharModal}>
          <h3 style={{ fontWeight: 700, fontSize: 18, color: "#1A1A1A", margin: "0 0 8px" }}>
            Que pena que você deseja cancelar sua reserva.
          </h3>
          <p style={{ fontSize: 14, color: "#888888", margin: "0 0 16px" }}>
            Podemos saber o motivo do cancelamento?
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {([
              ["imprevisto", "Apareceu um imprevisto"],
              ["data_errada", "Escolhi a data ou horário errado"],
              ["outro", "Outro motivo"],
            ] as const).map(([val, label]) => {
              const ativo = motivo === val;
              return (
                <button
                  key={val}
                  onClick={() => setMotivo(val)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1.5px solid ${ativo ? PRIMARY : "#EEEEEE"}`,
                    background: ativo ? PRIMARY_SOFT : "#FFFFFF",
                    color: "#1A1A1A",
                    fontSize: 14,
                    fontWeight: 600,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 150ms",
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: `2px solid ${ativo ? PRIMARY : "#CCCCCC"}`,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {ativo && (
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: PRIMARY }} />
                    )}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>

          <button
            onClick={confirmarCancelamento}
            disabled={!motivo}
            style={{
              ...btnPrimary,
              opacity: motivo ? 1 : 0.5,
              cursor: motivo ? "pointer" : "not-allowed",
            }}
          >
            Cancelar Reserva
          </button>
        </ModalCentral>
      )}

      <CancelamentoModal
        open={sucessoOpen}
        info={canceladoInfo}
        onClose={() => {
          setSucessoOpen(false);
          onBack();
        }}
        onVerAgendamentos={() => setSucessoOpen(false)}
      />
    </section>
  );
}

function ModalCentral({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: 16,
          width: "100%",
          maxWidth: 420,
          padding: 24,
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function isCanceledStatus(s: StatusAg | string): boolean {
  const v = String(s ?? "").toLowerCase();
  return v === "cancelado" || v === "cancelled" || v === "canceled";
}

function isPast(data: string, horario: string): boolean {
  if (!data || !horario) return false;
  // data: YYYY-MM-DD, horario: HH:mm (já em horário local/BR)
  const t = new Date(`${data}T${horario}:00`).getTime();
  if (Number.isNaN(t)) return false;
  return t < Date.now();
}

function splitStartsAtBR(iso: string): { date: string; time: string } {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { date: "", time: "" };
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return {
      date: `${get("year")}-${get("month")}-${get("day")}`,
      time: `${get("hour")}:${get("minute")}`,
    };
  } catch {
    return { date: "", time: "" };
  }
}

function badgeStyleFor(canceled: boolean): CSSProperties {
  const base: CSSProperties = {
    borderRadius: 20,
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 700,
    border: "1px solid",
    whiteSpace: "nowrap",
  };
  if (canceled) {
    return { ...base, background: "#FEE2E2", color: "#B91C1C", borderColor: "#FECACA" };
  }
  return { ...base, background: "#DCFCE7", color: "#15803D", borderColor: "#BBF7D0" };
}

const btnPrimary: CSSProperties = {
  width: "100%",
  background: PRIMARY,
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: 15,
  height: 48,
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
};
