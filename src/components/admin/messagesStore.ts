// ============================================================================
// Mensagens — store em memória (sem localStorage).
// ----------------------------------------------------------------------------
// Centraliza:
//   • Modelos de mensagem (4 padrões + customizados criados pelo proprietário)
//   • Registro de envios (qual cliente/agendamento já recebeu qual modelo)
//
// TODO(Supabase): substituir este store por queries reais a:
//   • Tabela `message_templates` (modelos padrão + customizados editados)
//   • Tabela `message_logs`     (histórico de envios por agendamento+modelo)
// As funções abaixo já estão prontas para receberem essas chamadas — basta
// trocar o estado em memória por requests assíncronos.
// ============================================================================

import { useEffect, useState, useSyncExternalStore } from "react";

/* ----------------------------- Tipos ----------------------------- */

export type TemplateKind =
  | "confirmacao"
  | "cancelamento"
  | "naoCompareceu"
  | "avaliacao"
  | "custom";

export interface MessageTemplate {
  id: string;
  kind: TemplateKind;
  name: string;
  description: string;
  content: string;
  /** True para os 4 modelos padrão (não podem ser excluídos). */
  isDefault: boolean;
  /** Conteúdo original — usado para restaurar o padrão. */
  defaultContent?: string;
}

export interface TemplateVariable {
  key: string;
  label: string;
  example: string;
}

/* ------------------------- Variáveis disponíveis ------------------------- */

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: "{nome_cliente}",       label: "Nome do cliente",       example: "Ana Silva" },
  { key: "{data_atendimento}",   label: "Data do atendimento",   example: "03/06/2025" },
  { key: "{horario_agendado}",   label: "Horário agendado",      example: "09:00" },
  { key: "{nome_servico}",       label: "Nome do serviço",       example: "Corte feminino" },
  { key: "{nome_profissional}",  label: "Nome do profissional",  example: "João Silva" },
  { key: "{nome_empresa}",       label: "Nome da empresa",       example: "Bisme" },
];

/* ------------------------- Mensagens padrão ------------------------- */

const DEFAULT_CONFIRMACAO =
  "Olá, {nome_cliente}! Tudo bem?\n\n" +
  "Seu agendamento para {data_atendimento}, às {horario_agendado}, foi confirmado.\n\n" +
  "Estamos aguardando você!";

const DEFAULT_CANCELAMENTO =
  "Olá, {nome_cliente}! Tudo bem?\n\n" +
  "Vimos que seu agendamento para {data_atendimento}, às {horario_agendado}, foi cancelado.\n\n" +
  "Queremos entender melhor o que aconteceu para podermos melhorar sua experiência. Pode nos contar o motivo?";

const DEFAULT_NAO_COMPARECEU =
  "Olá, {nome_cliente}! Tudo bem?\n\n" +
  "Notamos que você tinha um agendamento para {data_atendimento}, às {horario_agendado}, mas não conseguiu comparecer.\n\n" +
  "Aconteceu algum imprevisto? Podemos te ajudar a remarcar um novo horário.";

const DEFAULT_AVALIACAO =
  "Olá, {nome_cliente}! Tudo bem?\n\n" +
  "Você esteve em nosso estabelecimento hoje e queremos saber como foi sua experiência.\n\n" +
  "De 0 a 10, qual nota você daria para o atendimento recebido?";

const INITIAL_TEMPLATES: MessageTemplate[] = [
  {
    id: "tpl-confirmacao",
    kind: "confirmacao",
    name: "Confirmação de Agendamento",
    description: "Enviada quando um novo agendamento é realizado.",
    content: DEFAULT_CONFIRMACAO,
    defaultContent: DEFAULT_CONFIRMACAO,
    isDefault: true,
  },
  {
    id: "tpl-cancelamento",
    kind: "cancelamento",
    name: "Cancelamento de Agendamento",
    description: "Enviada quando um agendamento é cancelado.",
    content: DEFAULT_CANCELAMENTO,
    defaultContent: DEFAULT_CANCELAMENTO,
    isDefault: true,
  },
  {
    id: "tpl-naoCompareceu",
    kind: "naoCompareceu",
    name: "Não Compareceu",
    description: "Enviada quando o cliente não comparece ao atendimento.",
    content: DEFAULT_NAO_COMPARECEU,
    defaultContent: DEFAULT_NAO_COMPARECEU,
    isDefault: true,
  },
  {
    id: "tpl-avaliacao",
    kind: "avaliacao",
    name: "Pedido de Avaliação",
    description: "Enviada após o atendimento para pedir um feedback.",
    content: DEFAULT_AVALIACAO,
    defaultContent: DEFAULT_AVALIACAO,
    isDefault: true,
  },
];

/* ------------------------- Estado em memória ------------------------- */

let templates: MessageTemplate[] = INITIAL_TEMPLATES.map((t) => ({ ...t }));
/** key = `${agendamentoId}::${templateId}` */
const sentLog = new Set<string>();

const listeners = new Set<() => void>();
function emit() { listeners.forEach((cb) => cb()); }
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }

/* ------------------------- API de templates ------------------------- */

export const messagesStore = {
  // ---- templates ----
  getTemplates(): MessageTemplate[] {
    return templates;
  },
  getTemplate(id: string): MessageTemplate | undefined {
    return templates.find((t) => t.id === id);
  },
  getTemplateByKind(kind: TemplateKind): MessageTemplate | undefined {
    return templates.find((t) => t.kind === kind);
  },
  /** Substitui todos os templates (usado ao sincronizar com Supabase). */
  setTemplates(list: MessageTemplate[]) {
    templates = list.map((t) => ({ ...t }));
    emit();
  },

  updateTemplate(id: string, patch: Partial<Pick<MessageTemplate, "name" | "description" | "content">>) {
    templates = templates.map((t) => (t.id === id ? { ...t, ...patch } : t));
    emit();
  },

  createTemplate(input: { name: string; description: string; content: string }): MessageTemplate {
    const t: MessageTemplate = {
      id: `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      kind: "custom",
      name: input.name.trim() || "Modelo personalizado",
      description: input.description.trim(),
      content: input.content,
      isDefault: false,
    };
    templates = [...templates, t];
    emit();
    return t;
  },

  deleteTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t || t.isDefault) return;
    templates = templates.filter((x) => x.id !== id);
    emit();
  },

  // ---- envio ----
  markSent(agendamentoId: string, templateId: string) {
    sentLog.add(`${agendamentoId}::${templateId}`);
    emit();
  },
  /** Substitui todo o log local (usado ao carregar de `message_logs`). */
  setSentLog(pairs: Array<{ appointmentId: string; templateId: string }>) {
    sentLog.clear();
    for (const p of pairs) sentLog.add(`${p.appointmentId}::${p.templateId}`);
    emit();
  },
  isSent(agendamentoId: string, templateId: string): boolean {
    return sentLog.has(`${agendamentoId}::${templateId}`);
  },
  subscribe,
};


/* ------------------------- Helpers ------------------------- */

/** Substitui {variaveis} pelos valores informados. Aceita aliases legados. */
export function applyVariables(text: string, values: Record<string, string>): string {
  // Aliases para compat com nomes antigos.
  const aliased: Record<string, string> = { ...values };
  if (values["{nome_servico}"] && !aliased["{servico}"]) aliased["{servico}"] = values["{nome_servico}"];
  if (values["{nome_empresa}"] && !aliased["{nome_estabelecimento}"]) aliased["{nome_estabelecimento}"] = values["{nome_empresa}"];
  return text.replace(/\{[a-z_]+\}/g, (m) => aliased[m] ?? m);
}

export function exampleValues(): Record<string, string> {
  return Object.fromEntries(TEMPLATE_VARIABLES.map((v) => [v.key, v.example]));
}

/* ------------------------- React hooks ------------------------- */

export function useTemplates(): MessageTemplate[] {
  return useSyncExternalStore(subscribe, () => templates, () => templates);
}

/** Re-renderiza quando qualquer envio é registrado. */
export function useSentVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => subscribe(() => setV((n) => n + 1)), []);
  return v;
}
