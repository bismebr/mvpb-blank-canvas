import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useSiteConfig, SITE_PUBLIC_BASE } from "./SiteConfigContext";
import { useApp } from "./AppContext";
import { COLORS, FONT, cardStyle, inputStyle, saveBtn, Label, PageHeader } from "./ui";
import { Check, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentCompanyId } from "@/lib/companySite";

/* ---------- Slug helpers ---------- */
function sanitizeSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_-]/g, "");
}

const RESERVED_SLUGS = new Set([
  "admin", "bisme", "api", "auth", "empresario", "meus-agendamentos",
  "planos", "venda", "sobre", "quem-somos", "avaliacoes",
  "politica-privacidade", "termos-de-servico", "bisme-admin",
]);

async function checkSlugAvailability(
  slug: string,
  currentCompanyId: string | null,
  currentSlug: string,
): Promise<boolean> {
  if (slug === currentSlug) return true;
  if (RESERVED_SLUGS.has(slug)) return false;
  const { data, error } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[sistema] checkSlug", error);
    return false;
  }
  if (!data) return true;
  return currentCompanyId != null && data.id === currentCompanyId;
}

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, fontFamily: FONT }}>
        {children}
      </h3>
      {hint && (
        <p style={{ margin: "4px 0 0", fontSize: 13, color: COLORS.textMuted, fontFamily: FONT, lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function ReqItem({ ok, label }: { ok: boolean; label: string }) {
  const color = ok ? "#16a34a" : COLORS.textMuted;
  return (
    <li style={{ display: "flex", alignItems: "center", gap: 8, color, fontSize: 13 }}>
      <Check size={14} strokeWidth={3} />
      <span>{label}</span>
    </li>
  );
}

function PasswordField({
  value, onChange, onBlur, placeholder, visible, onToggleVisible,
  invalid, autoComplete, ariaLabelToggle,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  visible: boolean;
  onToggleVisible?: () => void;
  invalid?: boolean;
  autoComplete?: string;
  ariaLabelToggle?: string;
}) {
  const showToggle = typeof onToggleVisible === "function";
  return (
    <div style={{ position: "relative" }}>
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          ...inputStyle,
          paddingRight: showToggle ? 44 : inputStyle.paddingRight ?? undefined,
          borderColor: invalid ? "#e11d48" : "#E4E4E4",
        }}
      />
      {showToggle && (
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={ariaLabelToggle}
          aria-pressed={visible}
          title={visible ? "Ocultar senha" : "Mostrar senha"}
          style={{
            position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
            width: 36, height: 36, display: "inline-flex", alignItems: "center",
            justifyContent: "center", background: "transparent", border: "none",
            color: COLORS.textMuted, cursor: "pointer", borderRadius: 8, padding: 0,
          }}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  );
}

export function SistemaTela() {
  const { config, updateConfig } = useSiteConfig();
  const { adminEmail, setAdminEmail, hasPassword, setHasPassword } = useApp();

  /* ---------- Troca de e-mail ---------- */
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  const companyIdRef = useRef<string | null>(null);
  const [dbSlug, setDbSlug] = useState<string>(config.username || "");
  const [hydrated, setHydrated] = useState(false);

  /* ---------- Hidratação real: company + auth ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: userData }, cid] = await Promise.all([
        supabase.auth.getUser(),
        resolveCurrentCompanyId(),
      ]);
      if (cancelled) return;
      if (userData?.user?.email) setAdminEmail(userData.user.email);
      if (cid) {
        companyIdRef.current = cid;
        const { data: comp } = await supabase
          .from("companies")
          .select("slug")
          .eq("id", cid)
          .maybeSingle();
        if (!cancelled && comp?.slug) {
          setDbSlug(comp.slug);
          setSlug(comp.slug);
          updateConfig({ username: comp.slug });
        }
      }
      setHydrated(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Slug ---------- */
  const [slug, setSlug] = useState(config.username || "");
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [savingSlug, setSavingSlug] = useState(false);

  useEffect(() => {
    if (!slug) { setSlugStatus("idle"); return; }
    if (slug.length < 3) { setSlugStatus("invalid"); return; }
    if (slug === dbSlug) { setSlugStatus("available"); return; }
    setSlugStatus("checking");
    const handle = window.setTimeout(async () => {
      const ok = await checkSlugAvailability(slug, companyIdRef.current, dbSlug);
      setSlugStatus(ok ? "available" : "taken");
    }, 450);
    return () => window.clearTimeout(handle);
  }, [slug, dbSlug]);

  const slugSuggestions = useMemo(() => {
    if (slugStatus !== "taken" || !slug) return [] as string[];
    const base = slug.replace(/[-_]+$/g, "") || slug;
    const list = [`${base}1`, `${base}br`, `${base}_oficial`];
    return Array.from(new Set(list.map(sanitizeSlug))).filter(Boolean).slice(0, 3);
  }, [slug, slugStatus]);

  const slugDirty = slug !== dbSlug;
  const canSaveSlug = slugDirty && slugStatus === "available" && !savingSlug;

  async function handleSaveSlug() {
    const next = sanitizeSlug(slug);
    if (!next) { toast.error("Informe um nome de usuário válido."); return; }
    if (slugStatus !== "available") { toast.error("Esse nome de usuário não está disponível."); return; }
    const cid = companyIdRef.current;
    if (!cid) { toast.error("Empresa não identificada."); return; }
    setSavingSlug(true);
    const { data, error } = await supabase.rpc("update_company_slug", {
      _company_id: cid,
      _new_slug: next,
    });
    setSavingSlug(false);
    if (error) {
      console.error("[sistema] update_company_slug", error.message);
      const msg = error.message || "";
      if (/slug_taken/.test(msg)) {
        toast.error("Esta URL já está em uso. Escolha outra.");
      } else if (/invalid_slug/.test(msg)) {
        toast.error("Use apenas letras, números e hífen.");
      } else if (/forbidden|not_authenticated/.test(msg)) {
        toast.error("Você não tem permissão para alterar esta URL.");
      } else {
        toast.error("Não foi possível salvar a URL. Tente novamente.");
      }
      return;
    }
    const savedSlug = (typeof data === "string" && data) || next;
    setDbSlug(savedSlug);
    setSlug(savedSlug);
    updateConfig({ username: savedSlug });
    toast.success("URL atualizada com sucesso!");
  }

  /* ---------- Login ---------- */
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [touchedSenha, setTouchedSenha] = useState(false);
  const [touchedConfirma, setTouchedConfirma] = useState(false);
  const [showNova, setShowNova] = useState(false);
  const [showAtual, setShowAtual] = useState(false);
  const [savingLogin, setSavingLogin] = useState(false);

  const reqLetter = /[A-Za-z]/.test(novaSenha);
  const reqDigit = /\d/.test(novaSenha);
  const reqLength = novaSenha.length >= 8;
  const senhaValida = reqLetter && reqDigit && reqLength;
  const senhasBatem = novaSenha.length > 0 && novaSenha === confirmaSenha;

  // Estados separados por bloco: digitar apenas a senha atual NÃO conta como alteração.
  const passwordChanged = novaSenha.length > 0 || confirmaSenha.length > 0;
  const loginDirty = passwordChanged;

  async function handleSaveLogin() {
    const trocarSenha = passwordChanged;
    if (trocarSenha) {
      setTouchedSenha(true);
      setTouchedConfirma(true);
      if (hasPassword && senhaAtual.trim().length === 0) {
        toast.error("Informe sua senha atual para confirmar a alteração.");
        return;
      }
      if (!senhaValida) { toast.error("A nova senha não atende aos requisitos."); return; }
      if (!senhasBatem) { toast.error("A confirmação de senha não confere."); return; }
    }
    if (!trocarSenha) return;
    setSavingLogin(true);
    try {
      // Verifica senha atual (se aplicável) via reautenticação leve
      if (trocarSenha && hasPassword) {
        const { error: reErr } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: senhaAtual,
        });
        if (reErr) {
          toast.error("Senha atual incorreta.");
          setSavingLogin(false);
          return;
        }
      }
      // Senha
      if (trocarSenha) {
        const { error } = await supabase.auth.updateUser({ password: novaSenha });
        if (error) {
          toast.error("Não foi possível alterar a senha. Tente novamente.");
          setSavingLogin(false);
          return;
        }
        setHasPassword(true);
      }
      toast.success("Senha atualizada com sucesso!");
      setSenhaAtual(""); setNovaSenha(""); setConfirmaSenha("");
      setTouchedSenha(false); setTouchedConfirma(false);
      setShowNova(false); setShowAtual(false);
    } finally {
      setSavingLogin(false);
    }
  }

  if (!hydrated) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: COLORS.textMuted, fontFamily: FONT }}>
        Carregando…
      </div>
    );
  }

  return (
    <div style={{ padding: "30px 16px 8px", maxWidth: 880, margin: "0 auto", fontFamily: FONT, color: COLORS.textPrimary }}>
      <PageHeader
        title="Configurações do seu sistema"
        subtitle="Gerencie seus dados de acesso, nome de usuário e preferências principais da sua conta."
      />

      {/* Slug */}
      <section style={{ ...cardStyle, marginBottom: 18 }}>
        <SectionTitle>Nome de usuário</SectionTitle>

        <Label>Seu link público</Label>
        <div className="bisme-input-group adm-slug-group" style={{
          display: "flex", alignItems: "stretch",
          border: `1.5px solid #E4E4E4`, borderRadius: 8, overflow: "hidden",
          background: "#FFFFFF",
        }}>
          <span className="bisme-input-prefix" style={{
            display: "flex", alignItems: "center", padding: "0 12px",
            background: "#f2f1f6", color: "#6F6F6F", fontSize: 14,
            borderRight: `1px solid #E4E4E4`, whiteSpace: "nowrap",
          }}>
            {SITE_PUBLIC_BASE}
          </span>
          <input
            className="bisme-input-group-control"
            value={slug}
            onChange={(e) => setSlug(sanitizeSlug(e.target.value))}
            placeholder="seunegocio"
            maxLength={40}
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            style={{
              flex: 1, minWidth: 0, height: 48, border: "none", outline: "none",
              padding: "0 14px", fontSize: 16, color: "#111111", fontFamily: FONT,
              background: "transparent",
            }}
          />
        </div>

        {slugStatus === "checking" && (
          <div style={{ marginTop: 8, fontSize: 13, color: COLORS.textMuted }}>Verificando disponibilidade...</div>
        )}
        {slugStatus === "invalid" && (
          <div style={{ marginTop: 8, fontSize: 13, color: "#c0392b" }}>Use no mínimo 3 caracteres.</div>
        )}
        {slugStatus === "available" && slug !== dbSlug && (
          <div style={{ marginTop: 8, fontSize: 13, color: "#0a8a4a" }}>
            Esse nome de usuário está disponível.
          </div>
        )}
        {slugStatus === "taken" && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 13, color: "#c0392b" }}>
              O nome de usuário <strong>{slug}</strong> não está disponível.
            </div>
            {slugSuggestions.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>Sugestões disponíveis:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {slugSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSlug(s)}
                      style={{
                        border: `1px solid ${COLORS.border}`,
                        background: COLORS.bgElevated,
                        padding: "6px 12px", borderRadius: 999, fontSize: 13,
                        color: COLORS.textPrimary, cursor: "pointer", fontFamily: FONT,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {slug && slug !== dbSlug && slugStatus === "available" && (
          <div style={{ marginTop: 12, padding: "10px 12px", background: COLORS.bgElevated, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, color: COLORS.textPrimary }}>
            Ao salvar, seu link público passará a ser <strong>{SITE_PUBLIC_BASE}{slug}</strong>. O link anterior deixará de funcionar.
          </div>
        )}

        {canSaveSlug && (
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleSaveSlug}
              disabled={savingSlug}
              style={{ ...saveBtn, padding: "0 22px", opacity: savingSlug ? 0.6 : 1 }}
            >
              {savingSlug ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        )}
      </section>

      {/* Login */}
      <section style={cardStyle}>
        <SectionTitle
          hint={
            !hasPassword
              ? "Você entrou com o Google. Defina uma senha caso queira também acessar por e-mail/senha."
              : "Defina uma nova senha. Deixe os campos de senha em branco para manter a senha atual."
          }
        >
          Dados de acesso
        </SectionTitle>

        <div style={{ marginBottom: 14 }}>
          <Label>E-mail de acesso</Label>
          <input
            type="email"
            value={adminEmail || ""}
            readOnly
            disabled
            style={{
              ...inputStyle,
              background: "var(--adm-bg-elevated)",
              color: "var(--adm-text-muted)",
              borderColor: "var(--adm-border)",
              cursor: "default",
              WebkitUserSelect: "none",
              userSelect: "none",
              opacity: 0.85,
            }}
            autoComplete="email"
          />
        </div>

        {hasPassword && (
          <div style={{ marginBottom: 14 }}>
            <Label>Senha atual</Label>
            <PasswordField
              value={senhaAtual}
              onChange={setSenhaAtual}
              placeholder="Digite sua senha atual"
              visible={showAtual}
              onToggleVisible={() => setShowAtual((v) => !v)}
              autoComplete="current-password"
              ariaLabelToggle={showAtual ? "Ocultar senha atual" : "Mostrar senha atual"}
            />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <Label>Nova senha</Label>
          <PasswordField
            value={novaSenha}
            onChange={setNovaSenha}
            onBlur={() => setTouchedSenha(true)}
            placeholder="Digite a nova senha"
            visible={showNova}
            onToggleVisible={() => setShowNova((v) => !v)}
            invalid={touchedSenha && novaSenha.length > 0 && !senhaValida}
            autoComplete="new-password"
            ariaLabelToggle={showNova ? "Ocultar senhas" : "Mostrar senhas"}
          />
          {(touchedSenha && novaSenha) || novaSenha.length > 0 ? (
            <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "flex", flexDirection: "column", gap: 4 }}>
              <ReqItem ok={reqLetter} label="ao menos uma letra" />
              <ReqItem ok={reqDigit} label="ao menos um dígito" />
              <ReqItem ok={reqLength} label="8 caracteres ou mais" />
            </ul>
          ) : null}
        </div>

        <div style={{ marginBottom: 14 }}>
          <Label>Confirmar nova senha</Label>
          <PasswordField
            value={confirmaSenha}
            onChange={setConfirmaSenha}
            onBlur={() => setTouchedConfirma(true)}
            placeholder="Repita a nova senha"
            visible={showNova}
            invalid={touchedConfirma && confirmaSenha.length > 0 && !senhasBatem}
            autoComplete="new-password"
          />
          {touchedConfirma && confirmaSenha && !senhasBatem && (
            <div style={{ marginTop: 6, fontSize: 12.5, color: "#e11d48" }}>
              A confirmação de senha não confere.
            </div>
          )}
        </div>

        {loginDirty && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleSaveLogin}
              disabled={savingLogin}
              style={{ ...saveBtn, padding: "0 22px", opacity: savingLogin ? 0.6 : 1 }}
            >
              {savingLogin ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
