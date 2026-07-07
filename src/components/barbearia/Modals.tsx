import { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import { IconX } from "./icons";
import { saveAgendamento, setUser, type Servico } from "./data";

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: 16,
          width: "100%",
          maxWidth: 420,
          padding: 20,
          position: "relative",
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#888888",
          }}
        >
          <IconX width={20} height={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1.5px solid #DDDDDD",
  background: "#F5F5F3",
  fontSize: 16,
  color: "#1A1A1A",
  marginBottom: 12,
  outline: "none",
  fontFamily: "inherit",
};

const btnPrimary: CSSProperties = {
  width: "100%",
  background: "var(--site-primary, #5690f5)",
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: 15,
  height: 48,
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(var(--site-primary-rgb, 191, 6, 3),0.3)",
};

export function LoginModal({
  open,
  onClose,
  onLogin,
}: {
  open: boolean;
  onClose: () => void;
  onLogin: (u: { nome: string; telefone: string }) => void;
}) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");

  return (
    <Modal open={open} onClose={onClose}>
      <h3 style={{ fontWeight: 700, fontSize: 20, color: "#1A1A1A", marginTop: 0, marginBottom: 16 }}>
        Entrar
      </h3>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#888888" }}>Nome</label>
      <input style={inputStyle} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
      <label style={{ fontSize: 13, fontWeight: 600, color: "#888888" }}>Telefone</label>
      <input style={inputStyle} value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
      <button
        style={btnPrimary}
        onClick={() => {
          if (nome.trim() && telefone.trim()) {
            const u = { nome: nome.trim(), telefone: telefone.trim() };
            setUser(u);
            onLogin(u);
          }
        }}
      >
        Entrar
      </button>
    </Modal>
  );
}

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function stripBR(v: string) {
  let d = onlyDigits(v);
  // Só remove o prefixo "55" se o número tiver mais de 11 dígitos
  // (ou seja, veio com código do país). Caso contrário, "55" pode ser DDD.
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  return d.slice(0, 11);
}

function formatBRPhone(digits: string) {
  const d = digits.slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function isValidPhone(v: string) {
  return stripBR(v).length === 11;
}

export function ConfirmacaoModal({
  open,
  onClose,
  servico,
  data,
  horario,
  user,
  onAbrirLogin,
  onConfirmado,
}: {
  open: boolean;
  onClose: () => void;
  servico: Servico | null;
  data: string | null;
  horario: string | null;
  user: { nome: string; telefone: string } | null;
  onAbrirLogin: () => void;
  onConfirmado: () => void;
}) {
  const [observacao, setObservacao] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [touched, setTouched] = useState(false);

  // Pré-preenche o WhatsApp quando o usuário muda / modal abre
  useEffect(() => {
    if (!open) return;
    const t = user?.telefone ?? "";
    setWhatsapp(formatBRPhone(stripBR(t)));
    setTouched(false);
  }, [open, user]);

  // Bloqueia rolagem do body enquanto fullscreen aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  if (!servico || !data || !horario) return null;

  const [y, m, d] = data.split("-");
  const dataFmt = `${d}/${m}/${y}`;

  const whatsappValido = isValidPhone(whatsapp);
  const podeConfirmar = !!user && whatsappValido;

  const handleConfirmar = () => {
    if (!user) {
      onAbrirLogin();
      return;
    }
    setTouched(true);
    if (!whatsappValido) return;
    saveAgendamento({
      id: String(Date.now()),
      servicoId: servico.id,
      data,
      horario,
      nome: user.nome,
      telefone: `+55 ${whatsapp}`,
    });
    onConfirmado();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#FFFFFF",
        zIndex: 1000,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Header (rola com o conteúdo) */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid #EEEEEE",
          background: "#FFFFFF",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Voltar"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#1A1A1A",
            padding: 4,
            display: "inline-flex",
          }}
        >
          <IconX width={22} height={22} />
        </button>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
          Confirmar agendamento
        </h2>
        <span style={{ width: 22 }} />
      </header>

      {/* Conteúdo */}
      <main
        style={{
          padding: "20px 16px 24px",
        }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          {/* 1. Resumo */}
          <section style={{ marginBottom: 20 }}>
            <SectionTitle>Resumo do agendamento</SectionTitle>
            <div style={{ borderTop: "1px solid #EEEEEE" }}>
              <SummaryRow label="Serviço" value={servico.nome} />
              <SummaryRow label="Preço" value={`R$ ${servico.preco.toFixed(2).replace(".", ",")}`} />
              <SummaryRow label="Data" value={dataFmt} />
              <SummaryRow label="Horário" value={horario} />
            </div>
          </section>

          {/* 2. Cliente */}
          <section style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 20 }}>
              <label style={fieldLabel}>Nome</label>
              <input
                style={{ ...inputStyle, marginBottom: 0, opacity: 0.85 }}
                value={user?.nome ?? ""}
                readOnly
              />
            </div>
            <div>
              <label style={fieldLabel}>WhatsApp</label>
              <div
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  borderRadius: 10,
                  border: `1.5px solid ${touched && !whatsappValido ? "#5690f5" : "#DDDDDD"}`,
                  background: "#F5F5F3",
                  overflow: "hidden",
                }}
              >
                <div
                  aria-hidden
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 12px",
                    fontSize: 16,
                    color: "#1A1A1A",
                    fontWeight: 600,
                    borderRight: "1px solid #DDDDDD",
                    userSelect: "none",
                    background: "#F5F5F3",
                  }}
                >
                  +55
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="(00) 00000-0000"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatBRPhone(stripBR(e.target.value)))}
                  onKeyDown={(e) => {
                    const allow = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"];
                    if (allow.includes(e.key) || e.metaKey || e.ctrlKey) return;
                    if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData("text");
                    setWhatsapp(formatBRPhone(stripBR(text)));
                  }}
                  onBlur={() => setTouched(true)}
                  maxLength={15}
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    border: "none",
                    background: "transparent",
                    fontSize: 16,
                    color: "#1A1A1A",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              {touched && !whatsappValido && (
                <p style={{ fontSize: 12, color: "#5690f5", margin: "4px 0 0" }}>
                  Informe um WhatsApp válido com DDD.
                </p>
              )}
            </div>
          </section>

          {/* 3. Observação */}
          <section style={{ marginBottom: 20 }}>
            <label style={fieldLabel}>Observação</label>
            <textarea
              className="bisme-textarea"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Adicione algum detalhe (opcional)"
              rows={3}
            />

          </section>

          {/* CTA (rola com o conteúdo) */}
          <div style={{ paddingTop: 8 }}>
            <button
              style={{
                ...btnPrimary,
                opacity: user && !podeConfirmar ? 0.6 : 1,
                cursor: user && !podeConfirmar ? "not-allowed" : "pointer",
              }}
              onClick={handleConfirmar}
            >
              {user ? "Confirmar agendamento" : "Entrar para confirmar"}
            </button>
          </div>
        </div>
      </main>
    </div>

  );
}

const fieldLabel: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#000000",
  marginBottom: 6,
};

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h4
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: "#000000",
        margin: "0 0 10px",
      }}
    >
      {children}
    </h4>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const style: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid #EEEEEE",
    fontSize: 14,
    gap: 12,
  };
  return (
    <div style={style}>
      <span style={{ color: "#888888", fontWeight: 600 }}>{label}</span>
      <span style={{ color: "#1A1A1A", fontWeight: 600, textAlign: "right", maxWidth: "65%" }}>{value}</span>
    </div>
  );
}

export interface SucessoInfo {
  servico: string;
  data: string; // YYYY-MM-DD
  horario: string;
  profissional?: string;
}

const ESTABELECIMENTO_NOME = "Barbearia Sr. Eli";

function CenteredCard({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      onClick={onClose}
      className="animate-fade-in"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-scale-in"
        style={{
          background: "#FFFFFF",
          borderRadius: 20,
          width: "100%",
          maxWidth: 400,
          padding: 28,
          position: "relative",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#9A9A9A",
            padding: 4,
            display: "inline-flex",
          }}
        >
          <IconX width={20} height={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

function fmtData(data: string) {
  const [y, m, d] = data.split("-");
  return `${d}/${m}/${y}`;
}

const linkBtn: CSSProperties = {
  width: "100%",
  background: "transparent",
  color: "#888888",
  fontWeight: 600,
  fontSize: 14,
  height: 40,
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  marginTop: 8,
};

function ResumoCard({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div
      style={{
        background: "#f2f1f6",
        borderRadius: 14,
        padding: "14px 16px",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        marginBottom: 16,
      }}
    >
      {rows.map((r) => (
        <div
          key={r.label}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}
        >
          <span style={{ fontSize: 13, color: "#888888", fontWeight: 600, flexShrink: 0 }}>{r.label}</span>
          <span
            style={{
              fontSize: 13,
              color: "#1A1A1A",
              fontWeight: 600,
              textAlign: "right",
              wordBreak: "break-word",
              maxWidth: "62%",
            }}
          >
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SucessoModal({
  open,
  onClose,
  info,
  onVerAgendamentos,
}: {
  open: boolean;
  onClose: () => void;
  info?: SucessoInfo | null;
  onVerAgendamentos: () => void;
}) {
  const [loadingNav, setLoadingNav] = useState(false);

  useEffect(() => {
    if (!open) {
      setLoadingNav(false);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const rows = info
    ? [
        { label: "Serviço", value: info.servico },
        { label: "Data", value: fmtData(info.data) },
        { label: "Horário", value: info.horario },
        ...(info.profissional ? [{ label: "Profissional", value: info.profissional }] : []),
      ]
    : [];

  const handleVer = () => {
    if (loadingNav) return;
    setLoadingNav(true);
    onVerAgendamentos();
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        position: "fixed",
        inset: 0,
        background: "#FFFFFF",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        overflowY: "auto",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div
          style={{
            position: "relative",
            width: 72,
            height: 72,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "#16A34A",
              opacity: 0.25,
              animation: "sreli-ring 900ms ease-out forwards",
            }}
          />
          <div
            style={{
              position: "relative",
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#DCFCE7",
              color: "#16A34A",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "sreli-pop 500ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path
                d="M20 6L9 17l-5-5"
                style={{
                  strokeDasharray: 30,
                  strokeDashoffset: 30,
                  animation: "sreli-check 450ms ease-out 350ms forwards",
                }}
              />
            </svg>
          </div>
        </div>
        <h3 style={{ fontWeight: 700, fontSize: 22, color: "#1A1A1A", margin: "0 0 8px" }}>
          Agendamento confirmado!
        </h3>
        <p style={{ fontSize: 14, color: "#888888", margin: "0 0 24px" }}>
          Seu horário foi reservado com sucesso.
        </p>
        {rows.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <ResumoCard rows={rows} />
          </div>
        )}
        <button
          style={{
            ...btnPrimary,
            boxShadow: "none",
            opacity: loadingNav ? 0.7 : 1,
            cursor: loadingNav ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
          onClick={handleVer}
          disabled={loadingNav}
        >
          {loadingNav && (
            <span
              style={{
                width: 16,
                height: 16,
                border: "2px solid rgba(255,255,255,0.5)",
                borderTopColor: "#FFFFFF",
                borderRadius: "50%",
                animation: "sreli-spin 0.8s linear infinite",
                display: "inline-block",
              }}
            />
          )}
          {loadingNav ? "Carregando..." : "Ir para meus agendamentos"}
        </button>
        <button style={linkBtn} onClick={onClose} disabled={loadingNav}>
          Voltar para o início
        </button>
      </div>
      <style>{`
        @keyframes sreli-spin { to { transform: rotate(360deg); } }
        @keyframes sreli-pop {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes sreli-check {
          to { stroke-dashoffset: 0; }
        }
        @keyframes sreli-ring {
          0% { transform: scale(0.8); opacity: 0.45; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export function CancelamentoModal({
  open,
  onClose,
  info,
  onVerAgendamentos,
}: {
  open: boolean;
  onClose: () => void;
  info?: SucessoInfo | null;
  onVerAgendamentos: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const rows = info
    ? [
        { label: "Serviço", value: info.servico },
        { label: "Data", value: fmtData(info.data) },
        { label: "Horário", value: info.horario },
        ...(info.profissional ? [{ label: "Profissional", value: info.profissional }] : []),
      ]
    : [];

  return (
    <div
      className="animate-fade-in"
      style={{
        position: "fixed",
        inset: 0,
        background: "#FFFFFF",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        overflowY: "auto",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div
          style={{
            position: "relative",
            width: 72,
            height: 72,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "#DC2626",
              opacity: 0.25,
              animation: "sreli-ring 900ms ease-out forwards",
            }}
          />
          <div
            style={{
              position: "relative",
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#FEE2E2",
              color: "#DC2626",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "sreli-pop 500ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path
                d="M6 6l12 12"
                style={{
                  strokeDasharray: 24,
                  strokeDashoffset: 24,
                  animation: "sreli-check 320ms ease-out 320ms forwards",
                }}
              />
              <path
                d="M18 6L6 18"
                style={{
                  strokeDasharray: 24,
                  strokeDashoffset: 24,
                  animation: "sreli-check 320ms ease-out 600ms forwards",
                }}
              />
            </svg>
          </div>
        </div>
        <h3 style={{ fontWeight: 700, fontSize: 22, color: "#1A1A1A", margin: "0 0 8px" }}>
          Agendamento cancelado com sucesso
        </h3>
        <p style={{ fontSize: 14, color: "#888888", margin: "0 0 24px" }}>
          Seu horário foi cancelado.
        </p>
        {rows.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <ResumoCard rows={rows} />
          </div>
        )}
        <button
          style={{ ...btnPrimary, boxShadow: "none" }}
          onClick={onVerAgendamentos}
        >
          Voltar para meus agendamentos
        </button>
        <button style={linkBtn} onClick={onClose}>
          Voltar para o início
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

