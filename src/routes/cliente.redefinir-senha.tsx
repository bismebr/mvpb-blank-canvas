import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { supabasePublic as supabase } from "@/integrations/supabase/client-public";

export const Route = createFileRoute("/cliente/redefinir-senha")({
  head: () => ({
    meta: [
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "Redefinir senha" },
      { name: "description", content: "Defina uma nova senha para sua conta." },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: RedefinirSenhaCliente,
});

const FONT =
  'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const COLORS = {
  bgPage: "#FFFFFF",
  border: "#E4E4E4",
  borderError: "#dc2626",
  text: "#111111",
  textMuted: "#6F6F6F",
  primary: "#5690f5",
};

type Status = "checking" | "ready" | "invalid" | "saving" | "done";

function sanitizeNext(next: string | null): string | null {
  if (!next) return null;
  // Só permite path interno começando com "/" e sem "//" (evita open redirect)
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  if (next.length > 200) return null;
  return next;
}

function RedefinirSenhaCliente() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [touched, setTouched] = useState<{ s?: boolean; c?: boolean }>({});
  const [erro, setErro] = useState<string | null>(null);
  const [next, setNext] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setNext(sanitizeNext(params.get("next")));

    let recoveryDetected = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryDetected = true;
        setStatus("ready");
      }
    });

    const hash = window.location.hash;
    const hasRecoveryHash = hash.includes("type=recovery");

    const timer = window.setTimeout(async () => {
      if (recoveryDetected) return;
      const { data } = await supabase.auth.getSession();
      if (data.session || hasRecoveryHash) {
        setStatus("ready");
      } else {
        setStatus("invalid");
      }
    }, 800);

    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  const senhaValida = senha.length >= 6;
  const iguais = senha === confirma && confirma.length > 0;
  const senhaErro = touched.s && !senhaValida;
  const confirmaErro = touched.c && !iguais;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setTouched({ s: true, c: true });
    if (!senhaValida || !iguais) return;
    setStatus("saving");
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setErro(error.message || "Não foi possível redefinir a senha.");
      setStatus("ready");
      return;
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // ignora
    }
    setStatus("done");
  }

  function goHome() {
    if (next) {
      window.location.assign(next);
      return;
    }
    navigate({ to: "/" });
  }

  return (
    <div style={pageStyle}>
      <main className="bisme-cliente-auth-main" style={mainStyle}>
        <div className="bisme-cliente-auth-card" style={cardStyle}>
          <h1 style={titleStyle}>Redefinir senha</h1>

          {status === "checking" && (
            <p style={{ ...muted, textAlign: "center" }}>Verificando link...</p>
          )}

          {status === "invalid" && (
            <>
              <p style={{ ...muted, textAlign: "center", margin: "0 0 18px" }}>
                Link inválido ou expirado. Solicite um novo link de recuperação.
              </p>
              <button type="button" onClick={goHome} style={primaryBtn(false)}>
                Voltar ao site
              </button>
            </>
          )}

          {status === "done" && (
            <>
              <p style={{ ...muted, textAlign: "center", margin: "0 0 18px" }}>
                Senha redefinida com sucesso.
              </p>
              <button type="button" onClick={goHome} style={primaryBtn(false)}>
                Voltar ao site
              </button>
            </>
          )}

          {(status === "ready" || status === "saving") && (
            <form onSubmit={handleSubmit} noValidate style={{ width: "100%" }}>
              <div style={{ marginBottom: 12 }}>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, s: true }))}
                  placeholder="Nova senha"
                  style={inputStyle(!!senhaErro)}
                  aria-invalid={!!senhaErro}
                />
                {senhaErro && (
                  <div style={errorMsg}>A senha deve ter ao menos 6 caracteres</div>
                )}
              </div>
              <div style={{ marginBottom: 14 }}>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirma}
                  onChange={(e) => setConfirma(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, c: true }))}
                  placeholder="Confirmar nova senha"
                  style={inputStyle(!!confirmaErro)}
                  aria-invalid={!!confirmaErro}
                />
                {confirmaErro && (
                  <div style={errorMsg}>As senhas não coincidem</div>
                )}
              </div>

              {erro && (
                <div style={{ ...errorMsg, marginBottom: 10, marginLeft: 4 }}>
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "saving"}
                style={primaryBtn(status === "saving")}
              >
                {status === "saving" ? "Salvando..." : "Redefinir senha"}
              </button>
            </form>
          )}
        </div>
      </main>
      <style>{`
        @media (max-width: 720px) {
          .bisme-cliente-auth-main { padding: 24px 12px 32px !important; }
          .bisme-cliente-auth-card { padding: 22px 18px 22px !important; max-width: 100% !important; }
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
  padding: "48px 16px 48px",
};
const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: 440,
  background: "#FFFFFF",
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
    background: COLORS.primary,
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
