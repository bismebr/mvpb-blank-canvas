import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/admin/AppContext";
import { COLORS, FONT } from "@/components/admin/ui";
import { AgendamentosTela } from "@/components/admin/AgendamentosTela";
import { ServicosTela, HorariosTela, FuncionariosTela } from "@/components/admin/OutrasTelas";
import { DashboardTela } from "@/components/admin/DashboardTela";
import { MensagensTela } from "@/components/admin/MensagensTela";
import { ClientesTela } from "@/components/admin/ClientesTela";
import { AssinaturaTela } from "@/components/admin/AssinaturaTela";
import { ConfiguracoesTela } from "@/components/admin/ConfiguracoesTela";
import { SistemaTela } from "@/components/admin/SistemaTela";
import { MeuLinkTela } from "@/components/admin/MeuLinkTela";
import { AvaliacoesTela } from "@/components/admin/AvaliacoesTela";
import { SiteConfigProvider, EMPTY_OWNER_CONFIG } from "@/components/admin/SiteConfigContext";
import {
  Link2, Settings, Palette, Star, Sun, Moon,
  Calendar, BarChart3, Globe, Menu as MenuIcon, X,
  LayoutGrid, Clock, User as UserIcon2, Users, Crown, LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isSubscriptionBlocked, type SubscriptionLike } from "@/lib/subscription";


function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.04 21.5h-.004a9.87 9.87 0 01-5.031-1.378l-.36-.214-3.741.981.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.002-5.45 4.436-9.884 9.889-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.892 6.994c-.003 5.45-4.437 9.885-9.887 9.885zM20.52 3.449C18.24 1.245 15.24.01 12.045.01 5.463.01.104 5.369.101 11.951c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.652a11.882 11.882 0 005.71 1.447h.005c6.581 0 11.94-5.358 11.943-11.94 0-3.193-1.245-6.193-3.473-8.406z"/>
    </svg>
  );
}


export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { name: "viewport", content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" },
      { name: "format-detection", content: "telephone=no, email=no, address=no, date=no" },
      { title: "Painel Admin — Bisme" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (typeof s.tab === "string" ? s.tab : undefined) as Tela | undefined,
  }),
  component: AdminPageWithOwnerConfig,
});

type Tela =
  | "agendamentos" | "dashboard" | "mensagens" | "servicos" | "horarios"
  | "funcionarios" | "clientes" | "configuracoes" | "sistema" | "meulink"
  | "modelos" | "assinatura" | "avaliacoes";

type IconCmp = (props: { size?: number }) => React.ReactElement;

const MENU_ITEMS: { key: Tela; label: string; Icon: IconCmp }[] = [
  { key: "servicos",     label: "Serviços",     Icon: ({ size = 20 }) => <LayoutGrid size={size} /> },
  { key: "horarios",     label: "Horários",     Icon: ({ size = 20 }) => <Clock size={size} /> },
  { key: "funcionarios", label: "Funcionários", Icon: ({ size = 20 }) => <UserIcon2 size={size} /> },
  { key: "mensagens",    label: "Mensagens",    Icon: ({ size = 20 }) => <WhatsAppIcon size={size} /> },
  { key: "clientes",     label: "Clientes",     Icon: ({ size = 20 }) => <Users size={size} /> },
  { key: "avaliacoes",   label: "Avaliações",   Icon: ({ size = 20 }) => <Star size={size} /> },
  { key: "assinatura",   label: "Assinatura",   Icon: ({ size = 20 }) => <Crown size={size} /> },
  { key: "sistema",      label: "Configurações", Icon: ({ size = 20 }) => <Settings size={size} /> },
];

const VALID_TELAS: Tela[] = [
  "agendamentos","dashboard","mensagens","servicos","horarios",
  "funcionarios","clientes","configuracoes","sistema","meulink",
  "modelos","assinatura","avaliacoes",
];
const TAB_STORAGE_KEY = "bisme-admin-active-tab";

function readSavedTab(): Tela | null {
  try {
    const v = window.localStorage.getItem(TAB_STORAGE_KEY);
    if (v && (VALID_TELAS as string[]).includes(v)) return v as Tela;
  } catch { /* ignore */ }
  return null;
}

const FOOTER_HEIGHT = 64;

function AdminPage() {
  const { adminEmail, adminName, adminAvatar, signOut, setAdmin, setAdminEmail, setAdminName, setAdminAvatar } = useApp();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [tela, setTelaRaw] = useState<Tela>(() => {
    if (search.tab && (VALID_TELAS as string[]).includes(search.tab)) return search.tab;
    if (typeof window !== "undefined") {
      const saved = readSavedTab();
      if (saved) return saved;
    }
    return "agendamentos";
  });
  const setTela = React.useCallback((t: Tela) => {
    setTelaRaw(t);
    try { window.localStorage.setItem(TAB_STORAGE_KEY, t); } catch { /* ignore */ }
  }, []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("bisme-admin-theme");
      if (saved === "dark" || saved === "light") setTheme(saved);
    } catch { /* ignore */ }
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try { window.localStorage.setItem("bisme-admin-theme", next); } catch { /* ignore */ }
      return next;
    });
  }

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionLike | null>(null);
  const trialStartedForRef = useRef<string | null>(null);

  const blocked = isSubscriptionBlocked(subscription);
  const ALLOWED_WHEN_BLOCKED: Tela[] = ["assinatura"];

  const setTelaGuarded = React.useCallback((t: Tela) => {
    if (blocked && !ALLOWED_WHEN_BLOCKED.includes(t)) {
      setTela("assinatura");
      return;
    }
    setTela(t);
  }, [blocked, setTela]);

  // Redireciona automaticamente pra Assinatura caso o painel esteja bloqueado.
  useEffect(() => {
    if (blocked && tela !== "assinatura") {
      setTela("assinatura");
    }
  }, [blocked, tela, setTela]);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        setAuthReady(false);
        navigate({ to: "/empresario/login", replace: true });
        return;
      }
      // Detecta troca de sessão (ex.: cliente final logou no mesmo navegador).
      // Sai do painel e manda para o login do empresário — nunca para o onboarding,
      // que é apenas para o fluxo inicial do empresário recém-cadastrado.
      if (currentUserId && currentUserId !== data.user.id) {
        setAuthReady(false);
        setAdmin(false);
        navigate({ to: "/empresario/login", replace: true });
        return;
      }
      setCurrentUserId(data.user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile?.full_name) {
        const parts = profile.full_name.trim().split(/\s+/);
        setAdminName(parts.slice(0, 2).join(" "));
      }
      if (profile?.avatar_url) {
        setAdminAvatar(profile.avatar_url);
      }
      if (data.user.email) setAdminEmail(data.user.email);
      setAdmin(true);
      const { data: member, error: memberErr } = await supabase
        .from("company_members")
        .select("company_id")
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (memberErr) {
        // Erro transitório (ex.: token expirando): não derruba a sessão.
        console.warn("[admin] company_members lookup falhou:", memberErr);
        return;
      }
      if (!member?.company_id) {
        // Usuário autenticado sem vínculo de empresa: pode ser cliente final
        // logado no mesmo navegador. Manda para o login do empresário, NÃO
        // para o onboarding, para evitar criar empresas indevidas.
        setAuthReady(false);
        setAdmin(false);
        navigate({ to: "/empresario/login", replace: true });
        return;
      }
      setCompanyId(member.company_id);

      // Inicia trial de 7 dias no primeiro acesso ao painel.
      // A RPC é idempotente: se já houver trial iniciado ou assinatura
      // active/past_due/canceled, ela não sobrescreve nada.
      if (trialStartedForRef.current !== member.company_id) {
        trialStartedForRef.current = member.company_id;
        const { error: trialErr } = await supabase.rpc("start_trial_if_needed", {
          _company_id: member.company_id,
        });
        if (trialErr) {
          console.warn("[admin] start_trial_if_needed falhou:", trialErr);
        }
      }

      // Carrega subscription real pra decidir se o painel deve ficar bloqueado.
      const { data: subRow, error: subErr } = await supabase
        .from("subscriptions")
        .select("plan,status,trial_started_at,trial_ends_at,current_period_start,current_period_end,canceled_at")
        .eq("company_id", member.company_id)
        .maybeSingle();
      if (cancelled) return;
      if (subErr) {
        console.warn("[admin] subscription lookup falhou:", subErr);
      } else {
        setSubscription((subRow ?? null) as SubscriptionLike | null);
      }

      setAuthReady(true);
    }
    void check();

    // Reavalia sempre que a sessão Supabase mudar (login do cliente final em
    // outra aba, token refresh com troca de usuário, signOut etc.).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setAuthReady(false);
        setAdmin(false);
        trialStartedForRef.current = null;
        setCompanyId(null);
        navigate({ to: "/empresario/login", replace: true });
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        void check();
      }
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sempre voltar ao topo ao trocar de aba do painel administrativo.
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      const main = document.querySelector("main");
      if (main) main.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch { /* ignore */ }
  }, [tela]);

  if (!authReady) return null;

  function go(t: Tela) {
    setTelaGuarded(t);
    setMenuOpen(false);
  }

  const doSignOut = async () => {
    await supabase.auth.signOut();
    signOut();
    navigate({ to: "/empresario/login", replace: true });
  };

  return (
    <div data-admin-theme={theme} style={{ background: COLORS.bgBase, minHeight: "100vh", fontFamily: FONT, color: COLORS.textPrimary }}>
      <style>{`
        .admin-sidebar { display: none; }
        @media (min-width: 1024px) {
          .admin-sidebar { display: flex; }
          .admin-bottomnav { display: none !important; }
          .admin-main { padding-left: 240px !important; padding-bottom: 24px !important; }
        }
      `}</style>

      <SideNav
        tela={tela}
        onSelect={go}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSignOut={doSignOut}
        adminName={adminName}
        adminEmail={adminEmail}
        adminAvatar={adminAvatar}
      />

      <main className="admin-main" style={{ paddingBottom: `calc(${FOOTER_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 8px)` }}>
        {tela === "meulink" && <MeuLinkTela onGoToConfig={() => setTela("configuracoes")} />}
        {tela === "agendamentos" && <AgendamentosTela addOpen={addOpen} onClose={() => setAddOpen(false)} onAdd={() => setAddOpen(true)} />}
        {tela === "servicos" && <ServicosTela />}
        {tela === "horarios" && <HorariosTela />}
        {tela === "dashboard" && <DashboardTela onNavigate={(t) => setTela(t)} />}
        {tela === "mensagens" && <MensagensTela />}
        {tela === "funcionarios" && <FuncionariosTela />}
        {tela === "clientes" && <ClientesTela />}
        {tela === "assinatura" && <AssinaturaTela companyId={companyId} blocked={blocked} />}
        {tela === "avaliacoes" && <AvaliacoesTela />}
        {(tela === "configuracoes" || tela === "modelos") && <ConfiguracoesTela onGoToLinks={() => setTela("meulink")} />}
        {tela === "sistema" && <SistemaTela />}
      </main>


      {/* Footer / Bottom Navigation (mobile) */}
      <div className="admin-bottomnav">
        <BottomNav
          tela={tela}
          onSelect={go}
          onToggleTheme={toggleTheme}
          theme={theme}
          onOpenMenu={() => setMenuOpen(true)}
          menuOpen={menuOpen}
        />
      </div>

      {/* Menu modal (3 traços) */}
      <MenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        currentTela={tela}
        onSelect={go}
        onSignOut={doSignOut}
        adminName={adminName}
        adminEmail={adminEmail}
        adminAvatar={adminAvatar}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    </div>
  );
}

interface SideNavProps {
  tela: Tela;
  onSelect: (t: Tela) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onSignOut: () => void;
  adminName: string | null | undefined;
  adminEmail: string | null | undefined;
  adminAvatar: string | null | undefined;
}

function SideNav({ tela, onSelect, theme, onToggleTheme, onSignOut, adminName, adminEmail, adminAvatar }: SideNavProps) {
  const isLight = theme === "light";
  const bg = isLight ? "#FFFFFF" : COLORS.bgSurface;
  const border = isLight ? "#E5E7EB" : COLORS.border;
  const inactive = isLight ? "#4B5563" : COLORS.textMuted;
  const activeBg = isLight ? "#EFF6FF" : "rgba(86,144,245,0.15)";
  const activeText = isLight ? "#2563EB" : COLORS.accentLight;
  const subText = isLight ? "#6B7280" : COLORS.textMuted;

  const items: { key: string; label: string; Icon: IconCmp; active: boolean; onClick: () => void }[] = [
    { key: "agendamentos", label: "Agenda",       Icon: ({ size = 18 }) => <Calendar size={size} />,      active: tela === "agendamentos",                        onClick: () => onSelect("agendamentos") },
    { key: "dashboard",    label: "Dashboard",    Icon: ({ size = 18 }) => <BarChart3 size={size} />,     active: tela === "dashboard",                           onClick: () => onSelect("dashboard") },
    { key: "meusite",      label: "Meu site",     Icon: ({ size = 18 }) => <Globe size={size} />,         active: tela === "configuracoes" || tela === "modelos", onClick: () => onSelect("configuracoes") },
    { key: "mensagens",    label: "Mensagens",    Icon: ({ size = 18 }) => <WhatsAppIcon size={size} />,  active: tela === "mensagens",                           onClick: () => onSelect("mensagens") },
    { key: "servicos",     label: "Serviços",     Icon: ({ size = 18 }) => <LayoutGrid size={size} />,    active: tela === "servicos",                            onClick: () => onSelect("servicos") },
    { key: "horarios",     label: "Horários",     Icon: ({ size = 18 }) => <Clock size={size} />,         active: tela === "horarios",                            onClick: () => onSelect("horarios") },
    { key: "funcionarios", label: "Funcionários", Icon: ({ size = 18 }) => <UserIcon2 size={size} />,     active: tela === "funcionarios",                        onClick: () => onSelect("funcionarios") },
    { key: "clientes",     label: "Clientes",     Icon: ({ size = 18 }) => <Users size={size} />,         active: tela === "clientes",                            onClick: () => onSelect("clientes") },
    { key: "avaliacoes",   label: "Avaliações",   Icon: ({ size = 18 }) => <Star size={size} />,          active: tela === "avaliacoes",                          onClick: () => onSelect("avaliacoes") },
    { key: "assinatura",   label: "Assinatura",   Icon: ({ size = 18 }) => <Crown size={size} />,         active: tela === "assinatura",                          onClick: () => onSelect("assinatura") },
    { key: "meulink",      label: "Meu link",     Icon: ({ size = 18 }) => <Link2 size={size} />,         active: tela === "meulink",                             onClick: () => onSelect("meulink") },
    { key: "sistema",      label: "Configurações",Icon: ({ size = 18 }) => <Settings size={size} />,      active: tela === "sistema",                             onClick: () => onSelect("sistema") },
  ];

  const initial = (adminName || adminEmail || "?").trim().charAt(0).toUpperCase();

  return (
    <aside
      className="admin-sidebar"
      aria-label="Navegação principal"
      style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: 240, zIndex: 110,
        background: bg, borderRight: `1px solid ${border}`,
        flexDirection: "column", fontFamily: FONT,
      }}
    >
      <div style={{ borderBottom: `1px solid ${border}`, padding: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 6px 10px", minWidth: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", background: "#5690f5", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontWeight: 700, flexShrink: 0, fontSize: 14 }}>
            {adminAvatar ? <img src={adminAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, color: isLight ? "#111827" : COLORS.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{adminName || "Empresário"}</div>
            <div style={{ fontSize: 11, color: subText, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{adminEmail || "—"}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Tema claro" : "Tema escuro"}
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
            style={{ flex: "0 0 auto", width: 36, height: 36, borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: inactive, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={onSignOut}
            style={{ flex: 1, height: 36, borderRadius: 8, border: `1px solid ${isLight ? "#FCA5A5" : "#7f1d1d"}`, background: isLight ? "#FEF2F2" : "rgba(185,28,28,0.15)", color: isLight ? "#B91C1C" : "#FCA5A5", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FONT, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={it.onClick}
            aria-current={it.active ? "page" : undefined}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 12px", marginBottom: 2, borderRadius: 8,
              background: it.active ? activeBg : "transparent",
              color: it.active ? activeText : inactive,
              border: "none", cursor: "pointer", fontFamily: FONT,
              fontSize: 14, fontWeight: it.active ? 600 : 500, textAlign: "left",
              transition: "background 120ms ease, color 120ms ease",
            }}
          >
            <it.Icon size={18} />
            <span>{it.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

interface BottomNavProps {
  tela: Tela;
  onSelect: (t: Tela) => void;
  onToggleTheme: () => void;
  theme: "light" | "dark";
  onOpenMenu: () => void;
  menuOpen: boolean;
}

function BottomNav({ tela, onSelect, onToggleTheme, theme, onOpenMenu, menuOpen }: BottomNavProps) {
  const items: { key: string; label: string; Icon: IconCmp; active: boolean; onClick: () => void }[] = [
    { key: "agendamentos", label: "Agenda", Icon: ({ size = 20 }) => <Calendar size={size} />, active: tela === "agendamentos", onClick: () => onSelect("agendamentos") },
    { key: "dashboard",    label: "Dashboard",    Icon: ({ size = 20 }) => <BarChart3 size={size} />, active: tela === "dashboard",    onClick: () => onSelect("dashboard") },
    { key: "meusite",      label: "Meu site",     Icon: ({ size = 20 }) => <Globe size={size} />,    active: tela === "configuracoes" || tela === "modelos", onClick: () => onSelect("configuracoes") },
    { key: "meulink",      label: "Meu link",     Icon: ({ size = 20 }) => <Link2 size={size} />,    active: tela === "meulink",     onClick: () => onSelect("meulink") },
    { key: "menu",         label: "Menu",         Icon: ({ size = 20 }) => <MenuIcon size={size} />, active: menuOpen, onClick: onOpenMenu },
  ];

  const isLight = theme === "light";
  const navBg = isLight ? "#FFFFFF" : COLORS.bgSurface;
  const navBorder = isLight ? "#E5E7EB" : COLORS.border;
  const inactiveColor = isLight ? "#6B7280" : COLORS.textMuted;
  const activeTextColor = isLight ? "#5690f5" : COLORS.accentLight;
  const activeIconColor = isLight ? "#5690f5" : COLORS.accentLight;

  return (
    <nav
      style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 120,
        background: navBg,
        borderTop: `1px solid ${isLight ? "#e5e5e5" : navBorder}`,
        boxShadow: "none",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        fontFamily: FONT,
      }}
      aria-label="Navegação principal"
    >
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
        height: FOOTER_HEIGHT, alignItems: "stretch",
        maxWidth: 720, margin: "0 auto",
      }}>
        {items.map((it) => {
          const iconColor = it.active ? activeIconColor : inactiveColor;
          const textColor = it.active ? activeTextColor : inactiveColor;
          return (
            <button
              key={it.key}
              type="button"
              onClick={it.onClick}
              aria-label={it.label}
              aria-current={it.active ? "page" : undefined}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 3, padding: "6px 4px",
                background: "transparent", border: "none", cursor: "pointer",
                color: iconColor, fontFamily: FONT,
                transition: "color 150ms ease",
                minWidth: 0,
              }}
            >
              <it.Icon size={20} />
              <span style={{
                fontSize: 10.5, fontWeight: it.active ? 700 : 500, color: textColor,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
              }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

interface MenuSheetProps {
  open: boolean;
  onClose: () => void;
  currentTela: Tela;
  onSelect: (t: Tela) => void;
  onSignOut: () => void;
  adminName: string | null | undefined;
  adminEmail: string | null | undefined;
  adminAvatar: string | null | undefined;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

function MenuSheet({ open, onClose, currentTela, onSelect, onSignOut, adminName, adminEmail, adminAvatar, theme, onToggleTheme }: MenuSheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setDragY(0);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const initial = (adminName || adminEmail || "?").trim().charAt(0).toUpperCase();
  const isDark = theme === "dark";
  const sheetBg = isDark ? COLORS.bgSurface : "#FFFFFF";
  const sheetText = isDark ? COLORS.textPrimary : "#111827";
  const subText = isDark ? COLORS.textMuted : "#6B7280";
  const itemBg = isDark ? COLORS.bgBase : "#F9FAFB";
  const itemBorder = isDark ? COLORS.border : "#E5E7EB";
  const grabberBg = isDark ? COLORS.border : "#E5E7EB";

  function onGrabberPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragStartY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onGrabberPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStartY.current == null) return;
    const dy = e.clientY - dragStartY.current;
    setDragY(Math.max(0, dy));
  }
  function onGrabberPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStartY.current == null) return;
    const dy = e.clientY - dragStartY.current;
    dragStartY.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (dy > 80) {
      onClose();
    } else {
      setDragY(0);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center",
        fontFamily: FONT,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Mais opções"
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520,
          background: sheetBg,
          color: sheetText,
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          padding: "12px 16px calc(20px + env(safe-area-inset-bottom, 0px))",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.2)",
          maxHeight: "85vh", overflowY: "auto",
          animation: "bismeSheetUp 220ms ease",
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: dragStartY.current == null ? "transform 180ms ease" : "none",
        }}
      >
        {/* grabber */}
        <div
          onPointerDown={onGrabberPointerDown}
          onPointerMove={onGrabberPointerMove}
          onPointerUp={onGrabberPointerUp}
          onPointerCancel={onGrabberPointerUp}
          style={{ padding: "6px 0 10px", margin: "-6px auto 4px", width: 80, display: "flex", justifyContent: "center", cursor: "grab", touchAction: "none" }}
          aria-label="Arraste para fechar"
        >
          <div style={{ width: 40, height: 4, borderRadius: 4, background: grabberBg }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", background: "#5690f5", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontWeight: 700, flexShrink: 0 }}>
              {adminAvatar ? <img src={adminAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: sheetText, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{adminName || "Cliente"}</div>
              <div style={{ fontSize: 12, color: subText, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{adminEmail || "—"}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? "Tema claro" : "Tema escuro"}
              title={isDark ? "Tema claro" : "Tema escuro"}
              style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${itemBorder}`, background: itemBg, color: sheetText, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${itemBorder}`, background: itemBg, color: sheetText, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {MENU_ITEMS.map(({ key, label, Icon }) => {
            const active = currentTela === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key)}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 12px", borderRadius: 12,
                  background: active ? COLORS.accentLight : itemBg,
                  color: active ? "#FFFFFF" : sheetText,
                  border: `1px solid ${active ? COLORS.accentLight : itemBorder}`,
                  cursor: "pointer", fontFamily: FONT, fontWeight: 600, fontSize: 14,
                  textAlign: "left",
                }}
              >
                <Icon size={18} />
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => { onClose(); onSignOut(); }}
          style={{
            marginTop: 16, width: "100%", height: 44, borderRadius: 12,
            border: "1px solid #FCA5A5", background: isDark ? "rgba(185,28,28,0.15)" : "#FEF2F2", color: isDark ? "#FCA5A5" : "#B91C1C",
            fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: FONT,
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <LogOut size={16} /> Sair
        </button>

        <style>{`@keyframes bismeSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      </div>
    </div>
  );
}

function AdminPageWithOwnerConfig() {
  return (
    <SiteConfigProvider initialConfig={EMPTY_OWNER_CONFIG}>
      <AdminPage />
    </SiteConfigProvider>
  );
}
