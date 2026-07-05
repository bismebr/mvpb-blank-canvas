import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Building2, CreditCard, KeyRound, ShieldAlert,
  Search, Copy, ExternalLink, LogOut, Loader2, CheckCircle2, Eye, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getMasterStatus, getMasterOverview, listMasterCompanies,
  getMasterCompanyDetails, changeEmpresarioAccess,
} from "@/lib/bisme-admin.functions";

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

const PANEL_LOGIN_URL = "https://bisme-simple-canvas.lovable.app/empresario/login";

function statusTone(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active": return "default";
    case "trial": return "secondary";
    case "past_due": return "destructive";
    case "canceled": return "destructive";
    default: return "outline";
  }
}
const STATUS_LABEL: Record<string, string> = {
  active: "Ativa", trial: "Trial", past_due: "Inadimplente",
  canceled: "Cancelada", none: "Sem assinatura",
};
function fmtDate(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("pt-BR");
}
function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ============================================================ */
function BismeAdminPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const qc = useQueryClient();
  const statusFn = useServerFn(getMasterStatus);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(() => mounted && setSessionReady(true));
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      qc.invalidateQueries({ queryKey: ["master-status"] });
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [qc]);

  const statusQ = useQuery({
    queryKey: ["master-status"],
    queryFn: () => statusFn(),
    enabled: sessionReady,
    retry: false,
  });

  if (!sessionReady || statusQ.isLoading) return <FullCenter><Loader2 className="animate-spin" /></FullCenter>;

  // Não autenticado (middleware lança Unauthorized) → login
  if (statusQ.isError) return <LoginScreen onLogged={() => qc.invalidateQueries({ queryKey: ["master-status"] })} />;

  if (!statusQ.data?.isMaster) return <BlockedScreen email={statusQ.data?.email} />;

  return <MasterPanel adminEmail={statusQ.data.email} />;
}

function FullCenter({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground">{children}</div>
  );
}

/* ---------- Login ---------- */
function LoginScreen({ onLogged }: { onLogged: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) { setErro("E-mail ou senha incorretos."); return; }
    onLogged();
  }

  return (
    <FullCenter>
      <Card className="w-full max-w-sm mx-4">
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground grid place-items-center font-extrabold text-lg mb-2">B</div>
          <CardTitle>Painel Master Bisme</CardTitle>
          <p className="text-sm text-muted-foreground">Acesso restrito ao administrador da Bisme.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} autoComplete="username"
                onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" value={senha} autoComplete="current-password"
                onChange={(e) => setSenha(e.target.value)} required />
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </FullCenter>
  );
}

/* ---------- Bloqueado ---------- */
function BlockedScreen({ email }: { email?: string }) {
  return (
    <FullCenter>
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive grid place-items-center mb-2">
            <ShieldAlert />
          </div>
          <CardTitle>Acesso não autorizado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A conta {email ? <strong>{email}</strong> : "atual"} não tem permissão de administrador master da Bisme.
          </p>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>
            <LogOut /> Sair
          </Button>
        </CardContent>
      </Card>
    </FullCenter>
  );
}

/* ============================================================
   Painel principal
   ============================================================ */
type CompanyRow = Awaited<ReturnType<typeof listMasterCompanies>>[number];

function MasterPanel({ adminEmail }: { adminEmail: string }) {
  const overviewFn = useServerFn(getMasterOverview);
  const companiesFn = useServerFn(listMasterCompanies);

  const overviewQ = useQuery({ queryKey: ["master-overview"], queryFn: () => overviewFn(), retry: false });
  const companiesQ = useQuery({ queryKey: ["master-companies"], queryFn: () => companiesFn(), retry: false });

  const [detailsId, setDetailsId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b sticky top-0 bg-background z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-extrabold">B</div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Bisme</div>
              <div className="font-bold leading-none">Painel Master</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{adminEmail}</span>
            <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
              <LogOut /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="overview">
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="overview"><LayoutDashboard className="mr-1" /> Visão geral</TabsTrigger>
            <TabsTrigger value="companies"><Building2 className="mr-1" /> Empresas</TabsTrigger>
            <TabsTrigger value="subscriptions"><CreditCard className="mr-1" /> Assinaturas</TabsTrigger>
            <TabsTrigger value="access"><KeyRound className="mr-1" /> Entregar acesso</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab data={overviewQ.data} loading={overviewQ.isLoading} />
          </TabsContent>

          <TabsContent value="companies">
            <CompaniesTab
              companies={companiesQ.data || []}
              loading={companiesQ.isLoading}
              onDetails={setDetailsId}
            />
          </TabsContent>

          <TabsContent value="subscriptions">
            <SubscriptionsTab companies={companiesQ.data || []} loading={companiesQ.isLoading} />
          </TabsContent>

          <TabsContent value="access">
            <AccessTab companies={companiesQ.data || []} />
          </TabsContent>
        </Tabs>
      </main>

      {detailsId && <CompanyDetailsDialog companyId={detailsId} onClose={() => setDetailsId(null)} />}
    </div>
  );
}

/* ---------- Visão geral ---------- */
function OverviewTab({ data, loading }: { data?: Awaited<ReturnType<typeof getMasterOverview>>; loading: boolean }) {
  if (loading || !data) return <Loader2 className="animate-spin" />;
  const stats = [
    { label: "Empresas cadastradas", value: String(data.totalCompanies) },
    { label: "Em trial", value: String(data.trial) },
    { label: "Ativas pagas", value: String(data.active) },
    { label: "Canceladas", value: String(data.canceled) },
    { label: "Inadimplentes", value: String(data.pastDue) },
    { label: "Sem assinatura", value: String(data.none) },
    { label: "Receita mensal estimada*", value: brl(data.monthlyRevenue) },
    { label: "Receita anual estimada*", value: brl(data.yearlyRevenue) },
    { label: "Novos cadastros (7 dias)", value: String(data.newLast7Days) },
    { label: "Agendamentos totais", value: String(data.totalAppointments) },
  ];
  return (
    <div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-bold mt-1">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        * Receita estimada com base nos planos ativos e em preços de referência configurados no código. A cobrança real é feita pelo Stripe.
      </p>
    </div>
  );
}

/* ---------- Empresas ---------- */
function CompaniesTab({ companies, loading, onDetails }: {
  companies: CompanyRow[]; loading: boolean; onDetails: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return companies.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (plan !== "all" && (c.plan ?? "none") !== plan) return false;
      if (!term) return true;
      return [c.name, c.slug, c.ownerEmail].some((v) => (v || "").toLowerCase().includes(term));
    });
  }, [companies, q, status, plan]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, slug ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="active">Ativa</SelectItem>
            <SelectItem value="past_due">Inadimplente</SelectItem>
            <SelectItem value="canceled">Cancelada</SelectItem>
            <SelectItem value="none">Sem assinatura</SelectItem>
          </SelectContent>
        </Select>
        <Select value={plan} onValueChange={setPlan}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os planos</SelectItem>
            <SelectItem value="mensal">Mensal</SelectItem>
            <SelectItem value="anual">Anual</SelectItem>
            <SelectItem value="none">Sem plano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <Loader2 className="animate-spin" /> : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trial até</TableHead>
                  <TableHead>Período pago até</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma empresa encontrada.</TableCell></TableRow>
                )}
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                    <TableCell className="text-muted-foreground">{c.ownerEmail || "—"}</TableCell>
                    <TableCell>{c.plan || "—"}</TableCell>
                    <TableCell><Badge variant={statusTone(c.status)}>{STATUS_LABEL[c.status] ?? c.status}</Badge></TableCell>
                    <TableCell>{fmtDate(c.trialEndsAt)}</TableCell>
                    <TableCell>{fmtDate(c.currentPeriodEnd)}</TableCell>
                    <TableCell>{fmtDate(c.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" title="Abrir site público" asChild>
                          <a href={`/${c.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink /></a>
                        </Button>
                        <Button variant="ghost" size="icon" title="Copiar URL"
                          onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/${c.slug}`)}>
                          <Copy />
                        </Button>
                        <Button variant="ghost" size="icon" title="Ver detalhes" onClick={() => onDetails(c.id)}>
                          <Eye />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------- Assinaturas ---------- */
function SubscriptionsTab({ companies, loading }: { companies: CompanyRow[]; loading: boolean }) {
  if (loading) return <Loader2 className="animate-spin" />;
  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trial até</TableHead>
              <TableHead>Período pago até</TableHead>
              <TableHead>Stripe customer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.plan || "—"}</TableCell>
                <TableCell><Badge variant={statusTone(c.status)}>{STATUS_LABEL[c.status] ?? c.status}</Badge></TableCell>
                <TableCell>{fmtDate(c.trialEndsAt)}</TableCell>
                <TableCell>{fmtDate(c.currentPeriodEnd)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{c.stripeCustomerId || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/* ---------- Detalhes da empresa ---------- */
function CompanyDetailsDialog({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const detailsFn = useServerFn(getMasterCompanyDetails);
  const q = useQuery({
    queryKey: ["master-company", companyId],
    queryFn: () => detailsFn({ data: { companyId } }),
    retry: false,
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Detalhes da empresa</DialogTitle></DialogHeader>
        {q.isLoading || !q.data ? <Loader2 className="animate-spin" /> : (
          <div className="space-y-5 text-sm">
            <section>
              <h4 className="font-semibold mb-2">Empresa</h4>
              <Row k="ID" v={q.data.company.id} />
              <Row k="Nome" v={q.data.company.name} />
              <Row k="Slug" v={q.data.company.slug} />
              <Row k="URL pública" v={`${window.location.origin}/${q.data.company.slug}`} />
              <Row k="Timezone" v={q.data.company.timezone} />
              <Row k="Criada em" v={fmtDate(q.data.company.created_at)} />
            </section>
            <section>
              <h4 className="font-semibold mb-2">Responsáveis / membros</h4>
              {q.data.members.map((m) => (
                <div key={m.userId} className="border rounded-md p-2 mb-2">
                  <Row k="user_id" v={m.userId} />
                  <Row k="E-mail" v={m.email || "—"} />
                  <Row k="Role" v={m.role} />
                  <Row k="Criado em" v={fmtDate(m.createdAt)} />
                </div>
              ))}
            </section>
            <section>
              <h4 className="font-semibold mb-2">Assinatura</h4>
              {q.data.subscription ? (
                <>
                  <Row k="Status" v={q.data.subscription.status} />
                  <Row k="Plano" v={q.data.subscription.plan} />
                  <Row k="Trial iniciado" v={fmtDate(q.data.subscription.trial_started_at)} />
                  <Row k="Trial termina" v={fmtDate(q.data.subscription.trial_ends_at)} />
                  <Row k="Período início" v={fmtDate(q.data.subscription.current_period_start)} />
                  <Row k="Período fim" v={fmtDate(q.data.subscription.current_period_end)} />
                  <Row k="Cancela no fim" v={String(q.data.subscription.cancel_at_period_end)} />
                  <Row k="Cancelada em" v={fmtDate(q.data.subscription.canceled_at)} />
                  <Row k="Stripe customer" v={q.data.subscription.stripe_customer_id || "—"} />
                  <Row k="Stripe subscription" v={q.data.subscription.stripe_subscription_id || "—"} />
                  <Row k="Stripe price" v={q.data.subscription.stripe_price_id || "—"} />
                </>
              ) : <p className="text-muted-foreground">Sem assinatura.</p>}
            </section>
            <section>
              <h4 className="font-semibold mb-2">Dados operacionais</h4>
              <Row k="Agendamentos" v={String(q.data.counts.appointments)} />
              <Row k="Clientes" v={String(q.data.counts.clients)} />
              <Row k="Serviços" v={String(q.data.counts.services)} />
              <Row k="Profissionais" v={String(q.data.counts.professionals)} />
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-0.5">
      <span className="text-muted-foreground min-w-[130px]">{k}</span>
      <span className="break-all">{v}</span>
    </div>
  );
}

/* ---------- Entregar acesso ---------- */
function AccessTab({ companies }: { companies: CompanyRow[] }) {
  const detailsFn = useServerFn(getMasterCompanyDetails);
  const changeFn = useServerFn(changeEmpresarioAccess);

  const [companyId, setCompanyId] = useState("");
  const [userId, setUserId] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);

  const membersQ = useQuery({
    queryKey: ["master-company-members", companyId],
    queryFn: () => detailsFn({ data: { companyId } }),
    enabled: !!companyId,
    retry: false,
  });
  const members = membersQ.data?.members || [];

  function validate(): string | null {
    if (!companyId) return "Selecione a empresa.";
    if (!userId) return "Selecione o membro responsável.";
    if (!newEmail.trim()) return "Informe o novo e-mail.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) return "E-mail inválido.";
    if (pw.length < 6) return "A senha provisória deve ter ao menos 6 caracteres.";
    if (pw !== pw2) return "As senhas não coincidem.";
    return null;
  }

  function openConfirm() {
    const v = validate();
    if (v) { setErro(v); return; }
    setErro(null);
    setConfirmOpen(true);
  }

  async function execute() {
    setSaving(true);
    setErro(null);
    try {
      await changeFn({ data: { companyId, userId, newEmail: newEmail.trim(), newPassword: pw } });
      setResult({ email: newEmail.trim(), password: pw });
      setConfirmOpen(false);
      setPw(""); setPw2("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao alterar o acesso.");
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <Card>
        <CardHeader><CardTitle>Trocar acesso do empresário</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Altera o e-mail e a senha do usuário existente. O mesmo <code>user_id</code> é mantido e o vínculo com a empresa não muda.
          </p>

          <div className="space-y-2">
            <Label>Empresa</Label>
            <Select value={companyId} onValueChange={(v) => { setCompanyId(v); setUserId(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Membro responsável</Label>
            <Select value={userId} onValueChange={setUserId} disabled={!companyId || membersQ.isLoading}>
              <SelectTrigger><SelectValue placeholder={membersQ.isLoading ? "Carregando..." : "Selecione o membro"} /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {(m.email || m.userId)} · {m.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newEmail">Novo e-mail</Label>
            <Input id="newEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pw">Senha provisória</Label>
              <Input id="pw" type="text" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw2">Confirmar senha</Label>
              <Input id="pw2" type="text" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <Button onClick={openConfirm}><KeyRound /> Trocar acesso</Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 /> Acesso atualizado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Copie os dados abaixo para entregar ao empresário:</p>
            <pre className="text-sm bg-muted rounded-md p-3 whitespace-pre-wrap break-all">
{`Painel:
${PANEL_LOGIN_URL}

E-mail:
${result.email}

Senha provisória:
${result.password}

Após o primeiro acesso, altere sua senha em Configurações.`}
            </pre>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(
                `Painel:\n${PANEL_LOGIN_URL}\n\nE-mail:\n${result.email}\n\nSenha provisória:\n${result.password}\n\nApós o primeiro acesso, altere sua senha em Configurações.`
              )}><Copy /> Copiar</Button>
              <Button variant="ghost" size="sm" onClick={() => setResult(null)}><X /> Fechar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmOpen} onOpenChange={(o) => !o && setConfirmOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar troca de acesso</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Você está prestes a alterar o e-mail de acesso deste usuário. O <strong>user_id continuará o mesmo</strong> e o vínculo com a empresa será mantido.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={execute} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
