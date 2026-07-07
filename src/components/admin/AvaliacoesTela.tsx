import { useState } from "react";
import { COLORS, FONT, cardStyle, inputStyle, Label, Toggle, primaryBtn, secondaryBtn, BottomSheet, PageHeader } from "./ui";
import { useAvaliacoes, type Avaliacao } from "./AvaliacoesContext";
import { useSiteConfig } from "./SiteConfigContext";
import { ImageCropper } from "./ImageCropper";
import { ReviewsConfig } from "./ReviewsConfig";
import { SavedOnBlurScope } from "./SavedToast";

function StarPicker({ value, onChange, size = 28 }: { value: number; onChange: (n: number) => void; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1,2,3,4,5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} estrelas`}
          style={{ background: "transparent", border: "none", padding: 2, cursor: "pointer", lineHeight: 0 }}
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill={n <= value ? "#FFC107" : "#E5E5E5"}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </button>
      ))}
    </div>
  );
}

function StarsView({ n }: { n: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1,2,3,4,5].map((i) => (
        <svg key={i} width={14} height={14} viewBox="0 0 24 24" fill={i <= n ? "#FFC107" : "#E5E5E5"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </span>
  );
}

function AvaliacaoCard({ a, onEdit, onRemove }: { a: Avaliacao; onEdit: (a: Avaliacao) => void; onRemove: (id: string) => void }) {
  return (
    <div className="bisme-light-border" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        {a.fotoUrl ? (
          <img src={a.fotoUrl} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: COLORS.bgElevated, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: COLORS.textPrimary }}>
            {a.nome.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.textPrimary }}>{a.nome}</div>
            <StarsView n={a.estrelas} />
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
            {formatDataHora(a.data)}
            {a.imagemUrl && <span style={{ marginLeft: 8, padding: "2px 6px", borderRadius: 6, background: COLORS.bgElevated }}>com foto</span>}
          </div>
          <p style={{ fontSize: 13, color: COLORS.textPrimary, margin: "8px 0 0", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{a.texto}</p>
          {a.imagemUrl && (
            <img src={a.imagemUrl} alt="" style={{ marginTop: 8, width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: `1px solid ${COLORS.border}` }} />
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
        <button onClick={() => onEdit(a)} className="bisme-light-border" style={{ ...secondaryBtn, height: 36, padding: "0 12px", fontSize: 13 }}>Editar</button>
        <button onClick={() => { if (confirm("Excluir esta avaliação?")) onRemove(a.id); }} style={{ ...secondaryBtn, height: 36, padding: "0 12px", fontSize: 13, color: COLORS.danger, borderColor: COLORS.dangerBorder }}>Excluir</button>
      </div>
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDataHora(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

interface EditState {
  id?: string;
  nome: string;
  fotoUrl?: string;
  estrelas: number;
  texto: string;
  imagemUrl?: string;
  data: string; // local input
}

function emptyEdit(): EditState {
  return { nome: "", estrelas: 5, texto: "", data: toLocalInput(new Date().toISOString()) };
}

export function AvaliacoesTela() {
  const { avaliacoes, addAvaliacao, updateAvaliacao, removeAvaliacao } = useAvaliacoes();
  const { config, updateConfig } = useSiteConfig();
  const [editing, setEditing] = useState<EditState | null>(null);
  const [openModelo, setOpenModelo] = useState(false);
  const [openReais, setOpenReais] = useState(false);
  const [cropState, setCropState] = useState<{ src: string; field: "fotoUrl" | "imagemUrl" } | null>(null);
  const [mapsError, setMapsError] = useState(false);

  const modelo = avaliacoes.filter((a) => !a.isReal);
  const reais = avaliacoes.filter((a) => a.isReal);

  function openNew() { setEditing(emptyEdit()); }
  function openEdit(a: Avaliacao) {
    setEditing({
      id: a.id, nome: a.nome, fotoUrl: a.fotoUrl, estrelas: a.estrelas,
      texto: a.texto, imagemUrl: a.imagemUrl, data: toLocalInput(a.data),
    });
  }

  function handleFile(field: "fotoUrl" | "imagemUrl", e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f || !editing) return;
    e.target.value = "";
    const r = new FileReader();
    r.onload = () => setCropState({ src: String(r.result), field });
    r.readAsDataURL(f);
  }

  function save() {
    if (!editing) return;
    if (!editing.nome.trim() || !editing.texto.trim() || editing.estrelas < 1) return;
    const payload = {
      nome: editing.nome.trim(),
      fotoUrl: editing.fotoUrl,
      estrelas: editing.estrelas,
      texto: editing.texto.trim(),
      imagemUrl: editing.imagemUrl,
      data: fromLocalInput(editing.data),
    };
    if (editing.id) {
      const original = avaliacoes.find((x) => x.id === editing.id);
      updateAvaliacao({ id: editing.id, ...payload, isReal: original?.isReal ?? false });
    } else {
      addAvaliacao({ ...payload, isReal: false });
    }
    setEditing(null);
  }

  return (
    <SavedOnBlurScope>
    <div style={{ padding: "30px 16px 8px", fontFamily: FONT, display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Avaliações do seu negócio"
        subtitle="Gerencie em um só lugar todas as avaliações recebidas pelo seu empreendimento"
        compact
      />
      {/* Google Reviews config */}
      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, color: COLORS.textPrimary }}>Avaliações do Google</h3>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: COLORS.textMuted }}>
          Mostre o botão "Ver mais no Google" para seus clientes acessarem suas avaliações no Google Maps
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>Mostrar botão</div>
          <Toggle on={config.showGoogleReviewsButton} onChange={(v) => {
            if (v && !config.googleMapsLink.trim()) {
              setMapsError(true);
              return;
            }
            setMapsError(false);
            updateConfig({ showGoogleReviewsButton: v });
          }} />
        </div>
        <Label>Link do Google Maps</Label>
        <input
          value={config.googleMapsLink}
          onChange={(e) => {
            updateConfig({ googleMapsLink: e.target.value });
            if (mapsError) setMapsError(false);
          }}
          placeholder="Cole o link aqui"
          style={{
            ...inputStyle,
            borderColor: mapsError ? COLORS.danger : inputStyle.borderColor,
            boxShadow: mapsError ? `0 0 0 2px ${COLORS.danger}33` : undefined,
            transition: "border-color .2s, box-shadow .2s",
          }}
        />
        {mapsError && (
          <p style={{ margin: "6px 0 0", fontSize: 13, color: COLORS.danger }}>
            Cole o link do Google Maps para ativar esse botão.
          </p>
        )}
      </section>

      {/* Configuração de quantidade e média (compartilhada com "Meu site") */}
      <section style={cardStyle}>
        <ReviewsConfig />
      </section>

      {/* Avaliações reais dos clientes */}
      <section style={cardStyle}>
        <button
          type="button"
          onClick={() => setOpenReais((v) => !v)}
          aria-expanded={openReais}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: COLORS.textPrimary }}>Avaliações reais dos clientes ({reais.length})</h3>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>Enviadas por clientes pelo site</span>
          </div>
          <span style={{ fontSize: 18, color: COLORS.textMuted, transition: "transform .2s", transform: openReais ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</span>
        </button>

        {openReais && (
          <div style={{ marginTop: 14 }}>
            {reais.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: COLORS.textMuted, fontSize: 14 }}>Nenhuma avaliação real recebida ainda.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {reais.map((a) => (
                  <AvaliacaoCard key={a.id} a={a} onEdit={openEdit} onRemove={removeAvaliacao} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Avaliações modelo */}
      <section style={cardStyle}>
        <button
          type="button"
          onClick={() => setOpenModelo((v) => !v)}
          aria-expanded={openModelo}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: COLORS.textPrimary }}>Avaliações modelo ({modelo.length})</h3>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>Exemplos controlados pelo proprietário</span>
          </div>
          <span style={{ fontSize: 18, color: COLORS.textMuted, transition: "transform .2s", transform: openModelo ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</span>
        </button>

        {openModelo && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <button onClick={openNew} style={{ ...primaryBtn, height: 38, padding: "0 14px", fontSize: 13 }}>+ Adicionar modelo</button>
            </div>
            {modelo.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: COLORS.textMuted, fontSize: 14 }}>Nenhuma avaliação modelo.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {modelo.map((a) => (
                  <AvaliacaoCard key={a.id} a={a} onEdit={openEdit} onRemove={removeAvaliacao} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>


      <BottomSheet open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Editar avaliação" : "Nova avaliação"}>
        {editing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <Label>Nome do cliente</Label>
              <input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} placeholder="Digite o nome do cliente" style={inputStyle} />
            </div>
            <div>
              <Label>Foto do cliente (opcional)</Label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label className="bisme-light-border" style={{ ...secondaryBtn, height: 40, padding: "0 14px", fontSize: 13, display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                  <input type="file" accept="image/*" onChange={(e) => handleFile("fotoUrl", e)} style={{ display: "none" }} />
                  {editing.fotoUrl ? "Trocar foto" : "Adicionar foto"}
                </label>
                {editing.fotoUrl && (
                  <img src={editing.fotoUrl} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
                )}
              </div>
            </div>
            <div>
              <Label>Estrelas</Label>
              <StarPicker value={editing.estrelas} onChange={(n) => setEditing({ ...editing, estrelas: n })} />
            </div>
            <div>
              <Label>Texto da avaliação</Label>
              <textarea
                value={editing.texto}
                onChange={(e) => setEditing({ ...editing, texto: e.target.value })}
                placeholder="Digite o texto da avaliação"
                rows={5}
                style={{ ...inputStyle, resize: "vertical", minHeight: 110 }}
              />
            </div>
            <div>
              <Label>Data e horário</Label>
              <input
                type="datetime-local"
                value={editing.data}
                onChange={(e) => setEditing({ ...editing, data: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <Label>Imagem da avaliação (opcional)</Label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ ...secondaryBtn, height: 40, padding: "0 14px", fontSize: 13, display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                  <input type="file" accept="image/*" onChange={(e) => handleFile("imagemUrl", e)} style={{ display: "none" }} />
                  {editing.imagemUrl ? "Trocar imagem" : "Adicionar imagem"}
                </label>
                {editing.imagemUrl && (
                  <div style={{ position: "relative" }}>
                    <img src={editing.imagemUrl} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }} />
                    <button onClick={() => setEditing({ ...editing, imagemUrl: undefined })} aria-label="Remover" style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", border: "none", background: COLORS.textPrimary, color: "#FFF", cursor: "pointer", fontSize: 12 }}>×</button>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => setEditing(null)} className="bisme-light-border" style={{ ...secondaryBtn, flex: 1 }}>Cancelar</button>
              <button onClick={save} style={{ ...primaryBtn, flex: 1 }}>Salvar</button>
            </div>
          </div>
        )}
      </BottomSheet>

      <ImageCropper
        open={!!cropState}
        src={cropState?.src ?? null}
        aspect={1}
        circular={cropState?.field === "fotoUrl"}
        outputSize={cropState?.field === "fotoUrl" ? { w: 240, h: 240 } : { w: 480, h: 480 }}
        title={cropState?.field === "fotoUrl" ? "Ajustar foto do cliente" : "Ajustar imagem da avaliação"}
        onCancel={() => setCropState(null)}
        onConfirm={(dataUrl) => {
          if (cropState && editing) {
            setEditing({ ...editing, [cropState.field]: dataUrl });
          }
          setCropState(null);
        }}
      />
    </div>
    </SavedOnBlurScope>
  );
}
