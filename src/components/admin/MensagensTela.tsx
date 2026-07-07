// ============================================================================
// Aba Mensagens — painel administrativo
// ----------------------------------------------------------------------------
// • Lista os 4 modelos fixos de mensagem (não há criação de novos modelos).
// • O proprietário pode editar o texto dos modelos.
// • Permite enviar pelo WhatsApp para os agendamentos relacionados ao
//   modelo selecionado.
// • Sincronizado com o botão de WhatsApp do resumo de agendamento via
//   `messagesStore` (envios feitos lá aparecem aqui como "Enviado") e o
//   resumo usa sempre o texto atualizado salvo aqui.
//
// TODO(Supabase): modelos, envios e a lista de confirmação estão em memória —
// ver `messagesStore.ts` e `demoAgendamentos.ts` (DEMO_CONFIRMACOES).
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Pencil, RotateCcw } from "lucide-react";
import { COLORS, FONT, PageHeader } from "./ui";
import {
  applyVariables,
  exampleValues,
  messagesStore,
  useSentVersion,
  useTemplates,
  type MessageTemplate,
  type TemplateKind,
} from "./messagesStore";
import { useApp, type StatusAg, type AgendamentoAdmin, type ServicoAdmin, type FuncionarioAdmin } from "./AppContext";
import { effectiveStatus } from "@/lib/agendamentoStatus";
import { supabase } from "@/integrations/supabase/client";

/* Carrega dados reais de appointments/services/professionals no AppContext,
   além de templates (`message_templates`) e logs de envio (`message_logs`)
   diretamente do Supabase. Mesmo padrão de Agenda/Clientes/Dashboard —
   permite abrir Mensagens direto sem depender de outra aba, e reage a
   mudanças em tempo real. */

const KIND_DEFAULTS: Array<{ kind: Exclude<TemplateKind, "custom">; name: string; description: string; content: string }> = [
  { kind: "confirmacao",   name: "Confirmação de Agendamento", description: "Enviada quando um novo agendamento é realizado.", content: "" },
  { kind: "cancelamento",  name: "Cancelamento de Agendamento", description: "Enviada quando um agendamento é cancelado.",     content: "" },
  { kind: "naoCompareceu", name: "Não Compareceu",              description: "Enviada quando o cliente não comparece ao atendimento.", content: "" },
  { kind: "avaliacao",     name: "Pedido de Avaliação",         description: "Enviada após o atendimento para pedir um feedback.", content: "" },
];

// Fallback de conteúdo padrão (mesmos textos originais do messagesStore).
function defaultContentFor(kind: Exclude<TemplateKind, "custom">): string {
  const t = messagesStore.getTemplateByKind(kind);
  return t?.defaultContent ?? t?.content ?? "";
}

function useLoadRealData() {
  const { setAgendamentos, setServicos, setFuncionarios } = useApp();
  useEffect(() => {
    let cancelled = false;
    const channels: Array<ReturnType<typeof supabase.channel>> = [];

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

    async function ensureDefaultTemplates(cid: string) {
      const { data: existing } = await supabase
        .from("message_templates")
        .select("id,kind,name,description,content,is_default")
        .eq("company_id", cid);
      const have = new Set((existing ?? []).map((t) => t.kind));
      const missing = KIND_DEFAULTS.filter((d) => !have.has(d.kind));
      if (missing.length > 0) {
        const rows = missing.map((d) => ({
          company_id: cid,
          kind: d.kind,
          name: d.name,
          description: d.description,
          content: defaultContentFor(d.kind),
          is_default: true,
        }));
        await supabase.from("message_templates").insert(rows);
      }
    }

    async function loadTemplatesAndLogs(cid: string) {
      const [tplRes, logRes] = await Promise.all([
        supabase.from("message_templates")
          .select("id,kind,name,description,content,is_default")
          .eq("company_id", cid),
        supabase.from("message_logs")
          .select("appointment_id,template_id")
          .eq("company_id", cid),
      ]);
      if (cancelled) return;

      const tpls: MessageTemplate[] = (tplRes.data ?? []).map((t) => ({
        id: t.id,
        kind: (t.kind as TemplateKind) ?? "custom",
        name: t.name,
        description: t.description ?? "",
        content: t.content ?? "",
        isDefault: !!t.is_default,
        defaultContent: t.kind && t.kind !== "custom" ? defaultContentFor(t.kind as Exclude<TemplateKind, "custom">) : undefined,
      }));
      // Ordena fixando os 4 padrões primeiro na mesma ordem histórica.
      const order: Record<string, number> = { confirmacao: 0, cancelamento: 1, naoCompareceu: 2, avaliacao: 3, custom: 9 };
      tpls.sort((a, b) => (order[a.kind] ?? 9) - (order[b.kind] ?? 9));
      messagesStore.setTemplates(tpls);

      const pairs = (logRes.data ?? [])
        .filter((r) => r.appointment_id && r.template_id)
        .map((r) => ({ appointmentId: r.appointment_id as string, templateId: r.template_id as string }));
      messagesStore.setSentLog(pairs);
    }

    async function load() {
      const { data: member } = await supabase
        .from("company_members").select("company_id").limit(1).maybeSingle();
      const cid = member?.company_id;
      if (!cid || cancelled) return;

      await ensureDefaultTemplates(cid);
      await loadTemplatesAndLogs(cid);

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

      channels.push(
        supabase
          .channel(`admin-mensagens-appts-${cid}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `company_id=eq.${cid}` },
            () => { void load(); })
          .subscribe(),
        supabase
          .channel(`admin-mensagens-logs-${cid}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "message_logs", filter: `company_id=eq.${cid}` },
            () => { void loadTemplatesAndLogs(cid); })
          .subscribe(),
      );
    }
    void load();
    return () => { cancelled = true; for (const ch of channels) supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}


/* --------------------------------------------------------------------- */
/* Status de agendamento → kind do modelo                                */
/* --------------------------------------------------------------------- */
function statusToKind(s: StatusAg): TemplateKind | null {
  if (s === "confirmado" || s === "pendente") return "confirmacao";
  if (s === "cancelado") return "cancelamento";
  if (s === "naoCompareceu") return "naoCompareceu";
  if (s === "concluido") return "avaliacao";
  return null;
}

/* --------------------------------------------------------------------- */
/* Tipo unificado para itens da lista de envio                           */
/* --------------------------------------------------------------------- */
interface SendItem {
  id: string;
  nome: string;
  telefone: string;
  data: string;
  horario: string;
  servicoNome: string;
  funcionarioNome: string;
}

/* --------------------------------------------------------------------- */
/* Componente principal                                                  */
/* --------------------------------------------------------------------- */
type View = "list" | "send";

export function MensagensTela() {
  useLoadRealData();
  const templates = useTemplates();
  const [selectedId, setSelectedId] = useState<string>(templates[0]?.id ?? "");
  const [view, setView] = useState<View>("list");

  // Garante que sempre haja seleção válida.
  useEffect(() => {
    if (!templates.find((t) => t.id === selectedId)) {
      setSelectedId(templates[0]?.id ?? "");
    }
  }, [templates, selectedId]);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  const handleSendClick = () => {
    if (!selected) return;
    setView("send");
  };

  if (view === "send" && selected) {
    return <EnvioWhatsapp template={selected} onBack={() => setView("list")} />;
  }

  return (
    <div
      style={{
        background: COLORS.bgBase,
        fontFamily: FONT,
        // Apenas 8px de respiro final. O <main> do painel já compensa o footer fixo.
        padding: "28px 16px 8px",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <PageHeader
          title="Mensagens"
          subtitle="Edite as mensagens enviadas aos seus clientes em cada situação."
          compact
        />

        <div
          className="msg-layout"
          style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* ------ Coluna esquerda: modelos ------ */}
          <aside
            style={{
              background: COLORS.bgSurface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 16,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxShadow: "0 1px 2px rgba(15,15,15,0.04)",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: COLORS.textPrimary,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              Modelos de mensagem
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  selected={t.id === selectedId}
                  onSelect={() => setSelectedId(t.id)}
                />
              ))}
            </div>
          </aside>

          {/* ------ Coluna direita: editor ------ */}
          <main style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
            {selected ? (
              <Editor template={selected} onSend={handleSendClick} />
            ) : (
              <EmptyState />
            )}
          </main>
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .msg-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Card de modelo na sidebar                                             */
/* --------------------------------------------------------------------- */
function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: MessageTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={selected ? undefined : "bisme-light-border"}
      style={{
        textAlign: "left",
        background: selected ? COLORS.bgElevated : COLORS.bgSurface,
        border: `1.5px solid ${selected ? COLORS.accentLight : COLORS.border}`,
        borderRadius: 12,
        padding: "12px 14px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontFamily: FONT,
        transition: "border-color .15s, background .15s",
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>
        {template.name}
      </span>
      <span style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.4 }}>
        {template.description}
      </span>
    </button>
  );
}

/* --------------------------------------------------------------------- */
/* Editor de modelo                                                      */
/* --------------------------------------------------------------------- */
function Editor({ template, onSend }: { template: MessageTemplate; onSend: () => void }) {
  const [content, setContent] = useState(template.content);
  const [justSaved, setJustSaved] = useState(false);

  // Reset campo quando troca de modelo (e esconde o botão Salvar).
  useEffect(() => {
    setContent(template.content);
    setJustSaved(false);
  }, [template.id, template.content]);

  const isDirty = content !== template.content;

  const handleSave = () => {
    messagesStore.updateTemplate(template.id, { content });
    // Persiste em message_templates. Falha silenciosa mantém o UX atual;
    // realtime na aba corrige em caso de conflito.
    void supabase.from("message_templates").update({ content }).eq("id", template.id);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1800);
  };


  const handleReset = () => {
    if (!template.defaultContent) return;
    setContent(template.defaultContent);
  };

  const previewText = useMemo(() => applyVariables(content, exampleValues()), [content]);

  return (
    <section
      style={{
        background: COLORS.bgSurface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 16,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        boxShadow: "0 1px 2px rgba(15,15,15,0.04)",
      }}
    >
      {/* Cabeçalho do editor */}
      <div style={{ minWidth: 0 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: COLORS.textPrimary }}>
          {template.name}
        </h2>
        <span style={{ fontSize: 13, color: COLORS.textMuted }}>{template.description}</span>
      </div>

      {/* Campo mensagem + Salvar (aparece só quando há alteração) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Field label="Mensagem">
          <textarea
            className="bisme-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={7}
            style={{ minHeight: 180 }}
          />
        </Field>

        {(isDirty || justSaved) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {isDirty && <span style={{ fontSize: 13, color: COLORS.textMuted }}>Alterações não salvas</span>}
              {justSaved && !isDirty && (
                <span style={{ fontSize: 13, color: COLORS.success, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Check size={14} /> Salvo
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {template.defaultContent && content !== template.defaultContent && (
                <button type="button" onClick={handleReset} style={ghostBtn} title="Restaurar mensagem padrão">
                  <RotateCcw size={14} /> Restaurar padrão
                </button>
              )}
              {isDirty && (
                <button type="button" onClick={handleSave} style={secondaryBtn}>
                  Salvar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pré-visualização (WhatsApp) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Pré-visualização
        </span>
        <WhatsappBubble text={previewText} />
      </div>

      {/* Botão Enviar pelo WhatsApp */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={onSend} style={whatsBtn}>
          <WhatsAppIcon size={16} /> Enviar pelo WhatsApp
        </button>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------- */
/* Tela: Enviar pelo WhatsApp                                            */
/* --------------------------------------------------------------------- */
function EnvioWhatsapp({ template, onBack }: { template: MessageTemplate; onBack: () => void }) {
  const { agendamentos, servicos, funcionarios } = useApp();
  useSentVersion(); // re-render quando um envio é registrado

  // Janelas de tempo aplicadas por tipo de modelo.
  // - confirmação / cancelamento: próximos 7 dias (inclui hoje)
  // - naoCompareceu: sem expiração
  // - avaliação: concluídos nas últimas 24h (data + horario)
  const now = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  }, [now]);
  const in7Iso = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + 6); // hoje + 6 = janela de 7 dias incluindo hoje
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }, [now]);

  function withinNext7(dataIso: string) {
    return dataIso >= todayIso && dataIso <= in7Iso;
  }
  function within24h(dataIso: string, horario: string) {
    const [y, m, d] = dataIso.split("-").map(Number);
    const [hh, mm] = horario.split(":").map(Number);
    if (!y || !m || !d) return false;
    const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
    const diffMs = now.getTime() - dt.getTime();
    return diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000;
  }

  // Converte agendamentos reais (do AppContext) em SendItem, já filtrados.
  const realItems: SendItem[] = useMemo(() => {
    const targetKind = template.kind;
    const filtered = agendamentos.filter((a) => {
      // Usa o status EFETIVO (respeita prioridade: cancelado > naoCompareceu >
      // concluido automático > agendado). Assim, um agendamento ainda marcado
      // como "confirmado" cujo horário já passou entra naturalmente em
      // "Pedido de Avaliação"; e se o proprietário marcar manualmente como
      // "Não compareceu", ele sai de "avaliação" e entra em "Não Compareceu".
      const eff = effectiveStatus(a);
      if (targetKind === "confirmacao") {
        if (eff !== "agendado") return false;
        return withinNext7(a.data);
      }
      if (targetKind === "cancelamento") {
        if (eff !== "cancelado") return false;
        return withinNext7(a.data);
      }
      if (targetKind === "naoCompareceu") return eff === "naoCompareceu";
      if (targetKind === "avaliacao") {
        if (eff !== "concluido") return false;
        return within24h(a.data, a.horario);
      }
      return false;
    });
    return [...filtered]
      .sort((a, b) => (a.data === b.data ? a.horario.localeCompare(b.horario) : a.data.localeCompare(b.data)))
      .map<SendItem>((a) => {
        const svc = servicos.find((s) => s.id === a.servicoId);
        const func = a.funcionarioId ? funcionarios.find((f) => f.id === a.funcionarioId) : null;
        return {
          id: a.id,
          nome: a.nome,
          telefone: a.telefone || "",
          data: a.data,
          horario: a.horario,
          servicoNome: svc?.nome ?? "",
          funcionarioNome: func?.nome ?? "",
        };
      });
  }, [agendamentos, servicos, funcionarios, template.kind, todayIso, in7Iso, now]);

  const items: SendItem[] = realItems;


  const pendentes = items.filter((a) => !messagesStore.isSent(a.id, template.id)).length;
  const enviados = items.length - pendentes;

  const handleSend = (a: SendItem) => {
    const tel = (a.telefone || "").replace(/\D/g, "");
    if (!tel) {
      alert("Cliente sem telefone cadastrado.");
      return;
    }
    const numero = tel.length <= 11 ? "55" + tel : tel;
    const [y, m, d] = a.data.split("-");
    const text = applyVariables(template.content, {
      "{nome_cliente}": a.nome || "",
      "{horario_agendado}": a.horario || "",
      "{data_atendimento}": y && m && d ? `${d}/${m}/${y}` : "",
      "{nome_servico}": a.servicoNome,
      "{nome_profissional}": a.funcionarioNome,
      "{nome_empresa}": "",
    });
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    // Marca localmente para feedback imediato; realtime confirma via message_logs.
    messagesStore.markSent(a.id, template.id);
    // Persiste envio manual em message_logs (idempotente por company+appointment+template).
    void (async () => {
      const { data: member } = await supabase
        .from("company_members").select("company_id").limit(1).maybeSingle();
      const cid = member?.company_id;
      if (!cid) return;
      const { data: existing } = await supabase
        .from("message_logs")
        .select("id")
        .eq("company_id", cid)
        .eq("appointment_id", a.id)
        .eq("template_id", template.id)
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        await supabase.from("message_logs").update({ sent_at: new Date().toISOString(), sent_to: numero }).eq("id", existing.id);
      } else {
        await supabase.from("message_logs").insert({
          company_id: cid,
          appointment_id: a.id,
          template_id: template.id,
          sent_to: numero,
        });
      }
    })();
  };


  return (
    <div
      style={{
        background: COLORS.bgBase,
        fontFamily: FONT,
        // Apenas 8px de respiro final. O <main> do painel já compensa o footer fixo.
        padding: "24px 16px 8px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header */}
        <section
          style={{
            background: COLORS.bgSurface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 1px 2px rgba(15,15,15,0.04)",
          }}
        >
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: COLORS.bgElevated, border: `1px solid ${COLORS.border}`,
              color: COLORS.textPrimary, cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: COLORS.textPrimary }}>
              Enviar pelo WhatsApp
            </h2>
            <span style={{ fontSize: 13, color: COLORS.textMuted }}>
              Confira os clientes e envie a mensagem usando o modelo selecionado.
            </span>
          </div>
        </section>

        {/* Resumo */}
        <section
          style={{
            background: COLORS.bgSurface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            padding: "16px 18px",
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            gap: 14,
            alignItems: "center",
            boxShadow: "0 1px 2px rgba(15,15,15,0.04)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>
              Modelo selecionado
            </span>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary }}>{template.name}</div>
          </div>
          <Stat label="Pendentes" value={pendentes} color={pendentes > 0 ? COLORS.accent : COLORS.textMuted} />
          <Stat label="Enviadas" value={enviados} color={COLORS.success} />
        </section>

        {/* Lista */}
        {items.length === 0 ? (
          <div
            style={{
              background: COLORS.bgSurface,
              border: `1px dashed ${COLORS.border}`,
              borderRadius: 14,
              padding: 32,
              textAlign: "center",
              color: COLORS.textMuted,
              fontSize: 14,
            }}
          >
            Nenhum agendamento corresponde a este modelo no momento.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((a) => {
              const sent = messagesStore.isSent(a.id, template.id);
              return (
                <article
                  key={a.id}
                  style={{
                    background: COLORS.bgSurface,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 14,
                    padding: 14,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    boxShadow: "0 1px 2px rgba(15,15,15,0.03)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    <span
                      style={{
                        fontSize: 14, fontWeight: 700, color: COLORS.textPrimary,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}
                    >
                      {a.nome}
                    </span>
                    <span style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.45 }}>
                      {formatDataHora(a.data, a.horario)}
                    </span>
                    {a.servicoNome && (
                      <span style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.45 }}>
                        {a.servicoNome}
                      </span>
                    )}
                    {a.funcionarioNome && (
                      <span style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.45 }}>
                        Profissional: {a.funcionarioNome}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSend(a)}
                    disabled={sent}
                    style={{
                      background: sent ? COLORS.bgElevated : "#25D366",
                      color: sent ? COLORS.textMuted : "#FFFFFF",
                      border: sent ? `1px solid ${COLORS.border}` : "none",
                      borderRadius: 10, padding: "9px 14px",
                      fontSize: 13, fontWeight: 700,
                      cursor: sent ? "default" : "pointer",
                      fontFamily: FONT,
                      display: "inline-flex", alignItems: "center", gap: 6,
                      flexShrink: 0,
                    }}
                  >
                    {sent ? (<><Check size={14} /> Enviado</>) : "Enviar"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Helpers de UI                                                         */
/* --------------------------------------------------------------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: FONT, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <section
      style={{
        background: COLORS.bgSurface,
        border: `1px dashed ${COLORS.border}`,
        borderRadius: 16,
        padding: 40,
        textAlign: "center",
        color: COLORS.textMuted,
        fontSize: 14,
      }}
    >
      <Pencil size={20} style={{ marginBottom: 8, opacity: 0.6 }} />
      <div>Selecione um modelo para editá-lo.</div>
    </section>
  );
}

function WhatsappBubble({ text }: { text: string }) {
  return (
    <div
      style={{
        background: "#EDE5DD",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
        borderRadius: 14,
        padding: 16,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div
        style={{
          background: "#D9FDD3",
          borderRadius: 12,
          padding: "10px 12px 8px",
          maxWidth: "82%",
          marginLeft: "auto",
          boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
          fontSize: 14,
          color: "#111B21",
          lineHeight: 1.5,
          fontFamily: FONT,
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        }}
      >
        {text}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 4,
            marginTop: 4,
            fontSize: 10.5,
            color: "#667781",
          }}
        >
          <span>Hoje às 14:30</span>
          <DoubleCheck />
        </div>
      </div>
    </div>
  );
}

const secondaryBtn: React.CSSProperties = {
  background: COLORS.bgSurface,
  color: COLORS.textPrimary,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: FONT,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: COLORS.textPrimary,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: FONT,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const whatsBtn: React.CSSProperties = {
  background: "#25D366",
  color: "#FFFFFF",
  border: "none",
  borderRadius: 10,
  padding: "11px 18px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: FONT,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  boxShadow: "0 1px 2px rgba(37,211,102,0.25)",
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Formato: "20 de junho às 09:00" — exibido nos cards de envio. */
function formatDataHora(dataIso: string, horario: string): string {
  const [y, m, d] = dataIso.split("-").map(Number);
  if (!y || !m || !d) return horario;
  const mes = MESES_PT[(m - 1) % 12];
  return `${d} de ${mes} às ${horario}`;
}

function DoubleCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M1 9.5L4.5 13L11 5.5" stroke="#53BDEB" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 9.5L9.5 13L17 5" stroke="#53BDEB" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.555-5.338 11.891-11.893 11.891a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.173.198-.297.297-.495.099-.198.05-.372-.025-.521-.074-.149-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
    </svg>
  );
}
