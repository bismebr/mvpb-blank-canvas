import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type CSSProperties, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { EmpresarioHeader } from "@/components/empresario/EmpresarioHeader";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/empresario/esqueci-senha")({
  head: () => ({
    meta: [
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "Recuperar senha — Bisme" },
      { name: "description", content: "Recupere o acesso à sua conta Bisme." },
    ],
  }),
  component: EsqueciSenha,
});

const FONT =
  'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const COLORS = {
  bgPage: "#FFFFFF",
  cardBg: "#FFFFFF",
  border: "#E4E4E4",
  borderError: "#E11D74",
  text: "#111111",
  textMuted: "#6F6F6F",
};

function EsqueciSenha() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const emailError = touched && email.length > 0 && !emailValid;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setErro(null);
    if (!emailValid) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/empresario/redefinir-senha` },
      );
      // Sempre mostrar mensagem genérica, independentemente do resultado.
      if (error) {
        // Erros técnicos (rede, rate limit) — logar sem expor detalhes.
        console.warn("[esqueci-senha] resetPasswordForEmail falhou");
      }
      setSent(true);
    } catch {
      setErro("Não foi possível enviar o link agora. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <EmpresarioHeader />
      <main className="bisme-auth-main" style={mainStyle}>
        <div className="bisme-auth-card" style={cardStyle}>
          <h1 style={titleStyle}>Recuperar senha</h1>

          {sent ? (
            <>
              <p style={{ ...muted, textAlign: "center", margin: "0 0 18px" }}>
                Se este e-mail estiver cadastrado, enviaremos um link para
                redefinir sua senha. Verifique sua caixa de entrada e spam.
              </p>
              <button
                type="button"
                onClick={() => navigate({ to: "/empresario/login" })}
                style={primaryBtn(false)}
              >
                Voltar para o login
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit} noValidate style={{ width: "100%" }}>
              <p style={{ ...muted, margin: "0 0 14px" }}>
                Informe o e-mail da sua conta e enviaremos um link para
                redefinir a senha.
              </p>
              <div style={{ marginBottom: 12 }}>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="Endereço de e-mail"
                  style={inputStyle(!!emailError)}
                  aria-invalid={!!emailError}
                />
                {emailError && (
                  <div style={errorMsg}>Informe um endereço de e-mail válido</div>
                )}
              </div>

              {erro && (
                <div style={{ ...errorMsg, marginBottom: 10, marginLeft: 4 }}>
                  {erro}
                </div>
              )}

              <button type="submit" disabled={loading} style={primaryBtn(loading)}>
                <Mail size={18} strokeWidth={2.2} style={{ display: "block" }} />
                <span style={{ lineHeight: 1 }}>
                  {loading ? "Enviando..." : "Enviar link de recuperação"}
                </span>
              </button>

              <p style={{ ...muted, textAlign: "center", margin: "16px 0 0" }}>
                Lembrou a senha?{" "}
                <Link to="/empresario/login" style={linkStyle}>
                  Entrar
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
      <style>{`
        @media (max-width: 720px) {
          .bisme-auth-main { padding: 0px 12px 32px !important; }
          .bisme-auth-card { padding: 20px 18px 22px !important; max-width: 100% !important; }
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
  padding: "24px 28px 22px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  boxSizing: "border-box",
};
const titleStyle: CSSProperties = {
  margin: "4px 0 18px",
  fontSize: 20,
  fontWeight: 700,
  textAlign: "center",
};
const muted: CSSProperties = { fontSize: 13.5, color: COLORS.textMuted, lineHeight: 1.5 };
function inputStyle(error: boolean): CSSProperties {
  return {
    width: "100%",
    height: 48,
    background: "#FFFFFF",
    border: `1px solid ${error ? COLORS.borderError : COLORS.border}`,
    borderRadius: 8,
    padding: "0 16px",
    fontSize: 16,
    color: COLORS.text,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: FONT,
  };
}
const errorMsg: CSSProperties = {
  color: COLORS.borderError,
  fontSize: 12.5,
  marginTop: 5,
  marginLeft: 4,
};
function primaryBtn(disabled: boolean): CSSProperties {
  return {
    width: "100%",
    height: 48,
    background: "#5690f5",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.7 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    fontFamily: FONT,
  };
}
const linkStyle: CSSProperties = {
  color: COLORS.text,
  textDecoration: "underline",
  fontFamily: FONT,
};
