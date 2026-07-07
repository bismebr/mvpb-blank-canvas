import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useApp, type ServicoAdmin, type HorarioAdmin, type BloqueioAdmin, type PausaAdmin, type FuncionarioAdmin, type StatusFunc, type ServicoFuncMode, type FuncServMode, type CategoriaAdmin } from "./AppContext";
import { COLORS, FONT, BottomSheet, Label, Toggle, inputStyle, primaryBtn, secondaryBtn, cardStyle, addBtn, PageHeader } from "./ui";
import { ImageCropper } from "./ImageCropper";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";

const DIAS = [
  { i: 1, nome: "Segunda-feira" }, { i: 2, nome: "Terça-feira" }, { i: 3, nome: "Quarta-feira" },
  { i: 4, nome: "Quinta-feira" }, { i: 5, nome: "Sexta-feira" }, { i: 6, nome: "Sábado" }, { i: 0, nome: "Domingo" },
];

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtDate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function brl(v: number) {
  return `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDuracaoExtenso(totalMin: number): string {
  const m = Math.max(0, Math.round(totalMin || 0));
  const h = Math.floor(m / 60);
  const min = m % 60;
  const horaStr = h > 0 ? `${h} ${h === 1 ? "hora" : "horas"}` : "";
  const minStr = min > 0 ? `${min} ${min === 1 ? "minuto" : "minutos"}` : "";
  if (h > 0 && min > 0) return `${horaStr} e ${minStr}`;
  return horaStr || minStr || "0 minutos";
}

/* =========================== SERVIÇOS =========================== */
type ServiceRow = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  duration_minutes: number;
  image_url: string | null;
  category_id: string | null;
  is_active: boolean;
};

function rowToServico(r: ServiceRow): ServicoAdmin {
  return {
    id: r.id,
    nome: r.name,
    preco: (r.price_cents || 0) / 100,
    duracao_minutos: r.duration_minutes || 0,
    imagemUrl: r.image_url ?? undefined,
    descricao: r.description ?? undefined,
    categoriaId: r.category_id ?? undefined,
    funcionariosMode: "todos",
    funcionariosIds: [],
  };
}

export function ServicosTela() {
  const {
    servicos, setServicos, saveServico, deleteServico,
    categorias, setCategorias, saveCategoria, deleteCategoria,
  } = useApp();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<ServicoAdmin | null>(null);
  const [creating, setCreating] = useState(false);
  const [catEditing, setCatEditing] = useState<CategoriaAdmin | null>(null);
  const [catCreating, setCatCreating] = useState(false);
  const [catFiltro, setCatFiltro] = useState<string>("todas");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          navigate({ to: "/empresario/login", replace: true });
          return;
        }
        const { data: member } = await supabase
          .from("company_members")
          .select("company_id")
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (!member?.company_id) {
          navigate({ to: "/empresario/onboarding", replace: true });
          return;
        }
        setCompanyId(member.company_id);
        const [svcRes, catRes] = await Promise.all([
          supabase.from("services").select("*").eq("company_id", member.company_id).eq("is_active", true).order("created_at", { ascending: true }),
          supabase.from("service_categories").select("*").eq("company_id", member.company_id).order("position", { ascending: true }),
        ]);
        if (cancelled) return;
        if (svcRes.error) throw svcRes.error;
        if (catRes.error) throw catRes.error;
        setServicos((svcRes.data ?? []).map((r) => rowToServico(r as ServiceRow)));
        setCategorias((catRes.data ?? []).map((c) => ({ id: c.id, nome: c.name })));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Falha ao carregar serviços.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveServico(s: ServicoAdmin) {
    if (!companyId) return;
    const exists = servicos.some((x) => x.id === s.id);
    const payload = {
      company_id: companyId,
      name: s.nome,
      price_cents: Math.max(0, Math.round((s.preco || 0) * 100)),
      duration_minutes: Math.max(1, Math.round(s.duracao_minutos || 0)),
      image_url: s.imagemUrl ?? null,
      description: s.descricao ?? null,
      category_id: s.categoriaId || null,
      is_active: true,
    };
    if (exists) {
      const { data, error: err } = await supabase
        .from("services").update(payload)
        .eq("id", s.id).eq("company_id", companyId)
        .select().maybeSingle();
      if (err) { toast.error("Erro ao salvar serviço: " + err.message); return; }
      if (data) saveServico(rowToServico(data as ServiceRow));
      toast.success("Serviço atualizado");
    } else {
      const { data, error: err } = await supabase
        .from("services").insert(payload)
        .select().maybeSingle();
      if (err) { toast.error("Erro ao criar serviço: " + err.message); return; }
      if (data) saveServico(rowToServico(data as ServiceRow));
      toast.success("Serviço criado");
    }
  }

  async function handleDeactivateServico(id: string) {
    if (!companyId) return;
    const { error: err } = await supabase
      .from("services").update({ is_active: false })
      .eq("id", id).eq("company_id", companyId);
    if (err) { toast.error("Erro ao desativar: " + err.message); return; }
    deleteServico(id);
    toast.success("Serviço desativado");
  }

  async function handleSaveCategoria(c: CategoriaAdmin) {
    if (!companyId) return;
    const exists = categorias.some((x) => x.id === c.id);
    if (exists) {
      const { data, error: err } = await supabase
        .from("service_categories").update({ name: c.nome })
        .eq("id", c.id).eq("company_id", companyId)
        .select().maybeSingle();
      if (err) { toast.error("Erro ao salvar categoria: " + err.message); return; }
      if (data) saveCategoria({ id: data.id, nome: data.name });
    } else {
      const { data, error: err } = await supabase
        .from("service_categories").insert({ company_id: companyId, name: c.nome })
        .select().maybeSingle();
      if (err) { toast.error("Erro ao criar categoria: " + err.message); return; }
      if (data) saveCategoria({ id: data.id, nome: data.name });
    }
  }

  async function handleDeleteCategoria(id: string) {
    if (!companyId) return;
    const { error: err } = await supabase
      .from("service_categories").delete()
      .eq("id", id).eq("company_id", companyId);
    if (err) { toast.error("Erro ao excluir categoria: " + err.message); return; }
    deleteCategoria(id);
  }

  const servicosFiltrados = catFiltro === "todas"
    ? servicos
    : catFiltro === "sem"
      ? servicos.filter((s) => !s.categoriaId)
      : servicos.filter((s) => s.categoriaId === catFiltro);

  const total = servicos.length;

  return (
    <div style={{ padding: "30px 16px 8px", background: COLORS.bgBase, minHeight: "calc(100vh - 56px)", fontFamily: FONT, maxWidth: 720, margin: "0 auto" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: COLORS.textPrimary,
              fontFamily: FONT,
              letterSpacing: -0.3,
              lineHeight: 1.2,
            }}
          >
            Serviços
          </h2>
          <span style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 500 }}>
            {loading ? "Carregando…" : `${total} ${total === 1 ? "serviço cadastrado" : "serviços cadastrados"}`}
          </span>
        </div>
        <div style={{ display: "inline-flex", gap: 8, flexShrink: 0 }}>
          <button
            className="adm-cat-add"
            onClick={() => setCatCreating(true)}
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 14,
              background: "#FFFFFF",
              color: "#000000",
              border: `1px solid ${COLORS.border}`,
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: FONT,
              cursor: "pointer",
              boxShadow: "none",
              display: "inline-flex", alignItems: "center", gap: 6,
              lineHeight: 1,
            }}
          >
            + Categoria
          </button>
          <button
            onClick={() => setCreating(true)}
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 14,
              background: COLORS.accentLight,
              color: "#FFFFFF",
              border: "none",
              fontSize: 13.5,
              fontWeight: 700,
              fontFamily: FONT,
              cursor: "pointer",
              boxShadow: "none",
              display: "inline-flex", alignItems: "center", gap: 6,
              lineHeight: 1,
            }}
          >
            + Serviço
          </button>
        </div>
      </header>

      {error && (
        <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: COLORS.dangerBg, border: `1px solid ${COLORS.dangerBorder}`, color: COLORS.danger, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Filtros de categoria */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }} className="sreli-no-scrollbar">
          {[{ id: "todas", nome: "Todas" } as CategoriaAdmin, ...categorias, { id: "sem", nome: "Sem categoria" } as CategoriaAdmin].map((c) => {
            const ativo = catFiltro === c.id;
            const editable = c.id !== "todas" && c.id !== "sem";
            return (
              <div key={c.id} style={{ position: "relative", flexShrink: 0, display: "inline-flex", alignItems: "center" }}>
                <button
                  className={ativo ? "adm-cat-chip is-active" : "adm-cat-chip"}
                  onClick={() => {
                    if (ativo && editable) {
                      setCatEditing(c);
                    } else {
                      setCatFiltro(c.id);
                    }
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                    background: ativo ? COLORS.accentLight : "#FFFFFF",
                    color: ativo ? "#FFFFFF" : "#000000",
                    border: `1px solid ${ativo ? COLORS.accentLight : COLORS.border}`,
                    whiteSpace: "nowrap",
                    transition: "all 150ms ease",
                  }}
                >
                  {c.nome}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {loading && servicos.length === 0 && (
        <div style={{ padding: 20, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>Carregando serviços…</div>
      )}

      {servicosFiltrados.map((s) => (
        <div key={s.id} style={{ ...cardStyle, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
            {s.imagemUrl && (
              <img
                src={s.imagemUrl}
                alt=""
                style={{ width: 60, height: 60, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: `1px solid ${COLORS.border}` }}
              />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.textPrimary }}>{s.nome}</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                <span style={{ fontWeight: 600, color: COLORS.textPrimary }}>{brl(s.preco)}</span>
                <span style={{ color: COLORS.textMuted }}> · {formatDuracaoExtenso(s.duracao_minutos)}</span>
              </div>
            </div>
          </div>
          <button onClick={() => setEditing(s)} aria-label="Editar" style={{ background: "transparent", border: "none", cursor: "pointer", padding: 10, minWidth: 44, minHeight: 44 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
        </div>
      ))}
      <BottomSheet open={editing !== null || creating} onClose={() => { setEditing(null); setCreating(false); }} title={editing ? "Editar Serviço" : "Novo Serviço"}>
        <FormServico
          initial={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={async (s) => { await handleSaveServico(s); }}
          onDelete={editing ? async () => {
            if (window.confirm("Desativar este serviço? Ele deixará de aparecer, mas os agendamentos existentes serão preservados.")) {
              await handleDeactivateServico(editing.id);
              setEditing(null);
            }
          } : undefined}
        />
      </BottomSheet>

      <BottomSheet open={catEditing !== null || catCreating} onClose={() => { setCatEditing(null); setCatCreating(false); }} title={catEditing ? "Editar Categoria" : "Nova Categoria"}>
        <FormCategoria
          initial={catEditing}
          onClose={() => { setCatEditing(null); setCatCreating(false); }}
          onSave={async (c) => { await handleSaveCategoria(c); }}
          onDelete={catEditing ? async () => {
            if (window.confirm("Excluir esta categoria? Os serviços ficarão sem categoria.")) {
              await handleDeleteCategoria(catEditing.id);
              setCatEditing(null);
            }
          } : undefined}
        />
      </BottomSheet>
    </div>
  );
}

function FormCategoria({ initial, onClose, onSave, onDelete }: {
  initial: CategoriaAdmin | null; onClose: () => void; onSave: (c: CategoriaAdmin) => void; onDelete?: () => void;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div><Label>Nome da categoria</Label><input style={inputStyle} placeholder="Digite o nome da categoria" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
      {onDelete && (
        <button onClick={onDelete} style={{ color: COLORS.danger, background: COLORS.dangerBg, border: `1px solid ${COLORS.dangerBorder}`, borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 44, fontFamily: FONT }}>Excluir</button>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={onClose} className="bisme-light-border" style={{ ...secondaryBtn, flex: 1 }}>Cancelar</button>
        <button
          onClick={() => {
            if (!nome.trim()) return;
            onSave({ id: initial?.id ?? crypto.randomUUID(), nome: nome.trim() });
            onClose();
          }}
          style={{ ...primaryBtn, flex: 2 }}
        >Salvar</button>
      </div>
    </div>
  );
}

function FormServico({ initial, onClose, onSave, onDelete }: {
  initial: ServicoAdmin | null; onClose: () => void; onSave: (s: ServicoAdmin) => void; onDelete?: () => void;
}) {
  const { funcionarios, categorias } = useApp();
  const [nome, setNome] = useState(initial?.nome ?? "");
  const initialPreco = initial?.preco ?? 0;
  // precoDigits: dígitos que o usuário digitou representando reais inteiros.
  // Vazio = ainda não digitou; nesse caso mantemos o preço original ao salvar
  // e mostramos o valor original formatado (preservando centavos existentes).
  const [precoDigits, setPrecoDigits] = useState<string>("");
  const precoDisplay =
    precoDigits === ""
      ? initialPreco > 0
        ? brl(initialPreco)
        : ""
      : brl(parseInt(precoDigits, 10) || 0);
  const initialHours = initial ? Math.floor(initial.duracao_minutos / 60) : 0;
  const initialMinutes = initial ? initial.duracao_minutos % 60 : 30;
  const [durHoras, setDurHoras] = useState<string>(initialHours ? String(initialHours) : "");
  const [durMin, setDurMin] = useState<string>(initialMinutes ? String(initialMinutes) : "");
  const [imagemUrl, setImagemUrl] = useState<string | undefined>(initial?.imagemUrl);
  const [categoriaId, setCategoriaId] = useState<string>(initial?.categoriaId ?? "");
  const [descricao, setDescricao] = useState<string>(initial?.descricao ?? "");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [funcMode, setFuncMode] = useState<ServicoFuncMode>(initial?.funcionariosMode ?? "todos");
  const [funcIds, setFuncIds] = useState<string[]>(initial?.funcionariosIds ?? []);
  const [erroFunc, setErroFunc] = useState(false);

  const totalMin = (parseInt(durHoras || "0", 10) || 0) * 60 + (parseInt(durMin || "0", 10) || 0);

  function toggleFunc(id: string) {
    setErroFunc(false);
    setFuncIds((l) => l.includes(id) ? l.filter((x) => x !== id) : [...l, id]);
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div><Label>Nome</Label><input style={inputStyle} placeholder="Digite o nome do serviço" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
      <div><Label>Preço</Label><input
        style={inputStyle}
        type="text"
        inputMode="numeric"
        placeholder="Digite o valor"
        value={precoDisplay}
        onChange={(e) => {
          const onlyDigits = e.target.value.replace(/\D/g, "");
          setPrecoDigits(onlyDigits);
        }}
      /></div>
      <div>
        <Label>Categoria (opcional)</Label>
        <div style={{ position: "relative" }}>
          <select
            style={{
              ...inputStyle,
              appearance: "none",
              WebkitAppearance: "none",
              MozAppearance: "none",
              height: 48,
              padding: "0 40px 0 14px",
              background: COLORS.bgSurface,
              cursor: "pointer",
              fontWeight: 500,
            }}
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            <option value="">Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          <span aria-hidden style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: COLORS.textMuted }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>
        <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6 }}>
          Serviços sem categoria continuam aparecendo em “Todas”.
        </div>
      </div>
      <div><Label>Duração</Label>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <select
              value={durHoras || "0"}
              onChange={(e) => setDurHoras(e.target.value)}
              style={{
                ...inputStyle,
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                height: 48,
                padding: "0 40px 0 14px",
                background: COLORS.bgSurface,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={String(i)}>{i === 0 ? "h" : `${i}h`}</option>
              ))}
            </select>
            <span aria-hidden style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: COLORS.textMuted }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </div>
          <div style={{ flex: 1, position: "relative" }}>
            <select
              value={durMin || "0"}
              onChange={(e) => setDurMin(e.target.value)}
              style={{
                ...inputStyle,
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                height: 48,
                padding: "0 40px 0 14px",
                background: COLORS.bgSurface,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              {[0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                <option key={m} value={String(m)}>{m === 0 ? "min" : `${m}min`}</option>
              ))}
            </select>
            <span aria-hidden style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: COLORS.textMuted }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </div>
        </div>
        {totalMin > 0 && (
          <div style={{ marginTop: 6, fontSize: 12, color: COLORS.textMuted }}>Total: {formatDuracaoExtenso(totalMin)}</div>
        )}
      </div>
      <div>
        <Label>Descrição (opcional)</Label>
        <textarea
          className="bisme-textarea"
          placeholder="Adicione uma descrição do serviço"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

      </div>
      <div>
        <Label>Imagem (opcional)</Label>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label={imagemUrl ? "Trocar imagem" : "Adicionar sua imagem aqui"}
            style={{
              width: 72, height: 72, borderRadius: 10,
              border: "none",
              background: imagemUrl ? COLORS.bgSurface : COLORS.bgElevated,
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", flexShrink: 0, color: COLORS.textMuted,
              padding: 0, cursor: "pointer",
            }}
          >
            {imagemUrl ? (
              <img src={imagemUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <ImagePlus size={22} />
            )}
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                height: 36, padding: "0 12px", borderRadius: 8,
                background: COLORS.bgElevated, border: `1px solid ${COLORS.border}`,
                fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.textPrimary,
                cursor: "pointer",
              }}
            >
              {imagemUrl ? "Trocar imagem" : "Adicionar sua imagem aqui"}
            </button>
            {imagemUrl && (
              <button
                type="button"
                onClick={() => setImagemUrl(undefined)}
                style={{
                  height: 32, padding: "0 12px", borderRadius: 8,
                  background: "transparent", border: "none",
                  fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: COLORS.danger,
                  cursor: "pointer", textAlign: "left",
                }}
              >
                Remover imagem
              </button>
            )}
          </div>
        </div>
      </div>

      {funcionarios.length >= 2 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>Funcionários que realizam</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {([
              { v: "todos", l: "Todos os funcionários realizam" },
              { v: "exceto", l: "Todos, exceto os selecionados" },
              { v: "apenas", l: "Apenas funcionários específicos" },
            ] as { v: ServicoFuncMode; l: string }[]).map((o) => {
              const on = funcMode === o.v;
              return (
                <label key={o.v} className={on ? undefined : "bisme-light-border"} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `1.5px solid ${on ? COLORS.accentLight : COLORS.border}`, borderRadius: 8, cursor: "pointer", background: COLORS.bgSurface }}>

                  <input type="radio" name="funcMode" checked={on} onChange={() => { setFuncMode(o.v); setErroFunc(false); }} style={{ display: "none" }} />
                  <span aria-hidden className={(on ? COLORS.accentLight : COLORS.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {on && <span style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.accentLight }} />}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>{o.l}</span>
                </label>
              );
            })}
            {funcMode !== "todos" && (
              <div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, margin: "6px 0" }}>
                  {funcMode === "exceto" ? "Selecione quem NÃO realiza:" : "Selecione quem realiza:"}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {funcionarios.length === 0 && <span style={{ fontSize: 12.5, color: COLORS.textMuted }}>Cadastre funcionários primeiro.</span>}
                  {funcionarios.map((f) => {
                    const on = funcIds.includes(f.id);
                    return (
                      <button key={f.id} type="button" onClick={() => toggleFunc(f.id)} className={on ? undefined : "bisme-light-border"} style={{
                        padding: "8px 12px", borderRadius: 16, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                        background: on ? COLORS.accentLight : COLORS.bgElevated,
                        color: on ? "#fff" : COLORS.textPrimary,
                        border: `1px solid ${on ? COLORS.accentLight : COLORS.border}`,
                      }}>{f.nome}</button>
                    );
                  })}
                </div>
                {erroFunc && <div style={{ fontSize: 12, color: COLORS.danger, marginTop: 6 }}>Selecione ao menos um funcionário.</div>}
              </div>
            )}
          </div>
        </>
      )}


      {onDelete && (
        <button onClick={onDelete} style={{ color: COLORS.danger, background: COLORS.dangerBg, border: `1px solid ${COLORS.dangerBorder}`, borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 44, fontFamily: FONT }}>Excluir</button>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={onClose} className="bisme-light-border" style={{ ...secondaryBtn, flex: 1 }}>Cancelar</button>
        <button
          onClick={() => {
            if (!nome.trim() || totalMin <= 0) return;
            if (funcMode !== "todos" && funcIds.length === 0) { setErroFunc(true); return; }
            onSave({
              id: initial?.id ?? crypto.randomUUID(),
              nome: nome.trim(),
              preco: precoDigits === "" ? initialPreco : (parseInt(precoDigits, 10) || 0),
              duracao_minutos: totalMin,
              imagemUrl,
              categoriaId: categoriaId || undefined,
              descricao: descricao.trim() || undefined,
              funcionariosMode: funcMode,
              funcionariosIds: funcMode === "todos" ? [] : funcIds,
            });
            onClose();
          }}
          style={{ ...primaryBtn, flex: 2 }}
        >Salvar</button>
      </div>

      <ImageCropper
        open={!!cropSrc}
        src={cropSrc}
        aspect={1}
        outputSize={{ w: 240, h: 240 }}
        title="Ajustar imagem do serviço"
        onCancel={() => setCropSrc(null)}
        onConfirm={(dataUrl) => {
          setImagemUrl(dataUrl);
          setCropSrc(null);
        }}
      />
    </div>
  );
}

/* =========================== HORÁRIOS + BLOQUEIOS =========================== */
type BusinessHourRow = { id: string; company_id: string; weekday: number; is_open: boolean; opens_at: string; closes_at: string };
type BreakRow = { id: string; company_id: string; weekday: number | null; starts_at: string; ends_at: string; professional_id: string | null };
type BlockRow = { id: string; company_id: string; block_date: string; starts_at: string | null; ends_at: string | null; full_day: boolean; professional_id: string | null };

function timeToHM(t: string | null | undefined): string {
  if (!t) return "";
  // "HH:MM:SS" or "HH:MM"
  const m = t.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : t;
}
function hmToTime(t: string): string {
  if (!t) return "00:00:00";
  return /^\d{2}:\d{2}$/.test(t) ? `${t}:00` : t;
}

export function HorariosTela() {
  const { horarios, setHorarios, bloqueios, setBloqueios, addBloqueio, removeBloqueio, pausas, setPausas, savePausa, removePausa, funcionarios, setFuncionarios } = useApp();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bloqOpen, setBloqOpen] = useState(false);
  
  const [pausaOpen, setPausaOpen] = useState(false);
  const [pausaEdit, setPausaEdit] = useState<PausaAdmin | null>(null);
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const horariosRef = useRef<HorarioAdmin[]>(horarios);
  useEffect(() => { horariosRef.current = horarios; }, [horarios]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) { navigate({ to: "/empresario/login", replace: true }); return; }
        const { data: member } = await supabase.from("company_members").select("company_id").limit(1).maybeSingle();
        if (cancelled) return;
        if (!member?.company_id) { navigate({ to: "/empresario/onboarding", replace: true }); return; }
        const cid = member.company_id;
        setCompanyId(cid);

        const [bhRes, brRes, blRes, profRes] = await Promise.all([
          supabase.from("business_hours").select("*").eq("company_id", cid),
          supabase.from("breaks").select("*").eq("company_id", cid),
          supabase.from("blocks").select("*").eq("company_id", cid),
          supabase.from("professionals").select("*").eq("company_id", cid).eq("is_active", true).eq("is_visible", true).eq("is_default_owner", false).order("position", { ascending: true }),
        ]);
        if (cancelled) return;
        if (bhRes.error) throw bhRes.error;
        if (brRes.error) throw brRes.error;
        if (blRes.error) throw blRes.error;
        if (profRes.error) throw profRes.error;

        const bhMap = new Map<number, BusinessHourRow>();
        (bhRes.data ?? []).forEach((r) => bhMap.set(r.weekday, r as BusinessHourRow));
        const hs: HorarioAdmin[] = [1,2,3,4,5,6,0].map((wd) => {
          const r = bhMap.get(wd);
          return {
            diaSemana: wd,
            aberto: r?.is_open ?? false,
            abre: timeToHM(r?.opens_at) || "08:00",
            fecha: timeToHM(r?.closes_at) || "18:00",
          };
        });
        setHorarios(hs);

        const ps: PausaAdmin[] = (brRes.data ?? []).map((r) => ({
          id: r.id,
          diaSemana: r.weekday,
          inicio: timeToHM(r.starts_at),
          fim: timeToHM(r.ends_at),
          funcionarioId: r.professional_id ?? undefined,
        }));
        setPausas(ps);

        const bs: BloqueioAdmin[] = (blRes.data ?? []).map((r) => ({
          id: r.id,
          data: r.block_date,
          inicio: r.starts_at ? timeToHM(r.starts_at) : undefined,
          fim: r.ends_at ? timeToHM(r.ends_at) : undefined,
          diaInteiro: r.full_day,
          funcionarioId: r.professional_id ?? undefined,
        }));
        setBloqueios(bs);

        // hidrata funcionarios visíveis para os formulários de pausa/bloqueio
        const fs: FuncionarioAdmin[] = (profRes.data ?? []).map((r) => ({
          id: r.id as string,
          nome: r.name as string,
          fotoUrl: (r.photo_url as string | null) ?? undefined,
          idade: undefined,
          cargo: (r.role_title as string | null) ?? "",
          telefone: undefined,
          status: "ativo" as StatusFunc,
          comissaoPct: 0,
          entrada: timeToHM(r.shift_start as string | null) || "08:00",
          saida: timeToHM(r.shift_end as string | null) || "18:00",
          diasFolga: (r.off_days as number[] | null) ?? [],
          feriasInicio: (r.vacation_start as string | null) ?? undefined,
          feriasFim: (r.vacation_end as string | null) ?? undefined,
        }));
        setFuncionarios(fs);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Falha ao carregar horários.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistDay(cid: string, h: HorarioAdmin) {
    // Garante horários válidos mesmo quando fechado para não quebrar constraint closes_at > opens_at
    let opens = h.abre || "08:00";
    let closes = h.fecha || "18:00";
    if (h.aberto && closes <= opens) {
      toast.error("Fechamento deve ser maior que abertura");
      // recarrega o valor real do banco para a UI não ficar com valor inválido
      void reloadDay(cid, h.diaSemana);
      return;
    }
    if (closes <= opens) { opens = "08:00"; closes = "18:00"; }
    const payload = {
      company_id: cid,
      weekday: h.diaSemana,
      is_open: h.aberto,
      opens_at: hmToTime(opens),
      closes_at: hmToTime(closes),
    };
    supabase
      .from("business_hours")
      .upsert(payload, { onConflict: "company_id,weekday" })
      .select("*")
      .maybeSingle()
      .then(({ data, error: e }) => {
        if (e) {
          toast.error("Erro ao salvar: " + e.message);
          void reloadDay(cid, h.diaSemana);
          return;
        }
        const row = data as BusinessHourRow | null;
        if (row) {
          // Sincroniza estado local com o que ficou de fato salvo no banco
          const synced = horariosRef.current.map((x) => x.diaSemana === row.weekday ? {
            diaSemana: row.weekday,
            aberto: row.is_open,
            abre: timeToHM(row.opens_at) || x.abre,
            fecha: timeToHM(row.closes_at) || x.fecha,
          } : x);
          setHorarios(synced);
        }
        toast.success("Alteração salva");
      });
  }

  async function reloadDay(cid: string, weekday: number) {
    const { data } = await supabase
      .from("business_hours")
      .select("*")
      .eq("company_id", cid)
      .eq("weekday", weekday)
      .maybeSingle();
    const row = data as BusinessHourRow | null;
    if (!row) return;
    const synced = horariosRef.current.map((x) => x.diaSemana === weekday ? {
      diaSemana: weekday,
      aberto: row.is_open,
      abre: timeToHM(row.opens_at) || "08:00",
      fecha: timeToHM(row.closes_at) || "18:00",
    } : x);
    setHorarios(synced);
  }

  function update(diaSemana: number, patch: Partial<HorarioAdmin>) {
    const next = horarios.map((h) => (h.diaSemana === diaSemana ? { ...h, ...patch } : h));
    setHorarios(next);
    if (!companyId) return;
    const h = next.find((x) => x.diaSemana === diaSemana)!;
    if (saveTimers.current[diaSemana]) clearTimeout(saveTimers.current[diaSemana]);
    saveTimers.current[diaSemana] = setTimeout(() => persistDay(companyId, h), 600);
  }

  function flushDay(diaSemana: number) {
    if (!companyId) return;
    if (saveTimers.current[diaSemana]) {
      clearTimeout(saveTimers.current[diaSemana]);
      delete saveTimers.current[diaSemana];
    }
    const h = horarios.find((x) => x.diaSemana === diaSemana);
    if (h) persistDay(companyId, h);
  }

  async function handleAddBloqueio(b: BloqueioAdmin) {
    if (!companyId) return;
    addBloqueio(b);
    const { error: e } = await supabase.from("blocks").insert({
      id: b.id,
      company_id: companyId,
      block_date: b.data,
      starts_at: b.diaInteiro ? null : (b.inicio ? hmToTime(b.inicio) : null),
      ends_at: b.diaInteiro ? null : (b.fim ? hmToTime(b.fim) : null),
      full_day: b.diaInteiro,
      professional_id: b.funcionarioId ?? null,
    });
    if (e) { toast.error("Erro ao salvar bloqueio: " + e.message); setBloqueios(bloqueios.filter((x) => x.id !== b.id)); }
  }
  async function handleRemoveBloqueio(id: string) {
    if (!companyId) return;
    removeBloqueio(id);
    const { error: e } = await supabase.from("blocks").delete().eq("id", id).eq("company_id", companyId);
    if (e) toast.error("Erro ao remover: " + e.message);
  }
  async function handleSavePausa(p: PausaAdmin) {
    if (!companyId) return;
    savePausa(p);
    const payload = {
      id: p.id,
      company_id: companyId,
      weekday: p.diaSemana,
      starts_at: hmToTime(p.inicio),
      ends_at: hmToTime(p.fim),
      professional_id: p.funcionarioId ?? null,
    };
    const { error: e } = await supabase.from("breaks").upsert(payload, { onConflict: "id" });
    if (e) toast.error("Erro ao salvar pausa: " + e.message);
    else toast.success("Alteração salva");
  }
  async function handleRemovePausa(id: string) {
    if (!companyId) return;
    removePausa(id);
    const { error: e } = await supabase.from("breaks").delete().eq("id", id).eq("company_id", companyId);
    if (e) toast.error("Erro ao remover: " + e.message);
  }

  if (loading) {
    return <div style={{ padding: 30, color: COLORS.textMuted, fontFamily: FONT }}>Carregando horários…</div>;
  }
  if (error) {
    return <div style={{ padding: 30, color: COLORS.danger, fontFamily: FONT }}>{error}</div>;
  }

  return (
    <div style={{ padding: "30px 16px 8px", background: COLORS.bgBase, minHeight: "calc(100vh - 56px)", fontFamily: FONT }}>

      <PageHeader
        title="Horários de Funcionamento"
        subtitle="Defina os dias e horários de atendimento"
      />

      {/* Ações rápidas: Bloquear (com lista inline) e Pausa (com lista inline) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={() => setBloqOpen(true)}
            className="bisme-action-btn"
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              background: COLORS.bgSurface, border: `1.5px solid ${COLORS.border}`,
              borderLeft: `4px solid ${COLORS.accentLight}`,
              borderRadius: 12, padding: "14px 14px", cursor: "pointer",
              fontFamily: FONT, textAlign: "left", minHeight: 56,
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              transition: "background 150ms ease, transform 80ms ease, box-shadow 150ms ease",
            }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 10, background: COLORS.accentLight, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.textPrimary }}>Bloquear horário do dia</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>{bloqueios.length} {bloqueios.length === 1 ? "bloqueio ativo" : "bloqueios ativos"}</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          {bloqueios.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {bloqueios.map((b) => {
                const escopo = b.funcionarioId ? (funcionarios.find((f) => f.id === b.funcionarioId)?.nome ?? "Funcionário") : "Negócio todo";
                return (
                  <div key={b.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.textPrimary }}>{b.data}</div>
                      <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                        {b.diaInteiro ? "Dia inteiro" : `${b.inicio ?? "—"} – ${b.fim ?? "—"}`} · {escopo}
                      </div>
                    </div>
                    <button onClick={() => handleRemoveBloqueio(b.id)} style={{ color: COLORS.danger, background: COLORS.dangerBg, border: `1px solid ${COLORS.dangerBorder}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>Remover</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={() => { setPausaEdit(null); setPausaOpen(true); }}
            className="bisme-action-btn"
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              background: COLORS.bgSurface, border: `1.5px solid ${COLORS.border}`,
              borderLeft: `4px solid ${COLORS.accentLight}`,
              borderRadius: 12, padding: "14px 14px", cursor: "pointer",
              fontFamily: FONT, textAlign: "left", minHeight: 56,
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              transition: "background 150ms ease, transform 80ms ease, box-shadow 150ms ease",
            }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 10, background: COLORS.accentLight, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.textPrimary }}>Horário de almoço ou pausa</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>{pausas.length} {pausas.length === 1 ? "pausa configurada" : "pausas configuradas"}</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          {pausas.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pausas.map((p) => {
                const funcNome = p.funcionarioId ? (funcionarios.find((f) => f.id === p.funcionarioId)?.nome ?? "—") : "Todo o negócio";
                const diaTxt = p.diaSemana === null ? "Todos os dias de funcionamento" : (DIAS.find((d) => d.i === p.diaSemana)?.nome ?? "—");
                return (
                  <div key={p.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.textPrimary }}>{p.inicio} – {p.fim}</div>
                      <div style={{ fontSize: 12, color: COLORS.textMuted }}>{diaTxt} · {funcNome}</div>
                    </div>
                    <button onClick={() => { setPausaEdit(p); setPausaOpen(true); }} aria-label="Editar" style={{ background: "transparent", border: "none", cursor: "pointer", padding: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                    </button>
                    <button onClick={() => handleRemovePausa(p.id)} style={{ color: COLORS.danger, background: COLORS.dangerBg, border: `1px solid ${COLORS.dangerBorder}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>Remover</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>


      {DIAS.map(({ i, nome }) => {
        const h = horarios.find((x) => x.diaSemana === i)!;
        return (
          <div key={i} style={{ ...cardStyle, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: 15, color: COLORS.textPrimary }}>{nome}</span>
              <Toggle on={h.aberto} onChange={(v) => update(i, { aberto: v })} />
            </div>
            <div style={{ maxHeight: h.aberto ? 80 : 0, overflow: "hidden", transition: "max-height 250ms ease" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
                <label style={{ fontSize: 12, color: COLORS.textMuted }}>Abertura</label>
                <input style={{ ...inputStyle, padding: 10, flex: 1 }} type="time" value={h.abre} onChange={(e) => update(i, { abre: e.target.value })} onBlur={() => flushDay(i)} />
                <label style={{ fontSize: 12, color: COLORS.textMuted }}>Fechamento</label>
                <input style={{ ...inputStyle, padding: 10, flex: 1 }} type="time" value={h.fecha} onChange={(e) => update(i, { fecha: e.target.value })} onBlur={() => flushDay(i)} />
              </div>
            </div>
            {!h.aberto && <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 8 }}>Fechado</div>}
          </div>
        );
      })}

      <BottomSheet open={bloqOpen} onClose={() => setBloqOpen(false)} title="Bloquear Horário / Dia">
        <FormBloqueio funcionarios={funcionarios} onClose={() => setBloqOpen(false)} onSave={handleAddBloqueio} />
      </BottomSheet>




      <BottomSheet open={pausaOpen} onClose={() => { setPausaOpen(false); setPausaEdit(null); }} title={pausaEdit ? "Editar pausa" : "Nova pausa"}>
        <FormPausa
          initial={pausaEdit}
          funcionarios={funcionarios}
          allowFuncionario
          onClose={() => { setPausaOpen(false); setPausaEdit(null); }}
          onSave={handleSavePausa}
        />
      </BottomSheet>
    </div>
  );
}

function FormPausa({ initial, funcionarios, allowFuncionario, fixedFuncionarioId, onClose, onSave }: {
  initial: PausaAdmin | null;
  funcionarios: FuncionarioAdmin[];
  allowFuncionario?: boolean;
  fixedFuncionarioId?: string;
  onClose: () => void;
  onSave: (p: PausaAdmin) => void;
}) {
  // "" = não selecionado; "all" = todos os dias; "0".."6" = dia da semana
  const [diaSemanaStr, setDiaSemanaStr] = useState<string>(
    initial ? (initial.diaSemana === null ? "all" : String(initial.diaSemana)) : ""
  );
  const [inicio, setInicio] = useState(initial?.inicio ?? "");
  const [fim, setFim] = useState(initial?.fim ?? "");
  const [aplicarFunc, setAplicarFunc] = useState<boolean>(!!initial?.funcionarioId);
  const [funcionarioId, setFuncionarioId] = useState<string>(initial?.funcionarioId ?? fixedFuncionarioId ?? "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <Label>Dia</Label>
        <select
          style={inputStyle}
          value={diaSemanaStr}
          onChange={(e) => setDiaSemanaStr(e.target.value)}
        >
          <option value="" disabled>Selecione…</option>
          <option value="all">Todos os dias de funcionamento</option>
          {DIAS.map((d) => <option key={d.i} value={d.i}>{d.nome}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Label>Início</Label><input style={inputStyle} type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
        <div style={{ flex: 1 }}><Label>Fim</Label><input style={inputStyle} type="time" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
      </div>

      {allowFuncionario && !fixedFuncionarioId && funcionarios.length >= 2 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>Aplicar para um funcionário específico</span>
            <Toggle on={aplicarFunc} onChange={(v) => { setAplicarFunc(v); if (!v) setFuncionarioId(""); }} />
          </div>
          {aplicarFunc && (
            <div>
              <Label>Funcionário</Label>
              <select style={inputStyle} value={funcionarioId} onChange={(e) => setFuncionarioId(e.target.value)}>
                <option value="">Selecione…</option>
                {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
          )}

          {!aplicarFunc && (
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>Esta pausa será aplicada a <b style={{ color: COLORS.textPrimary }}>todo o negócio</b>.</div>
          )}
        </>
      )}


      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={onClose} className="bisme-light-border" style={{ ...secondaryBtn, flex: 1 }}>Cancelar</button>
        <button
          onClick={() => {
            if (diaSemanaStr === "") { alert("Selecione o dia da pausa."); return; }
            if (!inicio || !fim) { alert("Informe o horário inicial e final."); return; }
            if (fim <= inicio) { alert("O horário final deve ser maior que o inicial."); return; }
            if (allowFuncionario && aplicarFunc && !funcionarioId && !fixedFuncionarioId) { alert("Selecione um funcionário."); return; }
            onSave({
              id: initial?.id ?? crypto.randomUUID(),
              diaSemana: diaSemanaStr === "all" ? null : parseInt(diaSemanaStr, 10),
              inicio,
              fim,
              funcionarioId: fixedFuncionarioId ?? (aplicarFunc ? funcionarioId : undefined),
            });
            onClose();
          }}
          style={{ ...primaryBtn, flex: 2 }}
        >Salvar</button>
      </div>
    </div>
  );
}

function FormBloqueio({ funcionarios, onClose, onSave }: { funcionarios: FuncionarioAdmin[]; onClose: () => void; onSave: (b: BloqueioAdmin) => void }) {
  const [data, setData] = useState(""); const [ini, setIni] = useState(""); const [fim, setFim] = useState(""); const [diaInteiro, setDiaInteiro] = useState(false);
  const [escopo, setEscopo] = useState<"negocio" | "funcionario">("negocio");
  const [funcionarioId, setFuncionarioId] = useState<string>("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div><Label>Dia</Label><input style={inputStyle} type="date" value={data} onChange={(e) => setData(e.target.value)} onClick={(e) => { try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* ignore */ } }} /></div>
      <div style={{ opacity: diaInteiro ? 0.4 : 1, pointerEvents: diaInteiro ? "none" : "auto", display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Label>Início</Label><input style={inputStyle} type="time" value={ini} onChange={(e) => setIni(e.target.value)} /></div>
        <div style={{ flex: 1 }}><Label>Fim</Label><input style={inputStyle} type="time" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>Fechar dia inteiro</span>
        <Toggle on={diaInteiro} onChange={setDiaInteiro} />
      </div>
      {funcionarios.length >= 2 && (
        <div>
          <Label>Aplicar bloqueio para</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className={escopo === "negocio" ? undefined : "bisme-light-border"} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `1.5px solid ${escopo === "negocio" ? COLORS.accentLight : COLORS.border}`, borderRadius: 8, cursor: "pointer", background: COLORS.bgSurface }}>
              <input type="radio" name="escopo-bloq" checked={escopo === "negocio"} onChange={() => { setEscopo("negocio"); setFuncionarioId(""); }} style={{ display: "none" }} />
              <span aria-hidden className={(escopo === "negocio" ? COLORS.accentLight : COLORS.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {escopo === "negocio" && <span style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.accentLight }} />}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>Para o negócio todo</span>
            </label>
            <label className={escopo === "funcionario" ? undefined : "bisme-light-border"} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `1.5px solid ${escopo === "funcionario" ? COLORS.accentLight : COLORS.border}`, borderRadius: 8, cursor: "pointer", background: COLORS.bgSurface }}>
              <input type="radio" name="escopo-bloq" checked={escopo === "funcionario"} onChange={() => setEscopo("funcionario")} style={{ display: "none" }} />
              <span aria-hidden className={(escopo === "funcionario" ? COLORS.accentLight : COLORS.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {escopo === "funcionario" && <span style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.accentLight }} />}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>Apenas para um funcionário específico</span>
            </label>
          </div>
        </div>
      )}
      {funcionarios.length >= 2 && escopo === "funcionario" && (
        <div>
          <Label>Funcionário</Label>
          <select style={inputStyle} value={funcionarioId} onChange={(e) => setFuncionarioId(e.target.value)}>
            <option value="">Selecione…</option>
            {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={onClose} className="bisme-light-border" style={{ ...secondaryBtn, flex: 1 }}>Cancelar</button>
        <button
          onClick={() => {
            if (!data) return;
            if (escopo === "funcionario" && !funcionarioId) {
              toast.error("Selecione o funcionário.");
              return;
            }
            onSave({
              id: crypto.randomUUID(),
              data,
              inicio: diaInteiro ? undefined : ini,
              fim: diaInteiro ? undefined : fim,
              diaInteiro,
              funcionarioId: escopo === "funcionario" ? funcionarioId : undefined,
            });
            onClose();
          }}
          style={{ ...primaryBtn, flex: 2 }}
        >Bloquear</button>
      </div>
    </div>
  );
}

/* DashboardTela foi movida para ./DashboardTela.tsx */

/* =========================== FUNCIONÁRIOS =========================== */
type ProfessionalRow = {
  id: string;
  company_id: string;
  name: string;
  role_title: string | null;
  photo_url: string | null;
  shift_start: string | null;
  shift_end: string | null;
  off_days: number[];
  vacation_start: string | null;
  vacation_end: string | null;
  bio: string | null;
  is_active: boolean;
  is_visible: boolean;
  is_default_owner: boolean;
  position: number;
};

function timeToHHMM(t: string | null): string {
  if (!t) return "";
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function rowToFuncionario(r: ProfessionalRow, prev?: FuncionarioAdmin): FuncionarioAdmin {
  return {
    id: r.id,
    nome: r.name,
    fotoUrl: r.photo_url ?? undefined,
    idade: prev?.idade,
    cargo: r.role_title ?? "",
    telefone: prev?.telefone,
    status: prev?.status ?? "ativo",
    comissaoPct: prev?.comissaoPct ?? 0,
    entrada: timeToHHMM(r.shift_start),
    saida: timeToHHMM(r.shift_end),
    diasFolga: r.off_days ?? [],
    feriasInicio: r.vacation_start ?? undefined,
    feriasFim: r.vacation_end ?? undefined,
    servicosMode: prev?.servicosMode ?? "todos",
    servicosIds: prev?.servicosIds ?? [],
  };
}

export function FuncionariosTela() {
  const { funcionarios, setFuncionarios, agendamentos, servicos, setServicos, pausas, setPausas, savePausa, removePausa } = useApp();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<FuncionarioAdmin | null>(null);
  const [creating, setCreating] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [servicosDisponiveis, setServicosDisponiveis] = useState<ServicoAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function syncServiceProfessionals(
    cid: string,
    professionalId: string,
    mode: FuncServMode,
    selectedIds: string[],
    activeServiceIds: string[],
  ) {
    // Remove TODOS os vínculos atuais desse profissional nesta empresa
    // (inclui os criados pelo trigger automático). Profissional oculto nunca chega aqui.
    const { error: delErr } = await supabase
      .from("service_professionals")
      .delete()
      .eq("company_id", cid)
      .eq("professional_id", professionalId);
    if (delErr) throw delErr;
    const finalIds = mode === "todos" ? activeServiceIds : selectedIds.filter((id) => activeServiceIds.includes(id));
    if (finalIds.length === 0) return;
    const rows = finalIds.map((sid) => ({ company_id: cid, professional_id: professionalId, service_id: sid }));
    const { error: insErr } = await supabase.from("service_professionals").insert(rows);
    if (insErr) throw insErr;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          navigate({ to: "/empresario/login", replace: true });
          return;
        }
        const { data: member } = await supabase
          .from("company_members")
          .select("company_id")
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (!member?.company_id) {
          navigate({ to: "/empresario/onboarding", replace: true });
          return;
        }
        setCompanyId(member.company_id);

        const [profRes, svcRes, linkRes] = await Promise.all([
          supabase
            .from("professionals")
            .select("*")
            .eq("company_id", member.company_id)
            .eq("is_active", true)
            .eq("is_visible", true)
            .eq("is_default_owner", false)
            .order("position", { ascending: true }),
          supabase
            .from("services")
            .select("*")
            .eq("company_id", member.company_id)
            .eq("is_active", true)
            .order("created_at", { ascending: true }),
          supabase
            .from("service_professionals")
            .select("professional_id, service_id")
            .eq("company_id", member.company_id),
        ]);
        if (cancelled) return;
        if (profRes.error) throw profRes.error;
        if (svcRes.error) throw svcRes.error;
        if (linkRes.error) throw linkRes.error;

        const brRes = await supabase.from("breaks").select("*").eq("company_id", member.company_id);
        if (cancelled) return;
        if (brRes.error) throw brRes.error;
        const ps: PausaAdmin[] = (brRes.data ?? []).map((r) => ({
          id: r.id as string,
          diaSemana: (r.weekday as number | null),
          inicio: timeToHM(r.starts_at as string),
          fim: timeToHM(r.ends_at as string),
          funcionarioId: (r.professional_id as string | null) ?? undefined,
        }));
        setPausas(ps);

        const svcList = (svcRes.data ?? []).map((r) => rowToServico(r as ServiceRow));
        const activeIds = svcList.map((s) => s.id);
        const linksByProf = new Map<string, string[]>();
        (linkRes.data ?? []).forEach((l) => {
          const arr = linksByProf.get(l.professional_id) ?? [];
          arr.push(l.service_id);
          linksByProf.set(l.professional_id, arr);
        });
        const profs = (profRes.data ?? []).map((r) => {
          const base = rowToFuncionario(r as ProfessionalRow);
          const linked = (linksByProf.get(base.id) ?? []).filter((id) => activeIds.includes(id));
          const isAll = activeIds.length > 0 && linked.length === activeIds.length;
          return { ...base, servicosMode: isAll ? "todos" as FuncServMode : "apenas" as FuncServMode, servicosIds: isAll ? [] : linked };
        });

        setServicosDisponiveis(svcList);
        // mantém o AppContext em sincronia para outras abas, sem depender dele
        setServicos(svcList);
        setFuncionarios(profs);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Falha ao carregar funcionários.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveFuncionario(f: FuncionarioAdmin) {
    if (!companyId) return;
    const isNew = !funcionarios.some((x) => x.id === f.id);
    const payload = {
      company_id: companyId,
      name: f.nome,
      role_title: f.cargo || null,
      photo_url: f.fotoUrl || null,
      shift_start: f.entrada || null,
      shift_end: f.saida || null,
      off_days: f.diasFolga ?? [],
      vacation_start: f.feriasInicio || null,
      vacation_end: f.feriasFim || null,
      is_visible: true,
      is_default_owner: false,
      is_active: true,
    };
    const activeIds = servicosDisponiveis.map((s) => s.id);
    const mode: FuncServMode = f.servicosMode ?? "todos";
    const selIds = f.servicosIds ?? [];
    try {
      if (isNew) {
        const { data, error: err } = await supabase
          .from("professionals")
          .insert(payload)
          .select("*")
          .single();
        if (err) throw err;
        const row = data as ProfessionalRow;
        await syncServiceProfessionals(companyId, row.id, mode, selIds, activeIds);
        const novo = { ...rowToFuncionario(row, f), servicosMode: mode, servicosIds: mode === "todos" ? [] : selIds };
        setFuncionarios([...funcionarios, novo]);
      } else {
        const { data, error: err } = await supabase
          .from("professionals")
          .update({
            name: payload.name,
            role_title: payload.role_title,
            photo_url: payload.photo_url,
            shift_start: payload.shift_start,
            shift_end: payload.shift_end,
            off_days: payload.off_days,
            vacation_start: payload.vacation_start,
            vacation_end: payload.vacation_end,
            is_visible: true,
          })
          .eq("id", f.id)
          .eq("company_id", companyId)
          .eq("is_default_owner", false)
          .select("*")
          .single();
        if (err) throw err;
        await syncServiceProfessionals(companyId, f.id, mode, selIds, activeIds);
        const updated = { ...rowToFuncionario(data as ProfessionalRow, f), servicosMode: mode, servicosIds: mode === "todos" ? [] : selIds };
        setFuncionarios(funcionarios.map((x) => (x.id === f.id ? updated : x)));
      }
      toast.success(isNew ? "Funcionário criado." : "Funcionário atualizado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  }

  async function handleSavePausaFunc(p: PausaAdmin) {
    if (!companyId) return;
    savePausa(p);
    const payload = {
      id: p.id,
      company_id: companyId,
      weekday: p.diaSemana,
      starts_at: hmToTime(p.inicio),
      ends_at: hmToTime(p.fim),
      professional_id: p.funcionarioId ?? null,
    };
    const { error: e } = await supabase.from("breaks").upsert(payload, { onConflict: "id" });
    if (e) toast.error("Erro ao salvar pausa: " + e.message);
    else toast.success("Pausa salva");
  }

  async function handleRemovePausaFunc(id: string) {
    if (!companyId) return;
    removePausa(id);
    const { error: e } = await supabase.from("breaks").delete().eq("id", id).eq("company_id", companyId);
    if (e) toast.error("Erro ao remover pausa: " + e.message);
  }

  async function handleDeleteFuncionario(id: string) {
    if (!companyId) return;
    try {
      const { error: err } = await supabase
        .from("professionals")
        .update({ is_active: false })
        .eq("id", id)
        .eq("company_id", companyId)
        .eq("is_default_owner", false);
      if (err) throw err;
      // Remove vínculos do profissional desativado. Profissional oculto nunca é alvo.
      await supabase
        .from("service_professionals")
        .delete()
        .eq("company_id", companyId)
        .eq("professional_id", id);
      setFuncionarios(funcionarios.filter((x) => x.id !== id));
      toast.success("Funcionário desativado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível desativar.");
    }
  }


  const stats = useMemo(() => {
    const hoje = fmtDate(new Date());
    const ini = new Date(); ini.setDate(ini.getDate() - ini.getDay());
    const fim = new Date(ini); fim.setDate(ini.getDate() + 6);
    const inicioSemana = fmtDate(ini), fimSemana = fmtDate(fim);
    const ym = hoje.slice(0, 7);
    const map: Record<string, { dia: number; semana: number; mes: number; fat: number; clientes: number }> = {};
    funcionarios.forEach((f) => { map[f.id] = { dia: 0, semana: 0, mes: 0, fat: 0, clientes: 0 }; });
    agendamentos.filter((a) => a.status !== "cancelado").forEach((a) => {
      if (!a.funcionarioId || !map[a.funcionarioId]) return;
      const m = map[a.funcionarioId];
      if (a.data === hoje) m.dia += 1;
      if (a.data >= inicioSemana && a.data <= fimSemana) m.semana += 1;
      if (a.data.startsWith(ym)) {
        m.mes += 1;
        m.fat += servicos.find((s) => s.id === a.servicoId)?.preco ?? 0;
        m.clientes += 1;
      }
    });
    return map;
  }, [funcionarios, agendamentos, servicos]);

  return (
    <div style={{ padding: "30px 16px 8px", background: COLORS.bgBase, minHeight: "calc(100vh - 56px)", fontFamily: FONT }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, fontFamily: FONT, letterSpacing: -0.2, lineHeight: 1.3 }}>Funcionários</h2>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: COLORS.textMuted, fontFamily: FONT, lineHeight: 1.5 }}>Equipe pública e gestão interna</p>
        </div>
        <button onClick={() => setCreating(true)} style={addBtn}>+ Adicionar</button>
      </div>

      {loading && (
        <div style={{ ...cardStyle, textAlign: "center", padding: 30 }}>
          <div style={{ fontSize: 14, color: COLORS.textMuted }}>Carregando...</div>
        </div>
      )}

      {!loading && error && (
        <div style={{ ...cardStyle, textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 14, color: COLORS.danger }}>{error}</div>
        </div>
      )}

      {!loading && !error && funcionarios.length === 0 && (
        <div style={{ ...cardStyle, textAlign: "center", padding: 30 }}>
          <div style={{ fontSize: 14, color: COLORS.textMuted }}>Nenhum funcionário cadastrado.</div>
        </div>
      )}

      {!loading && !error && funcionarios.map((f) => {
        const s = stats[f.id] ?? { dia: 0, semana: 0, mes: 0, fat: 0, clientes: 0 };
        const tkt = s.clientes > 0 ? s.fat / s.clientes : 0;
        const comissao = s.fat * (f.comissaoPct / 100);
        return (
          <div key={f.id} style={{ ...cardStyle, marginBottom: 12, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <Avatar nome={f.nome} fotoUrl={f.fotoUrl} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.textPrimary }}>{f.nome}</div>
                <div style={{ fontSize: 13, color: COLORS.textMuted }}>{f.cargo}{f.idade ? ` · ${f.idade} anos` : ""}</div>
              </div>
              <button onClick={() => setEditing(f)} aria-label="Editar" style={{ background: "transparent", border: "none", cursor: "pointer", padding: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              <MiniStat label="Hoje" value={s.dia.toString()} />
              <MiniStat label="Semana" value={s.semana.toString()} />
              <MiniStat label="Mês" value={s.mes.toString()} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              <MiniStat label="Faturamento" value={brl(s.fat)} accent />
              <MiniStat label="Comissão" value={brl(comissao)} accent />
              <MiniStat label="Ticket méd." value={brl(tkt)} />
            </div>

            <FuncInfoBlocks f={f} />
          </div>
        );
      })}

      <BottomSheet open={editing !== null || creating} onClose={() => { setEditing(null); setCreating(false); }} title={editing ? "Editar Funcionário" : "Novo Funcionário"}>
        <FormFuncionario
          initial={editing}
          servicosDisponiveis={servicosDisponiveis}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(f) => { void handleSaveFuncionario(f); }}
          onDelete={editing ? () => { if (window.confirm("Desativar este funcionário?")) { void handleDeleteFuncionario(editing.id); setEditing(null); } } : undefined}
          onSavePausa={(p) => { void handleSavePausaFunc(p); }}
          onRemovePausa={(id) => { void handleRemovePausaFunc(id); }}
        />
      </BottomSheet>
    </div>
  );
}


function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: COLORS.bgElevated, borderRadius: 8, padding: "8px 10px", border: `1px solid ${COLORS.border}` }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: accent ? COLORS.success : COLORS.textPrimary, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function StatusBadge({ s }: { s: StatusFunc }) {
  const map: Record<StatusFunc, { l: string; bg: string; fg: string; bd: string }> = {
    ativo:       { l: "Ativo",          bg: COLORS.successBg, fg: COLORS.success, bd: COLORS.successBorder },
    ausente:     { l: "Ausente",        bg: COLORS.dangerBg,  fg: COLORS.danger,  bd: COLORS.dangerBorder },
    atendimento: { l: "Em atendimento", bg: COLORS.accentLight, fg: COLORS.accent, bd: COLORS.accent },
  };
  const c = map[s];
  return <span style={{ background: c.bg, color: c.fg, border: `1px solid ${c.bd}`, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{c.l}</span>;
}

function ServicosBadge({ f }: { f: FuncionarioAdmin }) {
  const all = !f.servicosMode || f.servicosMode === "todos";
  const label = all ? "Todos os serviços" : `Serviços específicos${f.servicosIds?.length ? ` (${f.servicosIds.length})` : ""}`;
  return <span style={{ background: "#EEF4FF", color: "#5690f5", border: "1px solid #BFD3F9", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{label}</span>;
}

function FuncInfoBlocks({ f }: { f: FuncionarioAdmin }) {
  const { pausas } = useApp();
  const minhasPausas = pausas.filter((p) => p.funcionarioId === f.id);
  const folgaTxt = f.diasFolga.length
    ? f.diasFolga.map((d) => DIAS.find((x) => x.i === d)?.nome.slice(0, 3)).join(", ")
    : "Nenhuma";
  const ico = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  const blocks: { icon: ReactNode; label: string; value: string }[] = [
    {
      icon: null,
      label: "Horário",
      value: f.entrada && f.saida ? `${f.entrada} – ${f.saida}` : "—",
    },
    {
      icon: <svg {...ico}><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
      label: "Folga",
      value: folgaTxt,
    },
  ];
  if (minhasPausas.length > 0) {
    blocks.push({
      icon: <svg {...ico}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
      label: "Pausas",
      value: `${minhasPausas.length} ${minhasPausas.length === 1 ? "configurada" : "configuradas"}`,
    });
  }
  if (f.feriasInicio && f.feriasFim) {
    blocks.push({
      icon: <svg {...ico}><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>,
      label: "Férias",
      value: `${f.feriasInicio} → ${f.feriasFim}`,
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, paddingTop: 10, borderTop: `1px solid ${COLORS.border}` }}>
      {blocks.map((b, idx) => (
        <div key={idx} style={{ background: COLORS.bgElevated, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "8px 10px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>
            {b.icon && <span style={{ color: COLORS.accentLight, display: "inline-flex" }}>{b.icon}</span>}
            <span>{b.label}</span>
          </div>
          <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: COLORS.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.value}</div>
        </div>
      ))}
    </div>
  );
}

function Avatar({ nome, fotoUrl, size = 40 }: { nome: string; fotoUrl?: string; size?: number }) {
  if (fotoUrl) {
    return <img src={fotoUrl} alt={nome} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: COLORS.accentLight, color: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.4, flexShrink: 0 }}>
      {nome.charAt(0).toUpperCase()}
    </div>
  );
}

function FormFuncionario({ initial, servicosDisponiveis, onClose, onSave, onDelete, onSavePausa, onRemovePausa }: {
  initial: FuncionarioAdmin | null; servicosDisponiveis: ServicoAdmin[]; onClose: () => void; onSave: (f: FuncionarioAdmin) => void; onDelete?: () => void;
  onSavePausa?: (p: PausaAdmin) => void;
  onRemovePausa?: (id: string) => void;
}) {
  const { pausas, savePausa, removePausa, funcionarios } = useApp();
  const persistPausa = onSavePausa ?? savePausa;
  const persistRemovePausa = onRemovePausa ?? removePausa;
  const servicos = servicosDisponiveis;
  const [pausaOpen, setPausaOpen] = useState(false);
  const [pausaEdit, setPausaEdit] = useState<PausaAdmin | null>(null);
  const minhasPausas = initial ? pausas.filter((p) => p.funcionarioId === initial.id) : [];
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [fotoUrl, setFotoUrl] = useState(initial?.fotoUrl ?? "");
  const [cargo, setCargo] = useState(initial?.cargo ?? "");
  const [telefone, setTelefone] = useState(initial?.telefone ?? "");
  const [comissaoPct, setComissaoPct] = useState(initial?.comissaoPct?.toString() ?? "");
  const [entrada, setEntrada] = useState(initial?.entrada ?? "");
  const [saida, setSaida] = useState(initial?.saida ?? "");
  const [diasFolga, setDiasFolga] = useState<number[]>(initial?.diasFolga ?? []);
  const [feriasInicio, setFeriasInicio] = useState(initial?.feriasInicio ?? "");
  const [feriasFim, setFeriasFim] = useState(initial?.feriasFim ?? "");
  const [servMode, setServMode] = useState<FuncServMode>(initial?.servicosMode ?? "todos");
  const [servIds, setServIds] = useState<string[]>(initial?.servicosIds ?? []);
  const [erroServ, setErroServ] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  function toggleDia(i: number) {
    setDiasFolga((l) => l.includes(i) ? l.filter((x) => x !== i) : [...l, i]);
  }
  function toggleServ(id: string) {
    setErroServ(false);
    setServIds((l) => l.includes(id) ? l.filter((x) => x !== id) : [...l, id]);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setCropSrc(String(r.result));
    r.readAsDataURL(f);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <FotoPlaceholder fotoUrl={fotoUrl} onFile={onFile} />
        <div style={{ flex: 1 }}>
          <Label>Adicionar sua imagem aqui</Label>
          <div style={{ fontSize: 12, color: COLORS.textMuted }}>Toque na foto para adicionar ou trocar.</div>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>Dados pessoais</div>
      <div><Label>Nome</Label><input style={inputStyle} placeholder="Digite o nome do funcionário" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
      <div><Label>Função</Label><input style={inputStyle} placeholder="Digite a função" value={cargo} onChange={(e) => setCargo(e.target.value)} /></div>
      <div><Label>Telefone</Label><input style={inputStyle} inputMode="tel" placeholder="Digite o telefone do funcionário" value={telefone} onChange={(e) => setTelefone(e.target.value)} /></div>

      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>Financeiro</div>
      <div><Label>Comissão (%)</Label><input style={inputStyle} type="number" value={comissaoPct} onChange={(e) => setComissaoPct(e.target.value)} /></div>

      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>HORÁRIO DE TRABALHO</div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Label>Entrada</Label><input style={inputStyle} type="time" value={entrada} onChange={(e) => setEntrada(e.target.value)} /></div>
        <div style={{ flex: 1 }}><Label>Saída</Label><input style={inputStyle} type="time" value={saida} onChange={(e) => setSaida(e.target.value)} /></div>
      </div>

      <div>
        <Label>Dias de folga</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {DIAS.map((d) => {
            const on = diasFolga.includes(d.i);
            return (
              <button key={d.i} type="button" onClick={() => toggleDia(d.i)} style={{
                padding: "8px 10px", borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                background: on ? COLORS.accentLight : COLORS.bgElevated,
                color: on ? "#fff" : COLORS.textPrimary,
                border: `1px solid ${on ? COLORS.accentLight : COLORS.border}`,
              }}>{d.nome.slice(0, 3)}</button>
            );
          })}
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>Férias</div>
      <p style={{ margin: 0, fontSize: 12.5, color: COLORS.textMuted, lineHeight: 1.45 }}>
        Período em que o funcionário não estará disponível. Deixe em branco se não houver férias programadas.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{
          background: COLORS.bgSurface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 10,
          padding: 12,
        }}>
          <Label>Início</Label>
          <input style={inputStyle} type="date" value={feriasInicio} onChange={(e) => setFeriasInicio(e.target.value)} />
        </div>
        <div style={{
          background: COLORS.bgSurface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 10,
          padding: 12,
        }}>
          <Label>Fim</Label>
          <input style={inputStyle} type="date" value={feriasFim} onChange={(e) => setFeriasFim(e.target.value)} />
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>Horário de pausa ou almoço</div>
      {!initial ? (
        <p style={{ margin: 0, fontSize: 12.5, color: COLORS.textMuted }}>Salve o funcionário antes para gerenciar suas pausas.</p>
      ) : (
        <>
          {minhasPausas.length === 0 ? (
            <div style={{ fontSize: 12.5, color: COLORS.textMuted }}>Nenhuma pausa configurada.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {minhasPausas.map((p) => {
                const diaTxt = p.diaSemana === null ? "Todos os dias" : (DIAS.find((d) => d.i === p.diaSemana)?.nome ?? "—");
                return (
                  <div key={p.id} style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bgSurface, borderRadius: 10, padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.textPrimary }}>{p.inicio} – {p.fim}</div>
                      <div style={{ fontSize: 11, color: COLORS.textMuted }}>{diaTxt}</div>
                    </div>
                    <button type="button" onClick={() => { setPausaEdit(p); setPausaOpen(true); }} aria-label="Editar" style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                    </button>
                    <button type="button" onClick={() => persistRemovePausa(p.id)} style={{ color: COLORS.danger, background: COLORS.dangerBg, border: `1px solid ${COLORS.dangerBorder}`, borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>Remover</button>
                  </div>
                );
              })}
            </div>
          )}
          <button type="button" className="bisme-light-border" onClick={() => { setPausaEdit(null); setPausaOpen(true); }} style={{ ...secondaryBtn, marginTop: 4 }}>+ Adicionar pausa</button>
          {pausaOpen && (
            <div style={{
              marginTop: 8,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.bgElevated,
              borderRadius: 12,
              padding: 14,
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.textPrimary, marginBottom: 10 }}>
                {pausaEdit ? "Editar pausa" : "Nova pausa"}
              </div>
              <FormPausa
                initial={pausaEdit}
                funcionarios={funcionarios}
                fixedFuncionarioId={initial.id}
                onClose={() => { setPausaOpen(false); setPausaEdit(null); }}
                onSave={(p) => persistPausa(p)}
              />
            </div>
          )}
        </>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>Serviços realizados</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {([
          { v: "todos", l: "Realiza todos os serviços" },
          { v: "apenas", l: "Realiza apenas serviços específicos" },
        ] as { v: FuncServMode; l: string }[]).map((o) => {
          const on = servMode === o.v;
          return (
            <label key={o.v} className={on ? undefined : "bisme-light-border"} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `1.5px solid ${on ? COLORS.accentLight : COLORS.border}`, borderRadius: 8, cursor: "pointer", background: COLORS.bgSurface }}>
              <input type="radio" name="servMode" checked={on} onChange={() => { setServMode(o.v); setErroServ(false); }} style={{ display: "none" }} />
              <span aria-hidden className={(on ? COLORS.accentLight : COLORS.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {on && <span style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.accentLight }} />}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>{o.l}</span>
            </label>
          );
        })}
        {servMode === "apenas" && (
          <div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, margin: "6px 0" }}>Selecione os serviços:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {servicos.length === 0 && <span style={{ fontSize: 12.5, color: COLORS.textMuted }}>Cadastre serviços primeiro.</span>}
              {servicos.map((s) => {
                const on = servIds.includes(s.id);
                return (
                  <button key={s.id} type="button" onClick={() => toggleServ(s.id)} className={on ? undefined : "bisme-light-border"} style={{
                    padding: "8px 12px", borderRadius: 16, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                    background: on ? COLORS.accentLight : COLORS.bgElevated,
                    color: on ? "#fff" : COLORS.textPrimary,
                    border: `1px solid ${on ? COLORS.accentLight : COLORS.border}`,
                  }}>{s.nome}</button>
                );
              })}
            </div>
            {erroServ && <div style={{ fontSize: 12, color: COLORS.danger, marginTop: 6 }}>Selecione ao menos um serviço.</div>}
          </div>
        )}
      </div>

      {onDelete && (
        <button onClick={onDelete} style={{ color: COLORS.danger, background: COLORS.dangerBg, border: `1px solid ${COLORS.dangerBorder}`, borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 44, fontFamily: FONT }}>Excluir</button>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={onClose} className="bisme-light-border" style={{ ...secondaryBtn, flex: 1 }}>Cancelar</button>
        <button
          onClick={() => {
            if (!nome.trim()) return;
            if (servMode === "apenas" && servIds.length === 0) { setErroServ(true); return; }
            onSave({
              id: initial?.id ?? crypto.randomUUID(),
              nome: nome.trim(),
              fotoUrl: fotoUrl || undefined,
              idade: initial?.idade,
              cargo: cargo.trim() || "Barbeiro",
              telefone: telefone.trim() || undefined,
              status: initial?.status ?? "ativo",
              comissaoPct: parseFloat(comissaoPct) || 0,
              entrada, saida, diasFolga,
              feriasInicio: feriasInicio || undefined,
              feriasFim: feriasFim || undefined,
              servicosMode: servMode,
              servicosIds: servMode === "todos" ? [] : servIds,
            });
            onClose();
          }}
          style={{ ...primaryBtn, flex: 2 }}
        >Salvar</button>
      </div>

      <ImageCropper
        open={!!cropSrc}
        src={cropSrc}
        aspect={1}
        circular
        outputSize={{ w: 320, h: 320 }}
        title="Ajustar foto do funcionário"
        onCancel={() => setCropSrc(null)}
        onConfirm={(dataUrl) => {
          setFotoUrl(dataUrl);
          setCropSrc(null);
        }}
      />
    </div>
  );
}

function FotoPlaceholder({ fotoUrl, onFile }: { fotoUrl: string; onFile: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const ref = useRef<HTMLInputElement | null>(null);
  return (
    <>
      <input ref={ref} type="file" accept="image/*" hidden onChange={onFile} />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        aria-label="Adicionar foto de perfil"
        style={{
          width: 72, height: 72, borderRadius: "50%",
          background: fotoUrl ? COLORS.bgSurface : COLORS.bgElevated,
          border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", padding: 0, cursor: "pointer", color: COLORS.textMuted, flexShrink: 0,
        }}
      >
        {fotoUrl ? (
          <img src={fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <ImagePlus size={24} />
        )}
      </button>
    </>
  );
}
