import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useApp, type FuncionarioAdmin, type ServicoAdmin } from "@/components/admin/AppContext";
import { isPhoneValid, maskBrPhone } from "./phoneMask";
import {
  dayHasAvailability,
  generateSlots,
  isProfessionalFreeAt,
  isSlotPast,
  nextAvailableDay,
  professionalsAvailableAt,
  toMin,
} from "@/lib/availability";

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtDate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseDate(s: string) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function slotLabel(t: number) { return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`; }
function minutesOf(h: string) { return toMin(h); }

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DOW = ["Dom.", "Seg.", "Ter.", "Qua.", "Qui.", "Sex.", "Sáb."];

/** Mesmo placeholder usado em EspecialistasSection para profissional sem foto. */
function DefaultAvatar({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#DFE3E8",
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 24 24" width="62%" height="62%" fill="#FFFFFF" aria-hidden="true">
        <circle cx="12" cy="8.5" r="4" />
        <path d="M3.5 20.5c0-4.142 3.806-7.5 8.5-7.5s8.5 3.358 8.5 7.5v.5h-17v-.5z" />
      </svg>
    </div>
  );
}

export type BookingItem = {
  servicoId: string;
  funcionarioId?: string;
};

export type BookingResult = {
  items: BookingItem[];
  data: string;
  horario: string;
  observacao: string;
  whatsapp: string;
  duracaoTotal: number;
  precoTotal: number;
};

type Props = {
  open: boolean;
  initialServicoId: string;
  initialFuncionarioId?: string | null;
  initialWhatsapp?: string;
  requireWhatsapp?: boolean;
  onClose: () => void;
  onConfirm: (r: BookingResult) => void;
  /** Quando fornecido, sobrepõe a disponibilidade dos slots: somente os
   *  horários presentes em `slotsOverride` ficam disponíveis. O visual
   *  (grade completa) é preservado. */
  slotsOverride?: string[] | null;
  /** Mostra estado de carregamento na grade de horários (uso com RPC). */
  slotsLoading?: boolean;
  /** Notifica o parent sobre o dia atualmente selecionado (para buscar RPC). */
  onDayChange?: (dateIso: string | null) => void;
  /** Notifica o parent sobre o profissional efetivamente selecionado dentro do fluxo
   *  (item[0].funcionarioId), para refetch dos slots via RPC. */
  onProfissionalChange?: (id: string | null) => void;
  /** Quando fornecido, sobrepõe a seleção automática de dia (local) com o dia
   *  já resolvido pela RPC (próximo dia com horário livre). */
  initialDay?: string | null;
};

export function BookingScreen({ open, initialServicoId, initialFuncionarioId, initialWhatsapp = "", requireWhatsapp = false, onClose, onConfirm, slotsOverride = null, slotsLoading = false, onDayChange, onProfissionalChange, initialDay = null }: Props) {


  const { servicos, funcionarios, horarios, bloqueios, agendamentos, pausas } = useApp();

  const [items, setItems] = useState<BookingItem[]>([]);
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; });
  const [dia, setDia] = useState<string | null>(null);
  const [horario, setHorario] = useState<string | null>(null);
  const [observacao, setObservacao] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappTouched, setWhatsappTouched] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [alterarIdx, setAlterarIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const resumoRef = useRef<HTMLDivElement>(null);
  const slotsRowRef = useRef<HTMLDivElement>(null);

  // Notifica o parent sobre mudanças no dia selecionado (para sourcear via RPC).
  useEffect(() => {
    if (onDayChange) onDayChange(dia);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dia]);

  // Notifica o parent sobre mudanças no profissional do item atual.
  // Também limpa o horário selecionado para forçar nova escolha após a
  // re-busca de slots na RPC para o novo profissional.
  const funcionarioItemId = items[0]?.funcionarioId ?? null;
  useEffect(() => {
    if (!open) return;
    console.log("[Agendamento] profissional alterado:", funcionarioItemId);
    setHorario(null);
    if (onProfissionalChange) onProfissionalChange(funcionarioItemId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcionarioItemId, open]);


  // Reset state when opened (uma vez por sessão de agendamento — não reseta
  // quando o BookingScreen é reaberto após o login para coletar WhatsApp).
  useEffect(() => {
    if (!open) return;
    setItems([{ servicoId: initialServicoId, funcionarioId: initialFuncionarioId ?? undefined }]);
    setHorario(null);
    setObservacao("");
    setWhatsapp(maskBrPhone(initialWhatsapp));
    setWhatsappTouched(false);
    setAddOpen(false);
    setAlterarIdx(null);
    // Reseta as marcas de escolha manual/aplicação de initialDay ANTES de
    // calcular a data inicial, para não depender do useEffect separado
    // rodar em outra passada.
    hasUserSelectedDayRef.current = false;
    lastAppliedInitialDayRef.current = null;

    // Escolhe a data inicial de forma síncrona (sem depender do
    // auto-select em outro useEffect). Evita ficar preso em "Carregando
    // horários…" quando o dia da sessão anterior fica em cache.
    const srv = servicos.find((s) => s.id === initialServicoId) ?? null;
    const ctxLocal = { agendamentos, bloqueios, pausas, funcionarios, horarios, servicos };
    const funcIdLocal = initialFuncionarioId ?? null;
    const nowLocal = new Date();
    let diaInicial: string | null = null;
    if (initialDay) {
      diaInicial = initialDay;
      lastAppliedInitialDayRef.current = initialDay;
    } else if (srv) {
      const hojeIso = fmtDate(new Date());
      if (dayHasAvailability({ service: srv, dateIso: hojeIso, professionalId: funcIdLocal, ctx: ctxLocal, now: nowLocal })) {
        diaInicial = hojeIso;
      } else {
        diaInicial = nextAvailableDay({ service: srv, fromIso: hojeIso, professionalId: funcIdLocal, ctx: ctxLocal, now: nowLocal });
      }
    }
    setDia(diaInicial);
    const anchor = diaInicial ? parseDate(diaInicial) : new Date();
    anchor.setDate(1); anchor.setHours(0, 0, 0, 0);
    setMonthAnchor(anchor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialServicoId]);

  // Preenche WhatsApp automaticamente quando o cliente loga e já tem número
  // salvo no perfil, sem perder os outros dados do agendamento.
  useEffect(() => {
    if (!open) return;
    if (initialWhatsapp && !whatsapp) setWhatsapp(maskBrPhone(initialWhatsapp));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWhatsapp, open]);

  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      htmlOverflow: document.documentElement.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      document.documentElement.style.overflow = prev.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  const servicosById = useMemo(() => {
    const m = new Map<string, ServicoAdmin>();
    servicos.forEach((s) => m.set(s.id, s));
    return m;
  }, [servicos]);

  const duracaoTotal = useMemo(() => items.reduce((acc, it) => acc + (servicosById.get(it.servicoId)?.duracao_minutos || 0), 0), [items, servicosById]);
  const precoTotal = useMemo(() => items.reduce((acc, it) => acc + (servicosById.get(it.servicoId)?.preco || 0), 0), [items, servicosById]);

  // Serviço único (sempre 1 item): a grade é gerada com base nesse serviço.
  const servicoAtual = items[0] ? servicosById.get(items[0].servicoId) ?? null : null;
  const funcionarioAtualId = items[0]?.funcionarioId ?? null;

  // Contexto compartilhado com a função central de disponibilidade.
  const availCtx = useMemo(
    () => ({ agendamentos, bloqueios, pausas, funcionarios, horarios, servicos }),
    [agendamentos, bloqueios, pausas, funcionarios, horarios, servicos],
  );

  // Relógio: tick a cada 30s para atualizar a marca de "passado" automaticamente
  // (sem precisar recarregar a tela).
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [open]);

  // Compute calendar grid (6 weeks)
  const today = useMemo(() => { const d = new Date(now); d.setHours(0,0,0,0); return d; }, [now]);
  const calendarDays = useMemo(() => {
    const first = new Date(monthAnchor);
    const startWeekday = first.getDay();
    const startDate = new Date(first);
    startDate.setDate(first.getDate() - startWeekday);
    const out: { date: Date; inMonth: boolean; iso: string }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      out.push({ date: d, inMonth: d.getMonth() === monthAnchor.getMonth(), iso: fmtDate(d) });
    }
    return out;
  }, [monthAnchor]);

  function diaTemDisponibilidade(dataIso: string): boolean {
    if (!servicoAtual) return false;
    const dt = parseDate(dataIso);
    if (dt < today) return false;
    return dayHasAvailability({
      service: servicoAtual,
      dateIso: dataIso,
      professionalId: funcionarioAtualId,
      ctx: availCtx,
      now,
    });
  }

  // Lista completa de slots (disponíveis + indisponíveis), gerada pela
  // função central com base na DURAÇÃO do serviço selecionado.
  const slotsHoje = useMemo(() => {
    if (!dia || !servicoAtual) return [] as ReturnType<typeof generateSlots>;
    const base = generateSlots({
      service: servicoAtual,
      dateIso: dia,
      professionalId: funcionarioAtualId,
      ctx: availCtx,
      now,
    });
    if (slotsOverride) {
      const set = new Set(slotsOverride);
      const baseTimes = new Set(base.map((s) => s.time));
      const merged = base.map((s) => set.has(s.time)
        ? { ...s, available: true, reason: undefined }
        : { ...s, available: false, reason: s.reason ?? "fora-horario" });
      // Adiciona horários da RPC que não estão na grade local (a grade local
      // pode estar vazia ou desalinhada com a config real do painel). A RPC
      // é a fonte da verdade — sempre exibimos seus horários.
      const dur = Math.max(1, servicoAtual.duracao_minutos | 0);
      const extras = slotsOverride
        .filter((t) => !baseTimes.has(t))
        .map((time) => {
          const [hh, mm] = time.split(":").map(Number);
          const startMin = (hh || 0) * 60 + (mm || 0);
          return { time, startMin, endMin: startMin + dur, available: true } as ReturnType<typeof generateSlots>[number];
        });
      return [...merged, ...extras].sort((a, b) => a.startMin - b.startMin);
    }
    return base;
  }, [dia, servicoAtual, funcionarioAtualId, availCtx, now, slotsOverride]);

  const horariosHoje = useMemo(() => slotsHoje.filter((s) => s.available).map((s) => s.time), [slotsHoje]);

  /** Agrupa horários disponíveis por período do dia (apenas visual). */
  const groupedSlots = useMemo(() => {
    const timeToMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const dia: string[] = [];
    const tarde: string[] = [];
    const noite: string[] = [];
    const madrugada: string[] = [];
    for (const t of horariosHoje) {
      const m = timeToMin(t);
      if (m >= 360 && m <= 720) dia.push(t);
      else if (m >= 725 && m <= 1080) tarde.push(t);
      else if (m === 0 || (m >= 1085 && m <= 1440)) noite.push(t);
      else if (m >= 5 && m <= 355) madrugada.push(t);
    }
    return { dia, tarde, noite, madrugada };
  }, [horariosHoje]);

  // Quando data muda e o horário não é mais válido, limpa
  useEffect(() => {
    if (horario && (!dia || !horariosHoje.includes(horario))) setHorario(null);
  }, [horariosHoje, horario, dia]);


  // Rola horizontalmente até o primeiro horário disponível assim que a lista
  // de slots aparece (ou quando a data/serviço muda). Evita que o cliente
  // veja primeiro os horários já passados/indisponíveis.
  useEffect(() => {
    if (!open || !dia) return;
    const row = slotsRowRef.current;
    if (!row) return;
    const firstAvailable = horariosHoje[0];
    const id = window.requestAnimationFrame(() => {
      const node = firstAvailable
        ? (row.querySelector(`[data-slot="${firstAvailable}"]`) as HTMLElement | null)
        : null;
      if (node) {
        const left = Math.max(0, node.offsetLeft - 16);
        row.scrollTo({ left, behavior: "auto" });
      } else {
        row.scrollTo({ left: 0, behavior: "auto" });
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, dia, slotsHoje, horariosHoje]);

  // Rolagem suave até o resumo/nota quando um horário é selecionado
  useEffect(() => {
    if (!horario) return;
    const t = setTimeout(() => {
      resumoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => clearTimeout(t);
  }, [horario]);

  function proximoDiaDisponivel(): string | null {
    if (!servicoAtual) return null;
    return nextAvailableDay({
      service: servicoAtual,
      fromIso: dia ?? fmtDate(today),
      professionalId: funcionarioAtualId,
      ctx: availCtx,
      now,
    });
  }

  function gotoNextAvailable() {
    const next = proximoDiaDisponivel();
    if (!next) return;
    setDia(next);
    setHorario(null);
    const m = parseDate(next); m.setDate(1); m.setHours(0,0,0,0);
    setMonthAnchor(m);
  }

  // Controle de intenção: uma vez que o cliente clica manualmente em um dia,
  // NÃO sobrescrevemos mais a data com o auto-select (nem via initialDay do
  // parent, nem via cálculo local). Só resetamos essa marca quando o fluxo
  // reabre ou quando muda serviço/profissional.
  const hasUserSelectedDayRef = useRef(false);
  const lastAppliedInitialDayRef = useRef<string | null>(null);

  useEffect(() => {
    hasUserSelectedDayRef.current = false;
    lastAppliedInitialDayRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, servicoAtual?.id, funcionarioAtualId]);

  // Auto-seleciona uma data inicial assim que abre (ou quando muda
  // serviço/profissional): hoje se houver disponibilidade, senão o próximo
  // dia disponível. Após a primeira escolha manual do cliente, nunca mais
  // sobrescreve.
  useEffect(() => {
    if (!open || !servicoAtual) return;
    if (hasUserSelectedDayRef.current) return;
    if (initialDay) {
      if (lastAppliedInitialDayRef.current === initialDay) return;
      lastAppliedInitialDayRef.current = initialDay;
      if (dia !== initialDay) {
        setDia(initialDay);
        const m = parseDate(initialDay); m.setDate(1); m.setHours(0,0,0,0);
        setMonthAnchor(m);
      }
      return;
    }
    if (dia && diaTemDisponibilidade(dia)) return;
    const hojeIso = fmtDate(today);
    if (diaTemDisponibilidade(hojeIso)) {
      if (dia !== hojeIso) setDia(hojeIso);
      return;
    }
    const next = proximoDiaDisponivel();
    if (next && next !== dia) {
      setDia(next);
      const m = parseDate(next); m.setDate(1); m.setHours(0,0,0,0);
      setMonthAnchor(m);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, servicoAtual, funcionarioAtualId, availCtx, now, initialDay, dia]);

  // Profissionais disponíveis para um serviço, na data e horário escolhidos.
  function funcionariosDisponiveis(servicoId: string): FuncionarioAdmin[] {
    const srv = servicosById.get(servicoId);
    if (!srv || !dia) {
      // Sem data/hora ainda — devolve elegíveis (sem checar agenda).
      if (!srv) return [];
      return funcionarios.filter((f) => {
        if (f.status === "ausente") return false;
        if (srv.funcionariosMode === "apenas" && !(srv.funcionariosIds || []).includes(f.id)) return false;
        if (srv.funcionariosMode === "exceto" && (srv.funcionariosIds || []).includes(f.id)) return false;
        if (f.servicosMode === "apenas" && !(f.servicosIds || []).includes(servicoId)) return false;
        return true;
      });
    }
    if (!horario) {
      // Com data mas sem horário escolhido: usa elegíveis filtrando dia.
      const wd = parseDate(dia).getDay();
      return funcionarios.filter((f) => {
        if (f.status === "ausente") return false;
        if (srv.funcionariosMode === "apenas" && !(srv.funcionariosIds || []).includes(f.id)) return false;
        if (srv.funcionariosMode === "exceto" && (srv.funcionariosIds || []).includes(f.id)) return false;
        if (f.servicosMode === "apenas" && !(f.servicosIds || []).includes(servicoId)) return false;
        if (f.diasFolga.includes(wd)) return false;
        if (f.feriasInicio && f.feriasFim && dia >= f.feriasInicio && dia <= f.feriasFim) return false;
        return true;
      });
    }
    return professionalsAvailableAt({
      service: srv,
      dateIso: dia,
      startMin: minutesOf(horario),
      ctx: availCtx,
    });
  }

  const PRIMARY = "var(--site-primary, #5690f5)";
  const whatsappOk = !requireWhatsapp || isPhoneValid(whatsapp);
  const podeContinuar = !!(dia && horario && items.length > 0 && whatsappOk);

  function handleContinuar() {
    if (!podeContinuar || !dia || !horario || !servicoAtual) return;
    const agora = new Date();
    const startMin = minutesOf(horario);
    const endMin = startMin + servicoAtual.duracao_minutos;
    if (isSlotPast(dia, startMin, agora)) {
      alert("Esse horário acabou de passar. Escolha outro horário.");
      setHorario(null);
      setNow(agora);
      return;
    }
    // Quando a RPC define a fonte da verdade (slotsOverride), basta validar
    // que o horário ainda está na lista — o estado local (agendamentos/pausas)
    // não reflete a base real e geraria falsos "indisponível".
    if (slotsOverride) {
      if (!slotsOverride.includes(horario)) {
        alert("Esse horário não está mais disponível. Escolha outro horário.");
        setHorario(null);
        return;
      }
    } else {
      const livre = isProfessionalFreeAt({
        funcId: funcionarioAtualId,
        dateIso: dia,
        startMin,
        endMin,
        ctx: availCtx,
      });
      if (!livre) {
        alert("Esse horário não está mais disponível. Escolha outro horário.");
        setHorario(null);
        setNow(agora);
        return;
      }
    }
    onConfirm({ items, data: dia, horario, observacao, whatsapp, duracaoTotal, precoTotal });
  }

  function fmtDur(min: number) {
    if (min >= 60 && min % 60 === 0) return `${min / 60}h`;
    if (min >= 60) return `${Math.floor(min / 60)}h${min % 60}`;
    return `${min}min`;
  }

  function fmtDurExtenso(min: number) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m} minuto${m === 1 ? "" : "s"}`;
    const horas = `${h} hora${h > 1 ? "s" : ""}`;
    if (m === 0) return horas;
    return `${horas} e ${m} minuto${m === 1 ? "" : "s"}`;
  }

  function endTime(start: string, dur: number) {
    const t = minutesOf(start) + dur;
    return slotLabel(t);
  }

  if (!open) return null;

  const monthLabel = `${MESES[monthAnchor.getMonth()]} ${monthAnchor.getFullYear()}`;

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "#FFFFFF", zIndex: 1000,
        display: "flex", flexDirection: "column",
        paddingTop: "env(safe-area-inset-top)",
        height: "100dvh",
        overscrollBehavior: "contain",
        touchAction: "pan-y",
      }}
    >
      {/* Scrollable content (header rola junto) */}
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", paddingBottom: "calc(120px + env(safe-area-inset-bottom))", scrollPaddingBottom: "calc(120px + env(safe-area-inset-bottom))" }}>
        {/* Header (não fixo) */}
        <header
          style={{
            display: "grid", gridTemplateColumns: "44px 1fr 44px", alignItems: "center",
            padding: "14px 12px", background: "#FFFFFF",
          }}
        >
          <button onClick={onClose} aria-label="Voltar" style={iconBtn}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h2 style={{ margin: 0, textAlign: "center", fontSize: 17, fontWeight: 700, color: "#1A1A1A" }}>
            Selecione Data e Hora
          </h2>
          <span />
        </header>

        {/* Calendar header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px 12px" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1A1A1A" }}>{monthLabel}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              aria-label="Mês anterior"
              onClick={() => { const m = new Date(monthAnchor); m.setMonth(m.getMonth() - 1); setMonthAnchor(m); }}
              style={navBtn}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button
              aria-label="Próximo mês"
              onClick={() => { const m = new Date(monthAnchor); m.setMonth(m.getMonth() + 1); setMonthAnchor(m); }}
              style={navBtn}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>

        {/* Weekday labels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0 8px", gap: 4 }}>
          {DOW.map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: 12, color: "#9A9A9A", fontWeight: 500, padding: "4px 0" }}>{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "4px 8px", gap: 6 }}>
          {calendarDays.map(({ date, inMonth, iso }) => {
            if (!inMonth) return <div key={iso} />;
            const isPast = date < today;
            const isSel = dia === iso;
            const hasAvail = !isPast && diaTemDisponibilidade(iso);
            // Dia "morto": ou já passou, ou é hoje/futuro sem nenhum horário
            // válido (estabelecimento fechado, expediente acabou, sem slot
            // futuro suficiente para o serviço, etc.). Em ambos os casos a
            // UI fica igual visualmente, mas apenas dias no passado bloqueiam
            // o clique. Dias "sem horário" local seguem clicáveis para que a
            // RPC seja a fonte da verdade (mostra "sem horários" se vazio).
            const isDead = isPast || !hasAvail;
            const isClickable = !isPast;
            const dayNum = date.getDate();
            return (
              <button
                key={iso}
                disabled={!isClickable}
                onClick={() => {
                  if (!isClickable) return;
                  if (dia === iso) return; // nunca desseleciona
                  hasUserSelectedDayRef.current = true;
                  setDia(iso);
                  setHorario(null);
                }}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: "50%",
                  border: isSel ? `2px solid ${PRIMARY}` : "1.5px solid #EFEFEF",
                  background: isSel ? `color-mix(in oklab, ${PRIMARY} 12%, white)` : "#f2f1f6",
                  color: isDead ? "#C8C8C8" : "#1A1A1A",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: isDead ? "not-allowed" : "pointer",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: isPast ? "line-through" : "none",
                  opacity: isDead ? 0.55 : 1,
                  padding: 0,
                  transition: "all 160ms",
                }}
              >
                {dayNum}
                {hasAvail && (
                  <span style={{
                    position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)",
                    width: 14, height: 3, borderRadius: 2,
                    background: "#22C55E",
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Divider (topo da seção de horários) */}
        <div style={{ height: 1, background: "#F0F0F0", margin: "16px 0" }} />

        {/* Time slots — sempre mostra a grade inteira; indisponíveis ficam apagados e sem clique */}
        {!dia || slotsLoading ? (
          <div style={{ padding: "12px 16px 8px", display: "flex", justifyContent: "center" }}><DotsSpinner size={28} /></div>

        ) : slotsHoje.length === 0 ? (
          <div style={{ padding: "0 16px 8px" }}>
            <div style={{ fontSize: 14, color: "#1A1A1A", fontWeight: 600, marginBottom: 10 }}>Sem disponibilidade nesta data</div>
            <button
              onClick={gotoNextAvailable}
              style={{
                background: PRIMARY, color: "#FFF", border: "none",
                borderRadius: 12, padding: "10px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >Próximo dia disponível</button>
          </div>
        ) : (
          <>
            {horariosHoje.length === 0 && (
              <div style={{ padding: "0 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontSize: 13, color: "#888" }}>Nenhum horário livre nesta data.</div>
                <button
                  onClick={gotoNextAvailable}
                  style={{
                    background: PRIMARY, color: "#FFF", border: "none",
                    borderRadius: 10, padding: "8px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}
                >Próximo dia</button>
              </div>
            )}
            <div ref={slotsRowRef}>
              {([
                { key: "dia", label: "Dia" },
                { key: "tarde", label: "Tarde" },
                { key: "noite", label: "Noite" },
                { key: "madrugada", label: "Madrugada" },
              ] as const).map(({ key, label }) => {
                const list = groupedSlots[key];
                if (list.length === 0) return null;
                return (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <div style={{ padding: "0 16px 6px", fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {label}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, padding: "0 16px 4px" }}>
                      {list.map((t) => {
                        const sel = horario === t;
                        return (
                          <button
                            key={t}
                            data-slot={t}
                            onClick={() => setHorario(t)}
                            style={{
                              padding: "10px 4px",
                              borderRadius: 12,
                              border: sel ? `2px solid ${PRIMARY}` : "1.5px solid transparent",
                              background: sel ? `color-mix(in oklab, ${PRIMARY} 12%, white)` : "#f2f1f6",
                              color: "#1A1A1A",
                              fontWeight: 700,
                              fontSize: 13,
                              cursor: "pointer",
                            }}
                          >{t}</button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Divider (fim da seção de horários) */}
        <div style={{ height: 1, background: "#F0F0F0", margin: "16px 0" }} />

        {/* Resumo dos serviços */}
        <div ref={resumoRef} style={{ padding: "4px 16px 0", scrollMarginTop: 12 }}>
          {items.map((it, idx) => {
            const srv = servicosById.get(it.servicoId);
            if (!srv) return null;
            // Calcula horário de início desse item: soma duração dos itens anteriores
            let offset = 0;
            for (let i = 0; i < idx; i++) {
              const s = servicosById.get(items[i].servicoId);
              offset += s?.duracao_minutos || 0;
            }
            const inicioItem = horario ? slotLabel(minutesOf(horario) + offset) : null;
            const fim = inicioItem ? endTime(inicioItem, srv.duracao_minutos) : null;
            const func = it.funcionarioId ? funcionarios.find((f) => f.id === it.funcionarioId) : null;
            const mostrarProfissional = funcionarios.length >= 2;
            return (
              <div key={idx} style={{ background: "#f2f1f6", borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#1A1A1A", flex: 1, minWidth: 0, wordBreak: "break-word" }}>{srv.nome}</div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#1A1A1A" }}>R$ {srv.preco.toFixed(2).replace(".", ",")}</div>
                    {inicioItem && fim && (
                      <div style={{ fontSize: 13, color: "#888", marginTop: 2, whiteSpace: "nowrap" }}>{inicioItem} - {fim}</div>
                    )}
                  </div>
                </div>
                {mostrarProfissional && (
                  <>
                    <div style={{ height: 1, background: "#E5E5E2", margin: "12px 0" }} />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{ fontSize: 13, color: "#888" }}>Profissional:</span>
                        {func ? (
                          <>
                            {func.fotoUrl ? (
                              <img src={func.fotoUrl} alt={func.nome} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                            ) : (
                              <DefaultAvatar size={28} />
                            )}
                            <span style={{ fontSize: 14, color: "#1A1A1A", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{func.nome}</span>
                          </>
                        ) : (
                          <span style={{ fontSize: 14, color: "#888", fontStyle: "italic" }}>Não selecionado</span>
                        )}
                      </div>
                      <button
                        onClick={() => setAlterarIdx(idx)}
                        style={{
                          background: "#FFF", border: "1.5px solid #E0E0E0",
                          borderRadius: 10, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                        }}
                      >{func ? "Alterar" : "Selecionar"}</button>
                    </div>
                  </>
                )}
                {items.length > 1 && idx > 0 && (
                  <div style={{ marginTop: 10, textAlign: "right" }}>
                    <button
                      onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))}
                      style={{ background: "transparent", border: "none", color: "#5690f5", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}
                    >Remover</button>
                  </div>
                )}
              </div>
            );
          })}

        </div>

        {/* WhatsApp (obrigatório quando o cliente ainda não tem número salvo) */}
        {requireWhatsapp && (
          <div style={{ padding: "2px 16px 12px" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1A1A1A", marginBottom: 10 }}>
              WhatsApp
            </div>
            <div className="phone-wrapper">
              <span className="phone-prefix">+55</span>
              <input
                className="phone-input"
                type="tel"
                inputMode="numeric"
                placeholder="(00) 00000-0000"
                value={whatsapp}
                onChange={(e) => setWhatsapp(maskBrPhone(e.target.value))}
                onBlur={() => setWhatsappTouched(true)}
                maxLength={15}
                autoComplete="tel-national"
                aria-invalid={whatsappTouched && !whatsappOk}
              />
            </div>
            {whatsappTouched && !whatsappOk && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                Adicione um número de telefone válido.
              </div>
            )}
          </div>
        )}

        {/* Observação */}
        <div style={{ padding: "2px 16px 12px" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#1A1A1A", marginBottom: 10 }}>
            Alguma observação ou pedido para sua visita?
          </div>
          <textarea
            className="bisme-textarea"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            onFocus={(e) => {
              const el = e.currentTarget;
              setTimeout(() => {
                try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
              }, 300);
            }}
            placeholder="Nota de agendamento"
            rows={3}
          />

        </div>

      </div>

      {/* Sticky bottom bar */}
      <div
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          background: "#FFFFFF", borderTop: "1px solid #F0F0F0",
          padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "#888" }}>
            Serviço de {fmtDurExtenso(duracaoTotal)}
          </div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#1A1A1A" }}>
            R$ {precoTotal.toFixed(2).replace(".", ",")}
          </div>
        </div>
        <button
          disabled={!podeContinuar}
          onClick={handleContinuar}
          style={{
            background: podeContinuar ? PRIMARY : "#f2f1f6",
            color: podeContinuar ? "#FFFFFF" : "#888888", fontWeight: 700, fontSize: 16,
            border: "none", borderRadius: 14,
            padding: "14px 28px", cursor: podeContinuar ? "pointer" : "not-allowed",
            minWidth: 160,
          }}
        >Continuar</button>
      </div>

      {/* Sheet adicionar serviço */}
      {addOpen && (
        <BottomSheet onClose={() => setAddOpen(false)} title="Adicionar serviço">
          {servicos
            .filter((s) => !items.some((it) => it.servicoId === s.id))
            .map((s) => (
              <button
                key={s.id}
                onClick={() => { setItems((arr) => [...arr, { servicoId: s.id }]); setAddOpen(false); setHorario(null); }}
                style={sheetItem}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: "#1A1A1A" }}>{s.nome}</span>
                  <span style={{ fontSize: 12, color: "#888" }}>{fmtDur(s.duracao_minutos)}</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#1A1A1A" }}>R$ {s.preco.toFixed(2).replace(".", ",")}</span>
              </button>
            ))}
          {servicos.filter((s) => !items.some((it) => it.servicoId === s.id)).length === 0 && (
            <div style={{ padding: 16, color: "#888", fontSize: 13 }}>Todos os serviços já foram adicionados.</div>
          )}
        </BottomSheet>
      )}

      {/* Sheet alterar profissional */}
      {alterarIdx !== null && (
        <BottomSheet onClose={() => setAlterarIdx(null)} title="Selecionar profissional">
          {(() => {
            const it = items[alterarIdx];
            const list = funcionariosDisponiveis(it.servicoId);
            if (list.length === 0) {
              return <div style={{ padding: 16, color: "#888", fontSize: 13 }}>Nenhum profissional disponível para este serviço/horário.</div>;
            }
            return list.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setItems((arr) => arr.map((x, i) => i === alterarIdx ? { ...x, funcionarioId: f.id } : x));
                  setAlterarIdx(null);
                }}
                style={sheetItem}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {f.fotoUrl ? (
                    <img src={f.fotoUrl} alt={f.nome} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                  ) : <DefaultAvatar size={36} />}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#1A1A1A" }}>{f.nome}</span>
                    <span style={{ fontSize: 12, color: "#888" }}>{f.cargo}</span>
                  </div>
                </div>
                {it.funcionarioId === f.id && (
                  <span style={{ color: PRIMARY, fontWeight: 700 }}>✓</span>
                )}
              </button>
            ));
          })()}
        </BottomSheet>
      )}
    </div>
  );
}

const iconBtn: CSSProperties = {
  width: 40, height: 40, borderRadius: 10, border: "none",
  background: "transparent", cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};
const navBtn: CSSProperties = {
  width: 40, height: 40, borderRadius: 10,
  background: "#FFFFFF", border: "1.5px solid #EFEFEF", cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};
const sheetItem: CSSProperties = {
  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "14px 16px", background: "#FFFFFF", border: "none",
  borderBottom: "1px solid #F0F0F0", cursor: "pointer", textAlign: "left",
};

function BottomSheet({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1100, display: "flex", alignItems: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF", width: "100%", maxHeight: "75vh", overflowY: "auto",
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
        }}
      >
        <div style={{ width: 40, height: 4, background: "#E5E5E5", borderRadius: 2, margin: "12px auto" }} />
        <h3 style={{ margin: 0, padding: "0 16px 12px", fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}
