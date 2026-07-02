import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { type Usuario } from "./data";
import { BISME_LOGOS } from "@/config/assets";
const bismeLogo = BISME_LOGOS.user;
import { LoadingOverlay } from "./LoadingOverlay";
import { isPhoneValid, maskBrPhone } from "./phoneMask";
import { supabase } from "@/integrations/supabase/client";



type Mode = "login" | "cadastro" | "esqueci";

const NOME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/;
const EMAIL_REGEX = /^[^\s@]+@(gmail\.com|hotmail\.com|outlook\.com)$/i;
const sanitizeNome = (v: string) => v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, "");

export function LoginFullScreen({
  open,
  initialMode = "cadastro",
  initialWhatsapp = "",
  onClose,
  onLogged,
}: {
  open: boolean;
  initialMode?: Mode;
  initialWhatsapp?: string;
  onClose: () => void;
  onLogged: (u: Usuario) => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loadingCadastro, setLoadingCadastro] = useState(false);
  const [whatsappTouched, setWhatsappTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  // reset on open
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setErro(null);
      setShowSenha(false);
      setWhatsapp(maskBrPhone(initialWhatsapp));
      setWhatsappTouched(false);
      setEmailTouched(false);
      setRecoverySent(false);
      setRecoveryLoading(false);
    }
  }, [open, initialMode, initialWhatsapp]);


  // body scroll lock + ESC
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevWidth = document.body.style.width;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.width = prevWidth;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit() {
    setErro(null);
    if (mode === "login") {
      if (!email.trim() || !senha) {
        setErro("Preencha e-mail e senha.");
        return;
      }
      setLoadingCadastro(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      });
      setLoadingCadastro(false);
      if (error || !data.user) {
        setErro("E-mail ou senha incorretos.");
        return;
      }
      const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      const telExistente = typeof meta.telefone === "string" ? meta.telefone : "";
      let telefoneFinal = telExistente;
      // Se veio WhatsApp do fluxo de agendamento e o usuário ainda não tem, salva no perfil.
      if (!telExistente && isPhoneValid(whatsapp)) {
        telefoneFinal = whatsapp;
        try {
          await supabase.auth.updateUser({ data: { telefone: whatsapp } });
        } catch (e) {
          console.warn("[LoginFullScreen] updateUser telefone falhou", e);
        }
      }
      const atualizado: Usuario = {
        nome:
          typeof meta.nome === "string" && meta.nome
            ? meta.nome
            : (data.user.email ?? email.trim()),
        email: data.user.email ?? email.trim(),
        senha: "",
        criadoEm: data.user.created_at ?? new Date().toISOString(),
        telefone: telefoneFinal,
        fotoUrl: typeof meta.fotoUrl === "string" ? meta.fotoUrl : undefined,
      };
      onLogged(atualizado);
    } else {
      if (!nome.trim() || !email.trim() || !senha) {
        setErro("Preencha todos os campos.");
        return;
      }
      if (!NOME_REGEX.test(nome.trim())) {
        setErro("Digite um nome válido, usando apenas letras.");
        return;
      }
      if (!EMAIL_REGEX.test(email.trim())) {
        setErro("Use um e-mail válido do Gmail, Hotmail ou Outlook.");
        return;
      }
      if (!isPhoneValid(whatsapp)) {
        setErro("Informe um WhatsApp válido para continuar.");
        return;
      }
      if (senha.length < 6) {
        setErro("A senha deve ter no mínimo 6 caracteres.");
        return;
      }
      setLoadingCadastro(true);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: senha,
        options: {
          emailRedirectTo:
            typeof window !== "undefined" ? window.location.origin : undefined,
          data: { nome: nome.trim(), telefone: whatsapp },
        },
      });
      if (error) {
        setLoadingCadastro(false);
        const m = (error.message || "").toLowerCase();
        if (m.includes("registered") || m.includes("already")) {
          setErro("Este e-mail já está cadastrado.");
        } else {
          setErro(error.message || "Não foi possível concluir o cadastro.");
        }
        return;
      }
      if (!data.session) {
        setLoadingCadastro(false);
        setErro(
          "Cadastro criado! Confirme seu e-mail para ativar a conta e entrar.",
        );
        return;
      }
      const novo: Usuario = {
        nome: nome.trim(),
        email: data.user?.email ?? email.trim(),
        senha: "",
        telefone: whatsapp,
        criadoEm: data.user?.created_at ?? new Date().toISOString(),
      };
      // Mantém o loading visual original do cadastro
      setTimeout(() => {
        setLoadingCadastro(false);
        onLogged(novo);
      }, 1200);
    }
  }

  async function handleRecovery() {
    setErro(null);
    const emailTrim = email.trim().toLowerCase();
    if (!emailTrim || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setErro("Informe um e-mail válido.");
      return;
    }
    setRecoveryLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(emailTrim, {
        redirectTo: `${window.location.origin}/cliente/redefinir-senha`,
      });
    } catch {
      // não revelar existência do e-mail
    }
    setRecoveryLoading(false);
    setRecoverySent(true);
  }


  return (
    <div className="sreli-login-overlay" onClick={(e) => e.stopPropagation()}>
      {loadingCadastro && <LoadingOverlay message="Finalizando seu cadastro..." />}
      <button
        className="sreli-login-close"
        onClick={onClose}
        aria-label="Fechar"
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className="sreli-login-header">
        <div className="sreli-login-logo">
          <img src={bismeLogo} alt="Bisme" />
        </div>
      </div>

      <div className="sreli-login-content">

        <h2 className="sreli-login-title">
          {mode === "login"
            ? "Bem-vindo de volta"
            : mode === "esqueci"
              ? "Recuperar senha"
              : "Bem-vindo"}
        </h2>
        <p className="sreli-login-subtitle">
          {mode === "login"
            ? "Faça login ou crie uma conta para realizar seus agendamentos"
            : mode === "esqueci"
              ? "Informe seu e-mail e enviaremos um link para redefinir sua senha."
              : "Crie uma conta para realizar seus agendamentos"}
        </p>

        {mode === "esqueci" ? (
          <>
            {recoverySent ? (
              <>
                <div
                  style={{
                    background: "#F3F4F6",
                    border: "1px solid #E4E4E4",
                    borderRadius: 8,
                    padding: "14px 16px",
                    fontSize: 14,
                    color: "#111111",
                    marginBottom: 14,
                  }}
                >
                  Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.
                </div>
                <button
                  type="button"
                  className="sreli-signin-btn"
                  onClick={() => { setMode("login"); setErro(null); setRecoverySent(false); }}
                >
                  Voltar ao login
                </button>
              </>
            ) : (
              <>
                <FloatField
                  label="E-mail"
                  value={email}
                  onChange={setEmail}
                  type="email"
                  autoComplete="email"
                />
                {erro && <div className="sreli-field-error" style={{ marginTop: 8 }}>{erro}</div>}
                <button
                  type="button"
                  className="sreli-signin-btn"
                  onClick={handleRecovery}
                  disabled={!email.trim() || recoveryLoading}
                  style={{
                    opacity: !email.trim() || recoveryLoading ? 0.5 : 1,
                    cursor: !email.trim() || recoveryLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {recoveryLoading ? "Enviando..." : "Enviar link de recuperação"}
                </button>
                <div className="sreli-modal-switch-row">
                  <strong onClick={() => { setMode("login"); setErro(null); }}>
                    Voltar ao login
                  </strong>
                </div>
              </>
            )}
          </>
        ) : (
          <>
        <div className="sreli-social-buttons" style={{ display: "block" }}>
          <button
            type="button"
            aria-label="Entrar com o Google"
            style={{
              width: "100%", height: 48, borderRadius: 10,
              background: "#ffffff", border: "1px solid #E5E7EB",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              gap: 10, cursor: "pointer", fontSize: 15, fontWeight: 600, color: "#1A1A1A",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.65 4.66-6.08 8-11.3 8-6.63 0-12-5.37-12-12s5.37-12 12-12c3.06 0 5.84 1.16 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.34-.14-2.65-.4-3.5z" />
              <path fill="#FF3D00" d="M6.31 14.69l6.57 4.82C14.66 15.13 18.97 12 24 12c3.06 0 5.84 1.16 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4 16.32 4 9.66 8.34 6.31 14.69z" />
              <path fill="#4CAF50" d="M24 44c5.18 0 9.86-1.98 13.41-5.2l-6.19-5.24C29.21 35.09 26.74 36 24 36c-5.2 0-9.62-3.32-11.28-7.95l-6.52 5.02C9.5 39.55 16.23 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.79 2.24-2.23 4.16-4.09 5.56l6.19 5.24C40.96 35.6 44 30.27 44 24c0-1.34-.14-2.65-.4-3.5z" />
            </svg>
            Entrar com o Google
          </button>
        </div>

        <div className="sreli-divider">
          <span className="sreli-divider-line" />
          <span className="sreli-divider-text">OU</span>
          <span className="sreli-divider-line" />
        </div>

        {mode === "cadastro" && (
          <>
            <FloatField label="Nome" value={nome} onChange={(v) => setNome(sanitizeNome(v))} type="text" autoComplete="name" />
            <div style={{ height: 12 }} />
            <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
              <div style={{ width: 110, flexShrink: 0 }}>
                <FloatField label="País" value="🇧🇷 +55" onChange={() => {}} readOnly />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <FloatField
                  label="Número de telefone"
                  value={whatsapp}
                  onChange={(v) => setWhatsapp(maskBrPhone(v))}
                  type="tel"
                  inputMode="numeric"
                  maxLength={15}
                  autoComplete="tel-national"
                  onFocus={() => setWhatsappTouched(false)}
                  onBlur={() => setWhatsappTouched(true)}
                />
              </div>
            </div>
            {whatsappTouched && whatsapp.length > 0 && !isPhoneValid(whatsapp) && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                Adicione um número de telefone válido
              </div>
            )}
            <div style={{ height: 12 }} />
          </>
        )}

        <FloatField
          label="E-mail"
          value={email}
          onChange={setEmail}
          type="email"
          autoComplete="email"
          onFocus={() => setEmailTouched(false)}
          onBlur={() => setEmailTouched(true)}
        />
        {emailTouched && email.length > 0 && !EMAIL_REGEX.test(email.trim()) && (
          <div style={{ marginTop: 6, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
            Informe um endereço de e-mail válido
          </div>
        )}
        <div style={{ height: 12 }} />
        <FloatField
          label="Senha"
          value={senha}
          onChange={setSenha}
          type={showSenha ? "text" : "password"}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          inputClassName="sreli-password-input"
          rightSlot={
            <button
              type="button"
              onClick={() => setShowSenha((v) => !v)}
              aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
              style={{
                background: "none", border: "none", padding: 4, cursor: "pointer",
                color: "#6F6F6F", display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {showSenha ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.77 19.77 0 0 1 4.22-5.94" />
                  <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.84 19.84 0 0 1-3.17 4.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          }
        />
        {mode === "login" && (
          <div style={{ marginTop: 10, textAlign: "right" }}>
            <button
              type="button"
              onClick={() => { setMode("esqueci"); setErro(null); setRecoverySent(false); }}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "#6F6F6F",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                textDecoration: "underline",
                fontFamily: "inherit",
              }}
            >
              Esqueci minha senha
            </button>
          </div>
        )}
        {erro && <div className="sreli-field-error" style={{ marginTop: 8 }}>{erro}</div>}

        <button
          type="button"
          className="sreli-signin-btn"
          onClick={handleSubmit}
          disabled={
            mode === "login"
              ? !email.trim() || !senha
              : !nome.trim() || !email.trim() || !EMAIL_REGEX.test(email.trim()) || !senha || senha.length < 6 || !isPhoneValid(whatsapp)
          }
          style={{
            opacity:
              (mode === "login"
                ? !email.trim() || !senha
                : !nome.trim() || !email.trim() || !EMAIL_REGEX.test(email.trim()) || !senha || senha.length < 6 || !isPhoneValid(whatsapp))
                ? 0.5
                : 1,
            cursor:
              (mode === "login"
                ? !email.trim() || !senha
                : !nome.trim() || !email.trim() || !EMAIL_REGEX.test(email.trim()) || !senha || senha.length < 6 || !isPhoneValid(whatsapp))
                ? "not-allowed"
                : "pointer",
          }}
        >
          {mode === "login" ? "Entrar" : "Criar conta"}
        </button>

        <div className="sreli-modal-switch-row">
          {mode === "login" ? (
            <>
              Não tem uma conta ainda?{" "}
              <strong onClick={() => { setMode("cadastro"); setErro(null); }}>
                Cadastre-se
              </strong>
            </>
          ) : (
            <>
              Já tem uma conta?{" "}
              <strong onClick={() => { setMode("login"); setErro(null); }}>
                Entrar
              </strong>
            </>
          )}
        </div>
          </>
        )}
      </div>


    </div>
  );
}

// referencing CSSProperties to avoid unused-import (kept for clarity)
export const __noop: CSSProperties = {};

/* ---------- Floating Input (matches onboarding "Sobre você") ---------- */
function FloatField({
  label, value, onChange, type = "text", readOnly, autoComplete,
  inputMode, maxLength, rightSlot, inputClassName, onFocus, onBlur,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  readOnly?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "tel" | "numeric" | "decimal" | "email";
  maxLength?: number;
  rightSlot?: ReactNode;
  inputClassName?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const hasValue = value.length > 0;
  return (
    <label
      style={{
        position: "relative",
        display: "flex",
        alignItems: "stretch",
        border: "1.5px solid #E4E4E4",
        borderRadius: 8,
        background: "#FFFFFF",
        padding: hasValue ? "20px 14px 8px" : "14px 14px",
        fontFamily: "inherit",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 14,
          top: hasValue ? 6 : 14,
          fontSize: hasValue ? 11 : 14,
          color: "#6F6F6F",
          transition: "all 150ms",
          pointerEvents: "none",
          fontWeight: hasValue ? 600 : 400,
        }}
      >
        {label}
      </span>
      <input
        className={inputClassName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        readOnly={readOnly}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        style={{
          flex: 1,
          minWidth: 0,
          width: "100%",
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 16,
          color: "#111111",
          fontFamily: "inherit",
          padding: 0,
        }}
      />
      {rightSlot && (
        <span style={{ display: "inline-flex", alignItems: "center", marginLeft: 8 }}>
          {rightSlot}
        </span>
      )}
    </label>
  );
}
