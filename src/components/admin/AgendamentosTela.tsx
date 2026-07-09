import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Bell, Calendar as CalIcon, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  MoreVertical, Plus, Search, SlidersHorizontal, User as UserIcon, X,
} from "lucide-react";

import { useApp, type AgendamentoAdmin, type StatusAg, type FuncionarioAdmin, type ServicoAdmin } from "./AppContext";
import { COLORS, FONT, BottomSheet, Label, inputStyle, primaryBtn, secondaryBtn } from "./ui";
import { confirmSentStore, notifStore } from "./notifyStore";
import { supabase } from "@/integrations/supabase/client";
import { messagesStore, applyVariables } from "./messagesStore";
import { AtividadeScreen } from "./AtividadeScreen";
import {
  generateSlots as generateSlotsLib,
  isProfessionalFreeAt as isProFreeLib,
  isSlotPast,
  type Slot,
} from "@/lib/availability";
import { effectiveStatus, isHorarioAtingido } from "@/lib/agendamentoStatus";


/* ------------------------------------------------------------------ */
/* Tipos / helpers                                                    */
/* ------------------------------------------------------------------ */

type Visao = "dia" | "mes" | "ano" | "profissional";
type DisplayStatus = "agendado" | "concluido" | "cancelado" | "naoCompareceu";

const WD_LONG = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WD_CURTO_MAI = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const WD_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_CURTO = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtDate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseDate(s: string) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function brl(n: number) { return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function toMin(hhmm: string) { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; }
function fmtHora(min: number) { return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`; }
function fmtHoraCurta(min: number) {
  const h = Math.floor(min / 60); const m = min % 60;
  return m === 0 ? `${h}h` : `${h}:${pad(m)}`;
}
function fmtDuracao(min: number) {
  if (!min || min <= 0) return "";
  if (min < 60) return `${min} ${min === 1 ? "minuto" : "minutos"}`;
  const h = Math.floor(min / 60); const r = min % 60;
  const hStr = `${h} ${h === 1 ? "hora" : "horas"}`;
  if (r === 0) return hStr;
  return `${hStr} e ${r} ${r === 1 ? "minuto" : "minutos"}`;
}
function addMinutesToTime(hhmm: string, min: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h || 0) * 60 + (m || 0) + (min || 0);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${pad(hh)}:${pad(mm)}`;
}
function shortName(n: string) {
  const parts = (n || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function displayStatus(a: AgendamentoAdmin, now: Date = new Date()): DisplayStatus {
  return effectiveStatus(a, now);
}

const STATUS_META: Record<DisplayStatus, { label: string; bg: string; fg: string; border: string; dot: string }> = {
  agendado:      { label: "Agendado",       bg: "#EFF6FF", fg: "#1D4ED8", border: "#BFDBFE", dot: "#3B82F6" },
  concluido:     { label: "Concluído",      bg: "#ECFDF5", fg: "#047857", border: "#A7F3D0", dot: "#10B981" },
  cancelado:     { label: "Cancelado",      bg: "#FEF2F2", fg: "#B91C1C", border: "#FECACA", dot: "#EF4444" },
  naoCompareceu: { label: "Não compareceu", bg: "#FFF7ED", fg: "#B45309", border: "#FED7AA", dot: "#F59E0B" },
};

function StatusBadge({ status }: { status: DisplayStatus }) {
  const m = STATUS_META[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999,
      padding: "3px 10px", fontSize: 11, fontWeight: 700,
      background: m.bg, color: m.fg, border: `1px solid ${m.border}`, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot }} />
      {m.label}
    </span>
  );
}

function segundaDaSemana(d: Date) {
  const x = new Date(d); x.setHours(0,0,0,0);
  const dia = x.getDay();
  x.setDate(x.getDate() + (dia === 0 ? -6 : 1 - dia));
  return x;
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */

export function AgendamentosTela({ addOpen, onClose, onAdd }: { addOpen: boolean; onClose: () => void; onAdd?: () => void }) {
  const { agendamentos, servicos, funcionarios, horarios, addAgendamento, updateStatusAg, setAgendamentos, setServicos, setFuncionarios } = useApp();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [cancelInfo, setCancelInfo] = useState<Record<string, { by: "client" | "company" | "system"; at: string }>>({});
  // Referência para o loader das atividades/agendamentos, usada para refetch
  // sob demanda (fallback quando o Realtime não está ativo na publicação).
  const reloadRef = useRef<() => void>(() => {});

  const funcionariosEfetivos = funcionarios;
  const agendamentosEfetivos = agendamentos;

  // ---- Conexão real com Supabase: carrega appointments/services/professionals da empresa do usuário logado ----
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    function tzParts(iso: string): { date: string; time: string } {
      try {
        const d = new Date(iso);
        const fmt = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", hour12: false,
        });
        const parts = fmt.formatToParts(d).reduce<Record<string, string>>((acc, p) => {
          if (p.type !== "literal") acc[p.type] = p.value;
          return acc;
        }, {});
        const hh = parts.hour === "24" ? "00" : parts.hour;
        return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${hh}:${parts.minute}` };
      } catch {
        return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
      }
    }

    async function load() {
      const { data: member } = await supabase
        .from("company_members").select("company_id").limit(1).maybeSingle();
      const cid = member?.company_id;
      if (!cid || cancelled) return;
      setCompanyId(cid);

      const [apptsRes, servRes, profRes, cancRes] = await Promise.all([
        supabase.from("appointments").select("*").eq("company_id", cid).order("starts_at", { ascending: true }),
        supabase.from("services").select("*").eq("company_id", cid).eq("is_active", true),
        supabase.from("professionals").select("*").eq("company_id", cid).eq("is_active", true).eq("is_visible", true).eq("is_default_owner", false).order("position", { ascending: true }),
        supabase.from("appointment_cancellations").select("appointment_id, canceled_by, created_at").eq("company_id", cid),
      ]);
      if (cancelled) return;

      const servRows = servRes.data ?? [];
      const profRows = profRes.data ?? [];
      const apptRows = apptsRes.data ?? [];

      // Mapa de cancelamentos: appointment_id -> { por quem, quando }
      const cancInfo: Record<string, { by: "client" | "company" | "system"; at: string }> = {};
      for (const c of cancRes.data ?? []) {
        if (c.appointment_id) {
          cancInfo[c.appointment_id] = {
            by: (c.canceled_by as "client" | "company" | "system") ?? "system",
            at: c.created_at ?? "",
          };
        }
      }

      const servicosMapped: ServicoAdmin[] = servRows.map((s) => ({
        id: s.id, nome: s.name, preco: (s.price_cents ?? 0) / 100,
        duracao_minutos: s.duration_minutes ?? 30,
        imagemUrl: s.image_url ?? undefined, descricao: s.description ?? undefined,
        categoriaId: s.category_id ?? undefined,
      }));
      // Inclui serviços faltantes a partir dos snapshots para evitar cards "sem serviço"
      const servIds = new Set(servicosMapped.map((s) => s.id));
      for (const a of apptRows) {
        if (a.service_id && !servIds.has(a.service_id)) {
          servicosMapped.push({
            id: a.service_id, nome: a.service_name_snapshot || "Serviço",
            preco: (a.service_price_cents_snapshot ?? 0) / 100,
            duracao_minutos: a.duration_minutes_snapshot ?? 30,
          });
          servIds.add(a.service_id);
        }
      }

      const funcsMapped: FuncionarioAdmin[] = profRows.map((p) => ({
        id: p.id, nome: p.name, fotoUrl: p.photo_url ?? undefined,
        cargo: p.role_title ?? "", status: "ativo",
        comissaoPct: 0, entrada: "08:00", saida: "18:00", diasFolga: [],
      }));

      const mapStatus = (s: string): StatusAg => {
        if (s === "cancelado" || s === "concluido" || s === "naoCompareceu" || s === "confirmado" || s === "pendente") return s as StatusAg;
        return "pendente";
      };

      const agsMapped: AgendamentoAdmin[] = apptRows.map((a) => {
        const { date, time } = tzParts(a.starts_at);
        return {
          id: a.id, nome: a.customer_name || "Cliente",
          telefone: a.customer_phone || "", email: a.customer_email || "",
          servicoId: a.service_id, funcionarioId: a.professional_id || undefined,
          data: date, horario: time, observacao: a.notes ?? undefined,
          status: mapStatus(a.status as unknown as string),
          createdAt: a.created_at ?? undefined,
          updatedAt: a.updated_at ?? undefined,
        };
      });

      setServicos(servicosMapped);
      setFuncionarios(funcsMapped);
      setAgendamentos(agsMapped);
      setCancelInfo(cancInfo);

      channel = supabase
        .channel(`admin-appts-${cid}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `company_id=eq.${cid}` },
          () => { void load(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "appointment_cancellations", filter: `company_id=eq.${cid}` },
          () => { void load(); })
        .subscribe();
    }
    reloadRef.current = () => { void load(); };
    void load();
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback de atualização: como o Realtime pode não estar ativo na publicação
  // para as tabelas necessárias, recarregamos ao abrir a aba Atividade e quando
  // a janela/aba volta ao foco. Isso garante que novas atividades apareçam sem
  // reload manual da página.
  useEffect(() => {
    if (notifOpen) reloadRef.current();
  }, [notifOpen]);

  useEffect(() => {
    function onFocus() { reloadRef.current(); }
    function onVisible() { if (document.visibilityState === "visible") reloadRef.current(); }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);


  async function handleStatus(a: AgendamentoAdmin, status: StatusAg) {
    const prevStatus = a.status;
    updateStatusAg(a.id, status);
    if (!companyId) return;
    const { error } = await supabase
      .from("appointments")
      .update({ status: status as StatusAg })
      .eq("id", a.id)
      .eq("company_id", companyId);
    if (error) {
      console.error("[agenda] falha ao atualizar status:", error);
      updateStatusAg(a.id, prevStatus);
      alert("Não foi possível atualizar o agendamento. Tente novamente.");
    }
  }

  const temFuncionarios = funcionariosEfetivos.length > 0;
  const mostrarFaixaProfs = funcionariosEfetivos.length >= 2;


  // --- Estado da view ---------------------------------------------------
  const hoje = useMemo(() => new Date(), []);
  const hojeStr = fmtDate(hoje);
  const [visao, setVisao] = useState<Visao>("dia");
  const [dataRef, setDataRef] = useState<string>(hojeStr);
  const [mesRef, setMesRef] = useState<{ y: number; m: number }>({ y: hoje.getFullYear(), m: hoje.getMonth() });
  const [anoRef, setAnoRef] = useState<number>(hoje.getFullYear());
  const [profSel, setProfSel] = useState<string>("todos");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [busca, setBusca] = useState("");

  // Mês/ano exibido no header, atualizado pelo scroll horizontal da faixa de dias
  const [scrollMonthYear, setScrollMonthYear] = useState<{ y: number; m: number }>({
    y: hoje.getFullYear(),
    m: hoje.getMonth(),
  });
  const [fStatus, setFStatus] = useState<DisplayStatus | "todos">("todos");
  const [fServ, setFServ] = useState<string>("todos");

  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [cancelSuccessAg, setCancelSuccessAg] = useState<AgendamentoAdmin | null>(null);

  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);

  // --- Notificações (sininho) ----------------------------------------
  const [readVersion, setReadVersion] = useState(0);
  useEffect(() => notifStore.subscribe(() => setReadVersion((v) => v + 1)), []);
  const readSet = useMemo(() => notifStore.getRead(), [readVersion]);

  type ActivityItem = {
    id: string;
    kind: "created" | "canceled";
    at: string; // ISO
    ag: AgendamentoAdmin;
    canceledBy?: "client" | "company" | "system";
  };

  // Atividades: derivadas dos agendamentos do banco.
  // - "created" ordenado por appointments.created_at
  // - "canceled" (quando status = cancelado) ordenado pelo momento do
  //   cancelamento (appointment_cancellations.created_at) com fallback em
  //   appointments.updated_at.
  // Tudo ordenado por data da AÇÃO (não pela data do agendamento), do mais
  // recente para o mais antigo.
  const activities = useMemo<ActivityItem[]>(() => {
    const out: ActivityItem[] = [];
    for (const a of agendamentos) {
      const createdAt = a.createdAt || `${a.data}T${a.horario}:00`;
      out.push({ id: a.id, kind: "created", at: createdAt, ag: a });
      if (a.status === "cancelado") {
        const info = cancelInfo[a.id];
        const at = info?.at || a.updatedAt || a.createdAt || `${a.data}T${a.horario}:00`;
        out.push({ id: `${a.id}:cancel`, kind: "canceled", at, ag: a, canceledBy: info?.by });
      }
    }
    out.sort((x, y) => y.at.localeCompare(x.at));
    return out;
  }, [agendamentos, cancelInfo]);
  const unreadCount = activities.filter((x) => !readSet.has(x.id)).length;


  // Bloquear scroll quando modais abertos
  useEffect(() => {
    const anyOpen = filtersOpen || !!detalheId || addOpen || menuOpen || notifOpen || !!cancelSuccessAg || monthPickerOpen;
    if (!anyOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [filtersOpen, detalheId, addOpen, menuOpen, notifOpen, cancelSuccessAg, monthPickerOpen]);

  function limparFiltros() { setBusca(""); setFStatus("todos"); setFServ("todos"); }
  const filtrosAtivos = (busca ? 1 : 0) + (fStatus !== "todos" ? 1 : 0) + (fServ !== "todos" ? 1 : 0)
    + (temFuncionarios && profSel !== "todos" ? 1 : 0);

  function openNotification(it: ActivityItem) {
    setNotifOpen(false);
    notifStore.markRead(it.id);
    setVisao("dia");
    setDataRef(it.ag.data);
    setDetalheId(it.ag.id);
    setHighlightId(it.ag.id);
    window.setTimeout(() => setHighlightId((cur) => (cur === it.ag.id ? null : cur)), 2200);
  }


  // --- Filtragem base --------------------------------------------------
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return agendamentosEfetivos.filter((a) => {
      if (q && !a.nome.toLowerCase().includes(q)) return false;
      if (fServ !== "todos" && a.servicoId !== fServ) return false;
      if (temFuncionarios && profSel !== "todos" && a.funcionarioId !== profSel) return false;
      if (fStatus !== "todos") {
        if (displayStatus(a, hoje) !== fStatus) return false;
      }
      return true;
    });
  }, [agendamentosEfetivos, busca, fStatus, fServ, profSel, temFuncionarios, hoje]);

  // --- Itens por período -----------------------------------------------
  const itensPeriodo = useMemo(() => {
    if (visao === "dia") return filtrados.filter((a) => a.data === dataRef);
    if (visao === "mes") {
      const prefix = `${mesRef.y}-${pad(mesRef.m + 1)}`;
      return filtrados.filter((a) => a.data.startsWith(prefix));
    }
    if (visao === "ano") return filtrados.filter((a) => a.data.startsWith(`${anoRef}-`));
    const base = segundaDaSemana(parseDate(dataRef));
    const fim = new Date(base); fim.setDate(base.getDate() + 6);
    const ini = fmtDate(base), fimStr = fmtDate(fim);
    return filtrados.filter((a) => a.data >= ini && a.data <= fimStr);
  }, [filtrados, visao, dataRef, mesRef, anoRef]);

  // Horário de funcionamento do dia selecionado
  const dataRefObj = useMemo(() => parseDate(dataRef), [dataRef]);
  const horarioDia = useMemo(() => {
    return horarios.find((h) => h.diaSemana === dataRefObj.getDay()) ?? null;
  }, [horarios, dataRefObj]);
  const horarioLabel = horarioDia && horarioDia.aberto
    ? `${horarioDia.abre} - ${horarioDia.fecha}`
    : "Fechado neste dia";

  // Label do mês/ano no header (ex.: "Junho 2026")
  const headerDataLabel = useMemo(() => {
    return `${MESES[scrollMonthYear.m]} ${scrollMonthYear.y}`;
  }, [scrollMonthYear]);

  // Sincroniza o mês/ano do header com o dia selecionado (clique ou picker)
  useEffect(() => {
    setScrollMonthYear({ y: dataRefObj.getFullYear(), m: dataRefObj.getMonth() });
  }, [dataRef]);

  // Label completa do dia selecionado (ex.: "Quarta-feira, 23 de junho, 2026")
  const fullDateLabel = useMemo(() => {
    const wd = WD_LONG[dataRefObj.getDay()];
    const wdName = wd === "Sábado" ? "Sábado" : `${wd}-feira`;
    const finalWd = (wd === "Sábado" || wd === "Domingo") ? wd : `${wd}-feira`;
    return `${finalWd}, ${dataRefObj.getDate()} de ${MESES[dataRefObj.getMonth()].toLowerCase()}, ${dataRefObj.getFullYear()}`;
  }, [dataRefObj]);

  // Faixa de dias (com rolagem horizontal: passado e futuro)
  const semana = useMemo(() => {
    const base = segundaDaSemana(dataRefObj);
    // 4 semanas antes + 8 semanas depois = 84 dias roláveis
    const startOffset = -28;
    const total = 84;
    return Array.from({ length: total }).map((_, i) => {
      const d = new Date(base); d.setDate(base.getDate() + startOffset + i);
      return d;
    });
  }, [dataRefObj]);

  return (
    <div className="agenda-page" style={{ fontFamily: FONT, background: COLORS.bgSurface, minHeight: "100vh", paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px) + 16px)", marginBottom: "calc(-1 * (64px + env(safe-area-inset-bottom, 0px) + 8px))" }}>

      {/* ===================== HEADER ===================== */}
      <header
        style={{
          background: COLORS.bgSurface,
          borderBottom: `1px solid var(--adm-divider)`,
        }}
      >
        <div style={{
          maxWidth: AGENDA_MAX_WIDTH, margin: "0 auto", width: "100%",
          padding: "10px 12px 8px",
          display: "grid",
          gridTemplateColumns: "80px minmax(0,1fr) 80px",
          alignItems: "center",
          gap: 8,
        }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifySelf: "start", position: "relative", zIndex: 260 }}>
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}`}
              style={{
                position: "relative",
                background: "transparent", border: "none", cursor: "pointer",
                width: 44, height: 44, borderRadius: 999,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: COLORS.textPrimary, padding: 0,
                zIndex: 2,
              }}
            >
              <span
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28, height: 28,
                  color: COLORS.textPrimary,
                }}
              >
                <Bell size={26} color="currentColor" strokeWidth={2} />
                {unreadCount > 0 && (
                  <span style={{
                    position: "absolute",
                    top: -4,
                    right: -8,
                    minWidth: 16, height: 16,
                    padding: unreadCount > 9 ? "0 4px" : "0",
                    borderRadius: 999, background: "#5690f5", color: "#FFFFFF",
                    fontSize: 10, fontWeight: 800, lineHeight: "16px",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    border: "none", boxShadow: "none",
                    pointerEvents: "none",
                  }}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
            </button>


            {/* Painel antigo removido — agora abrimos a tela Atividade (full-screen) abaixo */}
          </div>




          <div style={{ justifySelf: "center", display: "inline-flex", alignItems: "center", minWidth: 0 }}>
            <button
              type="button"
              onClick={() => setMonthPickerOpen(true)}
              aria-label="Selecionar mês e ano"
              aria-haspopup="dialog"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "transparent", border: "none", cursor: "pointer",
                padding: "6px 8px", borderRadius: 8,
                fontFamily: FONT, fontSize: 15, fontWeight: 700,
                color: COLORS.textPrimary,
                maxWidth: "100%",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {headerDataLabel}
              </span>
              <ChevronDown size={16} strokeWidth={2.2} style={{ opacity: 0.7, flexShrink: 0 }} />
            </button>
          </div>




          <div style={{ display: "inline-flex", alignItems: "center", gap: 2, justifySelf: "end" }}>
            {visao === "dia" && (
              <HeaderIconBtn aria="Filtros" onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal size={18} />
                {filtrosAtivos > 0 && (
                  <span style={{
                    position: "absolute", top: 4, right: 4,
                    width: 7, height: 7, borderRadius: "50%", background: COLORS.accentLight,
                  }} />
                )}
              </HeaderIconBtn>
            )}
          </div>
        </div>
      </header>

      {/* ===================== WEEK STRIP (apenas visão dia) ===================== */}
      {visao === "dia" && (
        <CenteredBand>
          <WeekStrip
            dias={semana}
            dataRef={dataRef}
            hojeStr={hojeStr}
            onPick={setDataRef}
            onVisibleMonthChange={(y, m) => setScrollMonthYear({ y, m })}
          />
        </CenteredBand>
      )}

      {/* ===================== PROFISSIONAIS (≥2) ===================== */}
      {visao === "dia" && mostrarFaixaProfs && (
        <CenteredBand>
          <ProfStrip
            profs={funcionariosEfetivos}
            value={profSel}
            onChange={setProfSel}
          />
        </CenteredBand>
      )}

      {/* ===================== CONTEÚDO ===================== */}
      <div style={{ padding: "4px 0 0" }}>
        {visao === "dia" && (
          <div style={{ maxWidth: AGENDA_MAX_WIDTH, margin: "0 auto", width: "100%" }}>
            <DiaTimeline
              ags={itensPeriodo}
              servicos={servicos}
              funcionarios={funcionariosEfetivos}
              horario={horarioDia}
              profSel={profSel}
              onOpen={setDetalheId}
              now={hoje}
              dateLabel={fullDateLabel}
            />
          </div>
        )}

        {visao === "mes" && (
          <MesView ags={itensPeriodo} mes={mesRef}
            onDayPick={(d) => { setDataRef(d); setVisao("dia"); }}
            onNavMes={(delta) => {
              const d = new Date(mesRef.y, mesRef.m + delta, 1);
              setMesRef({ y: d.getFullYear(), m: d.getMonth() });
            }} />
        )}
        {visao === "ano" && (
          <AnoView ags={itensPeriodo} ano={anoRef}
            onMonthPick={(y, m) => { setMesRef({ y, m }); setVisao("mes"); }}
            onNavAno={(delta) => setAnoRef((a) => a + delta)} />
        )}
        {visao === "profissional" && temFuncionarios && (
          <ProfissionalView
            ags={itensPeriodo} servicos={servicos} funcionarios={funcionariosEfetivos}
            baseStr={dataRef} profSel={profSel} setProfSel={setProfSel}
            setBaseStr={setDataRef}
            onOpen={setDetalheId} now={hoje}
          />
        )}
      </div>


      {/* Atalho discreto "Hoje" (canto inferior esquerdo) */}
      {visao === "dia" && dataRef !== hojeStr && (
        <button
          onClick={() => setDataRef(hojeStr)}
          aria-label="Ir para hoje"
          style={{
            position: "fixed",
            left: 16,
            bottom: `calc(64px + env(safe-area-inset-bottom, 0px) + 12px)`,
            width: 40, height: 40, borderRadius: "50%",
            background: COLORS.bgSurface, color: COLORS.textPrimary,
            border: `1.5px solid ${COLORS.border}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", zIndex: 90,
          }}
        >
          <CalendarDays size={18} />
        </button>
      )}

      {/* Floating "+" laranja — adicionar agendamento manualmente (somente visão Dia) */}
      {onAdd && visao === "dia" && (
        <button
          onClick={onAdd}
          aria-label="Novo agendamento"
          style={{
            position: "fixed",
            right: 16,
            bottom: `calc(64px + env(safe-area-inset-bottom, 0px) + 12px)`,
            width: 40, height: 40, borderRadius: "50%",
            background: COLORS.accentLight, color: "#FFFFFF",
            border: "none",
            boxShadow: "0 3px 10px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", zIndex: 95,
            padding: 0,
          }}
        >
          <Plus size={18} strokeWidth={2.4} />
        </button>
      )}

      {/* Painel de notificações renderizado dentro do container do sino (acima) */}




      {/* Month/Year picker: agora usa <input type="month"> nativo (acima, no header). */}


      {/* Drawer filtros */}
      <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtros">
        <FiltrosForm
          busca={busca} setBusca={setBusca}
          status={fStatus} setStatus={setFStatus}
          servicoId={fServ} setServicoId={setFServ}
          servicos={servicos}
          profissionais={funcionariosEfetivos}
          profSel={profSel} setProfSel={setProfSel}
          onClear={limparFiltros}
          onClose={() => setFiltersOpen(false)}
        />
      </BottomSheet>

      {/* Detalhe */}
      <BottomSheet open={!!detalheId} onClose={() => setDetalheId(null)} title="Detalhes do agendamento">
        {detalheId && (() => {
          const a = agendamentosEfetivos.find((x) => x.id === detalheId);
          if (!a) return null;
          return <DetalheAg
            ag={a}
            servicos={servicos}
            funcionarios={funcionariosEfetivos}
            now={hoje}
            onCancelar={() => {
              handleStatus(a, "cancelado");
              setDetalheId(null);
              setCancelSuccessAg({ ...a, status: "cancelado" });
            }}
            onNaoCompareceu={() => { handleStatus(a, "naoCompareceu"); setDetalheId(null); }}
            onClose={() => setDetalheId(null)}
          />;
        })()}
      </BottomSheet>

      <CancelSucessoOverlay
        ag={cancelSuccessAg}
        servicos={servicos}
        funcionarios={funcionariosEfetivos}
        onClose={() => setCancelSuccessAg(null)}
      />

      {/* Novo agendamento */}
      <BottomSheet open={addOpen} onClose={onClose} title="Novo Agendamento">
        <FormAgendamento
          onClose={onClose}
          onSave={(a) => { addAgendamento(a); notifStore.markRead(a.id); }}
          servicos={servicos}
          funcionarios={funcionariosEfetivos}
        />
      </BottomSheet>

      <MonthYearPickerModal
        open={monthPickerOpen}
        year={dataRefObj.getFullYear()}
        month={dataRefObj.getMonth()}
        onClose={() => setMonthPickerOpen(false)}
        onSelect={(y, m) => {
          setMesRef({ y, m });
          setAnoRef(y);
          const day = Math.min(dataRefObj.getDate(), new Date(y, m + 1, 0).getDate());
          setDataRef(fmtDate(new Date(y, m, day)));
          setMonthPickerOpen(false);
        }}
      />

      {notifOpen && (
        <AtividadeScreen
          activities={activities}
          readSet={readSet}
          servicos={servicos}
          funcionarios={funcionariosEfetivos}
          onClose={() => setNotifOpen(false)}
          onMarkAllRead={() => notifStore.markRead(activities.map((x) => x.id))}
          onOpen={openNotification}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header bits                                                        */
/* ------------------------------------------------------------------ */

function HeaderIconBtn({ children, onClick, aria }: { children: React.ReactNode; onClick: () => void; aria: string }) {
  return (
    <button onClick={onClick} aria-label={aria} style={{
      position: "relative",
      background: "transparent", border: "none", cursor: "pointer",
      width: 40, height: 40, borderRadius: 10,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      color: COLORS.textPrimary,
    }}>{children}</button>
  );
}

function menuItemStyle(active: boolean): CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 10,
    width: "100%", padding: "10px 10px", borderRadius: 10,
    background: active ? COLORS.accentLight : "transparent",
    color: active ? "#FFFFFF" : COLORS.textPrimary,
    border: "none", cursor: "pointer", fontFamily: FONT,
    fontSize: 13.5, fontWeight: 700, textAlign: "left",
    transition: "background .15s",
    marginTop: 2,
  };
}

/* ------------------------------------------------------------------ */
/* Month / Year picker                                                */
/* ------------------------------------------------------------------ */

function MesAnoPicker({
  dataRef, onPick, onHoje,
}: { dataRef: string; onPick: (y: number, m: number) => void; onHoje: () => void }) {
  const cur = parseDate(dataRef);
  const [ano, setAno] = useState<number>(cur.getFullYear());
  const mesSel = cur.getMonth();
  const anoSel = cur.getFullYear();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2px",
      }}>
        <button
          onClick={() => setAno((a) => a - 1)}
          aria-label="Ano anterior"
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            width: 36, height: 36, borderRadius: 10,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: COLORS.textPrimary,
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.textPrimary }}>{ano}</div>
        <button
          onClick={() => setAno((a) => a + 1)}
          aria-label="Próximo ano"
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            width: 36, height: 36, borderRadius: 10,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: COLORS.textPrimary,
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8,
      }}>
        {MESES.map((nome, i) => {
          const ativo = ano === anoSel && i === mesSel;
          return (
            <button
              key={nome}
              onClick={() => onPick(ano, i)}
              style={{
                padding: "12px 8px",
                borderRadius: 12,
                border: `1px solid ${ativo ? COLORS.accentLight : COLORS.border}`,
                background: ativo ? COLORS.accentLight : "transparent",
                color: ativo ? "#FFFFFF" : COLORS.textPrimary,
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                fontFamily: FONT,
              }}
            >
              {MESES_CURTO[i]}
            </button>
          );
        })}
      </div>

      <button onClick={onHoje} style={{ ...secondaryBtn, width: "100%" }}>Ir para hoje</button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Centered band wrapper                                              */
/* ------------------------------------------------------------------ */

const AGENDA_MAX_WIDTH = 520;

function CenteredBand({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: COLORS.bgSurface,
      borderBottom: `1px solid var(--adm-divider)`,
    }}>
      <div style={{ maxWidth: AGENDA_MAX_WIDTH, margin: "0 auto", width: "100%" }}>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Week strip                                                         */
/* ------------------------------------------------------------------ */

function WeekStrip({ dias, dataRef, hojeStr, onPick, onVisibleMonthChange }: {
  dias: Date[]; dataRef: string; hojeStr: string;
  onPick: (s: string) => void;
  onVisibleMonthChange: (year: number, month: number) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const selectedRef = useRef<HTMLButtonElement | null>(null);
  const callbackRef = useRef(onVisibleMonthChange);
  useEffect(() => { callbackRef.current = onVisibleMonthChange; }, [onVisibleMonthChange]);

  // Centraliza o dia selecionado ao montar / mudar dataRef
  useEffect(() => {
    const sc = scrollerRef.current;
    const el = selectedRef.current;
    if (!sc || !el) return;
    const target = el.offsetLeft - (sc.clientWidth / 2) + (el.clientWidth / 2);
    sc.scrollTo({ left: Math.max(0, target), behavior: "auto" });
  }, [dataRef, dias.length]);

  // Atualiza o mês/ano do header conforme o scroll horizontal
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    let rafId = 0;

    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const containerWidth = sc.clientWidth;
        const scrollCenter = sc.scrollLeft + containerWidth / 2;
        let bestIdx = 0;
        let bestDist = Infinity;
        const children = sc.children;
        for (let i = 0; i < children.length; i++) {
          const child = children[i] as HTMLElement;
          const childCenter = child.offsetLeft + child.offsetWidth / 2;
          const dist = Math.abs(childCenter - scrollCenter);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        }
        if (bestIdx >= 0 && bestIdx < dias.length) {
          const d = dias[bestIdx];
          callbackRef.current(d.getFullYear(), d.getMonth());
        }
      });
    };

    sc.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      sc.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [dias]);

  return (
    <div
      ref={scrollerRef}
      style={{
        display: "flex",
        padding: "8px 8px 8px",
        gap: 2,
        overflowX: "auto",
        overflowY: "hidden",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
      }}
    >
      {dias.map((d) => {
        const s = fmtDate(d);
        const selected = s === dataRef;
        const isHoje = s === hojeStr;
        const wd = d.getDay();
        return (
          <button
            key={s}
            ref={selected ? selectedRef : undefined}
            onClick={() => onPick(s)}
            style={{
              flex: "0 0 calc((100% - 12px) / 7)",
              background: "transparent", border: "none", cursor: "pointer",
              padding: "4px 2px", borderRadius: 12,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              fontFamily: FONT,
            }}
          >
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
              color: selected ? COLORS.accentLight : COLORS.textMuted,
            }}>
              {WD_CURTO_MAI[wd]}
            </span>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 34, borderRadius: "50%",
              background: selected ? COLORS.accentLight : "transparent",
              color: selected ? "#FFFFFF" : COLORS.textPrimary,
              fontSize: 14, fontWeight: 800,
              border: !selected && isHoje ? `1.5px solid ${COLORS.accentLight}` : "1.5px solid transparent",
            }}>
              {d.getDate()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Profissionais strip                                                */
/* ------------------------------------------------------------------ */

function ProfStrip({ profs, value, onChange }: {
  profs: FuncionarioAdmin[];
  value: string; onChange: (s: string) => void;
}) {
  const items: { id: string; nome: string; fotoUrl?: string; entrada?: string; saida?: string }[] = [
    { id: "todos", nome: "Todos" },
    ...profs.map((p) => ({ id: p.id, nome: p.nome, fotoUrl: p.fotoUrl, entrada: p.entrada, saida: p.saida })),
  ];
  return (
    <div style={{
      display: "flex", gap: 0, overflowX: "auto",
      padding: "0px 4px 0px",
      WebkitOverflowScrolling: "touch",
    }}>
      {items.map((p, i) => {
        const ativo = value === p.id;
        const hr = p.entrada && p.saida ? `${p.entrada} - ${p.saida}` : "";
        return (
          <div key={p.id} style={{
            display: "flex", alignItems: "stretch",
            borderRight: i < items.length - 1 ? `1px solid var(--adm-divider)` : "none",
          }}>
            <button onClick={() => onChange(p.id)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              background: "transparent", border: "none", cursor: "pointer",
              padding: "6px 14px 4px", fontFamily: FONT, minWidth: 84,
              position: "relative",
            }}>
              <span style={{
                width: 44, height: 44, borderRadius: "50%",
                background: COLORS.bgElevated,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", flexShrink: 0,
                border: `1.5px solid ${COLORS.border}`,
              }}>
                {p.id === "todos" ? (
                  <UserIcon size={20} color={COLORS.textMuted} />
                ) : p.fotoUrl ? (
                  <img src={p.fotoUrl} alt={p.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <UserIcon size={20} color={COLORS.textMuted} />
                )}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 700, color: COLORS.textPrimary,
                maxWidth: 96, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                textAlign: "center", lineHeight: 1.2,
              }}>
                {p.nome}
              </span>
              {hr && (
                <span style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {hr}
                </span>
              )}
              <span style={{
                marginTop: 2,
                width: 28, height: 3, borderRadius: 2,
                background: ativo ? "#10B981" : "transparent",
                transition: "background .15s",
              }} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline (visão Dia) — grade dinâmica baseada na menor duração     */
/* ------------------------------------------------------------------ */

const TIME_GUTTER = 56; // px

function DiaTimeline({ ags, servicos, funcionarios, horario, profSel, onOpen, now, dateLabel }: {
  ags: AgendamentoAdmin[];
  servicos: { id: string; nome: string; preco: number; duracao_minutos: number }[];
  funcionarios: FuncionarioAdmin[];
  horario: { aberto: boolean; abre: string; fecha: string } | null;
  profSel: string;
  onOpen: (id: string) => void;
  now: Date;
  dateLabel: string;
}) {
  // profSel define se mostramos "com {profissional}" ao lado do nome do cliente.
  const mostrarProfNome = profSel === "todos";
  void horario;

  // Agendamentos que ocupam agenda (cancelados não bloqueiam)
  const agsAtivos = useMemo(
    () => [...ags].filter((a) => a.status !== "cancelado").sort((a, b) => a.horario.localeCompare(b.horario)),
    [ags],
  );
  const cancelados = useMemo(() => ags.filter((a) => a.status === "cancelado"), [ags]);

  if (ags.length === 0) {
    return (
      <div style={{ fontFamily: FONT }}>
        <div className="agenda-section" style={{ background: COLORS.bgSurface, padding: "4px 16px 32px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ padding: "10px 4px 4px", fontSize: 12.5, fontWeight: 600, color: COLORS.textMuted, fontFamily: FONT }}>
            {dateLabel}
          </div>
          <div style={{ padding: "32px 16px", textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>
            Nenhum agendamento neste dia
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT }}>
      <div className="agenda-section" style={{ background: COLORS.bgSurface, padding: "4px 16px 32px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ padding: "10px 4px 4px", fontSize: 12.5, fontWeight: 600, color: COLORS.textMuted, fontFamily: FONT }}>
          {dateLabel}
        </div>

        {agsAtivos.map((a) => {
          const svc = servicos.find((x) => x.id === a.servicoId);
          const status = displayStatus(a, now);
          const meta = STATUS_META[status];
          const func = a.funcionarioId ? funcionarios.find((f) => f.id === a.funcionarioId) ?? null : null;
          const cliente = shortName(a.nome);
          const profNome = func ? shortName(func.nome) : null;
          const dur = svc ? fmtDuracao(svc.duracao_minutos) : "";
          return (
            <button
              key={a.id}
              className="agenda-card"
              onClick={() => onOpen(a.id)}
              style={{
                background: "#f9f9f9",
                border: "none",
                borderRadius: 9,
                padding: 0,
                cursor: "pointer",
                fontFamily: FONT,
                width: "100%",
                minWidth: 0,
                color: COLORS.textPrimary,
                display: "grid",
                gridTemplateColumns: "56px 3px minmax(0,1fr)",
                alignItems: "stretch",
                overflow: "hidden",
                minHeight: 64,
                textAlign: "left",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: COLORS.textPrimary,
                fontVariantNumeric: "tabular-nums",
                padding: "12px 0",
              }}>
                {a.horario}
              </div>
              <div style={{ background: meta.dot, margin: "10px 0" }} />
              <div style={{
                display: "flex", flexDirection: "column", gap: 4,
                padding: "12px 14px", minWidth: 0,
              }}>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: COLORS.textPrimary,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                }}>
                  {cliente}{mostrarProfNome && profNome ? <span style={{ fontWeight: 400, color: COLORS.textMuted }}>{` com ${profNome}`}</span> : ""}
                </div>
                <div style={{
                  fontSize: 12.5, fontWeight: 500, color: COLORS.textMuted,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  minWidth: 0,
                }}>
                  {svc?.nome ?? "—"}{dur ? ` - ${dur}` : ""}
                </div>
              </div>
            </button>
          );
        })}

        {cancelados.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: COLORS.textMuted,
              textTransform: "uppercase", letterSpacing: 0.4, padding: "0 4px",
            }}>
              Cancelados
            </div>
            {cancelados.map((a) => {
              const svc = servicos.find((x) => x.id === a.servicoId);
              const func = a.funcionarioId ? funcionarios.find((f) => f.id === a.funcionarioId) ?? null : null;
              const meta = STATUS_META.cancelado;
              const cliente = shortName(a.nome);
              const profNome = func ? shortName(func.nome) : null;
              const dur = svc ? fmtDuracao(svc.duracao_minutos) : "";
              return (
                <button
                  key={a.id}
                  className="agenda-card"
                  onClick={() => onOpen(a.id)}
                  style={{
                    background: "#f9f9f9",
                    border: "none",
                    borderRadius: 9,
                    padding: 0,
                    cursor: "pointer",
                    fontFamily: FONT,
                    width: "100%",
                    minWidth: 0,
                    color: COLORS.textPrimary,
                    display: "grid",
                    gridTemplateColumns: "56px 3px minmax(0,1fr)",
                    alignItems: "stretch",
                    overflow: "hidden",
                    opacity: 0.85,
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: COLORS.textMuted,
                    fontVariantNumeric: "tabular-nums", padding: "10px 0",
                  }}>
                    {a.horario}
                  </div>
                  <div style={{ background: meta.dot, margin: "8px 0" }} />
                  <div style={{ padding: "10px 14px", minWidth: 0 }}>
                    <div style={{
                      fontSize: 13.5, fontWeight: 700,
                      textDecoration: "line-through", color: COLORS.textPrimary,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {cliente}{mostrarProfNome && profNome ? <span style={{ fontWeight: 400, color: COLORS.textMuted }}>{` com ${profNome}`}</span> : ""}
                    </div>
                    <div style={{
                      fontSize: 12, fontWeight: 500, color: COLORS.textMuted,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {svc?.nome ?? "—"}{dur ? ` - ${dur}` : ""}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}





/* ------------------------------------------------------------------ */
/* Visão Mês / Ano / Profissional (mantidas, com nav próprio)         */
/* ------------------------------------------------------------------ */

function MesView({ ags, mes, onDayPick, onNavMes }: {
  ags: AgendamentoAdmin[];
  mes: { y: number; m: number };
  onDayPick: (d: string) => void;
  onNavMes: (delta: number) => void;
}) {
  // Agrupa agendamentos por dia (apenas os que ocupam agenda)
  const porDia = useMemo(() => {
    const map: Record<string, AgendamentoAdmin[]> = {};
    for (const a of ags) {
      (map[a.data] ??= []).push(a);
    }
    for (const arr of Object.values(map)) arr.sort((x, y) => x.horario.localeCompare(y.horario));
    return map;
  }, [ags]);

  const diasNoMes = new Date(mes.y, mes.m + 1, 0).getDate();
  const primeiroWd = new Date(mes.y, mes.m, 1).getDay();
  const hojeStr = fmtDate(new Date());

  // Grade: começa no domingo (0). Cells vazios antes do dia 1.
  const cells: Array<{ d: number | null; dStr?: string }> = [];
  for (let i = 0; i < primeiroWd; i++) cells.push({ d: null });
  for (let d = 1; d <= diasNoMes; d++) {
    cells.push({ d, dStr: `${mes.y}-${pad(mes.m + 1)}-${pad(d)}` });
  }
  // Preencher até completar a última semana
  while (cells.length % 7 !== 0) cells.push({ d: null });

  return (
    <div>
      <SubNav
        label={`${MESES[mes.m]} ${mes.y}`}
        onPrev={() => onNavMes(-1)} onNext={() => onNavMes(1)}
      />
      <div style={{ maxWidth: AGENDA_MAX_WIDTH, margin: "0 auto", width: "100%", padding: "4px 12px 12px" }}>
        {/* Cabeçalho dos dias da semana */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4, marginBottom: 6, padding: "0 2px",
        }}>
          {WD_CURTO_MAI.map((wd) => (
            <div key={wd} style={{
              fontSize: 10, fontWeight: 800, color: COLORS.textMuted,
              textAlign: "center", letterSpacing: 0.5,
            }}>
              {wd}
            </div>
          ))}
        </div>

        {/* Grade de dias */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4,
        }}>
          {cells.map((c, i) => {
            if (c.d === null || !c.dStr) {
              return <div key={`e-${i}`} style={{ aspectRatio: "1 / 1.1" }} />;
            }
            const dia = c.d;
            const dStr = c.dStr;
            const items = porDia[dStr] ?? [];
            const isHoje = dStr === hojeStr;
            const total = items.length;
            const concl = items.filter((a) => a.status === "concluido").length;
            const canc = items.filter((a) => a.status === "cancelado").length;
            const ativ = total - concl - canc;
            return (
              <button
                key={dStr}
                onClick={() => onDayPick(dStr)}
                aria-label={`${dia} — ${total} agendamento(s)`}
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1.1",
                  background: isHoje ? COLORS.accentLight : COLORS.bgSurface,
                  border: `1px solid ${isHoje ? COLORS.accentLight : COLORS.border}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
                  padding: "6px 4px 4px",
                  fontFamily: FONT,
                  gap: 2,
                  overflow: "hidden",
                }}
              >
                <span style={{
                  fontSize: 13, fontWeight: 800,
                  color: isHoje ? "#FFFFFF" : COLORS.textPrimary,
                  lineHeight: 1,
                }}>
                  {dia}
                </span>
                {total > 0 && (
                  <>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: isHoje ? "rgba(255,255,255,0.92)" : COLORS.textMuted,
                      lineHeight: 1, marginTop: 1,
                    }}>
                      {total}
                    </span>
                    <span style={{
                      display: "inline-flex", gap: 3, marginTop: 3,
                    }}>
                      {ativ > 0 && <Dot color={isHoje ? "#FFFFFF" : "#3B82F6"} />}
                      {concl > 0 && <Dot color={isHoje ? "#A7F3D0" : "#10B981"} />}
                      {canc > 0 && <Dot color={isHoje ? "#FECACA" : "#EF4444"} />}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Legenda */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 14, marginTop: 12,
          fontSize: 10.5, color: COLORS.textMuted, fontWeight: 600,
        }}>
          <LegendItem color="#3B82F6" label="Ativos" />
          <LegendItem color="#10B981" label="Concluídos" />
          <LegendItem color="#EF4444" label="Cancelados" />
        </div>
      </div>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block" }} />;
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <Dot color={color} /> {label}
    </span>
  );
}

function AnoView({ ags, ano, onMonthPick, onNavAno }: {
  ags: AgendamentoAdmin[];
  ano: number;
  onMonthPick: (y: number, m: number) => void;
  onNavAno: (delta: number) => void;
}) {
  const porMes = useMemo(() => {
    const arr = new Array(12).fill(0);
    for (const a of ags) {
      const m = Number(a.data.slice(5, 7)) - 1;
      if (m >= 0 && m < 12) arr[m] += 1;
    }
    return arr as number[];
  }, [ags]);
  const total = porMes.reduce((s, n) => s + n, 0);
  const max = Math.max(1, ...porMes);
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  return (
    <div>
      <SubNav label={String(ano)} onPrev={() => onNavAno(-1)} onNext={() => onNavAno(1)} />

      {/* Resumo do ano */}
      <div style={{ maxWidth: AGENDA_MAX_WIDTH, margin: "0 auto", width: "100%", padding: "4px 16px 12px" }}>
        <div style={{
          background: COLORS.bgSurface, border: `1px solid ${COLORS.border}`,
          borderRadius: 14, padding: "14px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.6, textTransform: "uppercase" }}>
              Total no ano
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.textPrimary, lineHeight: 1.1, marginTop: 2 }}>
              {total}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.6, textTransform: "uppercase" }}>
              Média/mês
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.textPrimary, lineHeight: 1.1, marginTop: 2 }}>
              {Math.round(total / 12)}
            </div>
          </div>
        </div>

        {/* Grid 3x4 de meses */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14,
        }}>
          {porMes.map((n, i) => {
            const isAtual = i === mesAtual && ano === anoAtual;
            const intensity = n / max; // 0..1
            return (
              <button key={i} onClick={() => onMonthPick(ano, i)} style={{
                background: COLORS.bgSurface,
                border: `1.5px solid ${isAtual ? COLORS.accentLight : COLORS.border}`,
                borderRadius: 12, padding: "12px 10px",
                cursor: "pointer", fontFamily: FONT, textAlign: "left",
                display: "flex", flexDirection: "column", gap: 8,
                position: "relative", overflow: "hidden",
                boxShadow: isAtual ? "0 4px 12px rgba(0,0,0,0.06)" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: isAtual ? COLORS.accentLight : COLORS.textPrimary, letterSpacing: 0.3 }}>
                    {MESES_CURTO[i].toUpperCase()}
                  </span>
                  {isAtual && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, color: "#FFFFFF",
                      background: COLORS.accentLight, padding: "2px 6px", borderRadius: 999,
                      letterSpacing: 0.3,
                    }}>HOJE</span>
                  )}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: n > 0 ? COLORS.textPrimary : COLORS.textMuted, lineHeight: 1 }}>
                  {n}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.textMuted, marginTop: -4 }}>
                  agend.
                </div>
                <div style={{ height: 4, background: COLORS.bgElevated, borderRadius: 999, overflow: "hidden", marginTop: 2 }}>
                  <div style={{
                    width: `${intensity * 100}%`, height: "100%",
                    background: n === 0 ? "transparent" : COLORS.accentLight,
                    transition: "width .25s",
                  }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProfissionalView({ ags, servicos, funcionarios, baseStr, profSel, setProfSel, setBaseStr, onOpen, now }: {
  ags: AgendamentoAdmin[];
  servicos: { id: string; nome: string; preco: number; duracao_minutos: number }[];
  funcionarios: FuncionarioAdmin[];
  baseStr: string;
  profSel: string;
  setProfSel: (s: string) => void;
  setBaseStr: (s: string) => void;
  onOpen: (id: string) => void;
  now: Date;
}) {
  const profsExibidos = profSel === "todos" ? funcionarios : funcionarios.filter((f) => f.id === profSel);
  const base = segundaDaSemana(parseDate(baseStr));
  const dias = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(base); d.setDate(base.getDate() + i);
    return fmtDate(d);
  });
  const hojeStr = fmtDate(new Date());
  const fim = new Date(base); fim.setDate(base.getDate() + 6);
  const label = `${pad(base.getDate())}/${pad(base.getMonth() + 1)} – ${pad(fim.getDate())}/${pad(fim.getMonth() + 1)}`;

  function shift(n: number) { const x = new Date(base); x.setDate(base.getDate() + n * 7); setBaseStr(fmtDate(x)); }

  return (
    <div>
      <SubNav label={`Semana ${label}`} onPrev={() => shift(-1)} onNext={() => shift(1)} />
      <div style={{ maxWidth: AGENDA_MAX_WIDTH, margin: "0 auto", width: "100%", display: "flex", gap: 6, overflowX: "auto", padding: "6px 16px 12px" }}>
        {[{ id: "todos", nome: "Todos" }, ...funcionarios.map((f) => ({ id: f.id, nome: f.nome.split(" ")[0] }))].map((it) => (
          <button key={it.id} onClick={() => setProfSel(it.id)}
            style={{
              padding: "8px 14px", borderRadius: 999, border: `1.5px solid ${profSel === it.id ? COLORS.accentLight : COLORS.border}`,
              background: profSel === it.id ? COLORS.accentLight : COLORS.bgSurface,
              color: profSel === it.id ? "#fff" : COLORS.textPrimary,
              fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
              boxShadow: profSel === it.id ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
              transition: "all .15s",
            }}>{it.nome}</button>
        ))}
      </div>
      <div style={{ overflowX: "auto", padding: "0 16px 12px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(1, profsExibidos.length)}, minmax(240px, 1fr))`,
          gap: 10,
          minWidth: profsExibidos.length > 1 ? profsExibidos.length * 250 : "auto",
        }}>
          {profsExibidos.map((f) => {
            const meus = ags.filter((a) => a.funcionarioId === f.id);
            return (
              <div key={f.id} style={{
                background: COLORS.bgSurface, border: `1px solid ${COLORS.border}`,
                borderRadius: 12, overflow: "hidden",
              }}>
                <div style={{ padding: "10px 12px", background: COLORS.bgElevated, borderBottom: `1px solid ${COLORS.border}` }}>
                  <div className="agenda-profissional-header" style={{ fontSize: 13, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nome}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600 }}>{f.cargo} · {meus.length} agend.</div>
                </div>
                <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, maxHeight: 620, overflowY: "auto" }}>
                  {dias.map((d) => {
                    const doDia = meus.filter((a) => a.data === d).sort((a, b) => a.horario.localeCompare(b.horario));
                    if (doDia.length === 0) return null;
                    const dt = parseDate(d);
                    return (
                      <div key={d}>
                        <div style={{
                          fontSize: 10, fontWeight: 800, color: COLORS.textMuted, textTransform: "uppercase",
                          padding: "4px 4px", letterSpacing: 0.4,
                        }}>
                          {WD_CURTO[dt.getDay()]} {pad(dt.getDate())}/{pad(dt.getMonth() + 1)} {d === hojeStr && "· Hoje"}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {doDia.map((a) => {
                            const svc = servicos.find((s) => s.id === a.servicoId);
                            const status = displayStatus(a, now);
                            const meta = STATUS_META[status];
                            return (
                              <button key={a.id} onClick={() => onOpen(a.id)} style={{
                                background: meta.bg, borderLeft: `3px solid ${meta.dot}`,
                                border: `1px solid ${meta.border}`, borderLeftWidth: 3,
                                padding: "6px 8px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                                fontFamily: FONT,
                              }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: meta.fg }}>
                                  {a.horario} · {a.nome}
                                </div>
                                <div style={{ fontSize: 11, color: meta.fg, opacity: 0.78, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {svc?.nome ?? "—"}
                                </div>
                              </button>

                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {meus.length === 0 && (
                    <div style={{ padding: "16px 8px", textAlign: "center", fontSize: 12, color: COLORS.textMuted }}>
                      Sem agendamentos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SubNav({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div style={{
      maxWidth: AGENDA_MAX_WIDTH, margin: "0 auto", width: "100%",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
      padding: "14px 16px 8px",
    }}>
      <button onClick={onPrev} aria-label="Anterior" style={navBtn}><ChevronLeft size={16} /></button>
      <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.textPrimary, letterSpacing: 0.2, minWidth: 140, textAlign: "center" }}>{label}</div>
      <button onClick={onNext} aria-label="Próximo" style={navBtn}><ChevronRight size={16} /></button>
    </div>
  );
}
const navBtn: CSSProperties = {
  background: COLORS.bgSurface, border: `1.5px solid ${COLORS.border}`,
  borderRadius: 999, padding: 6, cursor: "pointer", color: COLORS.textPrimary,
  width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};


/* ------------------------------------------------------------------ */
/* Detalhe                                                            */
/* ------------------------------------------------------------------ */

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.555-5.338 11.891-11.893 11.891a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.173.198-.297.297-.495.099-.198.05-.372-.025-.521-.074-.149-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Tela de sucesso após cancelamento                                  */
/* Reutiliza a animação de check do fluxo de agendamento do cliente.  */
/* ------------------------------------------------------------------ */
function CancelSucessoOverlay({
  ag, servicos, funcionarios, onClose,
}: {
  ag: AgendamentoAdmin | null;
  servicos: { id: string; nome: string; preco: number; duracao_minutos: number }[];
  funcionarios: FuncionarioAdmin[];
  onClose: () => void;
}) {
  if (!ag) return null;
  const svc = servicos.find((s) => s.id === ag.servicoId);
  const func = ag.funcionarioId ? funcionarios.find((f) => f.id === ag.funcionarioId) : null;
  const dt = parseDate(ag.data);
  const dataFmt = `${WD_LONG[dt.getDay()]}, ${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
  return (
    <div
      className="animate-fade-in"
      style={{
        position: "fixed", inset: 0, background: "#FFFFFF", zIndex: 1100,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 24, overflowY: "auto",
        fontFamily: FONT,
      }}
      role="dialog"
      aria-modal="true"
    >
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div style={{ position: "relative", width: 72, height: 72, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
          <span aria-hidden style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "#16A34A", opacity: 0.25,
            animation: "sreli-ring 900ms ease-out forwards",
          }}/>
          <div style={{
            position: "relative", width: 72, height: 72, borderRadius: "50%",
            background: "#DCFCE7", color: "#16A34A",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            animation: "sreli-pop 500ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" style={{
                strokeDasharray: 30, strokeDashoffset: 30,
                animation: "sreli-check 450ms ease-out 350ms forwards",
              }}/>
            </svg>
          </div>
        </div>
        <h3 style={{ fontWeight: 700, fontSize: 22, color: "#1A1A1A", margin: "0 0 8px" }}>
          Agendamento cancelado
        </h3>
        <p style={{ fontSize: 14, color: "#888888", margin: "0 0 24px" }}>
          O agendamento foi cancelado com sucesso.
        </p>
        <div style={{
          background: COLORS.bgElevated, borderRadius: 12, padding: 14,
          textAlign: "left", display: "flex", flexDirection: "column", gap: 8, marginBottom: 24,
        }}>
          <CancelRow label="Cliente" value={ag.nome} />
          {svc && <CancelRow label="Serviço" value={svc.nome} />}
          <CancelRow label="Data" value={dataFmt} />
          <CancelRow label="Horário" value={ag.horario} />
          {func && <CancelRow label="Profissional" value={func.nome} />}
        </div>
        <button
          onClick={onClose}
          style={{
            ...primaryBtn,
            width: "100%",
            minHeight: 48,
          }}
        >
          Voltar para agendamentos
        </button>
      </div>
      <style>{`
        @keyframes sreli-pop {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes sreli-check { to { stroke-dashoffset: 0; } }
        @keyframes sreli-ring {
          0% { transform: scale(0.8); opacity: 0.45; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function CancelRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
      <span style={{ color: COLORS.textMuted, fontWeight: 600 }}>{label}</span>
      <span style={{ color: COLORS.textPrimary, fontWeight: 700, textAlign: "right" }}>{value}</span>
    </div>
  );
}


function DetalheAg({ ag, servicos, funcionarios, now, onCancelar, onNaoCompareceu, onClose }: {
  ag: AgendamentoAdmin;
  servicos: { id: string; nome: string; preco: number; duracao_minutos: number }[];
  funcionarios: FuncionarioAdmin[];
  now: Date;
  onCancelar: () => void;
  onNaoCompareceu: () => void;
  onClose: () => void;
}) {
  const svc = servicos.find((s) => s.id === ag.servicoId);
  const func = ag.funcionarioId ? funcionarios.find((f) => f.id === ag.funcionarioId) : null;
  const dt = parseDate(ag.data);
  const status = displayStatus(ag, now);
  const tel = (ag.telefone ?? "").replace(/\D/g, "");
  // "Cancelar" só faz sentido enquanto o agendamento ainda está ativo
  // (status efetivo "agendado"). Concluído / Cancelado / Não compareceu
  // não exibem mais a ação de cancelamento.
  const podeCancelar = status === "agendado";
  // "Não compareceu" só pode ser marcado a partir do horário agendado.
  // Mesmo se a etiqueta visual ainda for "Agendado", o que vale é a data/hora.
  const horarioAtingido = isHorarioAtingido(ag, now);
  const jaFinalizado = ag.status === "cancelado" || ag.status === "naoCompareceu";
  const podeNaoCompareceu = !jaFinalizado && horarioAtingido;
  const mostrarAcoes = podeCancelar || (!jaFinalizado);
  
  

  // O WhatsApp do resumo usa SEMPRE o modelo correspondente ao status atual
  // (sincronizado com a aba Mensagens). Editar o modelo lá atualiza aqui.
  // TODO(Supabase): substituir messagesStore por queries reais.
  const { template: waTemplate, waLink } = useMemo(() => {
    if (!tel) return { template: null as null | ReturnType<typeof messagesStore.getTemplateByKind>, waLink: null as string | null };
    const numero = tel.length <= 11 ? "55" + tel : tel;

    const kind: "confirmacao" | "cancelamento" | "naoCompareceu" | "avaliacao" =
      status === "cancelado" ? "cancelamento" :
      status === "naoCompareceu" ? "naoCompareceu" :
      status === "concluido" ? "avaliacao" :
      "confirmacao"; // agendado / pendente

    const tpl = messagesStore.getTemplateByKind(kind);
    if (!tpl) return { template: null, waLink: `https://wa.me/${numero}` };

    const [y, m, d] = ag.data.split("-");
    const values: Record<string, string> = {
      "{nome_cliente}": ag.nome || "",
      "{horario_agendado}": ag.horario || "",
      "{data_atendimento}": y && m && d ? `${d}/${m}/${y}` : "",
      "{nome_servico}": svc?.nome ?? "",
      "{nome_profissional}": func?.nome ?? "",
      "{nome_empresa}": "",
    };
    const msg = applyVariables(tpl.content, values);
    return { template: tpl, waLink: `https://wa.me/${numero}?text=${encodeURIComponent(msg)}` };
  }, [tel, status, ag, svc, func]);

  const waLabel =
    !waTemplate ? "Falar no WhatsApp" :
    waTemplate.kind === "confirmacao" ? "Enviar confirmação por WhatsApp" :
    waTemplate.kind === "cancelamento" ? "Enviar mensagem de cancelamento" :
    waTemplate.kind === "naoCompareceu" ? "Enviar mensagem por não comparecer" :
    waTemplate.kind === "avaliacao" ? "Pedir avaliação por WhatsApp" :
    "Falar no WhatsApp";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.textPrimary }}>{ag.nome}</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted }}>
            {WD_LONG[dt.getDay()]} · {pad(dt.getDate())}/{pad(dt.getMonth() + 1)}/{dt.getFullYear()}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <InfoRow label="Horário" value={svc ? `${ag.horario} - ${addMinutesToTime(ag.horario, svc.duracao_minutos)}` : ag.horario} />
        <InfoRow label="Valor" value={svc ? brl(svc.preco) : "—"} />
        <div style={{ gridColumn: "1 / -1" }}>
          <InfoRow label="Serviço" value={svc?.nome ?? "—"} />
        </div>
        {func && (
          <div style={{ gridColumn: "1 / -1" }}>
            <InfoRow label="Profissional" value={func.nome} />
          </div>
        )}
        {ag.telefone && (
          <div style={{ gridColumn: "1 / -1" }}>
            <InfoRow label="Telefone" value={ag.telefone} />
          </div>
        )}
        {ag.observacao && (
          <div style={{ gridColumn: "1 / -1" }}>
            <InfoRow label="Observação" value={ag.observacao} />
          </div>
        )}
        {status === "cancelado" && (
          <div style={{ gridColumn: "1 / -1" }}>
            <InfoRow
              label="Motivo do cancelamento"
              value={ag.motivoCancelamento?.trim() || "Motivo não informado"}
            />
          </div>
        )}
      </div>

      {waLink && (
        <a
          href={waLink}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            // Marca como enviada nas duas dimensões (badge global + por modelo).
            confirmSentStore.markSent(ag.id);
            if (waTemplate) messagesStore.markSent(ag.id, waTemplate.id);
          }}
          style={{
            background: "#25D366", color: "#FFFFFF",
            borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700,
            cursor: "pointer", fontFamily: FONT, textDecoration: "none",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: "0 1px 2px rgba(37,211,102,0.25)",
          }}>
          <WhatsAppIcon size={16} /> {waLabel}
        </a>
      )}



      {mostrarAcoes && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: podeCancelar ? "1fr 1fr" : "1fr",
            gap: 8,
          }}
        >
          {!jaFinalizado && (
            <button
              onClick={podeNaoCompareceu ? onNaoCompareceu : undefined}
              disabled={!podeNaoCompareceu}
              title={
                !podeNaoCompareceu && !jaFinalizado && !horarioAtingido
                  ? "Essa ação só fica disponível após o horário agendado."
                  : undefined
              }
              aria-disabled={!podeNaoCompareceu}
              style={{
                ...softActionBtn("#FFF1E6", "#C2410C", "#FDBA74"),
                opacity: podeNaoCompareceu ? 1 : 0.5,
                cursor: podeNaoCompareceu ? "pointer" : "not-allowed",
              }}
            >
              Não compareceu
            </button>
          )}
          {podeCancelar && (
            <button
              onClick={onCancelar}
              style={softActionBtn("#FEECEC", "#B91C1C", "#FCA5A5")}
            >
              Cancelar agendamento
            </button>
          )}
        </div>
      )}



      <button onClick={onClose} style={{ ...secondaryBtn, marginTop: 4 }}>Fechar</button>
    </div>
  );
}

function softActionBtn(bg: string, fg: string, border: string): CSSProperties {
  return {
    background: bg, color: fg, border: `1.5px solid ${border}`,
    borderRadius: 10, padding: "12px 14px", fontSize: 14, fontWeight: 800,
    cursor: "pointer", fontFamily: FONT, minHeight: 48,
    letterSpacing: 0.2,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  };
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: COLORS.bgElevated, borderRadius: 8, padding: "8px 10px" }}>
      <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 700, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, marginTop: 2, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/* Filtros                                                            */
/* ------------------------------------------------------------------ */

function FiltrosForm({
  busca, setBusca,
  status, setStatus,
  servicoId, setServicoId,
  servicos,
  profissionais, profSel, setProfSel,
  onClear, onClose,
}: {
  busca: string; setBusca: (s: string) => void;
  status: DisplayStatus | "todos"; setStatus: (s: DisplayStatus | "todos") => void;
  servicoId: string; setServicoId: (s: string) => void;
  servicos: { id: string; nome: string }[];
  profissionais: FuncionarioAdmin[];
  profSel: string; setProfSel: (s: string) => void;
  onClear: () => void; onClose: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <Label>Buscar cliente</Label>
        <div className="bisme-input-group" style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#FFFFFF", border: "1.5px solid #E4E4E4", borderRadius: 8, padding: "10px 12px",
        }}>
          <Search size={16} color={COLORS.textMuted} />
          <input
            className="bisme-input-group-control"
            value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome do cliente..."
            style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontFamily: FONT, fontSize: 14, color: "#111" }}
          />
        </div>
      </div>
      <div>
        <Label>Status</Label>
        <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value as DisplayStatus | "todos")}>
          <option value="todos">Todos</option>
          <option value="agendado">Agendado</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
          <option value="naoCompareceu">Não compareceu</option>
        </select>
      </div>
      <div>
        <Label>Serviço</Label>
        <select style={inputStyle} value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
          <option value="todos">Todos</option>
          {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>
      {profissionais.length > 0 && (
        <div>
          <Label>Profissional</Label>
          <select style={inputStyle} value={profSel} onChange={(e) => setProfSel(e.target.value)}>
            <option value="todos">Todos</option>
            {profissionais.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button
          className="bisme-light-border"
          onClick={onClear}
          style={{
            ...secondaryBtn,
            flex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            minHeight: 44,
          }}
        >
          Limpar
        </button>
        <button onClick={onClose} style={{ ...primaryBtn, flex: 2 }}>Aplicar</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form novo agendamento                                              */
/* ------------------------------------------------------------------ */

function FormAgendamento({ onClose, onSave, servicos, funcionarios }: {
  onClose: () => void; onSave: (a: AgendamentoAdmin) => void;
  servicos: { id: string; nome: string }[];
  funcionarios: FuncionarioAdmin[];
}) {
  const { servicos: servicosFull, horarios, agendamentos, bloqueios, pausas, funcionarios: funcsCtx } = useApp();
  const [nome, setNome] = useState(""); const [tel, setTel] = useState(""); const [email, setEmail] = useState("");
  const [servicoId, setServicoId] = useState(servicos[0]?.id ?? "");
  const [funcionarioId, setFuncionarioId] = useState<string>("");
  const [data, setData] = useState(""); const [hora, setHora] = useState("");
  const [obs, setObs] = useState("");

  const servicoSel = useMemo(() => servicosFull.find((s) => s.id === servicoId) ?? null, [servicosFull, servicoId]);
  const availCtx = useMemo(
    () => ({ agendamentos, bloqueios, pausas, funcionarios: funcsCtx, horarios, servicos: servicosFull }),
    [agendamentos, bloqueios, pausas, funcsCtx, horarios, servicosFull],
  );
  const slots = useMemo<Slot[]>(() => {
    if (!servicoSel || !data) return [];
    return generateSlotsLib({
      service: servicoSel,
      dateIso: data,
      professionalId: funcionarioId || null,
      ctx: availCtx,
    });
  }, [servicoSel, data, funcionarioId, availCtx]);

  // Limpa horário quando deixa de ser válido
  useEffect(() => {
    if (!hora) return;
    const ok = slots.find((s) => s.time === hora && s.available);
    if (!ok) setHora("");
  }, [slots, hora]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div><Label>Nome*</Label><input style={inputStyle} placeholder="Nome do cliente" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
      <div><Label>Telefone</Label><input style={inputStyle} type="tel" placeholder="Telefone" value={tel} onChange={(e) => setTel(e.target.value)} /></div>
      <div><Label>Email</Label><input style={inputStyle} type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><Label>Serviço</Label>
        <select style={inputStyle} value={servicoId} onChange={(e) => { setServicoId(e.target.value); setHora(""); }}>
          {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>
      {funcionarios.length > 0 && (
        <div><Label>Profissional</Label>
          <select style={inputStyle} value={funcionarioId} onChange={(e) => { setFuncionarioId(e.target.value); setHora(""); }}>
            <option value="">— Sem preferência —</option>
            {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Label>Dia</Label>
          <input style={inputStyle} type="date" value={data} onChange={(e) => { setData(e.target.value); setHora(""); }} />
        </div>
        <div style={{ flex: 1 }}>
          <Label>Horário</Label>
          <select
            style={inputStyle}
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            disabled={!servicoSel || !data || slots.length === 0}
          >
            <option value="">{!data ? "Selecione o dia" : slots.length === 0 ? "Sem horários" : "Selecione"}</option>
            {slots.map((s) => (
              <option key={s.time} value={s.time} disabled={!s.available}>
                {s.time}{!s.available ? " (indisponível)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      {servicoSel && data && slots.length > 0 && (
        <div style={{ fontSize: 11, color: "#888", marginTop: -8 }}>
          Grade gerada com passo de {servicoSel.duracao_minutos} min (duração do serviço).
        </div>
      )}
      <div><Label>Observação</Label><textarea className="bisme-textarea" rows={3} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={onClose} className="bisme-light-border" style={{ ...secondaryBtn, flex: 1 }}>Cancelar</button>
        <button
          onClick={() => {
            if (!nome.trim() || !servicoId || !data || !hora || !servicoSel) return;
            // Revalida usando a mesma função central antes de salvar
            const startMin = toMin(hora);
            const endMin = startMin + servicoSel.duracao_minutos;
            // Revalida no momento real do clique (relógio atual): impede
            // criar agendamento em horário que já passou, mesmo se a tela
            // estiver aberta há muito tempo.
            if (isSlotPast(data, startMin, new Date())) {
              alert("Esse horário já passou. Escolha outro horário.");
              return;
            }
            const livre = isProFreeLib({
              funcId: funcionarioId || (funcsCtx.length === 0 ? null : funcionarioId || null),
              dateIso: data,
              startMin,
              endMin,
              ctx: availCtx,
            });
            if (!livre) {
              alert("Esse horário não está disponível. Escolha outro.");
              return;
            }
            onSave({
              id: crypto.randomUUID(), nome: nome.trim(), telefone: tel, email,
              servicoId, funcionarioId: funcionarioId || undefined,
              data, horario: hora, observacao: obs, status: "confirmado",
            });
            onClose();
          }}
          style={{ ...primaryBtn, flex: 2 }}
        >Salvar</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Painel de Notificações (sininho)                                   */
/* ------------------------------------------------------------------ */

function NotificationsPanel({
  ags, readSet, servicos, funcionarios, onClose, onMarkAllRead, onOpen,
}: {
  ags: AgendamentoAdmin[];
  readSet: Set<string>;
  servicos: { id: string; nome: string }[];
  funcionarios: FuncionarioAdmin[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onOpen: (a: AgendamentoAdmin) => void;
}) {
  const lista = ags.slice(0, 30);
  const hasUnread = lista.some((a) => !readSet.has(a.id));

  return (
    <>
      {/* Backdrop para clique fora — atrás do sino para que ele continue clicável e visível */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: "fixed", inset: 0, background: "transparent",
          zIndex: 1,
        }}
      />
      <div
        role="dialog"
        aria-label="Notificações"
        className="adm-notif-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          left: 0,
          width: "min(340px, calc(100vw - 24px))",
          maxHeight: "min(70vh, 480px)",
          background: "#FFFFFF",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 14,
          boxShadow: "0 12px 32px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)",
          fontFamily: FONT,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          zIndex: 3,
        }}
      >
        <div className="adm-notif-header" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`,
        }}>
          <div className="adm-notif-title" style={{ fontWeight: 800, fontSize: 14, color: "#000000" }}>Notificações</div>
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={!hasUnread}
            style={{
              background: "transparent", border: "none",
              color: hasUnread ? COLORS.accentLight : COLORS.textMuted,
              fontWeight: 700, fontSize: 12, cursor: hasUnread ? "pointer" : "default",
              padding: "4px 6px", fontFamily: FONT,
            }}
          >
            Marcar todas como lidas
          </button>
        </div>

        <div className="adm-notif-list" style={{ overflowY: "auto", flex: 1 }}>
          {lista.length === 0 ? (
            <div className="adm-notif-empty" style={{
              padding: "32px 16px", textAlign: "center",
              color: COLORS.textMuted, fontSize: 13,
            }}>
              Nenhum novo agendamento.
            </div>
          ) : (
            lista.map((a) => {
              const isUnread = !readSet.has(a.id);
              const func = a.funcionarioId ? funcionarios.find((f) => f.id === a.funcionarioId) : null;
              const text = func
                ? `${a.nome} agendou às ${a.horario} no seu estabelecimento com o profissional ${func.nome}.`
                : `${a.nome} agendou às ${a.horario} no seu estabelecimento.`;
              const svc = servicos.find((s) => s.id === a.servicoId);
              const [y, m, d] = a.data.split("-");
              return (
                <button
                  key={a.id}
                  type="button"
                  className={`adm-notif-item ${isUnread ? "is-unread" : "is-read"}`}
                  onClick={() => onOpen(a)}
                  style={{
                    width: "100%", textAlign: "left",
                    background: isUnread ? "rgba(86, 144, 245,0.04)" : "transparent",
                    border: "none",
                    borderBottom: `1px solid ${COLORS.border}`,
                    padding: "12px 14px",
                    cursor: "pointer", fontFamily: FONT,
                    display: "flex", gap: 10, alignItems: "flex-start",
                  }}
                >
                  <span aria-hidden style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: isUnread ? COLORS.accentLight : "transparent",
                    marginTop: 6, flexShrink: 0,
                  }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="adm-notif-text" style={{
                      fontSize: 13, lineHeight: 1.4,
                      color: isUnread ? "#111111" : "#9CA3AF",
                      fontWeight: isUnread ? 600 : 500,
                    }}>
                      {text}
                    </div>
                    <div className="adm-notif-meta" style={{
                      fontSize: 11, color: COLORS.textMuted, marginTop: 3, fontWeight: 500,
                    }}>
                      {`${d}/${m}/${y}`}{svc ? ` · ${svc.nome}` : ""}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>

  );
}

/* ------------------------------------------------------------------ */
/* Month / Year picker modal                                          */
/* ------------------------------------------------------------------ */

function MonthYearPickerModal({
  open, year, month, onClose, onSelect,
}: {
  open: boolean;
  year: number;
  month: number;
  onClose: () => void;
  onSelect: (year: number, month: number) => void;
}) {
  const [yearView, setYearView] = useState<number>(year);
  const [selMonth, setSelMonth] = useState<number>(month);
  const [selYear, setSelYear] = useState<number>(year);

  useEffect(() => {
    if (open) {
      setYearView(year);
      setSelMonth(month);
      setSelYear(year);
    }
  }, [open, year, month]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Selecionar mês e ano"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        fontFamily: FONT,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 340,
          background: COLORS.bgSurface,
          borderRadius: 16,
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        {/* Header com seletor de ano */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: `1px solid ${COLORS.border}`,
        }}>
          <button
            type="button"
            onClick={() => setYearView((y) => y - 1)}
            aria-label="Ano anterior"
            style={{
              width: 32, height: 32, borderRadius: 999,
              background: "transparent", border: "none", cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: COLORS.textPrimary,
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <div style={{
            fontSize: 16, fontWeight: 700, color: COLORS.textPrimary,
            letterSpacing: 0.2,
          }}>
            {yearView}
          </div>
          <button
            type="button"
            onClick={() => setYearView((y) => y + 1)}
            aria-label="Próximo ano"
            style={{
              width: 32, height: 32, borderRadius: 999,
              background: "transparent", border: "none", cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: COLORS.textPrimary,
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Grade de meses */}
        <div style={{
          padding: 12,
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8,
        }}>
          {MESES_CURTO.map((mLabel, idx) => {
            const isSelected = selYear === yearView && selMonth === idx;
            return (
              <button
                key={mLabel}
                type="button"
                onClick={() => { setSelMonth(idx); setSelYear(yearView); }}
                style={{
                  padding: "10px 0",
                  borderRadius: 10,
                  border: isSelected
                    ? `1.5px solid ${COLORS.accentLight}`
                    : `1px solid ${COLORS.border}`,
                  background: isSelected ? COLORS.accentLight : COLORS.bgSurface,
                  color: isSelected ? "#FFFFFF" : COLORS.textPrimary,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  fontFamily: FONT,
                  transition: "all 120ms ease",
                }}
              >
                {mLabel}
              </button>
            );
          })}
        </div>

        {/* Ações */}
        <div style={{
          display: "flex", gap: 8, padding: "12px 16px 16px",
          borderTop: `1px solid ${COLORS.border}`,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, padding: "10px 12px", borderRadius: 10,
              background: COLORS.bgSurface, color: COLORS.textPrimary,
              border: `1px solid ${COLORS.border}`,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSelect(selYear, selMonth)}
            style={{
              flex: 1, padding: "10px 12px", borderRadius: 10,
              background: COLORS.accentLight, color: "#FFFFFF",
              border: "none",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
