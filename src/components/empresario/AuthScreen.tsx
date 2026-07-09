import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type CSSProperties, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { EmpresarioHeader } from "./EmpresarioHeader";
import { AuthI18nProvider, LanguageSelector, useAuthI18n } from "./authI18n";

export type AuthMode = "login" | "signup";

interface Props {
  mode: AuthMode;
  showPassword: boolean;
  showPasswordRequirements?: boolean;
  onSubmit: (data: { email: string; senha: string }) => Promise<void> | void;
  onGoogle: () => void;
  submitting?: boolean;
  serverError?: string | null;
}

const FONT =
  'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const COLORS = {
  bgPage: "#FFFFFF",
  cardBg: "#FFFFFF",
  border: "#E4E4E4",
  borderError: "#E11D74",
  text: "#111111",
  textMuted: "#6F6F6F",
  textPlaceholder: "#9A9A9A",
  tabBg: "#F0F0F0",
  black: "#111111",
};

export function AuthScreen(props: Props) {
  return (
    <AuthI18nProvider>
      <AuthScreenInner {...props} />
    </AuthI18nProvider>
  );
}

function AuthScreenInner(props: Props) {
  const navigate = useNavigate();
  const { mode } = props;
  const { t } = useAuthI18n();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [touched, setTouched] = useState<{ email?: boolean; senha?: boolean }>({});
  const [emailFocused, setEmailFocused] = useState(false);

  const EMAIL_DOMAIN_REGEX = /^[^\s@]+@(gmail\.com|hotmail\.com|outlook\.com)$/i;
  const enforceEmailDomain = mode === "signup";
  const emailValid = enforceEmailDomain ? EMAIL_DOMAIN_REGEX.test(email.trim()) : email.trim().length > 0;
  const emailError =
    touched.email && !emailFocused && email.length > 0 && enforceEmailDomain && !emailValid;
  const reqLetter = /[A-Za-z]/.test(senha);
  const reqDigit = /\d/.test(senha);
  const reqLength = senha.length >= 8;
  const passwordValid = reqLetter && reqDigit && reqLength;
  const senhaError =
    props.showPassword && touched.senha &&
    (props.showPasswordRequirements ? !passwordValid : senha.length < 1);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ email: true, senha: true });
    if (!email.trim() || !emailValid) return;
    if (props.showPassword) {
      if (props.showPasswordRequirements && !passwordValid) return;
      if (!props.showPasswordRequirements && senha.length < 1) return;
    }
    await props.onSubmit({ email, senha });
  }

  // Preserved for compatibility with earlier flows that navigate via tabs.
  function _go(to: "/empresario/login" | "/empresario/cadastro") {
    if (
      (to === "/empresario/login" && mode === "login") ||
      (to === "/empresario/cadastro" && mode === "signup")
    ) return;
    navigate({ to });
  }
  void _go;

  const title = mode === "signup" ? t("signup.title") : t("login.title");
  const buttonText = mode === "signup" ? t("signup.button") : t("login.button");
  const agreementLead = mode === "signup" ? t("agreement.signup") : t("agreement.login");

  return (
    <div style={pageStyle}>
      <EmpresarioHeader right={<LanguageSelector />} />
      <main className="bisme-auth-main" style={mainStyle}>
        <div className="bisme-auth-card" style={cardStyle}>
          <h1 style={titleStyle}>{title}</h1>

          <form onSubmit={handleSubmit} noValidate style={{ width: "100%" }}>
            <div style={{ marginBottom: 10 }}>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => { setEmailFocused(true); }}
                onBlur={() => { setEmailFocused(false); setTouched((tt) => ({ ...tt, email: true })); }}
                placeholder={t("form.email")}
                style={inputStyle(!!emailError)}
                aria-invalid={!!emailError}
              />
              {emailError && <div style={errorMsg}>{t("form.emailInvalid")}</div>}
            </div>

            {props.showPassword && (
              <div style={{ marginBottom: 14, position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onBlur={() => setTouched((tt) => ({ ...tt, senha: true }))}
                  placeholder={t("form.password")}
                  style={{ ...inputStyle(!!senhaError), paddingRight: 80 }}
                  aria-invalid={!!senhaError}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  style={eyeBtn}
                  aria-label={showPass ? t("form.hide") : t("form.show")}
                >
                  {showPass ? t("form.hide") : t("form.show")}
                </button>
                {props.showPasswordRequirements && (
                  <div style={reqWrap}>
                    <div style={reqTitle}>{t("req.title")}</div>
                    <ul style={reqList}>
                      <ReqItem ok={reqLetter} label={t("req.letter")} />
                      <ReqItem ok={reqDigit} label={t("req.digit")} />
                      <ReqItem ok={reqLength} label={t("req.length")} />
                    </ul>
                  </div>
                )}
                {mode === "login" && (
                  <div style={{ textAlign: "right", marginTop: 8 }}>
                    <Link
                      to="/empresario/esqueci-senha"
                      style={{
                        fontSize: 13,
                        color: COLORS.textMuted,
                        textDecoration: "underline",
                        fontFamily: FONT,
                      }}
                    >
                      {t("login.forgot")}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {props.serverError && (
              <div style={{ ...errorMsg, marginBottom: 10, marginLeft: 4 }}>
                {props.serverError}
              </div>
            )}

            <button type="submit" disabled={props.submitting} style={primaryBtn(props.submitting)}>
              <Mail size={18} strokeWidth={2.2} style={{ display: "block" }} />
              <span style={{ lineHeight: 1 }}>{props.submitting ? t("form.wait") : buttonText}</span>
            </button>
          </form>

          <div style={dividerWrap}>
            <div style={dividerLine} />
            <span style={dividerText}>{t("form.or")}</span>
            <div style={dividerLine} />
          </div>

          <button type="button" onClick={props.onGoogle} style={googleBtn}>
            <GoogleIcon />
            <span>{t("form.google")}</span>
          </button>

          <p style={agreementStyle}>
            {agreementLead}{" "}
            <Link to="/termos-de-uso" style={linkStyle}>
              {t("agreement.terms")}
            </Link>{" "}
            {t("agreement.and")}{" "}
            <Link to="/politica-privacidade" style={linkStyle}>
              {t("agreement.privacy")}
            </Link>
          </p>

          <div style={altDivider} />

          <p style={altTextStyle}>
            {mode === "login" ? (
              <>
                {t("login.altQuestion")}{" "}
                <Link to="/empresario/cadastro" style={altLinkStyle}>
                  {t("login.altLink")}
                </Link>
              </>
            ) : (
              <>
                {t("signup.altQuestion")}{" "}
                <Link to="/empresario/login" style={altLinkStyle}>
                  {t("signup.altLink")}
                </Link>
              </>
            )}
          </p>
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

/* ---------- styles ---------- */

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
  fontSize: 22,
  fontWeight: 700,
  color: COLORS.text,
  textAlign: "center",
};

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
    transition: "border-color 150ms",
  };
}

const eyeBtn: CSSProperties = {
  position: "absolute",
  right: 14,
  top: 14,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: COLORS.textMuted,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.5,
  padding: 0,
  fontFamily: FONT,
};

const errorMsg: CSSProperties = {
  color: COLORS.borderError,
  fontSize: 12.5,
  marginTop: 5,
  marginLeft: 4,
};

function primaryBtn(disabled?: boolean): CSSProperties {
  return {
    width: "100%",
    height: 48,
    background: "#5690f5",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: 0.2,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.7 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    fontFamily: FONT,
  };
}

const dividerWrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  margin: "16px 0 12px",
  width: "100%",
};
const dividerLine: CSSProperties = { flex: 1, height: 1, background: COLORS.border };
const dividerText: CSSProperties = {
  fontSize: 11.5,
  color: COLORS.textMuted,
  letterSpacing: 1.5,
  fontWeight: 500,
};

const googleBtn: CSSProperties = {
  width: "100%",
  height: 48,
  background: "#FFFFFF",
  color: COLORS.text,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  fontSize: 14.5,
  fontWeight: 500,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  fontFamily: FONT,
};

const agreementStyle: CSSProperties = {
  margin: "18px 0 0",
  textAlign: "center",
  fontSize: 12.5,
  color: COLORS.textMuted,
  lineHeight: 1.55,
};

const linkStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
  color: COLORS.text,
  fontWeight: 400,
  fontSize: 12.5,
  textDecoration: "underline",
  fontFamily: FONT,
};

const altDivider: CSSProperties = {
  width: "100%",
  height: 1,
  background: COLORS.border,
  margin: "20px 0 0",
  border: "none",
};

const altTextStyle: CSSProperties = {
  margin: "14px 0 0",
  textAlign: "center",
  fontSize: 13.5,
  color: COLORS.textMuted,
  fontFamily: FONT,
};

const altLinkStyle: CSSProperties = {
  color: "#5690f5",
  textDecoration: "underline",
  fontWeight: 600,
  fontFamily: FONT,
};

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

/* ---------- Password requirements ---------- */

const REQ_GREEN = "#00be70";
const REQ_GRAY = "#C8C8C8";

const reqWrap: CSSProperties = {
  marginTop: 10,
  marginLeft: 2,
};

const reqTitle: CSSProperties = {
  fontSize: 13,
  color: COLORS.text,
  fontWeight: 600,
  marginBottom: 6,
};

const reqList: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

function ReqItem({ ok, label }: { ok: boolean; label: string }) {
  const color = ok ? REQ_GREEN : REQ_GRAY;
  return (
    <li style={{ display: "flex", alignItems: "center", gap: 8, color, fontSize: 13, transition: "color 150ms" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>{label}</span>
    </li>
  );
}
