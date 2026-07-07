import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";
import {
  TrendingUp, TrendingDown, Calendar as CalendarIcon,
  Trophy, Users as UsersIcon,
  Clock, Sparkles, ArrowUpRight, BarChart3, AlertCircle,
  CheckCircle2, MinusCircle, CircleDot,
} from "lucide-react";
import { useApp, type AgendamentoAdmin, type ServicoAdmin, type FuncionarioAdmin, type StatusAg } from "./AppContext";
import { COLORS, FONT } from "./ui";
import { effectiveStatus, type EffectiveStatus } from "@/lib/agendamentoStatus";
import { supabase } from "@/integrations/supabase/client";

type Periodo = "dia" | "mes" | "ano" | "custom";

// ===== Paleta semântica do Dashboard =====
const ORANGE = "#5690f5";
const GREEN = "#00BE70";
const RED = "#EF4444";
const AMBER = "#F59E0B";
const BLUE = "#3B82F6";

const numStyle: CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: '"tnum" 1, "ss01" 1',
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtDate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}
function brlCompact(v: number) {
  if (Math.abs(v) >= 1000) {
    const k = v / 1000;
    return `R$ ${k.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  }
  return brl(v);
}
function fmtPtBr(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function diffDaysInclusive(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = new Date(fy, fm - 1, fd).getTime();
  const b = new Date(ty, tm - 1, td).getTime();
  return Math.round((b - a) / 86400000) + 1;
}
function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return fmtDate(dt);
}
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

const MESES_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

interface Props {
  onNavigate?: (tab: "agendamentos" | "funcionarios") => void;
}

export function DashboardTela({ onNavigate }: Props) {
  const { agendamentos, servicos, funcionarios, setAgendamentos, setServicos, setFuncionarios } = useApp();

  // ---- Conexão real com Supabase (mesmo padrão de ClientesTela/AgendamentosTela) ----
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

      const [apptsRes, servRes, profRes] = await Promise.all([
        supabase.from("appointments").select("*").eq("company_id", cid).order("starts_at", { ascending: true }),
        supabase.from("services").select("*").eq("company_id", cid).eq("is_active", true),
        supabase.from("professionals").select("*").eq("company_id", cid).eq("is_active", true).eq("is_visible", true).eq("is_default_owner", false).order("position", { ascending: true }),
      ]);
      if (cancelled) return;

      const servRows = servRes.data ?? [];
      const profRows = profRes.data ?? [];
      const apptRows = apptsRes.data ?? [];

      const servicosMapped: ServicoAdmin[] = servRows.map((s) => ({
        id: s.id, nome: s.name, preco: (s.price_cents ?? 0) / 100,
        duracao_minutos: s.duration_minutes ?? 30,
        imagemUrl: s.image_url ?? undefined, descricao: s.description ?? undefined,
        categoriaId: s.category_id ?? undefined,
      }));
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
          precoCentsSnapshot: a.service_price_cents_snapshot ?? undefined,
        };
      });

      setServicos(servicosMapped);
      setFuncionarios(funcsMapped);
      setAgendamentos(agsMapped);

      if (!channel) {
        channel = supabase
          .channel(`admin-dashboard-${cid}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `company_id=eq.${cid}` },
            () => { void load(); })
          .subscribe();
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [setAgendamentos, setServicos, setFuncionarios]);


  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const today = useMemo(() => fmtDate(new Date()), []);
  const [refDia, setRefDia] = useState<string>(today);
  const [refMes, setRefMes] = useState<string>(today.slice(0, 7));
  const [refAno, setRefAno] = useState<string>(today.slice(0, 4));
  const [customFrom, setCustomFrom] = useState<string>(addDays(today, -29));
  const [customTo, setCustomTo] = useState<string>(today);

  const { from, to, label } = useMemo(() => {
    if (periodo === "dia") {
      return { from: refDia, to: refDia, label: fmtPtBr(refDia) };
    }
    if (periodo === "mes") {
      const [y, m] = refMes.split("-").map(Number);
      const f = fmtDate(new Date(y, m - 1, 1));
      const t = fmtDate(new Date(y, m, 0));
      return { from: f, to: t, label: `${MESES_PT[m - 1]} de ${y}` };
    }
    if (periodo === "ano") {
      const y = Number(refAno);
      return { from: `${y}-01-01`, to: `${y}-12-31`, label: String(y) };
    }
    return { from: customFrom, to: customTo, label: `${fmtPtBr(customFrom)} – ${fmtPtBr(customTo)}` };
  }, [periodo, refDia, refMes, refAno, customFrom, customTo]);

  const realData = useMemo(() => {
    const now = new Date();
    const inWindow = (iso: string) => iso >= from && iso <= to;
    const noPeriodo = agendamentos.filter((a) => inWindow(a.data));

    const enriched = noPeriodo.map((a) => ({ a, status: effectiveStatus(a, now) }));
    const byStatus: Record<EffectiveStatus, typeof enriched> = {
      agendado: [], concluido: [], cancelado: [], naoCompareceu: [],
    };
    enriched.forEach((x) => byStatus[x.status].push(x));

    const priceOf = (a: AgendamentoAdmin) => (a.precoCentsSnapshot != null ? a.precoCentsSnapshot / 100 : (servicos.find((s) => s.id === a.servicoId)?.preco ?? 0));
    const nameOf = (id: string) => servicos.find((s) => s.id === id)?.nome ?? "Serviço";

    const faturamento = byStatus.concluido.reduce((sum, { a }) => sum + priceOf(a), 0);
    const totalConcluidos = byStatus.concluido.length;
    const totalAg = enriched.length;
    const totalCanc = byStatus.cancelado.length;
    const totalNS = byStatus.naoCompareceu.length;
    const totalPend = byStatus.agendado.length;
    const ticket = totalConcluidos > 0 ? faturamento / totalConcluidos : 0;
    const pctCanc = totalAg > 0 ? (totalCanc / totalAg) * 100 : 0;
    const pctNS = totalAg > 0 ? (totalNS / totalAg) * 100 : 0;

    const dias = diffDaysInclusive(from, to);
    const prevTo = addDays(from, -1);
    const prevFrom = addDays(prevTo, -(dias - 1));
    const prevAg = agendamentos.filter((a) => a.data >= prevFrom && a.data <= prevTo);
    const prevConcl = prevAg.filter((a) => effectiveStatus(a, now) === "concluido");
    const prevFat = prevConcl.reduce((s, a) => s + priceOf(a), 0);
    const compFat = prevFat > 0 ? ((faturamento - prevFat) / prevFat) * 100 : null;
    const compAg = prevAg.length > 0 ? ((totalAg - prevAg.length) / prevAg.length) * 100 : null;

    type Point = { label: string; faturamento: number; agendamentos: number };
    const serie: Point[] = [];
    if (periodo === "dia") {
      const buckets = new Map<number, Point>();
      for (let h = 6; h <= 22; h++) buckets.set(h, { label: `${pad(h)}h`, faturamento: 0, agendamentos: 0 });
      enriched.forEach(({ a, status }) => {
        const h = Number(a.horario.slice(0, 2));
        if (!buckets.has(h)) buckets.set(h, { label: `${pad(h)}h`, faturamento: 0, agendamentos: 0 });
        const b = buckets.get(h)!;
        b.agendamentos += 1;
        if (status === "concluido") b.faturamento += priceOf(a);
      });
      serie.push(...Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]).map(([, v]) => v));
    } else if (periodo === "ano") {
      const [y] = refAno.split("-").map(Number);
      for (let i = 0; i < 12; i++) serie.push({ label: MESES_PT[i], faturamento: 0, agendamentos: 0 });
      enriched.forEach(({ a, status }) => {
        const [yy, mm] = a.data.split("-").map(Number);
        if (yy !== y) return;
        const p = serie[mm - 1];
        p.agendamentos += 1;
        if (status === "concluido") p.faturamento += priceOf(a);
      });
    } else if (periodo === "mes") {
      const [yM, mM] = refMes.split("-").map(Number);
      const lastDay = new Date(yM, mM, 0).getDate();
      const monthAbbr = MESES_PT[mM - 1];
      const weekRanges: { start: number; end: number }[] = [
        { start: 1, end: Math.min(7, lastDay) },
        { start: 8, end: Math.min(14, lastDay) },
        { start: 15, end: Math.min(21, lastDay) },
        { start: 22, end: lastDay },
      ].filter((w) => w.start <= lastDay);
      weekRanges.forEach((w) => {
        serie.push({
          label: `${w.start}–${w.end} ${monthAbbr}`,
          faturamento: 0,
          agendamentos: 0,
        });
      });
      enriched.forEach(({ a, status }) => {
        const [yy, mm, dd] = a.data.split("-").map(Number);
        if (yy !== yM || mm !== mM) return;
        const idx = weekRanges.findIndex((w) => dd >= w.start && dd <= w.end);
        if (idx < 0) return;
        const p = serie[idx];
        p.agendamentos += 1;
        if (status === "concluido") p.faturamento += priceOf(a);
      });
    } else {
      if (dias <= 60) {
        const map = new Map<string, Point>();
        for (let i = 0; i < dias; i++) {
          const iso = addDays(from, i);
          map.set(iso, { label: iso.slice(8, 10), faturamento: 0, agendamentos: 0 });
        }
        enriched.forEach(({ a, status }) => {
          const p = map.get(a.data); if (!p) return;
          p.agendamentos += 1;
          if (status === "concluido") p.faturamento += priceOf(a);
        });
        serie.push(...map.values());
      } else {
        const weeks = Math.ceil(dias / 7);
        for (let w = 0; w < weeks; w++) {
          const ws = addDays(from, w * 7);
          serie.push({ label: `${ws.slice(8, 10)}/${ws.slice(5, 7)}`, faturamento: 0, agendamentos: 0 });
        }
        enriched.forEach(({ a, status }) => {
          const idx = Math.floor(diffDaysInclusive(from, a.data) / 7);
          const p = serie[Math.min(idx, serie.length - 1)]; if (!p) return;
          p.agendamentos += 1;
          if (status === "concluido") p.faturamento += priceOf(a);
        });
      }
    }

    const sMap = new Map<string, { id: string; nome: string; qtd: number; fat: number }>();
    byStatus.concluido.forEach(({ a }) => {
      const cur = sMap.get(a.servicoId) ?? { id: a.servicoId, nome: nameOf(a.servicoId), qtd: 0, fat: 0 };
      cur.qtd += 1;
      cur.fat += priceOf(a);
      sMap.set(a.servicoId, cur);
    });
    const topServicos = Array.from(sMap.values()).sort((a, b) => b.qtd - a.qtd);
    const maxServ = topServicos[0]?.qtd ?? 0;

    const fMap = new Map<string, { qtd: number; fat: number; canc: number; ns: number }>();
    funcionarios.forEach((f) => fMap.set(f.id, { qtd: 0, fat: 0, canc: 0, ns: 0 }));
    enriched.forEach(({ a, status }) => {
      if (!a.funcionarioId) return;
      const cur = fMap.get(a.funcionarioId); if (!cur) return;
      if (status === "concluido") { cur.qtd += 1; cur.fat += priceOf(a); }
      else if (status === "cancelado") cur.canc += 1;
      else if (status === "naoCompareceu") cur.ns += 1;
    });
    const perFunc = funcionarios.map((f) => {
      const s = fMap.get(f.id)!;
      const tkt = s.qtd > 0 ? s.fat / s.qtd : 0;
      const totalF = s.qtd + s.canc + s.ns;
      const pctProb = totalF > 0 ? ((s.canc + s.ns) / totalF) * 100 : 0;
      return { id: f.id, nome: f.nome, fotoUrl: f.fotoUrl, cargo: f.cargo, ...s, tkt, pctProb };
    }).sort((a, b) => b.fat - a.fat);

    const hourMap = new Map<string, number>();
    enriched.forEach(({ a }) => {
      const k = a.horario.slice(0, 5);
      hourMap.set(k, (hourMap.get(k) ?? 0) + 1);
    });
    const peakHours = Array.from(hourMap.entries())
      .map(([h, q]) => ({ h, q }))
      .sort((a, b) => b.q - a.q)
      .slice(0, 6);
    const maxPeak = peakHours[0]?.q ?? 0;

    const cliMap = new Map<string, { nome: string; qtd: number; ultima: string; total: number }>();
    agendamentos.forEach((a) => {
      if (effectiveStatus(a, now) !== "concluido") return;
      const key = (a.telefone || a.email || a.nome).toLowerCase();
      const cur = cliMap.get(key) ?? { nome: a.nome, qtd: 0, ultima: a.data, total: 0 };
      cur.qtd += 1;
      cur.total += priceOf(a);
      if (a.data > cur.ultima) cur.ultima = a.data;
      cliMap.set(key, cur);
    });
    const loyals = Array.from(cliMap.values()).filter((c) => c.qtd > 1).sort((a, b) => b.qtd - a.qtd).slice(0, 5);

    const upcoming = agendamentos
      .filter((a) => a.status !== "cancelado" && a.status !== "naoCompareceu" && a.status !== "concluido")
      .filter((a) => {
        const dt = new Date(`${a.data}T${a.horario}:00`);
        return dt.getTime() >= now.getTime();
      })
      .sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario))
      .slice(0, 5);

    const insights: { icon: ReactNode; text: string }[] = [];
    if (peakHours[0]) insights.push({ icon: <Clock size={14} />, text: `Horário de pico em ${peakHours[0].h}.` });
    if (topServicos[0]) insights.push({ icon: <Trophy size={14} />, text: `Serviço líder: ${topServicos[0].nome}.` });
    if (totalCanc > 0) insights.push({ icon: <AlertCircle size={14} />, text: `${totalCanc} ${totalCanc === 1 ? "cancelamento" : "cancelamentos"} no período.` });
    if (totalNS > 0) insights.push({ icon: <MinusCircle size={14} />, text: `${totalNS} ${totalNS === 1 ? "ausência" : "ausências"} registradas.` });
    if (totalConcluidos > 0) insights.push({ icon: <CircleDot size={14} />, text: `Ticket médio em ${brl(ticket)}.` });

    return {
      faturamento, totalConcluidos, totalAg, totalCanc, totalNS, totalPend,
      ticket, pctCanc, pctNS, compFat, compAg,
      serie, topServicos, maxServ, perFunc, peakHours, maxPeak,
      loyals, upcoming, insights,
    };
  }, [agendamentos, servicos, funcionarios, from, to, periodo, refAno, refMes]);

  const data = realData;



  return (
    <div
      className="admin-tab dash-root"
      style={{
        padding: "30px 16px 40px",
        background: COLORS.bgBase,
        minHeight: "calc(100vh - 56px)",
        fontFamily: FONT,
        color: COLORS.textPrimary,
      }}
    >
      {/* ===== HEADER ===== */}
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: COLORS.textMuted }}>
              Visão geral
            </div>
            <h1 style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
              Dashboard
            </h1>
          </div>
        </div>
      </header>

      {/* ===== FATURAMENTO HERO ===== */}
      <section
        className="dash-hero"
        style={{
          paddingBottom: 18,
          marginBottom: 0,
          borderBottom: `0px solid ${COLORS.border}`,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div className="dash-hero-row">
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: COLORS.textMuted }}>
              Faturamento · {label}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ ...numStyle, fontSize: 38, fontWeight: 700, letterSpacing: -1, lineHeight: 1, color: COLORS.textPrimary }}>
                {brl(data.faturamento)}
              </div>
              <Delta delta={data.compFat} />
            </div>
            <div style={{ fontSize: 12.5, color: COLORS.textMuted }}>
              {data.totalConcluidos} {data.totalConcluidos === 1 ? "atendimento concluído" : "atendimentos concluídos"}
              {" · "}ticket médio <span style={{ ...numStyle, color: COLORS.textPrimary, fontWeight: 600 }}>{brl(data.ticket)}</span>
            </div>
          </div>

          {/* Sparkline (desktop) */}
          {data.serie.length > 1 && (
            <div className="dash-hero-spark" aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.serie} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="heroSpark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ORANGE} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="faturamento" stroke={ORANGE} strokeWidth={1.5} fill="url(#heroSpark)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Filtro */}
        <Filtros
          periodo={periodo} setPeriodo={setPeriodo}
          refDia={refDia} setRefDia={setRefDia}
          refMes={refMes} setRefMes={setRefMes}
          refAno={refAno} setRefAno={setRefAno}
          customFrom={customFrom} setCustomFrom={setCustomFrom}
          customTo={customTo} setCustomTo={setCustomTo}
        />
      </section>

      {/* ===== KPIs ===== */}
      <div className="dash-kpi-grid">
        <Kpi label="Agendamentos" value={String(data.totalAg)} sub={`${data.totalConcluidos} concluídos`} delta={data.compAg} />
        <Kpi label="Pendentes" value={String(data.totalPend)} sub="A confirmar" tone="info" />
        <Kpi label="Cancelamentos" value={String(data.totalCanc)} sub={`${data.pctCanc.toFixed(1)}% do total`} tone="danger" />
        <Kpi label="Não compareceu" value={String(data.totalNS)} sub={`${data.pctNS.toFixed(1)}% do total`} tone="warning" />
      </div>

      {/* ===== GRÁFICO + STATUS ===== */}
      <div className="dash-row-2" style={{ marginTop: 16 }}>
        <Section title="Evolução do faturamento" subtitle="Tendência ao longo do período">
          {data.totalAg === 0 ? (
            <EmptyState icon={<BarChart3 size={22} />} title="Sem dados no período" text="O gráfico aparece conforme houver atendimentos concluídos." />
          ) : (
            <div style={{ width: "100%", height: 240, marginTop: 4 }}>
              <ResponsiveContainer>
                <AreaChart data={data.serie} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ORANGE} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={COLORS.border} vertical={false} strokeDasharray="2 4" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: COLORS.textMuted, fontSize: 10.5 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: string, i: number) => {
                      if (periodo !== "mes" || typeof v !== "string") return v;
                      const m = v.match(/^(\d+)[–-](\d+)\s+(\S+)$/);
                      if (!m) return v;
                      const isLast = i === (data.serie.length - 1);
                      return `${isLast ? m[2] : m[1]} ${m[3]}`;
                    }}
                  />
                  <YAxis
                    tick={{ fill: COLORS.textMuted, fontSize: 10.5 }}
                    axisLine={false} tickLine={false}
                    width={68}
                    tickMargin={6}
                    tickFormatter={(v) => brlCompact(v)}
                  />
                  <Tooltip
                    cursor={{ stroke: COLORS.border, strokeWidth: 1 }}
                    contentStyle={{
                      background: COLORS.bgSurface,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8, fontSize: 12,
                      color: COLORS.textPrimary,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                    labelStyle={{ color: COLORS.textMuted, fontWeight: 600, fontSize: 11 }}
                    labelFormatter={(l: string) => (periodo === "mes" ? `Período: ${l}` : l)}
                    formatter={(value: number) => [brl(value), "Faturamento"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="faturamento"
                    stroke={ORANGE}
                    strokeWidth={1.75}
                    fill="url(#fatGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: ORANGE, stroke: COLORS.bgSurface, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section title="Distribuição dos agendamentos" subtitle="Status no período">
          <StatusList
            total={data.totalAg}
            items={[
              { label: "Concluídos", v: data.totalConcluidos, color: GREEN },
              { label: "Pendentes", v: data.totalPend, color: BLUE },
              { label: "Cancelados", v: data.totalCanc, color: RED },
              { label: "Não compareceu", v: data.totalNS, color: AMBER },
            ]}
          />
        </Section>
      </div>

      {/* ===== SERVIÇOS + FUNCIONÁRIOS ===== */}
      <div className="dash-row-2" style={{ marginTop: 14 }}>
        <Section title="Serviços mais vendidos" subtitle="Ranking por atendimentos concluídos">
          {data.topServicos.length === 0 ? (
            <EmptyState icon={<Trophy size={22} />} title="Nenhum serviço concluído" text="Quando seus clientes começarem a agendar, os serviços aparecerão aqui." />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
              {data.topServicos.slice(0, 6).map((s, i) => {
                const pct = data.maxServ ? (s.qtd / data.maxServ) * 100 : 0;
                return (
                  <li key={s.id} style={{ padding: "12px 0", borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{ ...numStyle, width: 18, fontSize: 11, fontWeight: 600, color: COLORS.textMuted, flexShrink: 0 }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: 13.5, color: COLORS.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.nome}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexShrink: 0, ...numStyle }}>
                        <span style={{ fontSize: 12, color: COLORS.textMuted }}>{s.qtd}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>{brl(s.fat)}</span>
                      </div>
                    </div>
                    <div style={{ height: 3, background: COLORS.bgElevated, borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: ORANGE, transition: "width 280ms" }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Desempenho da equipe" subtitle="Atendimentos · faturamento · ticket">
          {data.perFunc.length === 0 ? (
            <EmptyState
              icon={<UsersIcon size={22} />}
              title="Acompanhe sua equipe"
              text="Cadastre funcionários para comparar atendimentos e faturamento."
              cta={onNavigate ? { label: "Cadastrar funcionário", onClick: () => onNavigate("funcionarios") } : undefined}
            />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {data.perFunc.map((f, i) => (
                <li key={f.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 0",
                  borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`,
                }}>
                  <FuncAvatar nome={f.nome} fotoUrl={f.fotoUrl} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nome}</div>
                    <div style={{ ...numStyle, fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 }}>
                      {f.qtd} atend · {brl(f.tkt)}{f.pctProb > 0 ? ` · ${f.pctProb.toFixed(0)}% problemas` : ""}
                    </div>
                  </div>
                  <div style={{ ...numStyle, fontWeight: 600, fontSize: 14, color: GREEN, flexShrink: 0 }}>
                    {brl(f.fat)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* ===== HORÁRIOS + CLIENTES + PRÓXIMOS ===== */}
      <div className="dash-row-3" style={{ marginTop: 14 }}>
        <Section title="Horários de pico" subtitle="Onde a demanda se concentra">
          {data.peakHours.length === 0 ? (
            <EmptyState icon={<Clock size={20} />} title="Sem dados de horário" text="Os horários aparecerão conforme houver agendamentos." />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {data.peakHours.map((p, i) => {
                const pct = data.maxPeak ? (p.q / data.maxPeak) * 100 : 0;
                return (
                  <li key={p.h} style={{ padding: "10px 0", borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                      <span style={{ ...numStyle, fontWeight: 600 }}>{p.h}</span>
                      <span style={{ ...numStyle, color: COLORS.textMuted }}>
                        {p.q} {p.q === 1 ? "atend" : "atend"}
                      </span>
                    </div>
                    <div style={{ height: 3, background: COLORS.bgElevated, borderRadius: 99 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: BLUE, borderRadius: 99 }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Clientes recorrentes" subtitle="Quem mais retorna">
          {data.loyals.length === 0 ? (
            <EmptyState icon={<Sparkles size={20} />} title="Sem recorrência ainda" text="Clientes com mais de uma visita aparecerão aqui." />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {data.loyals.map((c, i) => (
                <li key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 0",
                  borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`,
                }}>
                  <span style={{ ...numStyle, width: 18, fontSize: 11, fontWeight: 600, color: COLORS.textMuted, flexShrink: 0 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</div>
                    <div style={{ ...numStyle, fontSize: 11.5, color: COLORS.textMuted }}>
                      {c.qtd} visitas · última {fmtPtBr(c.ultima)}
                    </div>
                  </div>
                  <div style={{ ...numStyle, fontSize: 13, fontWeight: 600, color: GREEN, flexShrink: 0 }}>
                    {brl(c.total)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Próximos agendamentos"
          subtitle="Compromissos da agenda"
          action={onNavigate ? { label: "Ver agenda", onClick: () => onNavigate("agendamentos") } : undefined}
        >
          {data.upcoming.length === 0 ? (
            <EmptyState icon={<CalendarIcon size={20} />} title="Sem próximos compromissos" text="Quando novos clientes agendarem, aparecem aqui." />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {data.upcoming.map((a, i) => {
                const s = servicos.find((x) => x.id === a.servicoId);
                const f = funcionarios.find((x) => x.id === a.funcionarioId);
                const sNome = (a as { __servicoNome?: string }).__servicoNome ?? s?.nome ?? "Serviço";
                const fNome = (a as { __funcNome?: string }).__funcNome ?? f?.nome;
                const dia = a.data.slice(8, 10);
                const mes = MESES_PT[Number(a.data.slice(5, 7)) - 1];
                return (
                  <li key={a.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 0",
                    borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`,
                  }}>
                    <div style={{
                      width: 44, textAlign: "center", flexShrink: 0,
                      paddingTop: 2, paddingBottom: 2,
                      borderRight: `1px solid ${COLORS.border}`,
                    }}>
                      <div style={{ ...numStyle, fontSize: 18, fontWeight: 700, lineHeight: 1, color: COLORS.textPrimary }}>{dia}</div>
                      <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>{mes}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nome}</div>
                      <div style={{ ...numStyle, fontSize: 11.5, color: COLORS.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.horario} · {sNome}{fNome ? ` · ${fNome}` : ""}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>

      {/* ===== INSIGHTS ===== */}
      {data.insights.length > 0 && (
        <Section title="Resumo do período" subtitle="Observações automáticas">
          <div className="dash-insights">
            {data.insights.map((ins, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 0",
                borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`,
              }}>
                <span style={{ color: COLORS.textMuted, flexShrink: 0 }}>{ins.icon}</span>
                <span style={{ fontSize: 13, color: COLORS.textPrimary, lineHeight: 1.5 }}>{ins.text}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <style>{`
        .dash-root :where(input, select, button) { font-family: inherit; }
        .dash-hero-row {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .dash-hero-spark { display: none; }
        .dash-kpi-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          background: ${COLORS.border};
          border: 1px solid ${COLORS.border};
          border-radius: 12px;
          overflow: hidden;
        }
        .dash-kpi-grid > * {
          background: ${COLORS.bgSurface};
        }
        .dash-row-2, .dash-row-3 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        .dash-insights {
          display: flex;
          flex-direction: column;
        }
        @media (min-width: 720px) {
          .dash-hero-row { flex-direction: row; align-items: center; gap: 24px; }
          .dash-hero-spark { display: block; width: 240px; height: 72px; flex-shrink: 0; }
          .dash-kpi-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .dash-hero-spark { width: 320px; height: 84px; }
          .dash-row-2 {
            grid-template-columns: 2fr 1fr;
            gap: 16px;
          }
          .dash-row-3 {
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
}

/* =========================================================== */
/*                       Subcomponentes                        */
/* =========================================================== */

function Filtros({
  periodo, setPeriodo,
  refDia, setRefDia,
  refMes, setRefMes,
  refAno, setRefAno,
  customFrom, setCustomFrom,
  customTo, setCustomTo,
}: {
  periodo: Periodo; setPeriodo: (p: Periodo) => void;
  refDia: string; setRefDia: (s: string) => void;
  refMes: string; setRefMes: (s: string) => void;
  refAno: string; setRefAno: (s: string) => void;
  customFrom: string; setCustomFrom: (s: string) => void;
  customTo: string; setCustomTo: (s: string) => void;
}) {
  const opts: { v: Periodo; l: string }[] = [
    { v: "dia", l: "Hoje" },
    { v: "mes", l: "Mês" },
    { v: "ano", l: "Ano" },
    { v: "custom", l: "Período" },
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
      <div style={{ display: "inline-flex", borderBottom: `1px solid ${COLORS.border}` }}>
        {opts.map((o) => {
          const active = periodo === o.v;
          return (
            <button
              key={o.v}
              onClick={() => setPeriodo(o.v)}
              style={{
                padding: "8px 14px",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${active ? ORANGE : "transparent"}`,
                marginBottom: -1,
                color: active ? COLORS.textPrimary : COLORS.textMuted,
                fontWeight: active ? 600 : 500,
                fontSize: 12.5,
                cursor: "pointer",
                fontFamily: FONT,
                transition: "color 160ms, border-color 160ms",
              }}
            >
              {o.l}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {periodo === "dia" && <input type="date" value={refDia} onChange={(e) => setRefDia(e.target.value)} style={dateInput} />}
        {periodo === "mes" && <input type="month" value={refMes} onChange={(e) => setRefMes(e.target.value)} style={dateInput} />}
        {periodo === "ano" && (
          <select value={refAno} onChange={(e) => setRefAno(e.target.value)} style={dateInput}>
            {Array.from({ length: 7 }).map((_, i) => {
              const y = new Date().getFullYear() - 5 + i;
              return <option key={y} value={String(y)}>{y}</option>;
            })}
          </select>
        )}
        {periodo === "custom" && (
          <>
            <input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} style={dateInput} />
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>até</span>
            <input type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} style={dateInput} />
          </>
        )}
      </div>
    </div>
  );
}

const dateInput: CSSProperties = {
  background: COLORS.bgSurface,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 12.5,
  color: COLORS.textPrimary,
  fontFamily: FONT,
  outline: "none",
  minHeight: 32,
};

type KpiTone = "default" | "info" | "danger" | "warning" | "success";
function toneColor(tone: KpiTone | undefined): string {
  switch (tone) {
    case "info": return BLUE;
    case "danger": return RED;
    case "warning": return AMBER;
    case "success": return GREEN;
    default: return ORANGE;
  }
}
function Kpi({ label, value, sub, delta, tone }: { label: string; value: string; sub: string; delta?: number | null; tone?: KpiTone }) {
  const hasTone = tone && tone !== "default";
  const accent = hasTone ? toneColor(tone) : null;
  return (
    <div style={{ position: "relative", padding: hasTone ? "16px 16px 14px 18px" : "16px 16px 14px", display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
      {accent && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 0, top: 12, bottom: 12,
            width: 3,
            background: accent,
          }}
        />
      )}
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: COLORS.textMuted }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <div style={{ ...numStyle, fontSize: 22, fontWeight: 700, color: COLORS.textPrimary, letterSpacing: -0.3, lineHeight: 1.1 }}>
          {value}
        </div>
        {delta !== undefined && <Delta delta={delta ?? null} small />}
      </div>
      <div style={{ fontSize: 11.5, color: COLORS.textMuted, lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
}


function Delta({ delta, small }: { delta: number | null; small?: boolean }) {
  if (delta === null) {
    return null;
  }

  const up = delta >= 0;
  const color = up ? GREEN : RED;
  const bg = up
    ? "color-mix(in oklab, #00BE70 14%, transparent)"
    : "color-mix(in oklab, #EF4444 14%, transparent)";
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      ...numStyle,
      fontSize: small ? 10.5 : 11.5, fontWeight: 600,
      color,
      background: bg,
      padding: small ? "2px 7px" : "3px 9px",
      borderRadius: 99,
      lineHeight: 1,
    }}>
      <Icon size={small ? 11 : 12} />
      {up ? "+" : ""}{delta.toFixed(1)}%
    </span>
  );
}

function Section({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: { label: string; onClick: () => void } }) {
  return (
    <section style={{
      background: COLORS.bgSurface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 12,
      padding: 16,
      minWidth: 0,
    }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, letterSpacing: -0.1 }}>{title}</h3>
          {subtitle && <p style={{ margin: "2px 0 0", fontSize: 11.5, color: COLORS.textMuted }}>{subtitle}</p>}
        </div>
        {action && (
          <button onClick={action.onClick} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "transparent", border: "none", color: ORANGE,
            fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 4, fontFamily: FONT,
          }}>
            {action.label} <ArrowUpRight size={12} />
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

function StatusList({ items, total }: { items: { label: string; v: number; color: string }[]; total: number }) {
  if (total === 0) {
    return <EmptyState icon={<CheckCircle2 size={22} />} title="Nenhum agendamento" text="A distribuição aparecerá quando houver dados." />;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
      {/* Barra empilhada */}
      <div style={{
        display: "flex", width: "100%", height: 8, borderRadius: 99, overflow: "hidden", background: COLORS.bgElevated,
      }}>
        {items.map((it) => {
          const pct = total > 0 ? (it.v / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div key={it.label} style={{ width: `${pct}%`, height: "100%", background: it.color, transition: "width 280ms" }} />
          );
        })}
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {items.map((it, i) => {
          const pct = total > 0 ? (it.v / total) * 100 : 0;
          return (
            <li key={it.label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0",
              borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`,
            }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: COLORS.textPrimary }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: it.color }} />
                {it.label}
              </span>
              <span style={{ ...numStyle, fontSize: 12.5, color: COLORS.textMuted, fontWeight: 500 }}>
                <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>{it.v}</span>
                <span style={{ opacity: 0.6, marginLeft: 6 }}>{pct.toFixed(0)}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptyState({ icon, title, text, cta }: { icon: ReactNode; title: string; text: string; cta?: { label: string; onClick: () => void } }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      padding: "28px 12px 20px", gap: 6,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 99,
        border: `1px solid ${COLORS.border}`,
        color: COLORS.textMuted, display: "grid", placeItems: "center", marginBottom: 4,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>{title}</div>
      <div style={{ fontSize: 12, color: COLORS.textMuted, maxWidth: 280, lineHeight: 1.5 }}>{text}</div>
      {cta && (
        <button onClick={cta.onClick} style={{
          marginTop: 10, padding: "8px 14px", background: ORANGE, color: "#fff",
          border: "none", borderRadius: 8, fontWeight: 600, fontSize: 12.5, cursor: "pointer", fontFamily: FONT,
        }}>
          {cta.label}
        </button>
      )}
    </div>
  );
}

function FuncAvatar({ nome, fotoUrl }: { nome: string; fotoUrl?: string }) {
  if (fotoUrl) {
    return <img src={fotoUrl} alt={nome} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: 34, height: 34, borderRadius: "50%",
      background: COLORS.bgElevated,
      border: `1px solid ${COLORS.border}`,
      color: COLORS.textPrimary,
      display: "grid", placeItems: "center", fontWeight: 600, fontSize: 12, flexShrink: 0,
    }}>{initials(nome) || "?"}</div>
  );
}
