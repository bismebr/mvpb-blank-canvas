import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type CSSProperties } from "react";
import { CheckCircle2 } from "lucide-react";
import { EmpresarioHeader } from "@/components/empresario/EmpresarioHeader";

export const Route = createFileRoute("/empresario/email-alterado")({
  head: () => ({
    meta: [
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "E-mail alterado — Bisme" },
      { name: "description", content: "Seu e-mail de acesso foi atualizado com sucesso." },
    ],
  }),
  component: EmailAlterado,
});

const FONT =
  'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const COLORS = {
  bgPage: "#FFFFFF",
  cardBg: "#FFFFFF",
  text: "#111111",
  textMuted: "#6F6F6F",
};

function EmailAlterado() {
  const navigate = useNavigate();

  return (
    <div style={pageStyle}>
      <EmpresarioHeader />
      <main className="bisme-auth-main" style={mainStyle}>
        <div className="bisme-auth-card" style={cardStyle}>
          <CheckCircle2 size={48} strokeWidth={2} color="#5690f5" style={{ marginBottom: 6 }} />
          <h1 style={titleStyle}>E-mail alterado com sucesso</h1>
          <p style={{ ...muted, textAlign: "center", margin: "0 0 20px" }}>
            Seu e-mail de acesso foi atualizado. Agora você já pode entrar
            usando o novo e-mail.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/empresario/login" })}
            style={primaryBtn}
          >
            Ir para o login
          </button>
        </div>
      </main>
      <style>{`
        @media (max-width: 720px) {
          .bisme-auth-main { padding: 0px 12px 32px !important; }
          .bisme-auth-card { padding: 24px 18px 26px !important; max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

const pageStyle: CSSProperties = {
  position: "relative",
  minHeight: "100vh",
  background: COLORS.bgPage,
  fontFamily: FONT,
  color: COLORS.text,
  WebkitFontSmoothing: "antialiased",
  boxSizing: "border-box",
};
const mainStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  padding: "12px 16px 48px",
};
const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: 440,
  background: COLORS.cardBg,
  borderRadius: 12,
  padding: "28px 28px 26px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  boxSizing: "border-box",
};
const titleStyle: CSSProperties = {
  margin: "4px 0 12px",
  fontSize: 20,
  fontWeight: 700,
  textAlign: "center",
};
const muted: CSSProperties = { fontSize: 13.5, color: COLORS.textMuted, lineHeight: 1.5 };
const primaryBtn: CSSProperties = {
  width: "100%",
  height: 48,
  background: "#5690f5",
  color: "#FFFFFF",
  border: "none",
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  fontFamily: FONT,
};
