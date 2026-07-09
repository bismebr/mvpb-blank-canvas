import { useEffect, useState } from "react";
import { ArrowLeft, User as UserIcon } from "lucide-react";
import type { AgendamentoAdmin, FuncionarioAdmin } from "./AppContext";
import { COLORS, FONT } from "./ui";

export type ActivityItem = {
  id: string;
  kind: "created" | "canceled";
  /** ISO timestamp da AÇÃO (created_at do agendamento / do cancelamento). */
  at: string;
  ag: AgendamentoAdmin;
  /** Quem cancelou (quando kind === "canceled"). */
  canceledBy?: "client" | "company" | "system";
};

interface Props {
  activities: ActivityItem[];
  readSet: Set<string>;
  servicos: { id: string; nome: string }[];
  funcionarios: FuncionarioAdmin[];
  /** Mapa temporário customer_user_id -> Signed URL da foto real do cliente. */
  avatarMap?: Record<string, string>;
  onClose: () => void;
  onMarkAllRead: () => void;
  onOpen: (it: ActivityItem) => void;
}

function parseAt(s: string): Date {
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  return new Date();
}

/** Data formatada como dd/mm/aaaa a partir de "YYYY-MM-DD". */
function fmtDataBR(data: string): string {
  const [y, m, d] = data.split("-");
  if (!y || !m || !d) return data;
  return `${d}/${m}/${y}`;
}

/**
 * Tempo relativo estilo rede social. Recalculado a cada render (ao reabrir a
 * aba). Retorna "Agora", "há 1 minuto", "há X minutos", "há X horas",
 * "há X dias", "há X semanas", "há X meses", "há X anos".
 */
function tempoRelativo(iso: string, now: Date = new Date()): string {
  const then = parseAt(iso);
  const diff = Math.max(0, now.getTime() - then.getTime());
  const seg = Math.floor(diff / 1000);
  if (seg < 60) return "Agora";
  const min = Math.floor(seg / 60);
  if (min < 60) return min === 1 ? "há 1 minuto" : `há ${min} minutos`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return horas === 1 ? "há 1 hora" : `há ${horas} horas`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
  const semanas = Math.floor(dias / 7);
  if (dias < 30) return semanas === 1 ? "há 1 semana" : `há ${semanas} semanas`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
  const anos = Math.floor(dias / 365);
  return anos <= 1 ? "há 1 ano" : `há ${anos} anos`;
}

/** Monta o texto da atividade conforme o tipo/ator, no padrão de feed. */
function buildText(
  it: ActivityItem,
  servicos: { id: string; nome: string }[],
  funcionarios: FuncionarioAdmin[],
): string {
  const a = it.ag;
  const svcNome = servicos.find((s) => s.id === a.servicoId)?.nome ?? "serviço";
  const hora = a.horario;
  const dia = fmtDataBR(a.data);

  // Profissional só entra na mensagem quando há múltiplos profissionais
  // visíveis/selecionáveis e o agendamento tem um profissional escolhido.
  const podeMostrarProf = funcionarios.length >= 2;
  const func = a.funcionarioId ? funcionarios.find((f) => f.id === a.funcionarioId) : null;
  const comProf = podeMostrarProf && func ? ` com profissional ${func.nome}` : "";

  if (it.kind === "created") {
    return `${a.nome} reservou o serviço ${svcNome} às ${hora} no dia ${dia}${comProf}.`;
  }
  // canceled
  if (it.canceledBy === "client") {
    return `${a.nome} cancelou a reserva do serviço ${svcNome} às ${hora} no dia ${dia}${comProf}.`;
  }
  // company/system/desconhecido -> forma passiva (cancelado pelo estabelecimento).
  return `A reserva de ${a.nome} do serviço ${svcNome} de ${hora} no dia ${dia}${comProf} foi cancelada.`;
}

export function AtividadeScreen({
  activities, readSet, servicos, funcionarios, avatarMap, onClose, onMarkAllRead, onOpen,
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

  const now = new Date();
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
        .adm-feed-item:hover { background: color-mix(in srgb, var(--adm-bg-elevated) 45%, transparent); }
      `}</style>


      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}>
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          padding: "12px 14px", borderBottom: `1px solid var(--adm-divider)`,
          background: COLORS.bgSurface, paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
          position: "sticky", top: 0, zIndex: 2,
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

        <div style={{ maxWidth: 640, margin: "0 auto", padding: "4px 4px 24px", display: "flex", flexDirection: "column" }}>
          {activities.length === 0 ? (
            <div style={{ padding: "48px 16px", textAlign: "center", color: COLORS.textMuted, fontSize: 14 }}>
              Nenhuma atividade ainda.
            </div>
          ) : (
            activities.map((it, idx) => (
              <FeedItem
                key={it.id}
                it={it}
                unread={!readSet.has(it.id)}
                text={buildText(it, servicos, funcionarios)}
                tempo={tempoRelativo(it.at, now)}
                avatarUrl={it.ag.customerUserId ? avatarMap?.[it.ag.customerUserId] : undefined}
                showDivider={idx < activities.length - 1}
                onOpen={onOpen}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FeedItem({
  it, unread, text, tempo, avatarUrl, showDivider, onOpen,
}: {
  it: ActivityItem;
  unread: boolean;
  text: string;
  tempo: string;
  avatarUrl?: string;
  showDivider: boolean;
  onOpen: (it: ActivityItem) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const badgeColor = it.kind === "canceled" ? COLORS.danger : COLORS.success;
  const showPhoto = !!avatarUrl && !imgFailed;
  return (
    <button
      type="button"
      className="adm-feed-item"
      onClick={() => onOpen(it)}
      style={{
        // Item solto de feed: sem card, sem sombra, sem borda arredondada,
        // fundo herdado da tela. Apenas uma divisória sutil entre itens.
        width: "100%", textAlign: "left",
        background: "transparent",
        border: "none",
        borderBottom: showDivider ? `1px solid var(--adm-divider)` : "none",
        borderRadius: 0,
        padding: "12px 8px", cursor: "pointer", fontFamily: FONT,
        display: "flex", gap: 12, alignItems: "flex-start", color: COLORS.textPrimary,
      }}
    >
      {/* Avatar circular (foto real ou padrão) + badge de status */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div
          aria-hidden
          style={{
            width: 44, height: 44, borderRadius: "50%",
            background: COLORS.bgElevated,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: COLORS.textMuted, overflow: "hidden",
          }}
        >
          {showPhoto ? (
            <img
              src={avatarUrl}
              alt=""
              onError={() => setImgFailed(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <UserIcon size={24} />
          )}
        </div>
        <span
          aria-hidden
          style={{
            position: "absolute", top: -1, right: -1,
            width: 14, height: 14, borderRadius: "50%",
            background: badgeColor,
            border: `2px solid ${COLORS.bgSurface}`,
          }}
        />
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, lineHeight: 1.45, color: unread ? COLORS.textPrimary : COLORS.textMuted, fontWeight: unread ? 600 : 500 }}>
          {text}
        </div>
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 5, fontWeight: 500 }}>
          {tempo}
        </div>
      </div>
    </button>
  );
}

