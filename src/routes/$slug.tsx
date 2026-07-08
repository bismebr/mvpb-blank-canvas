import { createFileRoute, notFound, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { getPublicSiteBySlug, parseAddressString, type PublicSiteData } from "@/lib/companySite";
import { SiteConfigProvider, EMPTY_OWNER_CONFIG, type SiteConfig } from "@/components/admin/SiteConfigContext";
import {
  AppProvider,
  type ServicoAdmin,
  type CategoriaAdmin,
  type FuncionarioAdmin,
  type HorarioAdmin,
} from "@/components/admin/AppContext";
import { BarbeariaLayout } from "@/components/barbearia/BarbeariaLayout";
import { ServicesTab } from "@/components/barbearia/ServicesTab";
import { AboutTab } from "@/components/barbearia/AboutTab";
import { AvaliacoesTab } from "@/components/barbearia/AvaliacoesTab";
import { EspecialistasSection } from "@/components/barbearia/EspecialistasSection";
import { LoadingOverlay } from "@/components/barbearia/LoadingOverlay";
import { BookingScreen, type BookingResult } from "@/components/barbearia/BookingScreen";
import { SucessoModal, type SucessoInfo } from "@/components/barbearia/Modals";
import { useClientUser } from "@/components/barbearia/ClientUserContext";
import { isPhoneValid } from "@/components/barbearia/phoneMask";
import type { Usuario } from "@/components/barbearia/data";
import { DEFAULT_TEMPLATE_ID, type SiteTemplateId } from "@/lib/siteTemplates";
import {
  buildStartsAtIso,
  createPublicAppointment,
  fetchAvailableSlotsDetailed,
  toE164BR,
  type AvailableSlot,
} from "@/lib/publicBooking";
import { addPublicAppointment } from "@/lib/publicAppointmentsStore";
import { supabasePublic as supabase } from "@/integrations/supabase/client-public";
import { toast } from "sonner";


export const Route = createFileRoute("/$slug")({
  head: () => ({
    meta: [
      { title: "Site da empresa — Bisme" },
      { name: "description", content: "Página pública da empresa." },
    ],
  }),
  component: PublicSitePage,
});

function trimSeconds(t: string | null | undefined): string {
  if (!t) return "";
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function mapPublicToContexts(data: PublicSiteData): {
  siteConfig: SiteConfig;
  appInitial: {
    servicos: ServicoAdmin[];
    categorias: CategoriaAdmin[];
    funcionarios: FuncionarioAdmin[];
    horarios: HorarioAdmin[];
  };
} {
  const site = data.site ?? null;
  const whatsappDigits = (site?.whatsapp ?? "").replace(/\D+/g, "");
  const cleanedWhats = whatsappDigits.startsWith("55") ? whatsappDigits.slice(2) : whatsappDigits;

  const siteConfig: SiteConfig = {
    ...EMPTY_OWNER_CONFIG,
    businessName: site?.display_name || data.company.name || "",
    username: data.company.slug,
    address: site?.address ?? "",
    ...parseAddressString(site?.address ?? ""),
    whatsapp: cleanedWhats,
    logo: site?.logo_url ?? "",
    coverImage: site?.cover_url ?? "",
    aboutText: site?.about ?? EMPTY_OWNER_CONFIG.aboutText,
    aboutImage: site?.about_image_url ?? "",
    workGallery: Array.isArray(site?.work_image_urls) ? site!.work_image_urls! : [],
    instagram: site?.social_instagram ?? "",
    facebook: site?.social_facebook ?? "",
    youtube: site?.social_youtube ?? "",
    tiktok: site?.social_tiktok ?? "",
    site: site?.website_url ?? "",
    comodidades: Array.isArray(site?.amenities) ? site!.amenities! : [],
    template: (site?.template_key as SiteTemplateId) || DEFAULT_TEMPLATE_ID,
    showAddress: typeof site?.show_address === "boolean" ? site.show_address : !!site?.address,
    ratingAverage: Number(site?.rating_average) || 0,
    reviewsCount: Number(site?.reviews_count) || 0,
  };

  const categorias: CategoriaAdmin[] = data.categories.map((c) => ({ id: c.id, nome: c.name }));

  const spByService = new Map<string, string[]>();
  for (const sp of data.service_professionals) {
    const arr = spByService.get(sp.service_id) ?? [];
    arr.push(sp.professional_id);
    spByService.set(sp.service_id, arr);
  }

  const servicos: ServicoAdmin[] = data.services.map((s) => ({
    id: s.id,
    nome: s.name,
    preco: (s.price_cents ?? 0) / 100,
    duracao_minutos: s.duration_minutes,
    imagemUrl: s.image_url ?? undefined,
    descricao: s.description ?? undefined,
    categoriaId: s.category_id ?? undefined,
    funcionariosMode: "apenas",
    funcionariosIds: spByService.get(s.id) ?? [],
  }));

  const funcionarios: FuncionarioAdmin[] = data.professionals.map((p) => ({
    id: p.id,
    nome: p.name,
    fotoUrl: p.photo_url ?? undefined,
    cargo: p.role_title ?? "",
    status: "ativo",
    comissaoPct: 0,
    entrada: "08:00",
    saida: "18:00",
    diasFolga: [],
  }));

  const horarios: HorarioAdmin[] = data.hours.map((h) => ({
    diaSemana: h.weekday,
    aberto: !!h.is_open,
    abre: trimSeconds(h.opens_at) || "08:00",
    fecha: trimSeconds(h.closes_at) || "18:00",
  }));

  return { siteConfig, appInitial: { servicos, categorias, funcionarios, horarios } };
}

function PublicSitePage() {
  const { slug } = Route.useParams();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "not-found" }
    | { kind: "unavailable" }
    | { kind: "error"; message: string }
    | { kind: "ready"; data: PublicSiteData }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    (async () => {
      try {
        const { data: availData, error: availErr } = await supabase.rpc(
          "get_public_site_availability",
          { _slug: slug },
        );
        if (cancelled) return;
        if (availErr) {
          setState({ kind: "error", message: "Erro ao carregar a página." });
          return;
        }
        const available =
          availData && typeof availData === "object" && "available" in (availData as Record<string, unknown>)
            ? Boolean((availData as { available?: unknown }).available)
            : false;
        if (!available) {
          setState({ kind: "unavailable" });
          return;
        }

        const data = await getPublicSiteBySlug(slug);
        if (cancelled) return;
        if (!data) {
          setState({ kind: "not-found" });
          return;
        }
        setState({ kind: "ready", data });
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Erro ao carregar a página.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.kind === "loading") {
    return <LoadingOverlay slug={slug} />;
  }


  if (state.kind === "not-found") {
    return (
      <FriendlyError
        title="Site não encontrado"
        description="O endereço informado não corresponde a nenhuma empresa cadastrada."
      />
    );
  }

  if (state.kind === "unavailable") {
    return (
      <FriendlyError
        title="Site temporariamente indisponível"
        description="Este site está temporariamente fora do ar. Tente novamente mais tarde."
      />
    );
  }

  if (state.kind === "error") {
    return (
      <FriendlyError
        title="Não foi possível carregar o site"
        description={state.message}
      />
    );
  }

  return <PublicSiteView data={state.data} />;
}


function PublicSiteView({ data }: { data: PublicSiteData }) {
  const { siteConfig, appInitial } = useMemo(() => mapPublicToContexts(data), [data]);
  const funcionarios = appInitial.funcionarios;
  const exigirEspecialista = funcionarios.length >= 2;
  const autoEspecialistaId = funcionarios.length === 1 ? funcionarios[0].id : null;
  const [especialistaId, setEspecialistaId] = useState<string | null>(autoEspecialistaId);
  useEffect(() => {
    if (funcionarios.length === 1) setEspecialistaId(funcionarios[0].id);
  }, [funcionarios]);
  const bloqueado = exigirEspecialista && !especialistaId;
  const location = useLocation();
  const tab = (location.hash || "").replace(/^#/, "");

  return (
    <SiteConfigProvider initialConfig={siteConfig}>
      <AppProvider initial={appInitial}>
        <BarbeariaLayout slug={data.company.slug}>
          {({ usuario, abrirLogin }) => (
            <BookingFlow
              slug={data.company.slug}
              servicos={appInitial.servicos}
              funcionarios={funcionarios}
              especialistaId={especialistaId}
              setEspecialistaId={setEspecialistaId}
              exigirEspecialista={exigirEspecialista}
              bloqueado={bloqueado}
              tab={tab}
              usuario={usuario}
              abrirLogin={abrirLogin}
            />
          )}
        </BarbeariaLayout>
      </AppProvider>
    </SiteConfigProvider>
  );
}

function BookingFlow({
  slug,
  servicos,
  funcionarios,
  especialistaId,
  setEspecialistaId,
  exigirEspecialista,
  bloqueado,
  tab,
  usuario,
  abrirLogin,
}: {
  slug: string;
  servicos: ServicoAdmin[];
  funcionarios: FuncionarioAdmin[];
  especialistaId: string | null;
  setEspecialistaId: (id: string | null) => void;
  exigirEspecialista: boolean;
  bloqueado: boolean;
  tab: string;
  usuario: Usuario | null;
  abrirLogin: (mode?: "login" | "cadastro", initialWhatsapp?: string) => void;
}) {
  const navigate = useNavigate();
  const { updateUsuario } = useClientUser();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingServicoId, setBookingServicoId] = useState<string | null>(null);
  const [pending, setPending] = useState<BookingResult | null>(null);
  const [sucessoOpen, setSucessoOpen] = useState(false);
  const [sucessoInfo, setSucessoInfo] = useState<SucessoInfo | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  // Estado dos slots vindos da RPC para o serviço/profissional/dia atual.
  const [bookingDia, setBookingDia] = useState<string | null>(null);
  const [slotsRpc, setSlotsRpc] = useState<string[] | null>(null);
  const [slotsIsoMap, setSlotsIsoMap] = useState<Record<string, string>>({});
  const [slotsLoading, setSlotsLoading] = useState(false);
  // Profissional efetivamente escolhido dentro do BookingScreen (item[0]).
  // Sobrescreve `especialistaId` quando o cliente troca via "Alterar profissional".
  const [bookingProfId, setBookingProfId] = useState<string | null>(null);
  // Dia inicial resolvido via RPC: primeiro dia (a partir de hoje) com horários
  // livres para o serviço/profissional escolhido. Re-resolvido ao trocar profissional.
  const [initialDayResolved, setInitialDayResolved] = useState<string | null>(null);

  // Profissional para a RPC: prioriza o escolhido dentro do fluxo; depois
  // o selecionado na seção de especialistas; senão null quando não há lista.
  const profissionalRpcId =
    funcionarios.length === 0 ? null : bookingProfId ?? especialistaId;

  // Cache de slots por combinação slug+service+professional+date.
  const slotsCacheRef = useRef<Map<string, AvailableSlot[]>>(new Map());

  function todayIsoSP(): string {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric", month: "2-digit", day: "2-digit",
    });
    const parts = fmt.formatToParts(new Date()).reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  function addDaysIso(iso: string, days: number): string {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  }

  // Resolve o "próximo dia disponível" via RPC quando o fluxo abre ou quando
  // muda o serviço/profissional. Faz busca progressiva por até 60 dias.
  useEffect(() => {
    if (!bookingOpen || !bookingServicoId) {
      setInitialDayResolved(null);
      return;
    }
    let cancelled = false;
    setInitialDayResolved(null);
    (async () => {
      const start = todayIsoSP();
      for (let offset = 0; offset < 60; offset++) {
        if (cancelled) return;
        const date = addDaysIso(start, offset);
        const cacheKey = `${slug}|${bookingServicoId}|${profissionalRpcId ?? "null"}|${date}`;
        let slots = slotsCacheRef.current.get(cacheKey);
        if (!slots) {
          try {
            slots = await fetchAvailableSlotsDetailed({
              slug, serviceId: bookingServicoId,
              professionalId: profissionalRpcId, dateIso: date,
            });
            slotsCacheRef.current.set(cacheKey, slots);
          } catch (e) {
            console.warn("[publicBooking] probe next-available-day", e);
            slots = [];
          }
        }
        if (cancelled) return;
        if (slots.length > 0) {
          console.log("[Agendamento] próximo dia disponível resolvido:", date);
          setInitialDayResolved(date);
          return;
        }
      }
      // Nenhum dia com horário livre nos próximos 60 dias: mantém hoje
      // (o BookingScreen mostrará "sem horários" para o dia selecionado).
      if (!cancelled) setInitialDayResolved(start);
    })();
    return () => { cancelled = true; };
  }, [bookingOpen, bookingServicoId, profissionalRpcId, slug]);

  useEffect(() => {
    if (!bookingOpen || !bookingServicoId || !bookingDia) {
      setSlotsRpc(null);
      setSlotsIsoMap({});
      return;
    }
    const cacheKey = `${slug}|${bookingServicoId}|${profissionalRpcId ?? "null"}|${bookingDia}`;
    const cached = slotsCacheRef.current.get(cacheKey);
    if (cached) {
      console.log("[Agendamento] slots cache hit:", cacheKey);
      setSlotsRpc(cached.map((s) => s.time));
      setSlotsIsoMap(Object.fromEntries(cached.filter((s) => s.iso).map((s) => [s.time, s.iso!])));
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    console.log("[Agendamento] get_available_slots args após trocar profissional:", {
      slug,
      serviceId: bookingServicoId,
      professionalId: profissionalRpcId,
      dateIso: bookingDia,
    });
    fetchAvailableSlotsDetailed({
      slug,
      serviceId: bookingServicoId,
      professionalId: profissionalRpcId,
      dateIso: bookingDia,
    })
      .then((slots: AvailableSlot[]) => {
        if (cancelled) return;
        slotsCacheRef.current.set(cacheKey, slots);
        setSlotsRpc(slots.map((s) => s.time));
        setSlotsIsoMap(Object.fromEntries(slots.filter((s) => s.iso).map((s) => [s.time, s.iso!])));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("[publicBooking] get_available_slots", err);
        setSlotsRpc([]);
        setSlotsIsoMap({});
        toast("Não foi possível carregar horários. Tente novamente.");
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingOpen, bookingServicoId, bookingDia, profissionalRpcId, slug]);

  // Limpa o dia ao fechar; quando aberto, o BookingScreen emite onDayChange.
  useEffect(() => {
    if (!bookingOpen) {
      setBookingDia(null);
      setBookingProfId(null);
    }
  }, [bookingOpen]);



  const finalize = async (r: BookingResult, u: Usuario) => {
    setConfirmando(true);
    const telefoneFinal = r.whatsapp || u.telefone || "";
    if (telefoneFinal && telefoneFinal !== u.telefone) {
      updateUsuario({ telefone: telefoneFinal });
    }
    const e164 = toE164BR(telefoneFinal);
    const first = r.items[0];
    if (!first) {
      setConfirmando(false);
      return;
    }
    try {
      const { data: sess } = await supabase.auth.getSession();
      console.log("[Agendamento] session user id:", sess.session?.user?.id ?? null);
      console.log("[Agendamento] usuario context:", u);
      // Prefere o ISO original retornado pela RPC quando disponível — evita
      // que a reconstrução manual com buildStartsAtIso desloque o slot real.
      const isoFromRpc = slotsIsoMap[r.horario] ?? null;
      const startsAtIso = isoFromRpc ?? buildStartsAtIso(r.data, r.horario);
      console.log("[Agendamento] slot selecionado:", r.horario, "isoMap:", isoFromRpc, "startsAtIso final:", startsAtIso);
      const payload = {
        slug,
        serviceId: first.servicoId,
        professionalId: first.funcionarioId ?? profissionalRpcId,
        startsAtIso,
        customerName: u.nome,
        customerPhoneE164: e164,
        customerEmail: u.email ? u.email : null,
        notes: r.observacao ? r.observacao : null,
      };
      console.log("[Agendamento] createPublicAppointment payload:", payload);
      const result = await createPublicAppointment(payload);
      console.log("[Agendamento] createPublicAppointment result:", result);
      const svc = servicos.find((s) => s.id === first.servicoId);
      const funcId = first.funcionarioId ?? profissionalRpcId ?? undefined;
      const func = funcionarios.find((f) => f.id === funcId);
      // Persistir localmente para a área "Meus agendamentos".
      try {
        addPublicAppointment({
          id: result.id || String(Date.now()),
          slug,
          serviceId: first.servicoId,
          serviceName: svc?.nome ?? "Serviço",
          professionalId: funcId ?? null,
          professionalName: func?.nome ?? null,
          data: r.data,
          horario: r.horario,
          endsAt: result.endsAt,
          cancelToken: result.cancelToken,
          reviewToken: result.reviewToken,
          customerName: u.nome,
          customerEmail: u.email || null,
          customerPhoneE164: e164,
          customerPhoneDigits: (telefoneFinal || "").replace(/\D+/g, ""),
          status: "confirmado",
          observacao: r.observacao || null,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("[publicBooking] falha ao salvar localmente", e);
      }
      setSucessoInfo({
        servico: svc?.nome ?? "Serviço",
        data: r.data,
        horario: r.horario,
        profissional: func?.nome,
      });

      setConfirmando(false);
      setBookingOpen(false);
      setPending(null);
      setSucessoOpen(true);
    } catch (err) {
      setConfirmando(false);
      const e = err as { message?: string; code?: string; details?: string; hint?: string };
      const msg = e?.message ?? "Erro ao confirmar agendamento.";
      console.error("[Agendamento] create_public_appointment ERRO:", {
        message: e?.message,
        code: e?.code,
        details: e?.details,
        hint: e?.hint,
        raw: err,
      });
      const friendly =
        msg.includes("ocupado") || msg.includes("passado") || msg.includes("disponível")
          ? "Esse horário não está mais disponível. Escolha outro."
          : msg.includes("telefone")
            ? "Telefone inválido. Verifique o número e tente novamente."
            : msg.includes("nome")
              ? "Informe seu nome para confirmar o agendamento."
              : `Não foi possível confirmar: ${msg}`;
      toast.error(friendly);
      // Recarrega slots do dia para refletir a indisponibilidade.
      if (bookingDia && bookingServicoId) {
        try {
          const cacheKey = `${slug}|${bookingServicoId}|${profissionalRpcId ?? "null"}|${bookingDia}`;
          slotsCacheRef.current.delete(cacheKey);
          const slots = await fetchAvailableSlotsDetailed({
            slug,
            serviceId: bookingServicoId,
            professionalId: profissionalRpcId,
            dateIso: bookingDia,
          });
          slotsCacheRef.current.set(cacheKey, slots);
          setSlotsRpc(slots.map((s) => s.time));
          setSlotsIsoMap(Object.fromEntries(slots.filter((s) => s.iso).map((s) => [s.time, s.iso!])));
        } catch {}
      }
    }
  };

  // Após login, retomar finalize do pending — em efeito, com guarda para não
  // disparar múltiplas vezes (evita flash/duplicidade de re-render).
  const finalizingPendingRef = useRef(false);
  useEffect(() => {
    if (!usuario || !pending || confirmando || sucessoOpen) return;
    if (finalizingPendingRef.current) return;
    const phone = usuario.telefone || pending.whatsapp;
    if (isPhoneValid(phone ?? "")) {
      finalizingPendingRef.current = true;
      const p = pending;
      const u = usuario;
      // limpa pending imediatamente para não re-disparar em novas renders
      setPending(null);
      Promise.resolve().then(async () => {
        try {
          await finalize(p, u);
        } finally {
          finalizingPendingRef.current = false;
        }
      });
    } else {
      // Precisa completar o WhatsApp — reabre booking se fechou
      setPending(null);
      if (!bookingOpen) setBookingOpen(true);
    }
    // finalize é estável o suficiente; incluir causaria loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, pending, confirmando, sucessoOpen]);

  return (
    <>
      {tab === "sobre" ? (
        <AboutTab onAgendar={() => { /* fica no slug */ }} />
      ) : tab === "avaliacoes" ? (
        <AvaliacoesTab
          onAgendar={() => { /* fica no slug */ }}
          usuario={usuario}
          abrirLogin={abrirLogin}
        />
      ) : (
        <>
          {funcionarios.length >= 2 && (
            <EspecialistasSection
              funcionarios={funcionarios}
              selectedId={especialistaId}
              onSelect={setEspecialistaId}
            />
          )}
          <div
            style={{
              opacity: bloqueado ? 0.45 : 1,
              pointerEvents: bloqueado ? "none" : "auto",
              transition: "opacity 200ms",
              position: "relative",
            }}
            aria-disabled={bloqueado}
          >
            {bloqueado && (
              <div
                style={{
                  textAlign: "center",
                  padding: "12px 16px 0",
                  fontSize: 13,
                  color: "var(--site-on-bg-muted, #888)",
                  fontWeight: 600,
                }}
              >
                Selecione um profissional para continuar
              </div>
            )}
            <ServicesTab
              onReservar={(id) => {
                setBookingServicoId(id);
                setBookingOpen(true);
              }}
            />
          </div>

          <BookingScreen
            open={bookingOpen}
            initialServicoId={bookingServicoId ?? ""}
            initialFuncionarioId={profissionalRpcId}
            initialWhatsapp={usuario?.telefone ?? ""}
            requireWhatsapp={!!usuario && !isPhoneValid(usuario.telefone ?? "")}
            slotsOverride={slotsRpc}
            slotsLoading={slotsLoading}
            onDayChange={(d) => setBookingDia(d)}
            onProfissionalChange={(id) => setBookingProfId(id)}
            initialDay={initialDayResolved}


            onClose={() => setBookingOpen(false)}
            onConfirm={(r) => {
              // Sincroniza o dia escolhido para refetch caso necessário
              setBookingDia(r.data);
              if (!usuario) {
                setPending(r);
                abrirLogin("cadastro");
                return;
              }
              finalize(r, usuario);
            }}
          />

          <SucessoModal
            open={sucessoOpen}
            info={sucessoInfo}
            onClose={() => setSucessoOpen(false)}
            onVerAgendamentos={() => {
              navigate({ to: "/meus-agendamentos", search: { slug } });
              setTimeout(() => setSucessoOpen(false), 50);
            }}
          />

          {(confirmando || (!!pending && !!usuario && !sucessoOpen)) && (
            <LoadingOverlay message="Confirmando seu agendamento..." />
          )}
        </>
      )}
    </>
  );
}

function FriendlyError({ title, description }: { title: string; description: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#f8f8f8",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#111" }}>{title}</h1>
        <p style={{ marginTop: 10, fontSize: 14, color: "#555", lineHeight: 1.5 }}>{description}</p>
      </div>
    </div>
  );
}

// Avoid unused-import lint
export const _notFound = notFound;
