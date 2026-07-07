import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import type { AgendamentoAdmin, FuncionarioAdmin } from "./AppContext";
import { COLORS, FONT } from "./ui";

export type ActivityItem = {
  id: string;
  kind: "created" | "canceled";
  /** ISO timestamp da AÇÃO (created_at / updated_at) — usado para ordenar e agrupar. */
  at: string;
  ag: AgendamentoAdmin;
};

interface Props {
  activities: ActivityItem[];
  readSet: Set<string>;
  servicos: { id: string; nome: string }[];
  funcionarios: FuncionarioAdmin[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onOpen: (it: ActivityItem) => void;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseAt(s: string): Date {
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  return new Date();
}

export function AtividadeScreen({
  activities, readSet, servicos, funcionarios, onClose, onMarkAllRead, onOpen,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (document.body.style.overflow === "hidden") document.body.style.overflow = "";
      if (document.documentElement.style.overflow === "hidden") document.documentElement.style.overflow = "";
    };
  }, []);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const weekStart = startOfWeek(hoje);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
  const limite = new Date(hoje); limite.setDate(hoje.getDate() - 31); limite.setHours(0, 0, 0, 0);

  // activities já vem ordenado por `at` desc.
  const semana: ActivityItem[] = [];
  const antes: ActivityItem[] = [];
  for (const it of activities) {
    const d = parseAt(it.at);
    if (d >= weekStart && d < weekEnd) semana.push(it);
    else if (d < weekStart && d >= limite) antes.push(it);
  }

  const hasUnread = activities.some((x) => !readSet.has(x.id));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Atividade"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: COLORS.bgSurface, color: COLORS.textPrimary, fontFamily: FONT,
        display: "flex", flexDirection: "column",
        animation: "bisme-atividade-in 220ms ease",
      }}
    >
      <style>{`
        @keyframes bisme-atividade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .adm-atividade-item:hover { background: var(--adm-bg-elevated); }
      `}</style>

      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}>
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          padding: "12px 14px", borderBottom: `1px solid var(--adm-divider)`,
          background: COLORS.bgSurface, paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
        }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <button
              type="button" onClick={onClose} aria-label="Voltar"
              style={{ width: 40, height: 40, borderRadius: 999, background: "transparent", border: "none", color: COLORS.textPrimary, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0 }}
            >
              <ArrowLeft size={22} />
            </button>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: COLORS.textPrimary }}>Atividade</h1>
          </div>
          <button
            type="button" onClick={onMarkAllRead} disabled={!hasUnread}
            style={{ background: "transparent", border: "none", color: hasUnread ? COLORS.accentLight : COLORS.textMuted, fontWeight: 700, fontSize: 13, cursor: hasUnread ? "pointer" : "default", padding: "8px 6px", fontFamily: FONT }}
          >
            Marcar todas como lida
          </button>
        </header>

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 14px 24px" }}>
          <Section title="Esta semana" items={semana} readSet={readSet} servicos={servicos} funcionarios={funcionarios} onOpen={onOpen} emptyText="Nenhuma atividade esta semana." />
          <Section title="Antes"        items={antes}  readSet={readSet} servicos={servicos} funcionarios={funcionarios} onOpen={onOpen} emptyText="Nenhuma atividade nos últimos 31 dias." />
        </div>
      </div>
    </div>
  );
}

function fmtAtDate(at: string): string {
  const d = parseAt(at);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} · ${hh}:${mi}`;
}

function Section({
  title, items, readSet, servicos, funcionarios, onOpen, emptyText,
}: {
  title: string;
  items: ActivityItem[];
  readSet: Set<string>;
  servicos: { id: string; nome: string }[];
  funcionarios: FuncionarioAdmin[];
  onOpen: (it: ActivityItem) => void;
  emptyText: string;
}) {
  return (
    <section style={{ marginTop: 18 }}>
      <h2 style={{ margin: "0 4px 10px", fontSize: 13, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: COLORS.textMuted }}>
        {title}
      </h2>
      <div
        className="bisme-light-border"
        style={{ background: COLORS.bgSurface, border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden" }}
      >
        {items.length === 0 ? (
          <div style={{ padding: "20px 16px", textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>{emptyText}</div>
        ) : (
          items.map((it, idx) => {
            const a = it.ag;
            const isUnread = !readSet.has(it.id);
            const func = a.funcionarioId ? funcionarios.find((f) => f.id === a.funcionarioId) : null;
            const svc = servicos.find((s) => s.id === a.servicoId);
            const text = it.kind === "canceled"
              ? `Agendamento de ${a.nome} foi cancelado.`
              : (func
                  ? `${a.nome} agendou às ${a.horario} no seu estabelecimento com o profissional ${func.nome}.`
                  : `${a.nome} agendou às ${a.horario} no seu estabelecimento.`);
            return (
              <button
                key={it.id}
                type="button"
                className="adm-atividade-item"
                onClick={() => onOpen(it)}
                style={{
                  width: "100%", textAlign: "left",
                  background: isUnread ? "rgba(86, 144, 245,0.06)" : "transparent",
                  border: "none",
                  borderTop: idx === 0 ? "none" : `1px solid ${COLORS.border}`,
                  padding: "14px 16px", cursor: "pointer", fontFamily: FONT,
                  display: "flex", gap: 12, alignItems: "flex-start", color: COLORS.textPrimary,
                }}
              >
                <span aria-hidden style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: isUnread ? (it.kind === "canceled" ? "#EF4444" : COLORS.accentLight) : "transparent",
                  marginTop: 7, flexShrink: 0,
                }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, lineHeight: 1.45, color: isUnread ? COLORS.textPrimary : COLORS.textMuted, fontWeight: isUnread ? 600 : 500 }}>
                    {text}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4, fontWeight: 500 }}>
                    {fmtAtDate(it.at)}{svc ? ` · ${svc.nome}` : ""}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
