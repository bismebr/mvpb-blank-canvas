// ============================================================================
// Status efetivo do agendamento
// ----------------------------------------------------------------------------
// Regras de prioridade (alto → baixo):
//   1. cancelado        — cliente ou proprietário cancelou
//   2. naoCompareceu    — proprietário marcou manualmente
//   3. concluido        — automático após o horário passar (ou explicitamente
//                          marcado como concluído na fonte de dados)
//   4. agendado         — antes do horário marcado
//
// O status manual "naoCompareceu" NUNCA é sobrescrito pelo "concluido"
// automático. A função opera apenas com data/horário e o status persistido.
// TODO(Supabase): manter essa lógica espelhada em queries server-side.
// ============================================================================
import type { AgendamentoAdmin } from "@/components/admin/AppContext";

export type EffectiveStatus = "agendado" | "concluido" | "cancelado" | "naoCompareceu";

/** Retorna o `Date` correspondente à data+horário do agendamento. */
export function agendamentoDateTime(a: Pick<AgendamentoAdmin, "data" | "horario">): Date {
  const [y, m, d] = a.data.split("-").map(Number);
  const [h, mi] = a.horario.split(":").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1, h || 0, mi || 0, 0, 0);
}

/** `true` quando o horário do agendamento já chegou ou passou. */
export function isHorarioAtingido(
  a: Pick<AgendamentoAdmin, "data" | "horario">,
  now: Date = new Date(),
): boolean {
  return agendamentoDateTime(a).getTime() <= now.getTime();
}

/** Calcula o status efetivo aplicando as regras de prioridade. */
export function effectiveStatus(a: AgendamentoAdmin, now: Date = new Date()): EffectiveStatus {
  if (a.status === "cancelado") return "cancelado";
  if (a.status === "naoCompareceu") return "naoCompareceu";
  if (a.status === "concluido") return "concluido";
  return isHorarioAtingido(a, now) ? "concluido" : "agendado";
}
