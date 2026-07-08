import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { type Usuario } from "./data";
import { LoadingOverlay } from "./LoadingOverlay";
import { isPhoneValid, maskBrPhone } from "./phoneMask";
import { supabasePublic as supabase } from "@/integrations/supabase/client-public";

type Mode = "login" | "cadastro" | "esqueci";

const NOME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/;
const EMAIL_REGEX = /^[^\s@]+@(gmail\.com|hotmail\.com|outlook\.com)$/i;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sanitizeNome = (v: string) => v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, "");

type Country = { code: string; name: string; flag: string; dial: string };
const COUNTRIES: Country[] = [
  { code: "BR", name: "Brasil", flag: "🇧🇷", dial: "+55" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", dial: "+1" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", dial: "+351" },
  { code: "ES", name: "Espanha", flag: "🇪🇸", dial: "+34" },
  { code: "FR", name: "França", flag: "🇫🇷", dial: "+33" },
  { code: "IT", name: "Itália", flag: "🇮🇹", dial: "+39" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧", dial: "+44" },
];

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
  const [sobrenome, setSobrenome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loadingCadastro, setLoadingCadastro] = useState(false);
  const [whatsappTouched, setWhatsappTouched] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [countryOpen, setCountryOpen] = useState(false);
  const countryRef = useRef<HTMLDivElement | null>(null);

  const nomeCompleto = useMemo(
    () => [nome.trim(), sobrenome.trim()].filter(Boolean).join(" "),
    [nome, sobrenome],
  );

  const emailValidShape = EMAIL_SHAPE.test(email.trim());
  const emailAllowedDomain = EMAIL_REGEX.test(email.trim());
  const [emailTouched, setEmailTouched] = useState(false);

  // reset on open
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setErro(null);
      setShowSenha(false);
      setWhatsapp(maskBrPhone(initialWhatsapp));
      setWhatsappTouched(false);
      setRecoverySent(false);
      setRecoveryLoading(false);
      setCountry(COUNTRIES[0]);
      setCountryOpen(false);
      setEmailTouched(false);
    }
  }, [open, initialMode, initialWhatsapp]);

  useEffect(() => {
    if (!countryOpen) return;
    function onDoc(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [countryOpen]);

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
      try {
        const { data: member } = await supabase
          .from("company_members")
          .select("company_id")
          .limit(1)
          .maybeSingle();
        if (member?.company_id) {
          await supabase.auth.signOut();
          setErro("Esta conta é de empresário. Use o acesso do painel.");
          return;
        }
      } catch (e) {
        console.warn("[LoginFullScreen] verificação de empresário falhou", e);
      }
      const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      const telExistente = typeof meta.telefone === "string" ? meta.telefone : "";
      let telefoneFinal = telExistente;
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
      const nomeFinal = nomeCompleto;
      if (!nomeFinal || !email.trim() || !senha) {
        setErro("Preencha todos os campos.");
        return;
      }
      if (!NOME_REGEX.test(nomeFinal)) {
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
          data: { nome: nomeFinal, telefone: whatsapp },
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
        setErro("Cadastro criado! Confirme seu e-mail para ativar a conta e entrar.");
        return;
      }
      const novo: Usuario = {
        nome: nomeFinal,
        email: data.user?.email ?? email.trim(),
        senha: "",
        telefone: whatsapp,
        criadoEm: data.user?.created_at ?? new Date().toISOString(),
      };
      setTimeout(() => {
        setLoadingCadastro(false);
        onLogged(novo);
      }, 1200);
    }
  }

  async function handleRecovery() {
    setErro(null);
    const emailTrim = email.trim().toLowerCase();
    if (!emailTrim || !EMAIL_SHAPE.test(emailTrim)) {
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

  const isLogin = mode === "login";
  const isCadastro = mode === "cadastro";

  const disabledSubmit = isLogin
    ? !email.trim() || !senha
    : !nomeCompleto ||
      !email.trim() ||
      !EMAIL_REGEX.test(email.trim()) ||
      !senha ||
      senha.length < 6 ||
      !isPhoneValid(whatsapp);

  function handleFacebookClick() {
    setErro("Login com Facebook estará disponível em breve.");
  }

  async function handleGoogleClick() {
    setErro(null);
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
    } catch {
      setErro("Não foi possível iniciar o login com o Google.");
    }
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

      <div className="sreli-login-content" style={{ paddingTop: 56 }}>
        {mode !== "esqueci" && (
          <div
            role="tablist"
            aria-label="Alternar entre entrar e cadastrar"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              background: "#F3F4F6",
              borderRadius: 8,
              padding: 3,
              marginBottom: 22,
              width: "min(240px, 100%)",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {(["login", "cadastro"] as const).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => { setMode(m); setErro(null); }}
                  style={{
                    height: 30,
                    borderRadius: 6,
                    border: "none",
                    background: active ? "#FFFFFF" : "transparent",
                    color: active ? "#111111" : "#6F6F6F",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                    fontFamily: "inherit",
                    transition: "background 150ms, color 150ms",
                  }}
                >
                  {m === "login" ? "Entrar" : "Cadastrar"}
                </button>
              );
            })}
          </div>
        )}

        <h2 className="sreli-login-title">
          {isLogin
            ? "Bem-vindo de volta"
            : mode === "esqueci"
              ? "Recuperar senha"
              : "Crie sua conta"}
        </h2>
        <p className="sreli-login-subtitle">
          {isLogin
            ? "Entre para gerenciar seus agendamentos"
            : mode === "esqueci"
              ? "Informe seu e-mail e enviaremos um link para redefinir sua senha."
              : "Preencha os dados para realizar seus agendamentos"}
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
                <EmailField value={email} onChange={setEmail} valid={emailValidShape} />
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
            {isCadastro && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <FloatField
                    label="Nome"
                    value={nome}
                    onChange={(v) => setNome(sanitizeNome(v))}
                    type="text"
                    autoComplete="given-name"
                  />
                  <FloatField
                    label="Sobrenome"
                    value={sobrenome}
                    onChange={(v) => setSobrenome(sanitizeNome(v))}
                    type="text"
                    autoComplete="family-name"
                  />
                </div>
                <div style={{ height: 12 }} />
                <div ref={countryRef} style={{ position: "relative" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "stretch",
                      border: "1.5px solid #E4E4E4",
                      borderRadius: 8,
                      background: "#FFFFFF",
                      overflow: "hidden",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setCountryOpen((v) => !v)}
                      aria-label="Selecionar país"
                      aria-expanded={countryOpen}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "0 10px 0 12px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 18,
                        color: "#111111",
                        fontFamily: "inherit",
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          background: "transparent",
                          fontSize: 20,
                          lineHeight: 1,
                        }}
                      >
                        {country.flag}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6F6F6F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    <input
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(maskBrPhone(e.target.value))}
                      onBlur={() => setWhatsappTouched(true)}
                      onFocus={() => setWhatsappTouched(false)}
                      placeholder="Digite seu telefone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={15}
                      autoComplete="tel-national"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        fontSize: 16,
                        color: "#111111",
                        padding: "14px 14px",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                  {countryOpen && (
                    <div
                      role="listbox"
                      style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        left: 0,
                        right: 0,
                        background: "#FFFFFF",
                        border: "1px solid #E4E4E4",
                        borderRadius: 10,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                        zIndex: 20,
                        overflow: "hidden",
                        maxHeight: 260,
                        overflowY: "auto",
                      }}
                    >
                      {COUNTRIES.map((c) => {
                        const active = c.code === country.code;
                        return (
                          <button
                            key={c.code}
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => { setCountry(c); setCountryOpen(false); }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              width: "100%",
                              padding: "10px 14px",
                              background: active ? "#F3F4F6" : "transparent",
                              border: "none",
                              cursor: "pointer",
                              fontFamily: "inherit",
                              fontSize: 14,
                              color: "#111111",
                              textAlign: "left",
                            }}
                          >
                            <span style={{ fontSize: 20, lineHeight: 1 }}>{c.flag}</span>
                            <span style={{ flex: 1, fontWeight: 500 }}>{c.name}</span>
                            <span style={{ color: "#6F6F6F", fontVariantNumeric: "tabular-nums" }}>{c.dial}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {whatsappTouched && whatsapp.length > 0 && !isPhoneValid(whatsapp) && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                    Adicione um número de telefone válido
                  </div>
                )}
                <div style={{ height: 12 }} />
              </>
            )}

            <EmailField value={email} onChange={setEmail} valid={emailValidShape} />
            <div style={{ height: 12 }} />
            <FloatField
              label="Senha"
              value={senha}
              onChange={setSenha}
              type={showSenha ? "text" : "password"}
              autoComplete={isLogin ? "current-password" : "new-password"}
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
            {isLogin && (
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
              disabled={disabledSubmit}
              style={{
                opacity: disabledSubmit ? 0.5 : 1,
                cursor: disabledSubmit ? "not-allowed" : "pointer",
              }}
            >
              {isLogin ? "Entrar" : "Continuar"}
            </button>

            <div className="sreli-divider" style={{ margin: "20px 0 16px" }}>
              <span className="sreli-divider-line" />
              <span className="sreli-divider-text" style={{ letterSpacing: 0.5 }}>Ou Continue Com</span>
              <span className="sreli-divider-line" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                type="button"
                onClick={handleGoogleClick}
                aria-label="Continuar com Google"
                style={{
                  height: 48, borderRadius: 10,
                  background: "#FFFFFF", border: "1px solid #E5E7EB",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#1A1A1A",
                  fontFamily: "inherit",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.65 4.66-6.08 8-11.3 8-6.63 0-12-5.37-12-12s5.37-12 12-12c3.06 0 5.84 1.16 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.34-.14-2.65-.4-3.5z" />
                  <path fill="#FF3D00" d="M6.31 14.69l6.57 4.82C14.66 15.13 18.97 12 24 12c3.06 0 5.84 1.16 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4 16.32 4 9.66 8.34 6.31 14.69z" />
                  <path fill="#4CAF50" d="M24 44c5.18 0 9.86-1.98 13.41-5.2l-6.19-5.24C29.21 35.09 26.74 36 24 36c-5.2 0-9.62-3.32-11.28-7.95l-6.52 5.02C9.5 39.55 16.23 44 24 44z" />
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.79 2.24-2.23 4.16-4.09 5.56l6.19 5.24C40.96 35.6 44 30.27 44 24c0-1.34-.14-2.65-.4-3.5z" />
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={handleFacebookClick}
                aria-label="Continuar com Facebook"
                style={{
                  height: 48, borderRadius: 10,
                  background: "#FFFFFF", border: "1px solid #E5E7EB",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#1A1A1A",
                  fontFamily: "inherit",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.85v-8.38h-3.05V12h3.05V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12z" />
                </svg>
                Facebook
              </button>
            </div>

            <p
              style={{
                marginTop: 14,
                fontSize: 12,
                color: "#6F6F6F",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              Ao {isLogin ? "entrar" : "se cadastrar"}, você concorda com os{" "}
              <Link
                to="/termos-de-servico"
                style={{ color: "#111111", textDecoration: "underline", fontWeight: 600 }}
              >
                Termos de Serviço
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// referencing CSSProperties to avoid unused-import (kept for clarity)
export const __noop: CSSProperties = {};

/* ---------- Email field with icon, divider and green check ---------- */
function EmailField({
  value,
  onChange,
  valid,
}: {
  value: string;
  onChange: (v: string) => void;
  valid: boolean;
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
        fontFamily: "inherit",
        overflow: "hidden",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 12px",
          color: "#6F6F6F",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      </span>
      <span
        aria-hidden
        style={{ width: 1, background: "#E4E4E4", margin: "10px 0" }}
      />
      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <span
          style={{
            position: "absolute",
            left: 12,
            top: hasValue ? 6 : 14,
            fontSize: hasValue ? 11 : 14,
            color: "#6F6F6F",
            transition: "all 150ms",
            pointerEvents: "none",
            fontWeight: hasValue ? 600 : 400,
          }}
        >
          E-mail
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type="email"
          autoComplete="email"
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 16,
            color: "#111111",
            fontFamily: "inherit",
            padding: hasValue ? "20px 12px 8px" : "14px 12px",
          }}
        />
      </div>
      {hasValue && valid && (
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 12px",
            color: "#16a34a",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </label>
  );
}

/* ---------- Floating Input ---------- */
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
