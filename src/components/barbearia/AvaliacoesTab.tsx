import { useEffect, useMemo, useRef, useState } from "react";
import { IconStar } from "./icons";
import { useSiteConfig } from "@/components/admin/SiteConfigContext";
import { useAvaliacoes, type Avaliacao } from "@/components/admin/AvaliacoesContext";
import { useClientUser } from "./ClientUserContext";
import type { Usuario } from "./data";

const FONT = "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

function Stars({ n, size = 14, max = 5 }: { n: number; size?: number; max?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ color: i < n ? "#FFC107" : "#E5E5E5", display: "inline-flex", lineHeight: 0 }}>
          <IconStar width={size} height={size} />
        </span>
      ))}
    </span>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const pad = (n: number) => String(n).padStart(2, "0");
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Agora há pouco";
    if (diffMin < 60) return `Há ${diffMin} ${diffMin === 1 ? "minuto" : "minutos"}`;
    const hh = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const days = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
    if (days === 0) return `Hoje às ${hh}`;
    if (days === 1) return `Ontem às ${hh}`;
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} às ${hh}`;
  } catch {
    return iso;
  }
}

const AVATAR_COLORS = [
  { bg: "#FBF4D7", fg: "#5690f5" },
  { bg: "#DBEAFE", fg: "#1D4ED8" },
  { bg: "#DCFCE7", fg: "#15803D" },
  { bg: "#FCE7F3", fg: "#9D174D" },
  { bg: "#FEF9C3", fg: "#92400E" },
  { bg: "#EDE9FE", fg: "#5B21B6" },
];

function avatarFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/**
 * Distribui N avaliações entre 3, 4 e 5 estrelas de modo que a média
 * resultante seja a mais próxima possível de `avgTarget`. Determinístico
 * para o mesmo (N, avgTarget) — usa um PRNG semeado para variar levemente
 * a forma da distribuição sem mudar a cada render.
 */
function distribuir345(N: number, avgTarget: number): { 3: number; 4: number; 5: number } {
  if (N <= 0) return { 3: 0, 4: 0, 5: 0 };
  const avg = Math.max(3, Math.min(5, avgTarget));
  const totalStars = Math.max(3 * N, Math.min(5 * N, Math.round(N * avg)));
  const excess = 5 * N - totalStars; // soma de (5 - estrelas) entre os convertidos
  // a + b + c = N; 3a + 4b + 5c = totalStars
  // => a (3-star) = k; b (4-star) = excess - 2k; c (5-star) = N - excess + k
  const minK = Math.max(0, excess - N);
  const maxK = Math.floor(excess / 2);
  // PRNG simples e determinístico (mulberry32) semeado por N+avg.
  let seed = (N * 1000 + Math.round(avg * 100)) >>> 0;
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const rand = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  // Mantém o número de 3-estrelas pequeno (favorece mais 4 e 5).
  const softMax = Math.min(maxK, minK + Math.max(1, Math.floor((maxK - minK) * 0.35)));
  const k = minK + Math.floor(rand * (softMax - minK + 1));
  const threes = k;
  const fours = excess - 2 * k;
  const fives = N - threes - fours;
  return { 3: threes, 4: fours, 5: fives };
}

function ReviewItem({ a, onOpenImage }: { a: Avaliacao; onOpenImage: (src: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const limit = 180;
  const isLong = a.texto.length > limit;
  const display = !expanded && isLong ? a.texto.slice(0, limit).trimEnd() + "…" : a.texto;
  const av = avatarFor(a.nome);
  // Memoiza o texto formatado por avaliação para que o horário não mude
  // a cada render. A chave estável é a própria data ISO da avaliação.
  const dataFmt = useMemo(() => formatDate(a.data), [a.data]);

  return (
    <div style={{ padding: 16, background: "#FFFFFF", borderRadius: 13, marginBottom: 10, border: "1px solid #FFFFFF" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {a.fotoUrl ? (
          <img src={a.fotoUrl} alt={a.nome} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div
            style={{
              width: 40, height: 40, borderRadius: "50%", background: av.bg, color: av.fg,
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0, fontFamily: FONT,
            }}
          >
            {initials(a.nome)}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#1A1A1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.nome}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            <Stars n={a.estrelas} size={12} />
            <span style={{ fontSize: 12, color: "#888888" }}>{dataFmt}</span>
          </div>
        </div>
      </div>
      <p style={{ fontSize: 14, color: "#444444", lineHeight: 1.6, margin: "10px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {display}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{ background: "transparent", border: "none", padding: 0, marginTop: 6, color: "var(--site-primary, #5690f5)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FONT }}
        >
          {expanded ? "Mostrar menos" : "Mostrar mais"}
        </button>
      )}
      {a.imagemUrl && (
        <button
          onClick={() => onOpenImage(a.imagemUrl!)}
          style={{ marginTop: 10, padding: 0, border: "none", background: "transparent", cursor: "zoom-in", display: "block" }}
        >
          <img src={a.imagemUrl} alt="" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 12, border: "1px solid #EEE" }} />
        </button>
      )}
    </div>
  );
}

function AddReviewModal({
  open, onClose, onSubmit, usuario, onChangeFoto,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { estrelas: number; texto: string; imagemUrl?: string }) => void;
  usuario: { nome: string; fotoUrl?: string } | null;
  onChangeFoto: (dataUrl: string) => void;
}) {
  const [estrelas, setEstrelas] = useState(0);
  const [texto, setTexto] = useState("");
  const [imagemUrl, setImagemUrl] = useState<string | undefined>(undefined);
  const [erro, setErro] = useState("");
  const avatarInput = useRef<HTMLInputElement>(null);

  // Bloqueia totalmente a rolagem da página de fundo (mobile e desktop).
  // A rolagem interna do modal continua funcionando porque o container usa overflowY: auto.
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const prev = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "contain";
    html.style.overflow = "hidden";
    return () => {
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      body.style.overflow = prev.bodyOverflow;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      html.style.overflow = prev.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open) return null;

  function reset() {
    setEstrelas(0); setTexto(""); setImagemUrl(undefined); setErro("");
  }
  function close() { reset(); onClose(); }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setImagemUrl(String(r.result));
    r.readAsDataURL(f);
  }

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => onChangeFoto(String(r.result));
    r.readAsDataURL(f);
  }

  function submit() {
    if (estrelas < 1) { setErro("Selecione a quantidade de estrelas."); return; }
    if (!texto.trim()) { setErro("Escreva sua avaliação."); return; }
    onSubmit({ estrelas, texto: texto.trim(), imagemUrl });
    reset();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, fontFamily: FONT, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div style={{
        position: "relative", width: "100%", maxWidth: 520, background: "#FFFFFF",
        borderRadius: "20px 20px 0 0", padding: "20px 18px 24px", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
      }}>
        <div style={{ width: 40, height: 4, background: "#EEEEEE", borderRadius: 2, margin: "0 auto 14px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1A1A1A" }}>Adicionar avaliação</h2>
          <button onClick={close} aria-label="Fechar" style={{ background: "transparent", border: "none", fontSize: 22, lineHeight: 1, cursor: "pointer", color: "#888" }}>×</button>
        </div>

        {usuario && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#f8f8f8", border: "1px solid #F0F0F0", borderRadius: 14, marginBottom: 16 }}>
            {usuario.fotoUrl ? (
              <img src={usuario.fotoUrl} alt={usuario.nome} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <span style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--site-primary, #5690f5)", color: "#FFFFFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                {usuario.nome.charAt(0).toUpperCase()}
              </span>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#1A1A1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{usuario.nome}</div>
              <button
                onClick={() => avatarInput.current?.click()}
                style={{ background: "transparent", border: "none", padding: 0, marginTop: 2, color: "var(--site-primary, #5690f5)", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: FONT }}
              >
                Alterar foto de perfil
              </button>
              <input ref={avatarInput} type="file" accept="image/*" onChange={handleAvatarFile} style={{ display: "none" }} />
            </div>
          </div>
        )}

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#888888", marginBottom: 8 }}>Sua nota</label>
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {[1,2,3,4,5].map((n) => (
            <button key={n} onClick={() => setEstrelas(n)} aria-label={`${n} estrelas`} style={{ background: "transparent", border: "none", padding: 4, cursor: "pointer", color: n <= estrelas ? "#FFC107" : "#E5E5E5" }}>
              <IconStar width={32} height={32} />
            </button>
          ))}
        </div>

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#888888", marginBottom: 8 }}>Sua avaliação</label>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite sua avaliação"
          rows={5}
          style={{
            width: "100%", boxSizing: "border-box", padding: "14px 16px", fontSize: 15,
            border: "1.5px solid #EEEEEE", borderRadius: 14, background: "#f8f8f8",
            fontFamily: FONT, color: "#1A1A1A", resize: "vertical", minHeight: 120, outline: "none",
          }}
        />

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#888888", margin: "16px 0 8px" }}>Foto (opcional)</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px",
            border: "1.5px solid #EEEEEE", borderRadius: 12, cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#1A1A1A",
          }}>
            <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            {imagemUrl ? "Trocar foto" : "Adicionar foto"}
          </label>
          {imagemUrl && (
            <div style={{ position: "relative" }}>
              <img src={imagemUrl} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", border: "1px solid #EEE" }} />
              <button onClick={() => setImagemUrl(undefined)} aria-label="Remover" style={{
                position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%",
                border: "none", background: "#1A1A1A", color: "#FFF", cursor: "pointer", fontSize: 12, lineHeight: 1,
              }}>×</button>
            </div>
          )}
        </div>

        {erro && <div style={{ marginTop: 12, color: "#5690f5", fontSize: 13, fontWeight: 600 }}>{erro}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={close} style={{
            flex: 1, height: 48, borderRadius: 12, border: "1.5px solid #EEEEEE", background: "#FFFFFF",
            color: "#1A1A1A", fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: FONT,
          }}>Cancelar</button>
          <button onClick={submit} style={{
            flex: 1, height: 48, borderRadius: 12, border: "none", background: "var(--site-primary, #5690f5)",
            color: "#FFFFFF", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: FONT,
          }}>Publicar avaliação</button>
        </div>
      </div>
    </div>
  );
}

function ImageLightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  if (!src) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16, cursor: "zoom-out",
    }}>
      <img src={src} alt="" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 12 }} />
    </div>
  );
}

interface Props {
  onAgendar: () => void;
  usuario: { nome: string; email: string } | Usuario | null;
  abrirLogin: (mode?: "login" | "cadastro") => void;
}

export function AvaliacoesTab({ usuario, abrirLogin }: Props) {
  const { config } = useSiteConfig();
  const { avaliacoes, addAvaliacao } = useAvaliacoes();
  const { usuario: clientUser, updateUsuario } = useClientUser();
  const [addOpen, setAddOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Avaliações REAIS adicionadas por clientes (não-seed).
  const reais = useMemo(() => avaliacoes.filter((a) => a.isReal), [avaliacoes]);

  const stats = useMemo(() => {
    // Avaliações modelo só contam quando o dono configurou quantidade (>=5) E média (>0).
    const rawCount = Math.max(0, Math.floor(config.reviewsCount || 0));
    const rawAvg = Math.max(0, Math.min(5, Number(config.ratingAverage) || 0));
    const modeloAtivo = rawCount >= 5 && rawAvg > 0;
    const baseCount = modeloAtivo ? rawCount : 0;
    const baseAvg = modeloAtivo ? rawAvg : 0;
    const baseStars = baseCount * baseAvg;

    // Distribuição sintética (3, 4, 5) gerada a partir da configuração do painel.
    const baseDist = distribuir345(baseCount, baseAvg);

    // Soma das avaliações reais.
    const realStars = reais.reduce((s, a) => s + a.estrelas, 0);
    const realDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reais.forEach((a) => {
      realDist[a.estrelas] = (realDist[a.estrelas] ?? 0) + 1;
    });

    const total = baseCount + reais.length;
    const media = total > 0 ? (baseStars + realStars) / total : 0;

    const dist: Record<number, number> = {
      1: realDist[1],
      2: realDist[2],
      3: baseDist[3] + realDist[3],
      4: baseDist[4] + realDist[4],
      5: baseDist[5] + realDist[5],
    };

    return { total, media, dist };
  }, [config.reviewsCount, config.ratingAverage, reais]);

  // Se modelos estão desativados, oculta avaliações modelo (não-reais) em toda a aba.
  const modeloAtivo = (config.reviewsCount || 0) >= 5 && (config.ratingAverage || 0) > 0;
  const avaliacoesVisiveis = useMemo(
    () => (modeloAtivo ? avaliacoes : avaliacoes.filter((a) => a.isReal)),
    [avaliacoes, modeloAtivo],
  );
  const fotos = avaliacoesVisiveis.filter((a) => !!a.imagemUrl);
  const mostrarBotaoGoogle = config.showGoogleReviewsButton && !!config.googleMapsLink.trim();

  function handleAddClick() {
    if (!usuario) {
      abrirLogin("login");
      return;
    }
    setAddOpen(true);
  }

  return (
    <div style={{ fontFamily: FONT, padding: "20px 16px 32px" }}>
      {/* 1. Resumo */}
      <section style={{
        background: "#FFFFFF", border: "1px solid #FFFFFF", borderRadius: 13,
        padding: 18, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 18, alignItems: "center" }}>
          <div style={{ textAlign: "center", paddingRight: 16, borderRight: "1px solid #F0F0F0" }}>
            <div style={{ fontSize: 44, fontWeight: 800, color: "#1A1A1A", lineHeight: 1 }}>
              {stats.media.toFixed(1).replace(".", ",")}
              <span style={{ fontSize: 18, color: "#888", fontWeight: 600 }}>/5</span>
            </div>
            <div style={{ marginTop: 6, display: "flex", justifyContent: "center" }}>
              <Stars n={Math.round(stats.media)} size={16} />
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#888888", whiteSpace: "nowrap" }}>
              {stats.total} {stats.total === 1 ? "avaliação" : "avaliações"}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            {[5,4,3,2,1].map((n) => {
              const q = stats.dist[n] ?? 0;
              const pct = stats.total ? (q / stats.total) * 100 : 0;
              return (
                <div key={n} style={{ display: "grid", gridTemplateColumns: "16px 1fr 28px", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#888", textAlign: "right", fontWeight: 600 }}>{n}</span>
                  <div style={{ height: 8, borderRadius: 4, background: "#F0F0F0", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#FFC107", transition: "width 300ms" }} />
                  </div>
                  <span style={{ fontSize: 12, color: "#888", textAlign: "right" }}>{q}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. Fotos de clientes */}
      {fotos.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A", margin: "0 0 12px" }}>Fotos de clientes</h3>
          <div style={{
            display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6,
            scrollbarWidth: "none",
          }}>
            {fotos.map((a) => (
              <button
                key={a.id}
                onClick={() => setLightbox(a.imagemUrl!)}
                style={{ flex: "0 0 auto", padding: 0, border: "none", background: "transparent", cursor: "zoom-in" }}
              >
                <img src={a.imagemUrl} alt="" style={{ width: 88, height: 88, borderRadius: 14, objectFit: "cover", border: "1px solid #EEE" }} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 3. Lista de avaliações */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
            Avaliações ({stats.total})
          </h3>
        </div>
        <div>
          {avaliacoesVisiveis.map((a) => (
            <ReviewItem key={a.id} a={a} onOpenImage={setLightbox} />
          ))}
        </div>
      </section>

      {/* 4. Botões finais */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
        <button
          onClick={handleAddClick}
          style={{
            background: "var(--site-primary, #5690f5)", color: "#FFFFFF", fontWeight: 700,
            fontSize: 15, height: 50, borderRadius: 14, width: "100%", border: "none", cursor: "pointer", fontFamily: FONT,
          }}
        >
          Adicionar avaliação
        </button>

        {mostrarBotaoGoogle && (
          <a
            href={config.googleMapsLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: "#FFFFFF", border: "1.5px solid #EEEEEE", color: "#1A1A1A",
              fontWeight: 600, fontSize: 14, height: 48, borderRadius: 14, textDecoration: "none", fontFamily: FONT,
            }}
          >
            <GoogleLogo />
            Ver mais no Google
          </a>
        )}
      </div>

      <AddReviewModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        usuario={clientUser ? { nome: clientUser.nome, fotoUrl: clientUser.fotoUrl } : (usuario as any)}
        onChangeFoto={(dataUrl) => updateUsuario({ fotoUrl: dataUrl })}
        onSubmit={({ estrelas, texto, imagemUrl }) => {
          const u = (clientUser ?? usuario) as any;
          addAvaliacao({
            nome: u?.nome || "Cliente",
            fotoUrl: u?.fotoUrl,
            estrelas,
            texto,
            imagemUrl,
          });
          setAddOpen(false);
        }}
      />

      <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
