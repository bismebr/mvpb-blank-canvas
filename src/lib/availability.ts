/**
 * Disponibilidade de agendamentos — função central.
 *
 * Esta é a ÚNICA fonte da verdade para gerar e validar horários.
 * Tanto o fluxo do cliente (BookingScreen) quanto o painel administrativo
 * (FormAgendamento, etc.) DEVEM usar `generateSlots` para gerar a grade
 * de horários e `isProfessionalFreeAt` para validar criação manual.
 *
 * Regras implementadas:
 * - O passo (step) da grade é a DURAÇÃO do serviço selecionado.
 *   Não existe step fixo de 15/30 minutos.
 * - O intervalo completo do serviço (início → início+duração) é validado
 *   contra agendamentos, bloqueios, pausas, férias, dias de folga, horário
 *   de funcionamento da empresa e horário de trabalho do profissional.
 * - Conflito = (novoIni < existenteFim) && (novoFim > existenteIni).
 *   Slots que apenas se tocam (14:00–14:20 e 14:20–14:40) NÃO conflitam.
 * - A grade respeita o horário de funcionamento: o serviço inteiro precisa
 *   caber dentro do expediente.
 * - Agendamentos cancelados NÃO bloqueiam horários.
 * - A disponibilidade é POR PROFISSIONAL. Um horário só fica indisponível
 *   no estabelecimento inteiro quando TODOS os profissionais elegíveis
 *   estão ocupados naquele intervalo.
 * - Slots indisponíveis são retornados com `available=false` para que a UI
 *   possa exibi-los apagados e sem clique (não escondê-los).
 *
 * Implementação pura (sem React, sem localStorage). Está pronta para ser
 * portada para Supabase: basta substituir as fontes de dados (agendamentos,
 * bloqueios, pausas, funcionários, horários) por queries.
 */

import type {
  AgendamentoAdmin,
  BloqueioAdmin,
  FuncionarioAdmin,
  HorarioAdmin,
  PausaAdmin,
  ServicoAdmin,
} from "@/components/admin/AppContext";

/* ----------------------------------------------------------------- */
/* Helpers                                                            */
/* ----------------------------------------------------------------- */

function pad(n: number) {
  return String(n).padStart(2, "0");
}
export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
export function fmtMin(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}
export function parseDateIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function fmtDateIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Conflito: ambos intervalos cruzam em pelo menos 1 minuto.
 *  Tocar nas bordas (a fim == b ini) NÃO é conflito. */
export function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/* ----------------------------------------------------------------- */
/* Filtros de profissional                                            */
/* ----------------------------------------------------------------- */

/** Profissionais que PODEM, em tese, realizar este serviço (sem checar agenda). */
export function getEligibleProfessionals(
  service: Pick<ServicoAdmin, "id" | "funcionariosMode" | "funcionariosIds">,
  funcionarios: FuncionarioAdmin[],
): FuncionarioAdmin[] {
  return funcionarios.filter((f) => {
    if (f.status === "ausente") return false;
    const mode = service.funcionariosMode ?? "todos";
    const ids = service.funcionariosIds ?? [];
    if (mode === "apenas" && !ids.includes(f.id)) return false;
    if (mode === "exceto" && ids.includes(f.id)) return false;
    const fMode = f.servicosMode ?? "todos";
    const fIds = f.servicosIds ?? [];
    if (fMode === "apenas" && !fIds.includes(service.id)) return false;
    return true;
  });
}

/* ----------------------------------------------------------------- */
/* Verificação de profissional livre em um intervalo                  */
/* ----------------------------------------------------------------- */

export interface AvailabilityCtx {
  agendamentos: AgendamentoAdmin[];
  bloqueios: BloqueioAdmin[];
  pausas: PausaAdmin[];
  funcionarios: FuncionarioAdmin[];
  horarios: HorarioAdmin[];
  servicos: ServicoAdmin[];
}

/** Está o profissional `funcId` LIVRE em [startMin, endMin) na data `dateIso`?
 *  Considera horário do profissional, folgas, férias, pausas (do pro + globais),
 *  bloqueios (do pro + globais) e agendamentos existentes do pro
 *  (incluindo agendamentos sem funcionarioId — tratados como reserva do
 *  estabelecimento/proprietário, válidos para todos quando não há
 *  funcionários cadastrados; quando há, são considerados conflito apenas
 *  para o próprio funcionário se o agendamento for dele). */
export function isProfessionalFreeAt(params: {
  funcId: string | null;            // null = sem funcionários cadastrados (proprietário)
  dateIso: string;
  startMin: number;
  endMin: number;
  ctx: AvailabilityCtx;
  ignoreAgId?: string;              // útil para edição de agendamento existente
}): boolean {
  const { funcId, dateIso, startMin, endMin, ctx, ignoreAgId } = params;
  const weekday = parseDateIso(dateIso).getDay();
  const servicosById = new Map(ctx.servicos.map((s) => [s.id, s] as const));

  // Profissional específico: respeita expediente, folgas, férias.
  if (funcId) {
    const f = ctx.funcionarios.find((x) => x.id === funcId);
    if (!f) return false;
    if (f.status === "ausente") return false;
    if (f.diasFolga.includes(weekday)) return false;
    if (f.feriasInicio && f.feriasFim && dateIso >= f.feriasInicio && dateIso <= f.feriasFim) return false;
    if (startMin < toMin(f.entrada) || endMin > toMin(f.saida)) return false;
  }

  // Bloqueios (globais ou do funcionário).
  for (const b of ctx.bloqueios) {
    if (b.data !== dateIso) continue;
    if (b.funcionarioId && b.funcionarioId !== funcId) continue;
    if (b.diaInteiro) return false;
    if (!b.inicio || !b.fim) continue;
    if (intervalsOverlap(startMin, endMin, toMin(b.inicio), toMin(b.fim))) return false;
  }

  // Pausas (globais ou do funcionário).
  for (const p of ctx.pausas) {
    if (p.funcionarioId && p.funcionarioId !== funcId) continue;
    if (p.diaSemana !== null && p.diaSemana !== weekday) continue;
    if (intervalsOverlap(startMin, endMin, toMin(p.inicio), toMin(p.fim))) return false;
  }

  // Agendamentos existentes.
  for (const a of ctx.agendamentos) {
    if (ignoreAgId && a.id === ignoreAgId) continue;
    if (a.data !== dateIso) continue;
    if (a.status === "cancelado") continue;
    // Regra: conflita se for do mesmo profissional. Agendamentos sem
    // funcionarioId conflitam com todos (reserva do estabelecimento).
    if (funcId && a.funcionarioId && a.funcionarioId !== funcId) continue;
    const dur = servicosById.get(a.servicoId)?.duracao_minutos ?? 30;
    const aStart = toMin(a.horario);
    const aEnd = aStart + dur;
    if (intervalsOverlap(startMin, endMin, aStart, aEnd)) return false;
  }

  return true;
}

/* ----------------------------------------------------------------- */
/* Geração de slots                                                   */
/* ----------------------------------------------------------------- */

export type Slot = {
  time: string;        // "HH:MM"
  startMin: number;
  endMin: number;
  available: boolean;
  reason?: "passado" | "fora-horario" | "ocupado" | "sem-profissional";
};

/** Verifica se um horário (dateIso + startMin) já passou em relação ao
 *  momento real (now). Regra: o slot só é futuro se o seu início, em
 *  segundos, for ESTRITAMENTE maior que o agora em segundos. Assim,
 *  14:20 com agora 14:20:00 ou 14:20:01 já é considerado passado. */
export function isSlotPast(dateIso: string, startMin: number, now: Date = new Date()): boolean {
  const today0 = new Date(now); today0.setHours(0, 0, 0, 0);
  const target0 = parseDateIso(dateIso);
  if (target0.getTime() < today0.getTime()) return true;
  if (target0.getTime() > today0.getTime()) return false;
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const slotSec = startMin * 60;
  return slotSec <= nowSec;
}

export function generateSlots(params: {
  service: ServicoAdmin;
  dateIso: string;
  professionalId?: string | null;   // null/undefined = qualquer profissional elegível
  ctx: AvailabilityCtx;
  now?: Date;
}): Slot[] {
  const { service, dateIso, professionalId, ctx } = params;
  const now = params.now ?? new Date();
  const duration = Math.max(1, service.duracao_minutos | 0);

  // Dia inteiro bloqueado para o negócio?
  for (const b of ctx.bloqueios) {
    if (b.data === dateIso && b.diaInteiro && !b.funcionarioId) return [];
  }

  const weekday = parseDateIso(dateIso).getDay();
  const dayCfg = ctx.horarios.find((h) => h.diaSemana === weekday);
  if (!dayCfg || !dayCfg.aberto) return [];
  const openStart = toMin(dayCfg.abre);
  const openEnd = toMin(dayCfg.fecha);
  if (openStart >= openEnd) return [];

  // Profissionais candidatos.
  const candidates: (FuncionarioAdmin | null)[] = (() => {
    if (ctx.funcionarios.length === 0) return [null]; // proprietário sozinho
    if (professionalId) {
      const f = ctx.funcionarios.find((x) => x.id === professionalId);
      return f ? [f] : [];
    }
    const eligible = getEligibleProfessionals(service, ctx.funcionarios);
    return eligible.length > 0 ? eligible : [];
  })();

  const slots: Slot[] = [];
  // Step = duração do serviço.
  for (let t = openStart; t + duration <= openEnd; t += duration) {
    const startMin = t;
    const endMin = t + duration;
    let available = true;
    let reason: Slot["reason"] | undefined;

    if (isSlotPast(dateIso, startMin, now)) {
      available = false;
      reason = "passado";
    } else if (candidates.length === 0) {
      available = false;
      reason = "sem-profissional";
    } else {
      const algumLivre = candidates.some((f) =>
        isProfessionalFreeAt({
          funcId: f ? f.id : null,
          dateIso,
          startMin,
          endMin,
          ctx,
        }),
      );
      if (!algumLivre) {
        available = false;
        reason = "ocupado";
      }
    }

    slots.push({ time: fmtMin(startMin), startMin, endMin, available, reason });
  }

  return slots;
}

/** Há ao menos um slot disponível neste dia para o serviço? */
export function dayHasAvailability(params: {
  service: ServicoAdmin;
  dateIso: string;
  professionalId?: string | null;
  ctx: AvailabilityCtx;
  now?: Date;
}): boolean {
  return generateSlots(params).some((s) => s.available);
}

/** Próximo dia (até `maxDays`) com disponibilidade. */
export function nextAvailableDay(params: {
  service: ServicoAdmin;
  fromIso: string;
  professionalId?: string | null;
  ctx: AvailabilityCtx;
  maxDays?: number;
  now?: Date;
}): string | null {
  const max = params.maxDays ?? 365;
  const start = parseDateIso(params.fromIso);
  for (let i = 1; i <= max; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = fmtDateIso(d);
    if (dayHasAvailability({ ...params, dateIso: iso })) return iso;
  }
  return null;
}

/** Profissionais disponíveis (livres) para o serviço, data e horário. */
export function professionalsAvailableAt(params: {
  service: ServicoAdmin;
  dateIso: string;
  startMin: number;
  ctx: AvailabilityCtx;
}): FuncionarioAdmin[] {
  const { service, dateIso, startMin, ctx } = params;
  const endMin = startMin + service.duracao_minutos;
  const eligible = getEligibleProfessionals(service, ctx.funcionarios);
  return eligible.filter((f) =>
    isProfessionalFreeAt({ funcId: f.id, dateIso, startMin, endMin, ctx }),
  );
}
