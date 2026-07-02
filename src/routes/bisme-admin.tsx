import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  LayoutDashboard, Filter, Building2, CreditCard, BarChart3, Users, CalendarDays,
  DollarSign, LifeBuoy, ShieldAlert, Settings, Trash2, Search, Menu, X, AlertTriangle,
  TrendingUp, Activity, Heart, Trophy, Bell,
} from "lucide-react";

/* ============================================================
   /bisme-admin — Painel Administrativo Master da Bisme
   Estrutura visual completa, pronta para integração com Supabase.
   Sem dados falsos persistidos, sem localStorage, sem auth fake.
   ============================================================ */

export const Route = createFileRoute("/bisme-admin")({
  head: () => ({
    meta: [
      { title: "Bisme · Painel Master" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
    ],
  }),
  component: BismeAdminPage,
});

/* ---------- Design tokens (alinhados ao admin existente) ---------- */
const C = {
  bg: "#F7F7F5",
  surface: "#FFFFFF",
  elevated: "#FAFAF8",
  border: "#ECECEC",
  borderStrong: "#E2E2E0",
  text: "#111111",
  textMuted: "#6B7280",
  textSubtle: "#9CA3AF",
  accent: "#F6671B",
  accentSoft: "#FEEDDB",
  ok: "#16A34A",
  okSoft: "#DCFCE7",
  warn: "#D97706",
  warnSoft: "#FEF3C7",
  danger: "#5690f5",
  dangerSoft: "#FFF1EA",
  info: "#2563EB",
  infoSoft: "#DBEAFE",
  purple: "#7C3AED",
  purpleSoft: "#EDE9FE",
};
const FONT = "'Inter', 'Inter', system-ui, sans-serif";

/* ---------- Tipos de seção ---------- */
type SectionId =
  | "overview" | "funnel" | "companies" | "subscriptions" | "analytics"
  | "endusers" | "appointments" | "finance" | "support" | "logs"
  | "settings" | "trash";

const SECTIONS: { id: SectionId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview",      label: "Visão Geral",         icon: LayoutDashboard },
  { id: "funnel",        label: "Funil de Conversão",  icon: Filter },
  { id: "companies",     label: "Empresas / Clientes", icon: Building2 },
  { id: "subscriptions", label: "Assinaturas e Planos",icon: CreditCard },
  { id: "analytics",     label: "Acessos & Analytics", icon: BarChart3 },
  { id: "endusers",      label: "Usuários Finais",     icon: Users },
  { id: "appointments",  label: "Agendamentos",        icon: CalendarDays },
  { id: "finance",       label: "Financeiro",          icon: DollarSign },
  { id: "support",       label: "Suporte",             icon: LifeBuoy },
  { id: "logs",          label: "Logs & Segurança",    icon: ShieldAlert },
  { id: "settings",      label: "Configurações",       icon: Settings },
  { id: "trash",         label: "Lixeira / Exclusões", icon: Trash2 },
];

/* ============================================================
   Página principal + guard preparado p/ super_admin
   ============================================================ */

// Modo preview temporário: libera visualização do painel sem auth real.
// NÃO salva nada no navegador. Remover quando o Supabase for conectado.
const PREVIEW_MODE = true;

function BismeAdminPage() {
  // TODO(supabase): substituir por consulta real à tabela user_roles
  //   const { data: { user } } = await supabase.auth.getUser();
  //   const { data } = await supabase.from('user_roles')
  //     .select('role').eq('user_id', user.id).eq('role','super_admin').maybeSingle();
  //   const isSuperAdmin = !!data;
  const isSuperAdmin = false;
  const cloudReady = false;

  if (!isSuperAdmin && !PREVIEW_MODE) {
    return <AccessGate cloudReady={cloudReady} />;
  }
  return <MasterLayout previewMode={!isSuperAdmin} />;
}

/* ---------- Tela de acesso negado / aguardando Cloud ---------- */
function AccessGate({ cloudReady }: { cloudReady: boolean }) {
  return (
    <div style={{
      minHeight: "100vh", display: "grid", placeItems: "center",
      background: C.bg, fontFamily: FONT, padding: 24,
    }}>
      <div style={{
        maxWidth: 480, width: "100%", background: C.surface,
        border: `1.5px solid ${C.border}`, borderRadius: 16, padding: 32,
        boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, background: C.dangerSoft,
          display: "grid", placeItems: "center", marginBottom: 20,
        }}>
          <ShieldAlert size={28} color={C.danger} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>
          Acesso restrito
        </h1>
        <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6, margin: "0 0 16px" }}>
          Esta área é exclusiva para administradores da Bisme com permissão
          <strong> super_admin</strong>. Empresários e clientes finais não têm acesso.
        </p>
        {!cloudReady && (
          <div style={{
            background: C.warnSoft, border: `1px solid ${C.warn}33`,
            borderRadius: 10, padding: 12, fontSize: 13, color: "#92400E",
            lineHeight: 1.5,
          }}>
            <strong>Aguardando integração:</strong> o Lovable Cloud ainda não está
            ativo neste projeto. Após ativar, marque manualmente seu usuário
            como <code style={{ background: "#FFF7ED", padding: "1px 6px", borderRadius: 4 }}>super_admin</code> na
            tabela <code style={{ background: "#FFF7ED", padding: "1px 6px", borderRadius: 4 }}>user_roles</code> do
            Supabase para liberar este painel.
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Layout master: sidebar (desktop) + bottom bar (mobile)
   ============================================================ */
function MasterLayout({ previewMode = false }: { previewMode?: boolean }) {
  const [section, setSection] = useState<SectionId>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  const current = SECTIONS.find(s => s.id === section)!;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT, color: C.text }}>
      {previewMode && (
        <div style={{
          background: C.warnSoft, borderBottom: `1px solid ${C.warn}33`,
          padding: "10px 16px", textAlign: "center", fontSize: 13,
          color: "#92400E", lineHeight: 1.4, fontWeight: 500,
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} color={C.warn} />
            Modo preview: painel visual sem dados reais e sem autenticação real.
            A proteção por super_admin será ativada quando o Supabase for conectado.
          </span>
        </div>
      )}
      <div style={{ display: "flex" }}>
        {/* Sidebar desktop */}
        <aside className="bisme-sidebar" style={{
          width: 240, minHeight: "100vh", background: C.surface,
          borderRight: `1.5px solid ${C.border}`, padding: "20px 12px",
          position: "sticky", top: 0,
        }}>
          <BrandHeader />
          <nav style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 2 }}>
            {SECTIONS.map(s => (
              <NavItem key={s.id} active={section === s.id} icon={s.icon} label={s.label}
                onClick={() => setSection(s.id)} />
            ))}
          </nav>
        </aside>

        {/* Conteúdo */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* Topbar */}
          <header style={{
            background: C.surface, borderBottom: `1.5px solid ${C.border}`,
            height: 64, padding: "0 24px", display: "flex", alignItems: "center",
            justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => setMobileOpen(true)}
                className="bisme-menu-btn"
                style={iconBtn}
                aria-label="Abrir menu"
              >
                <Menu size={20} />
              </button>
              <div>
                <div style={{ fontSize: 11, color: C.textSubtle, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Bisme · Painel Master
                </div>
                <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{current.label}</h1>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button style={iconBtn} aria-label="Notificações"><Bell size={18} /></button>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: C.accent,
                color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13,
              }}>SA</div>
            </div>
          </header>

          {/* Section content */}
          <div style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>
            <SectionRenderer id={section} />
          </div>
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div onClick={() => setMobileOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
          <div style={{
            position: "absolute", top: 0, left: 0, bottom: 0, width: 280,
            background: C.surface, padding: "20px 12px", overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px 8px" }}>
              <BrandHeader />
              <button onClick={() => setMobileOpen(false)} style={iconBtn} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <nav style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 2 }}>
              {SECTIONS.map(s => (
                <NavItem key={s.id} active={section === s.id} icon={s.icon} label={s.label}
                  onClick={() => { setSection(s.id); setMobileOpen(false); }} />
              ))}
            </nav>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .bisme-sidebar { display: none !important; }
          .bisme-menu-btn { display: grid !important; }
        }
        @media (min-width: 901px) {
          .bisme-menu-btn { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ---------- Header + Nav item ---------- */
function BrandHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px" }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: C.text,
        color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14,
      }}>B</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1 }}>Bisme</div>
        <div style={{ fontSize: 10, color: C.textSubtle, marginTop: 2, letterSpacing: 0.5 }}>MASTER ADMIN</div>
      </div>
    </div>
  );
}

const iconBtn: CSSProperties = {
  width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.border}`,
  background: C.surface, display: "grid", placeItems: "center", cursor: "pointer",
  color: C.text,
};

function NavItem({ active, icon: Icon, label, onClick }: {
  active: boolean; icon: typeof LayoutDashboard; label: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
      borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left",
      background: active ? C.accentSoft : "transparent",
      color: active ? C.accent : C.text,
      fontWeight: active ? 600 : 500, fontSize: 14, fontFamily: FONT,
      transition: "background 120ms",
    }}>
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

/* ============================================================
   Componentes utilitários (cards, tabelas, gráficos vazios)
   ============================================================ */
const card: CSSProperties = {
  background: C.surface, border: `1.5px solid ${C.border}`,
  borderRadius: 12, padding: 20,
};

function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{children}</h2>
      {sub && <p style={{ fontSize: 13, color: C.textMuted, margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

function StatCard({ label, value, hint, tone = "default", icon: Icon }: {
  label: string; value: string; hint?: string;
  tone?: "default" | "ok" | "warn" | "danger" | "info" | "purple";
  icon?: typeof LayoutDashboard;
}) {
  const toneMap = {
    default: { bg: C.elevated, fg: C.text },
    ok:      { bg: C.okSoft, fg: C.ok },
    warn:    { bg: C.warnSoft, fg: C.warn },
    danger:  { bg: C.dangerSoft, fg: C.danger },
    info:    { bg: C.infoSoft, fg: C.info },
    purple:  { bg: C.purpleSoft, fg: C.purple },
  }[tone];
  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>{label}</div>
        {Icon && (
          <div style={{ width: 32, height: 32, borderRadius: 8, background: toneMap.bg, color: toneMap.fg, display: "grid", placeItems: "center" }}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, margin: "10px 0 4px", letterSpacing: -0.5 }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: C.textSubtle }}>{hint}</div>}
    </div>
  );
}

function Badge({ children, tone = "default" }: {
  children: ReactNode; tone?: "default" | "ok" | "warn" | "danger" | "info" | "purple";
}) {
  const toneMap = {
    default: { bg: C.elevated, fg: C.text, br: C.border },
    ok:      { bg: C.okSoft, fg: C.ok, br: "transparent" },
    warn:    { bg: C.warnSoft, fg: C.warn, br: "transparent" },
    danger:  { bg: C.dangerSoft, fg: C.danger, br: "transparent" },
    info:    { bg: C.infoSoft, fg: C.info, br: "transparent" },
    purple:  { bg: C.purpleSoft, fg: C.purple, br: "transparent" },
  }[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: toneMap.bg, color: toneMap.fg, border: `1px solid ${toneMap.br}`,
    }}>{children}</span>
  );
}

function EmptyState({ icon: Icon = Activity, title, hint }: {
  icon?: typeof LayoutDashboard; title: string; hint?: string;
}) {
  return (
    <div style={{
      padding: "48px 24px", textAlign: "center", color: C.textMuted,
      border: `1.5px dashed ${C.borderStrong}`, borderRadius: 12, background: C.elevated,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, background: C.surface,
        display: "inline-grid", placeItems: "center", marginBottom: 12,
        border: `1px solid ${C.border}`,
      }}>
        <Icon size={22} color={C.textSubtle} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{title}</div>
      {hint && <div style={{ fontSize: 13, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function Grid({ cols = 4, children }: { cols?: number; children: ReactNode }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(auto-fit, minmax(${cols === 4 ? 220 : 280}px, 1fr))`,
      gap: 16,
    }}>{children}</div>
  );
}

function ChartPlaceholder({ title, height = 200 }: { title: string; height?: number }) {
  // Pequeno gráfico decorativo "vazio" — apenas visual, sem dados.
  return (
    <div style={card}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: C.text }}>{title}</div>
      <div style={{
        height, background: `linear-gradient(180deg, ${C.elevated} 0%, ${C.surface} 100%)`,
        border: `1px dashed ${C.border}`, borderRadius: 8,
        display: "grid", placeItems: "center", color: C.textSubtle, fontSize: 12,
      }}>
        Aguardando dados reais
      </div>
    </div>
  );
}

function DataTable({ columns, emptyText }: { columns: string[]; emptyText: string }) {
  return (
    <div style={{ ...card, padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.elevated }}>
              {columns.map(c => (
                <th key={c} style={{
                  textAlign: "left", padding: "12px 16px", fontWeight: 600,
                  color: C.textMuted, fontSize: 11, textTransform: "uppercase",
                  letterSpacing: 0.5, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap",
                }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length} style={{ padding: 0 }}>
                <div style={{ padding: 32 }}>
                  <EmptyState title="Nenhum dado ainda" hint={emptyText} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Toolbar({ placeholder, filters }: { placeholder: string; filters?: string[] }) {
  return (
    <div style={{
      display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, flex: "1 1 240px",
        background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 10,
        padding: "10px 12px", minWidth: 0,
      }}>
        <Search size={16} color={C.textSubtle} />
        <input placeholder={placeholder} style={{
          border: "none", outline: "none", background: "transparent",
          fontSize: 14, flex: 1, fontFamily: FONT, color: C.text, minWidth: 0,
        }} />
      </div>
      {filters?.map(f => (
        <button key={f} style={{
          padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`,
          background: C.surface, fontSize: 13, fontWeight: 500, cursor: "pointer",
          color: C.text, fontFamily: FONT, display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <Filter size={13} /> {f}
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   Section Renderer
   ============================================================ */
function SectionRenderer({ id }: { id: SectionId }) {
  switch (id) {
    case "overview":      return <OverviewSection />;
    case "funnel":        return <FunnelSection />;
    case "companies":     return <CompaniesSection />;
    case "subscriptions": return <SubscriptionsSection />;
    case "analytics":     return <AnalyticsSection />;
    case "endusers":      return <EndUsersSection />;
    case "appointments":  return <AppointmentsSection />;
    case "finance":       return <FinanceSection />;
    case "support":       return <SupportSection />;
    case "logs":          return <LogsSection />;
    case "settings":      return <SettingsSection />;
    case "trash":         return <TrashSection />;
  }
}

/* ---------- 1. Visão Geral ---------- */
function OverviewSection() {
  return (
    <>
      <SectionTitle sub="Resumo macro do SaaS Bisme em tempo real.">Visão geral</SectionTitle>

      <div style={{ marginBottom: 24 }}>
        <Grid cols={4}>
          <StatCard label="Empresas cadastradas" value="—" icon={Building2} tone="info" hint="Total histórico" />
          <StatCard label="Empresas ativas" value="—" icon={Activity} tone="ok" />
          <StatCard label="Em teste grátis" value="—" icon={TrendingUp} tone="warn" />
          <StatCard label="Pagamento em atraso" value="—" icon={AlertTriangle} tone="danger" />
          <StatCard label="Inativas" value="—" icon={Building2} />
          <StatCard label="Canceladas" value="—" icon={Building2} tone="danger" />
          <StatCard label="Usuários finais" value="—" icon={Users} tone="purple" />
          <StatCard label="Agendamentos totais" value="—" icon={CalendarDays} tone="info" />
        </Grid>
      </div>

      <div style={{ marginBottom: 24 }}>
        <SectionTitle sub="Tráfego, conversão e receita recorrente.">Receita & conversão</SectionTitle>
        <Grid cols={4}>
          <StatCard label="Acessos · página de vendas" value="—" icon={BarChart3} />
          <StatCard label="Acessos · cadastro" value="—" icon={BarChart3} />
          <StatCard label="Conversão vendas → cadastro" value="—%" tone="info" />
          <StatCard label="Conclusão do cadastro" value="—%" tone="ok" />
          <StatCard label="Desistência no cadastro" value="—%" tone="danger" />
          <StatCard label="MRR estimado" value="R$ —" icon={DollarSign} tone="ok" />
          <StatCard label="ARR estimado" value="R$ —" icon={DollarSign} tone="ok" />
          <StatCard label="Novos clientes · 7d" value="—" tone="info" />
          <StatCard label="Novos clientes · 30d" value="—" tone="info" />
          <StatCard label="Cancelamentos · 30d" value="—" tone="danger" />
        </Grid>
      </div>

      <SectionTitle>Tendências</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <ChartPlaceholder title="Crescimento de empresas (dia/semana/mês)" />
        <ChartPlaceholder title="Acessos · página de vendas" />
        <ChartPlaceholder title="Conversão visitante → cadastro" />
        <ChartPlaceholder title="Empresas ativas × inativas" />
        <ChartPlaceholder title="Planos mais usados" />
        <ChartPlaceholder title="Agendamentos por período" />
      </div>
    </>
  );
}

/* ---------- 2. Funil de Conversão ---------- */
function FunnelSection() {
  const steps = useMemo(() => [
    "Página de vendas acessada",
    "Clique em “Começar agora”",
    "Página de cadastro aberta",
    "Cadastro iniciado",
    "Cadastro concluído",
    "Onboarding iniciada",
    "Onboarding concluída",
    "Primeiro acesso ao painel",
  ], []);

  const dropoffs = [
    "Criação de senha", "Escolha da categoria", "Funcionários", "Serviços",
    "Escolha do link", "Antes de finalizar onboarding",
  ];

  return (
    <>
      <SectionTitle sub="Acompanhe o caminho do visitante até virar cliente ativo.">Funil de conversão</SectionTitle>
      <Toolbar placeholder="Filtrar por período" filters={["Hoje", "7 dias", "30 dias", "Este mês", "Personalizado"]} />

      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {steps.map((step, i) => {
            const width = 100 - i * 11;
            return (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: C.elevated, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, color: C.textMuted, flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, position: "relative", height: 40, background: C.elevated, borderRadius: 8, overflow: "hidden" }}>
                  <div style={{
                    position: "absolute", inset: 0, width: `${Math.max(width, 12)}%`,
                    background: `linear-gradient(90deg, ${C.accent}, ${C.accent}cc)`,
                    borderRadius: 8, opacity: 0.15,
                  }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px" }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{step}</span>
                    <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>—</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SectionTitle sub="Em qual etapa o usuário mais desistiu.">Pontos de desistência</SectionTitle>
      <Grid cols={4}>
        {dropoffs.map(d => (
          <StatCard key={d} label={`Desistiu em: ${d}`} value="—" tone="danger" />
        ))}
      </Grid>
    </>
  );
}

/* ---------- 3. Empresas / Clientes Bisme ---------- */
function CompaniesSection() {
  return (
    <>
      <SectionTitle sub="Todas as empresas cadastradas na plataforma.">Empresas / Clientes Bisme</SectionTitle>
      <Toolbar
        placeholder="Buscar por nome, responsável, e-mail, WhatsApp, slug ou cidade…"
        filters={["Status", "Plano", "Categoria", "Cidade", "Estado", "Data"]}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <Badge tone="ok">Ativa</Badge>
        <Badge tone="info">Em teste grátis</Badge>
        <Badge tone="warn">Pagamento pendente</Badge>
        <Badge>Inativa</Badge>
        <Badge tone="danger">Cancelada</Badge>
        <Badge tone="danger">Bloqueada</Badge>
        <Badge>Excluída</Badge>
      </div>

      <DataTable
        columns={["Empresa", "Responsável", "WhatsApp", "Slug", "Categoria", "Cidade/UF", "Cadastro", "Plano", "Assinatura", "Acessos", "Agendamentos", "Último acesso"]}
        emptyText="As empresas cadastradas via /empresario/cadastro aparecerão aqui."
      />
    </>
  );
}

/* ---------- 4. Assinaturas e Planos ---------- */
function SubscriptionsSection() {
  return (
    <>
      <SectionTitle sub="Visão geral das assinaturas e da receita recorrente.">Assinaturas e Planos</SectionTitle>
      <Grid cols={4}>
        <StatCard label="Assinaturas ativas" value="—" tone="ok" icon={CreditCard} />
        <StatCard label="Em teste grátis" value="—" tone="info" />
        <StatCard label="Vencidas" value="—" tone="warn" />
        <StatCard label="Canceladas" value="—" tone="danger" />
        <StatCard label="Pagamento pendente" value="—" tone="warn" />
        <StatCard label="MRR estimado" value="R$ —" tone="ok" icon={DollarSign} />
        <StatCard label="ARR estimado" value="R$ —" tone="ok" icon={DollarSign} />
        <StatCard label="Churn 30d" value="—%" tone="danger" />
        <StatCard label="Fim de teste em 7d" value="—" tone="warn" />
        <StatCard label="Renovação em 7d" value="—" tone="info" />
      </Grid>

      <div style={{ marginTop: 24 }}>
        <SectionTitle>Tabela de assinaturas</SectionTitle>
        <DataTable
          columns={["Empresa", "Responsável", "Plano", "Valor", "Ciclo", "Status", "Próxima cobrança", "Início", "Cancelamento", "Stripe ID"]}
          emptyText="Conecte o Stripe para listar assinaturas reais."
        />
      </div>
    </>
  );
}

/* ---------- 5. Acessos e Analytics ---------- */
function AnalyticsSection() {
  return (
    <>
      <SectionTitle sub="Tráfego da página de vendas, painéis e sites públicos das empresas.">Acessos & Analytics</SectionTitle>
      <Toolbar placeholder="Filtrar por empresa, página ou período" filters={["Hoje", "7d", "30d", "Personalizado"]} />

      <Grid cols={4}>
        <StatCard label="Total · página de vendas" value="—" />
        <StatCard label="Únicos · página de vendas" value="—" />
        <StatCard label="Acessos · cadastro" value="—" />
        <StatCard label="Acessos · painéis dos clientes" value="—" />
        <StatCard label="Acessos · sites das empresas" value="—" tone="info" />
        <StatCard label="Mobile" value="—%" />
        <StatCard label="Desktop" value="—%" />
        <StatCard label="Tablet" value="—%" />
      </Grid>

      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <ChartPlaceholder title="Acessos por dia" />
        <ChartPlaceholder title="Top empresas por acessos" />
        <ChartPlaceholder title="Origem do tráfego" />
        <ChartPlaceholder title="Navegadores mais usados" />
      </div>
    </>
  );
}

/* ---------- 6. Usuários Finais ---------- */
function EndUsersSection() {
  return (
    <>
      <SectionTitle sub="Clientes finais que se cadastraram nos sites das empresas.">Usuários finais</SectionTitle>
      <Toolbar placeholder="Buscar por nome, e-mail, WhatsApp ou empresa" filters={["Empresa", "Status", "Data"]} />
      <Grid cols={4}>
        <StatCard label="Total de usuários finais" value="—" icon={Users} tone="purple" />
        <StatCard label="Novos · 7d" value="—" tone="info" />
        <StatCard label="Novos · 30d" value="—" tone="info" />
        <StatCard label="Inativos · 30d" value="—" tone="warn" />
      </Grid>
      <div style={{ marginTop: 16 }}>
        <DataTable
          columns={["Cliente", "E-mail", "WhatsApp", "Empresa", "Cadastro", "Último acesso", "Agendamentos", "Cancelamentos", "Status"]}
          emptyText="Os clientes finais aparecerão quando os sites das empresas começarem a receber cadastros."
        />
      </div>
    </>
  );
}

/* ---------- 7. Agendamentos ---------- */
function AppointmentsSection() {
  return (
    <>
      <SectionTitle sub="Todos os agendamentos criados em todas as empresas.">Agendamentos</SectionTitle>
      <Toolbar placeholder="Buscar agendamento" filters={["Empresa", "Categoria", "Cidade", "Status", "Período"]} />
      <Grid cols={4}>
        <StatCard label="Total" value="—" icon={CalendarDays} />
        <StatCard label="Confirmados" value="—" tone="ok" />
        <StatCard label="Cancelados" value="—" tone="danger" />
        <StatCard label="Hoje" value="—" tone="info" />
      </Grid>
      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <ChartPlaceholder title="Agendamentos por dia da semana" />
        <ChartPlaceholder title="Horários mais usados" />
        <ChartPlaceholder title="Top empresas por agendamentos" />
        <ChartPlaceholder title="Serviços mais agendados" />
      </div>
      <div style={{ marginTop: 16 }}>
        <DataTable
          columns={["Empresa", "Cliente", "Serviço", "Funcionário", "Data", "Hora", "Status", "Criado em", "Valor"]}
          emptyText="Os agendamentos das empresas aparecerão aqui."
        />
      </div>
    </>
  );
}

/* ---------- 8. Financeiro ---------- */
function FinanceSection() {
  return (
    <>
      <SectionTitle sub="Receita, pendências e clientes que mais geram caixa.">Financeiro</SectionTitle>
      <Grid cols={4}>
        <StatCard label="Receita mensal estimada" value="R$ —" tone="ok" icon={DollarSign} />
        <StatCard label="Receita anual estimada" value="R$ —" tone="ok" icon={DollarSign} />
        <StatCard label="Total recebido" value="R$ —" tone="info" />
        <StatCard label="Total pendente" value="R$ —" tone="warn" />
        <StatCard label="Em atraso" value="R$ —" tone="danger" />
        <StatCard label="Clientes inadimplentes" value="—" tone="danger" />
      </Grid>
      <div style={{ marginTop: 24 }}>
        <SectionTitle>Top clientes por receita</SectionTitle>
        <DataTable
          columns={["Empresa", "Plano", "Valor mensal", "Total pago", "Status", "Última fatura"]}
          emptyText="Conecte o Stripe para visualizar histórico financeiro real."
        />
      </div>
    </>
  );
}

/* ---------- 9. Suporte ---------- */
function SupportSection() {
  const buckets = [
    { label: "Sem concluir onboarding", tone: "warn" as const },
    { label: "Sem acessar há 7 dias", tone: "warn" as const },
    { label: "Sem acessar há 30 dias", tone: "danger" as const },
    { label: "Erro no cadastro", tone: "danger" as const },
    { label: "Pagamento pendente", tone: "warn" as const },
    { label: "Slug duplicado", tone: "info" as const },
    { label: "Baixo uso da plataforma", tone: "warn" as const },
  ];
  return (
    <>
      <SectionTitle sub="Clientes que precisam de acompanhamento ativo.">Suporte</SectionTitle>
      <Grid cols={4}>
        {buckets.map(b => <StatCard key={b.label} label={b.label} value="—" tone={b.tone} />)}
      </Grid>
      <div style={{ marginTop: 16 }}>
        <DataTable
          columns={["Empresa", "Responsável", "Categoria de problema", "Última atividade", "Anotação interna", "Status"]}
          emptyText="Anotações internas e fila de suporte aparecerão aqui."
        />
      </div>
    </>
  );
}

/* ---------- 10. Logs & Segurança ---------- */
function LogsSection() {
  return (
    <>
      <SectionTitle sub="Auditoria completa de ações administrativas.">Logs & Segurança</SectionTitle>
      <Toolbar placeholder="Buscar log por ator, ação ou empresa" filters={["Tipo de ação", "Período", "Severidade"]} />
      <DataTable
        columns={["Quando", "Quem", "Ação", "Empresa afetada", "IP / Dispositivo", "Detalhes"]}
        emptyText="Toda ação sensível (alterar plano, bloquear, resetar senha, excluir) será registrada aqui."
      />
    </>
  );
}

/* ---------- 11. Configurações ---------- */
function SettingsSection() {
  const fields = [
    { label: "Tempo de teste grátis padrão (dias)", placeholder: "Ex: 14" },
    { label: "Valor do plano mensal (R$)", placeholder: "Ex: 49,90" },
    { label: "Valor do plano anual (R$)", placeholder: "Ex: 499,00" },
    { label: "Texto de aviso global para clientes", placeholder: "Ex: Manutenção amanhã às 02h" },
    { label: "Limite de funcionários por empresa", placeholder: "Vazio = sem limite" },
    { label: "Limite de serviços por empresa", placeholder: "Vazio = sem limite" },
    { label: "Dias até bloqueio por pagamento atrasado", placeholder: "Ex: 7" },
    { label: "Domínio público padrão", placeholder: "bisme.app" },
  ];
  return (
    <>
      <SectionTitle sub="Regras globais do SaaS Bisme.">Configurações do sistema</SectionTitle>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <ToggleRow label="Permitir novos cadastros de empresas" defaultOn />
          <ToggleRow label="Página de vendas ativa" defaultOn />
          <ToggleRow label="Modo manutenção (bloqueia o sistema)" />
          <ToggleRow label="Bloquear automaticamente clientes em atraso" defaultOn />
        </div>
      </div>

      <div style={card}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {fields.map(f => (
            <div key={f.label}>
              <label style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, display: "block", marginBottom: 6 }}>
                {f.label}
              </label>
              <input placeholder={f.placeholder} style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: FONT,
                background: C.elevated, color: C.text, outline: "none", boxSizing: "border-box",
              }} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button style={{
            background: C.accent, color: "#fff", border: "none", padding: "10px 20px",
            borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: FONT,
          }}>Salvar configurações</button>
        </div>
      </div>
    </>
  );
}

function ToggleRow({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 14, color: C.text }}>{label}</span>
      <button onClick={() => setOn(!on)} style={{
        width: 44, height: 24, borderRadius: 12, background: on ? C.accent : C.borderStrong,
        border: "none", padding: 0, position: "relative", cursor: "pointer", flexShrink: 0,
      }} aria-pressed={on}>
        <span style={{
          position: "absolute", top: 2, left: on ? 22 : 2, width: 20, height: 20,
          background: "#FFFFFF", borderRadius: "50%", transition: "left 200ms",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    </div>
  );
}

/* ---------- 12. Lixeira / Exclusões ---------- */
function TrashSection() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <SectionTitle sub="Empresas excluídas e histórico de exclusões.">Lixeira / Exclusões</SectionTitle>

      <div style={{ ...card, background: C.dangerSoft, border: `1.5px solid ${C.danger}33`, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <AlertTriangle size={20} color={C.danger} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.danger, marginBottom: 4 }}>
              Zona de perigo
            </div>
            <p style={{ fontSize: 13, color: "#7F1D1D", margin: 0, lineHeight: 1.5 }}>
              A exclusão completa de uma empresa apaga dados, serviços, funcionários,
              clientes finais, agendamentos, mensagens e arquivos no Storage.
              Esta ação só deve ser executada por uma função protegida do Supabase
              (RPC / Edge Function) com verificação de <strong>super_admin</strong>.
            </p>
          </div>
        </div>
      </div>

      <DataTable
        columns={["Empresa excluída", "Slug", "Responsável", "Excluída em", "Por quem", "Restaurar"]}
        emptyText="Nenhuma exclusão registrada."
      />

      <div style={{ marginTop: 16 }}>
        <button onClick={() => setConfirmOpen(true)} style={{
          background: C.danger, color: "#fff", border: "none", padding: "12px 20px",
          borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: FONT,
          display: "inline-flex", alignItems: "center", gap: 8,
        }}>
          <Trash2 size={16} /> Simular exclusão de empresa
        </button>
      </div>

      {confirmOpen && <DeleteConfirmModal onClose={() => setConfirmOpen(false)} />}
    </>
  );
}

function DeleteConfirmModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const canConfirm = text.trim() === "EXCLUIR TUDO";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "grid", placeItems: "center", padding: 16 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} />
      <div style={{
        position: "relative", background: C.surface, borderRadius: 16, padding: 24,
        maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.dangerSoft, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <AlertTriangle size={22} color={C.danger} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Excluir empresa completamente</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
              Essa ação não pode ser desfeita. Todos os dados, arquivos e
              assinaturas vinculadas serão apagados.
            </p>
          </div>
        </div>

        {step === 1 ? (
          <>
            <div style={{ background: C.elevated, borderRadius: 10, padding: 14, fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
              Serão apagados: dados da empresa, logo, capa, configurações, serviços,
              funcionários, horários, bloqueios, clientes finais, agendamentos,
              mensagens, analytics e arquivos no Storage.
            </div>
            <label style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, display: "block", marginBottom: 6 }}>
              Digite <strong style={{ color: C.danger }}>EXCLUIR TUDO</strong> para confirmar
            </label>
            <input value={text} onChange={e => setText(e.target.value)} placeholder="EXCLUIR TUDO" style={{
              width: "100%", padding: "12px 14px", borderRadius: 10,
              border: `1.5px solid ${canConfirm ? C.danger : C.border}`,
              fontSize: 14, fontFamily: FONT, background: C.surface, color: C.text,
              outline: "none", boxSizing: "border-box", marginBottom: 16,
            }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={ghostBtn}>Cancelar</button>
              <button disabled={!canConfirm} onClick={() => setStep(2)} style={{
                ...dangerBtn, opacity: canConfirm ? 1 : 0.5, cursor: canConfirm ? "pointer" : "not-allowed",
              }}>Continuar</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ background: C.dangerSoft, borderRadius: 10, padding: 14, fontSize: 13, color: "#7F1D1D", marginBottom: 16, lineHeight: 1.5 }}>
              Última confirmação. Ao clicar em <strong>Excluir definitivamente</strong> a função
              protegida do Supabase será chamada para apagar todos os dados ligados a esta empresa.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setStep(1)} style={ghostBtn}>Voltar</button>
              <button onClick={onClose} style={dangerBtn}>Excluir definitivamente</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const ghostBtn: CSSProperties = {
  background: "transparent", border: `1.5px solid ${C.border}`, color: C.text,
  padding: "10px 16px", borderRadius: 10, fontWeight: 600, fontSize: 13,
  cursor: "pointer", fontFamily: FONT,
};
const dangerBtn: CSSProperties = {
  background: C.danger, color: "#fff", border: "none",
  padding: "10px 18px", borderRadius: 10, fontWeight: 600, fontSize: 13,
  cursor: "pointer", fontFamily: FONT,
};

/* (sufixo intencional para silenciar warnings de imports auxiliares usados em ícones decorativos) */
void Heart; void Trophy;
