import { useMemo, useState } from "react";
import { useApp } from "@/components/admin/AppContext";

export function ServicesTab({
  onReservar,
}: {
  onReservar: (servicoId: string) => void;
}) {
  const { servicos: servicosAdmin, categorias, funcionarios } = useApp();

  const [catAtivaId, setCatAtivaId] = useState<string>("todas");
  const [fotoZoom, setFotoZoom] = useState<{ url: string; nome: string } | null>(null);
  const [descAberta, setDescAberta] = useState<{ nome: string; descricao: string } | null>(null);

  const categoriasPresentes = useMemo(() => {
    const ids = new Set(servicosAdmin.map((s) => s.categoriaId).filter(Boolean) as string[]);
    return categorias.filter((c) => ids.has(c.id));
  }, [servicosAdmin, categorias]);

  const semCategoria = servicosAdmin.some((s) => !s.categoriaId);
  const layoutCompacto = categoriasPresentes.length === 0 && funcionarios.length < 2;

  const servicosFiltrados = useMemo(() => {
    if (catAtivaId === "todas") return servicosAdmin;
    if (catAtivaId === "sem") return servicosAdmin.filter((s) => !s.categoriaId);
    return servicosAdmin.filter((s) => s.categoriaId === catAtivaId);
  }, [servicosAdmin, catAtivaId]);

  function fmtDuracao(min: number): string {
    if (min >= 60 && min % 60 === 0) return `${min / 60}h`;
    if (min >= 60) return `${Math.floor(min / 60)}h${min % 60}`;
    return `${min}min`;
  }

  /** Trunca preservando palavras completas (corta sempre no último espaço). */
  function preview(t: string, n = 60): string {
    const s = t.replace(/\s+/g, " ").trim();
    if (s.length <= n) return s;
    let cut = s.slice(0, n);
    const lastSpace = cut.lastIndexOf(" ");
    if (lastSpace > 10) cut = cut.slice(0, lastSpace);
    return cut.replace(/[\s.,;:!?\-–—]+$/, "");
  }

  return (
    <div style={{ paddingTop: 13, paddingBottom: 24, background: "#f8f8f8" }}>
      {categoriasPresentes.length > 0 && (
        <div
          className="sreli-no-scrollbar"
          style={{ display: "flex", gap: 8, padding: "0 16px 10px", overflowX: "auto" }}
        >
          {[
            { id: "todas", nome: "Todos" },
            ...categoriasPresentes,
            ...(semCategoria ? [{ id: "sem", nome: "Outros" }] : []),
          ].map((c) => {
            const ativo = catAtivaId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCatAtivaId(c.id)}
                style={{
                  flexShrink: 0,
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  background: ativo ? "var(--site-primary, #5690f5)" : "#FFFFFF",
                  color: ativo ? "#FFFFFF" : "#1A1A1A",
                  border: `1.5px solid ${ativo ? "var(--site-primary, #5690f5)" : "#EEEEEE"}`,
                  fontFamily: "'Inter', sans-serif",
                  transition: "all 180ms",
                }}
              >
                {c.nome}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 16px" }}>
        {servicosFiltrados.length === 0 && (
          <div style={{ fontSize: 13, color: "#888", padding: "12px 0" }}>
            Nenhum serviço nesta categoria.
          </div>
        )}
        {servicosFiltrados.map((s) => {
          const desc = s.descricao?.trim();
          const hasDesc = !!desc;
          const hasFoto = !!s.imagemUrl;
          const compact = !hasDesc;

          const cardBase: React.CSSProperties = {
            background: "#FFFFFF",
            border: "1.5px solid #FFFFFF",
            borderRadius: 10,
            padding: compact ? "10px 12px" : (layoutCompacto ? "10px 12px" : 12),
            display: "flex",
            alignItems: "center",
            gap: 12,
            height: "auto",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            transition: "all 180ms",
          };

          const fotoSize = compact ? 48 : (layoutCompacto ? 54 : 64);
          const foto = hasFoto && (
            <button
              type="button"
              onClick={() => setFotoZoom({ url: s.imagemUrl!, nome: s.nome })}
              aria-label={`Ver foto de ${s.nome}`}
              style={{ padding: 0, border: "none", background: "transparent", cursor: "zoom-in", flexShrink: 0 }}
            >
              <img
                src={s.imagemUrl}
                alt={s.nome}
                style={{ width: fotoSize, height: fotoSize, borderRadius: 12, objectFit: "cover", display: "block" }}
              />
            </button>
          );

          const nome = (
            <span style={{ fontWeight: 700, fontSize: 14, color: "#1A1A1A", lineHeight: 1.25, overflowWrap: "break-word", wordBreak: "normal" }}>
              {s.nome}
            </span>
          );

          const precoTempo = (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.1, textAlign: "right" }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: "#000", whiteSpace: "nowrap" }}>
                R$ {s.preco.toFixed(2).replace(".", ",")}
              </span>
              <span style={{ fontSize: 11, color: "#888", marginTop: 2, whiteSpace: "nowrap" }}>{fmtDuracao(s.duracao_minutos)}</span>
            </div>
          );

          const reservarBtn = (
            <button
              type="button"
              onClick={() => onReservar(s.id)}
              style={{
                background: "var(--site-primary, #5690f5)",
                color: "#FFFFFF",
                fontWeight: 700, fontSize: 12,
                border: "none",
                borderRadius: 7,
                padding: "7px 14px", cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                whiteSpace: "nowrap",
                minWidth: 84,
              }}
            >
              Reservar
            </button>
          );

          const rightCol = (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0, justifyContent: "space-between", alignSelf: "stretch" }}>
              {precoTempo}
              {reservarBtn}
            </div>
          );

          if (compact) {
            return (
              <div key={s.id} style={cardBase}>
                {foto}
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                  {nome}
                </div>
                {precoTempo}
                {reservarBtn}
              </div>
            );
          }

          return (
            <div key={s.id} style={cardBase}>
              {foto}
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, alignSelf: "stretch", justifyContent: "center", gap: 3 }}>
                {nome}
                <button
                  type="button"
                  onClick={() => setDescAberta({ nome: s.nome, descricao: desc! })}
                  style={{
                    padding: 0, border: "none", background: "transparent",
                    textAlign: "left", cursor: "pointer", color: "#666", fontSize: 12, lineHeight: 1.3,
                    fontFamily: "'Inter', sans-serif",
                    overflowWrap: "break-word", wordBreak: "normal",
                  }}
                >
                  {preview(desc!, layoutCompacto ? 48 : 56)}<span style={{ color: "#888888", fontWeight: 700 }}>…</span>
                </button>
              </div>
              {rightCol}
            </div>
          );
        })}
      </div>

      {fotoZoom && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setFotoZoom(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
            zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
            padding: 0, animation: "sreliFadeIn 180ms ease",
          }}
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={(e) => { e.stopPropagation(); setFotoZoom(null); }}
            style={{
              position: "absolute", top: 16, right: 16, zIndex: 2,
              width: 44, height: 44, borderRadius: "50%", border: "none",
              background: "rgba(255,255,255,0.18)", color: "#FFF",
              fontSize: 24, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(6px)",
            }}
          >×</button>
          <img
            src={fotoZoom.url}
            alt={fotoZoom.nome}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100vw",
              height: "100vh",
              maxWidth: "100vw",
              maxHeight: "100vh",
              objectFit: "contain",
              imageRendering: "auto",
              display: "block",
            }}
          />
        </div>
      )}

      {descAberta && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setDescAberta(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 480,
              background: "#FFFFFF",
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              padding: "18px 18px 22px",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <div style={{ width: 40, height: 4, background: "#E5E5E5", borderRadius: 2, margin: "0 auto 14px" }} />
            <h4 style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#1A1A1A" }}>{descAberta.nome}</h4>
            <p style={{ marginTop: 10, marginBottom: 16, fontSize: 14, lineHeight: 1.5, color: "#444", whiteSpace: "pre-wrap" }}>
              {descAberta.descricao}
            </p>
            <button
              type="button"
              onClick={() => setDescAberta(null)}
              style={{
                width: "100%", height: 44, borderRadius: 10, border: "none",
                background: "var(--site-primary, #5690f5)", color: "#FFF",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
