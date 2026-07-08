import { useEffect, useMemo, useState } from "react";
import { useApp, type AgendamentoAdmin, type ServicoAdmin, type FuncionarioAdmin, type StatusAg } from "./AppContext";
import { COLORS, FONT, BottomSheet, cardStyle, inputStyle } from "./ui";
import { supabase } from "@/integrations/supabase/client";

function brl(v: number) { return `R$ ${v.toFixed(2).replace(".", ",")}`; }
function fmtBR(data: string) {
  if (!data) return "—";
  const [y, m, d] = data.split("-");
  return `${d}/${m}/${y}`;
}
function isoToBRDate(iso: string): string {
  if (!iso) return "";
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric", month: "2-digit", day: "2-digit",
    });
    const parts = fmt.formatToParts(new Date(iso)).reduce<Record<string,string>>((acc,p)=>{
      if (p.type !== "literal") acc[p.type]=p.value; return acc;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  } catch { return iso.slice(0,10); }
}

const MONEY_COLOR = "#16A34A";

interface Cliente {
  key: string;
  nome: string;
  email: string;
  telefone: string;
  fotoUrl?: string;
  cadastro: string;
  totalAg: number;
  ultimoAg: string;           // data (YYYY-MM-DD) do agendamento criado mais recentemente
  ultimoAgCreatedAt: string;  // ISO createdAt do agendamento criado mais recentemente
  proximoAg?: string;
  gasto: number;
  ticketMedio: number;
  servicosTop: { nome: string; qtd: number }[];
  historico: AgendamentoAdmin[];
}

type SortKey = "nome" | "ag" | "ultimo";
type Filtro = "todos" | "recentes";

const PAGE_SIZE = 10;

export function ClientesTela() {
  const { agendamentos, servicos, setAgendamentos, setServicos, setFuncionarios } = useApp();
  const [busca, setBusca] = useState("");
  const [sort, setSort] = useState<SortKey>("ultimo");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [page, setPage] = useState(1);
  const [aberto, setAberto] = useState<Cliente | null>(null);

  // ---- Conexão real com Supabase (mesmo padrão da AgendamentosTela) ----
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    function tzParts(iso: string): { date: string; time: string } {
      try {
        const d = new Date(iso);
        const fmt = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", hour12: false,
        });
        const parts = fmt.formatToParts(d).reduce<Record<string, string>>((acc, p) => {
          if (p.type !== "literal") acc[p.type] = p.value;
          return acc;
        }, {});
        const hh = parts.hour === "24" ? "00" : parts.hour;
        return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${hh}:${parts.minute}` };
      } catch {
        return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
      }
    }

    async function load() {
      const { data: member } = await supabase
        .from("company_members").select("company_id").limit(1).maybeSingle();
      const cid = member?.company_id;
      if (!cid || cancelled) return;

      const [apptsRes, servRes, profRes] = await Promise.all([
        supabase.from("appointments").select("*").eq("company_id", cid).order("starts_at", { ascending: true }),
        supabase.from("services").select("*").eq("company_id", cid).eq("is_active", true),
        supabase.from("professionals").select("*").eq("company_id", cid).eq("is_active", true).eq("is_visible", true).eq("is_default_owner", false).order("position", { ascending: true }),
      ]);
      if (cancelled) return;

      const servRows = servRes.data ?? [];
      const profRows = profRes.data ?? [];
      const apptRows = apptsRes.data ?? [];

      const servicosMapped: ServicoAdmin[] = servRows.map((s) => ({
        id: s.id, nome: s.name, preco: (s.price_cents ?? 0) / 100,
        duracao_minutos: s.duration_minutes ?? 30,
        imagemUrl: s.image_url ?? undefined, descricao: s.description ?? undefined,
        categoriaId: s.category_id ?? undefined,
      }));
      const servIds = new Set(servicosMapped.map((s) => s.id));
      for (const a of apptRows) {
        if (a.service_id && !servIds.has(a.service_id)) {
          servicosMapped.push({
            id: a.service_id, nome: a.service_name_snapshot || "Serviço",
            preco: (a.service_price_cents_snapshot ?? 0) / 100,
            duracao_minutos: a.duration_minutes_snapshot ?? 30,
          });
          servIds.add(a.service_id);
        }
      }

      const funcsMapped: FuncionarioAdmin[] = profRows.map((p) => ({
        id: p.id, nome: p.name, fotoUrl: p.photo_url ?? undefined,
        cargo: p.role_title ?? "", status: "ativo",
        comissaoPct: 0, entrada: "08:00", saida: "18:00", diasFolga: [],
      }));

      const mapStatus = (s: string): StatusAg => {
        if (s === "cancelado" || s === "concluido" || s === "naoCompareceu" || s === "confirmado" || s === "pendente") return s as StatusAg;
        return "pendente";
      };

      const agsMapped: AgendamentoAdmin[] = apptRows.map((a) => {
        const { date, time } = tzParts(a.starts_at);
        return {
          id: a.id, nome: a.customer_name || "Cliente",
          telefone: a.customer_phone || "", email: a.customer_email || "",
          servicoId: a.service_id, funcionarioId: a.professional_id || undefined,
          data: date, horario: time, observacao: a.notes ?? undefined,
          status: mapStatus(a.status as unknown as string),
          createdAt: a.created_at ?? undefined,
          updatedAt: a.updated_at ?? undefined,
          precoCentsSnapshot: a.service_price_cents_snapshot ?? undefined,
        };
      });

      setServicos(servicosMapped);
      setFuncionarios(funcsMapped);
      setAgendamentos(agsMapped);

      channel = supabase
        .channel(`admin-clientes-${cid}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `company_id=eq.${cid}` },
          () => { void load(); })
        .subscribe();
    }
    void load();
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const clientes = useMemo<Cliente[]>(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const map = new Map<string, Cliente>();
    agendamentos.forEach((a) => {
      const key = (a.telefone || a.email || a.nome).toLowerCase().trim();
      if (!key) return;
      let c = map.get(key);
      if (!c) {
        c = {
          key, nome: a.nome, email: a.email, telefone: a.telefone,
          cadastro: a.data, totalAg: 0, ultimoAg: "", ultimoAgCreatedAt: "",
          gasto: 0, ticketMedio: 0, servicosTop: [], historico: [],
        };
        map.set(key, c);
      }
      const cur = c;
      cur.historico.push(a);
      if (a.data < cur.cadastro) cur.cadastro = a.data;

      // Último agendamento = agendamento criado mais recentemente (created_at desc).
      // Independente de estar no futuro ou passado. Não considera status "cancelado".
      const createdAt = a.createdAt ?? "";
      if (a.status !== "cancelado" && createdAt && createdAt > cur.ultimoAgCreatedAt) {
        cur.ultimoAgCreatedAt = createdAt;
        cur.ultimoAg = isoToBRDate(createdAt);
      }

      if (a.status !== "cancelado") {
        cur.totalAg += 1;
        const preco = servicos.find((s) => s.id === a.servicoId)?.preco ?? 0;
        cur.gasto += preco;
        // Próximo agendamento: starts_at futuro mais próximo.
        if (a.data > hoje && (!cur.proximoAg || a.data < cur.proximoAg)) cur.proximoAg = a.data;
      }
    });
    // ticket médio e serviços mais utilizados por cliente
    map.forEach((c) => {
      const cont: Record<string, number> = {};
      let soma = 0;
      let qtdValidos = 0;
      c.historico.forEach((a) => {
        if (a.status === "cancelado" || a.status === "naoCompareceu") return;
        const snap = typeof a.precoCentsSnapshot === "number" ? a.precoCentsSnapshot / 100 : undefined;
        const preco = snap ?? servicos.find((s) => s.id === a.servicoId)?.preco ?? 0;
        soma += preco;
        qtdValidos += 1;
        const nm = servicos.find((s) => s.id === a.servicoId)?.nome ?? "—";
        cont[nm] = (cont[nm] ?? 0) + 1;
      });
      c.ticketMedio = qtdValidos > 0 ? soma / qtdValidos : 0;
      c.servicosTop = Object.entries(cont).map(([nome, qtd]) => ({ nome, qtd }))
        .sort((a, b) => b.qtd - a.qtd).slice(0, 3);
    });
    return Array.from(map.values());
  }, [agendamentos, servicos]);

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    let list = clientes.filter((c) =>
      !q || c.nome.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.telefone.toLowerCase().includes(q)
    );
    if (filtro === "recentes") {
      const limite = new Date(); limite.setDate(limite.getDate() - 30);
      const lim = limite.toISOString().slice(0, 10);
      list = list.filter((c) => c.ultimoAg >= lim);
    }
    list.sort((a, b) => {
      if (sort === "nome") return a.nome.localeCompare(b.nome);
      if (sort === "ag") return b.totalAg - a.totalAg;
      return (b.ultimoAgCreatedAt || "").localeCompare(a.ultimoAgCreatedAt || "");
    });
    return list;
  }, [clientes, busca, sort, filtro]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const visiveis = filtrados.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  

  return (
    <div style={{ padding: "30px 16px 8px", background: COLORS.bgBase, minHeight: "calc(100vh - 56px)", fontFamily: FONT }}>
      {/* Busca */}
      <div style={{ ...cardStyle, marginBottom: 12, padding: 12 }}>
        <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600, marginBottom: 10 }}>
          {`Total de clientes: ${filtrados.length}`}
        </div>

        <div style={{ position: "relative", marginBottom: 10 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: COLORS.textMuted }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            style={{ ...inputStyle, paddingLeft: 38 }}
            placeholder="Buscar por nome, telefone ou e-mail"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPage(1); }}
          />
        </div>
        {/* Filtros rápidos */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {([
            ["todos", "Todos"], ["recentes", "Últimos 30 dias"],
          ] as [Filtro, string][]).map(([k, l]) => {
            const on = filtro === k;
              return (
                <button key={k} onClick={() => { setFiltro(k); setPage(1); }} style={{
                  padding: "7px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                  background: on ? COLORS.accentLight : COLORS.bgElevated,
                  color: on ? "#fff" : COLORS.textPrimary,
                  border: `1px solid ${on ? COLORS.accentLight : COLORS.border}`,
                }}>{l}</button>
              );
          })}
        </div>
        {/* Ordenação */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600 }}>Ordenar:</span>
          <select style={{ ...inputStyle, padding: "8px 10px", fontSize: 13 }} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="ultimo">Último atendimento</option>
            <option value="nome">Nome (A–Z)</option>
            <option value="ag">Mais agendamentos</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      {visiveis.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 30 }}>
          <div style={{ fontSize: 14, color: COLORS.textMuted }}>Nenhum cliente encontrado.</div>
        </div>
      ) : visiveis.map((c) => (
        <ClienteCard key={c.key} c={c} onOpen={() => setAberto(c)} />
      ))}

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 16 }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={curPage === 1}
            style={pageBtn(curPage === 1)}>‹ Anterior</button>
          <span style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600 }}>
            {curPage} / {totalPages}
          </span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={curPage === totalPages}
            style={pageBtn(curPage === totalPages)}>Próxima ›</button>
        </div>
      )}

      <BottomSheet open={!!aberto} onClose={() => setAberto(null)} title="Detalhes do Cliente">
        {aberto && <DetalhesCliente c={aberto} servicos={servicos} />}
      </BottomSheet>
    </div>
  );
}

function pageBtn(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? COLORS.bgElevated : COLORS.bgSurface,
    border: `1px solid ${COLORS.border}`,
    color: disabled ? COLORS.textMuted : COLORS.textPrimary,
    borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer", fontFamily: FONT,
  };
}

function ClienteAvatar({ nome, fotoUrl, size = 48 }: { nome: string; fotoUrl?: string; size?: number }) {
  if (fotoUrl) {
    return <img src={fotoUrl} alt={nome} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: COLORS.accentLight, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.4, flexShrink: 0 }}>
      {(nome || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function ClienteCard({ c, onOpen }: { c: Cliente; onOpen: () => void }) {
  return (
    <div onClick={onOpen} style={{ ...cardStyle, marginBottom: 12, padding: 14, cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <ClienteAvatar nome={c.nome} fotoUrl={c.fotoUrl} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.telefone || c.email || "—"}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Último</div>
          <div style={{ fontSize: 12, color: COLORS.textPrimary, fontWeight: 700 }}>{c.ultimoAg ? fmtBR(c.ultimoAg) : "—"}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <Mini label="Agendamentos" value={c.totalAg.toString()} />
        <Mini label="TOTAL" value={brl(c.gasto)} money />
        <Mini label="Ticket médio" value={brl(c.ticketMedio)} money />
      </div>
    </div>
  );
}

function Mini({ label, value, accent, money }: { label: string; value: string; accent?: boolean; money?: boolean }) {
  const color = money ? MONEY_COLOR : accent ? COLORS.accentLight : COLORS.textPrimary;
  return (
    <div style={{ background: COLORS.bgElevated, borderRadius: 8, padding: "8px 10px", border: `1px solid ${COLORS.border}` }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function DetalhesCliente({ c, servicos }: { c: Cliente; servicos: { id: string; nome: string; preco: number }[] }) {
  const freq = c.totalAg > 0 && c.ultimoAg && c.cadastro
    ? (() => {
        const dias = Math.max(1, (new Date(c.ultimoAg).getTime() - new Date(c.cadastro).getTime()) / 86400000);
        const meses = dias / 30;
        return meses >= 1 ? `${(c.totalAg / meses).toFixed(1)} / mês` : `${c.totalAg} no período`;
      })()
    : "—";

  const historico = [...c.historico].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <ClienteAvatar nome={c.nome} fotoUrl={c.fotoUrl} size={64} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: COLORS.textPrimary }}>{c.nome}</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted }}>{c.email || "—"}</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted }}>{c.telefone || "—"}</div>
        </div>
      </div>

      <Sec titulo="Resumo">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Mini label="Cadastrado em" value={fmtBR(c.cadastro)} />
          <Mini label="Agendamentos" value={c.totalAg.toString()} />
          <Mini label="Total gasto" value={brl(c.gasto)} money />
          <Mini label="Ticket médio" value={brl(c.ticketMedio)} money />
          <Mini label="Frequência" value={freq} />
          <Mini label="Último agend." value={c.ultimoAg ? fmtBR(c.ultimoAg) : "—"} />
        </div>
        {c.proximoAg && (
          <div style={{ marginTop: 10, background: COLORS.accentLight, border: `2px solid ${COLORS.accentLight}`, borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#FFFFFF", textTransform: "uppercase", letterSpacing: 0.4, opacity: 0.9 }}>Próximo agendamento</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", marginTop: 2 }}>{fmtBR(c.proximoAg)}</div>
          </div>
        )}
      </Sec>

      <Sec titulo="Serviços mais utilizados">
        {c.servicosTop.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.textMuted }}>Nenhum serviço.</div>
        ) : c.servicosTop.map((s, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
            <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>{i + 1}. {s.nome}</span>
            <span style={{ color: COLORS.textMuted }}>{s.qtd}x</span>
          </div>
        ))}
      </Sec>

      <Sec titulo={`Histórico (${historico.length})`}>
        {historico.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.textMuted }}>Sem agendamentos.</div>
        ) : historico.map((a) => {
          const srv = servicos.find((s) => s.id === a.servicoId);
          const cor = a.status === "cancelado" ? COLORS.danger : a.status === "concluido" ? COLORS.success : COLORS.accent;
          const snap = typeof a.precoCentsSnapshot === "number" ? a.precoCentsSnapshot / 100 : undefined;
          const preco = snap ?? srv?.preco ?? 0;
          return (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.textPrimary }}>{srv?.nome ?? "—"}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>{fmtBR(a.data)} · {a.horario}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: MONEY_COLOR }}>{brl(preco)}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: cor, textTransform: "uppercase" }}>{a.status}</div>
              </div>
            </div>
          );
        })}
      </Sec>
    </div>
  );
}

function Sec({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ ...cardStyle, padding: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>{titulo}</div>
      {children}
    </div>
  );
}
