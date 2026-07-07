import { useEffect, useRef, useState } from "react";
import { COLORS, FONT } from "./ui";
import { useSiteConfig } from "./SiteConfigContext";

/**
 * Configuração de avaliações (quantidade + média) compartilhada entre as abas
 * "Meu site" e "Avaliações". Fonte da verdade: useSiteConfig (reviewsCount,
 * ratingAverage). Cada instância mantém apenas a string local dos inputs.
 *
 * Regras:
 * - Quantidade mínima válida: 5. Abaixo disso, persiste como 0 (modelos ocultos).
 * - Se a quantidade for válida e a média estiver vazia, média é automaticamente 5,0
 *   apenas na lógica de salvamento (sem preencher visualmente).
 * - Se ambos vazios/zerados, avaliações modelo não aparecem na página inicial.
 */
export function ReviewsConfig() {
  const { config, updateConfig } = useSiteConfig();
  const selfUpdatedReviews = useRef(false);
  const selfUpdatedRating = useRef(false);

  const [reviewsStr, setReviewsStr] = useState<string>(() =>
    config.reviewsCount > 0 ? String(config.reviewsCount) : "",
  );
  const [ratingStr, setRatingStr] = useState<string>(() => {
    const v = Number(config.ratingAverage) || 0;
    if (v <= 0) return "";
    if (v >= 5) return "5,0";
    return v.toFixed(1).replace(".", ",");
  });
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  // Mantém os inputs sincronizados quando outra aba altera os valores.
  useEffect(() => {
    if (selfUpdatedReviews.current) {
      selfUpdatedReviews.current = false;
      return;
    }
    const n = config.reviewsCount || 0;
    setReviewsStr(n > 0 ? String(n) : "");
  }, [config.reviewsCount]);
  useEffect(() => {
    if (selfUpdatedRating.current) {
      selfUpdatedRating.current = false;
      return;
    }
    const v = Number(config.ratingAverage) || 0;
    if (v <= 0) setRatingStr("");
    else if (v >= 5) setRatingStr("5,0");
    else setRatingStr(v.toFixed(1).replace(".", ","));
  }, [config.ratingAverage]);

  const countValid = (config.reviewsCount || 0) >= 5;
  const avgValid = (config.ratingAverage || 0) > 0;
  const showWarning = !countValid && !avgValid;

  function onReviewsChange(raw: string) {
    if (raw !== "" && !/^\d+$/.test(raw)) return;
    setReviewsStr(raw);
    // Limpa erro assim que o usuário começa a digitar novamente.
    if (reviewsError) setReviewsError(null);
    if (raw === "") {
      selfUpdatedReviews.current = true;
      updateConfig({ reviewsCount: 0 });
      return;
    }
    const n = parseInt(raw, 10) || 0;
    if (n >= 5) {
      const patch: { reviewsCount: number; ratingAverage?: number } = { reviewsCount: n };
      // Auto-completa média 5,0 apenas na lógica/salvamento quando vazia.
      if ((config.ratingAverage || 0) <= 0) {
        patch.ratingAverage = 5;
        selfUpdatedRating.current = true;
      }
      selfUpdatedReviews.current = true;
      updateConfig(patch);
    } else {
      // Mantém o texto digitado, mas não persiste como válido.
      selfUpdatedReviews.current = true;
      updateConfig({ reviewsCount: 0 });
    }
  }

  function onReviewsBlur() {
    if (reviewsStr === "") {
      setReviewsError(null);
      return;
    }
    const n = parseInt(reviewsStr, 10) || 0;
    if (n < 5) {
      setReviewsStr("");
      selfUpdatedReviews.current = true;
      updateConfig({ reviewsCount: 0 });
      setReviewsError("A quantidade mínima de avaliações é 5.");
    } else {
      setReviewsError(null);
    }
  }

  function onRatingChange(raw0: string) {
    const prev = ratingStr;
    let v = raw0.replace(/\./g, ",").replace(/[^\d,]/g, "");
    const firstComma = v.indexOf(",");
    if (firstComma !== -1) {
      v = v.slice(0, firstComma + 1) + v.slice(firstComma + 1).replace(/,/g, "");
    }
    if (v.includes(",")) {
      const [a, b = ""] = v.split(",");
      v = `${a.slice(0, 1)},${b.slice(0, 1)}`;
    } else {
      v = v.slice(0, 1);
    }
    if (/^\d$/.test(v) && parseInt(v, 10) > 5) {
      v = "5";
    }
    // Auto-vírgula apenas quando o usuário está digitando para frente (valor cresceu).
    // Não adicionar ao apagar — permite editar/limpar livremente.
    if (/^\d$/.test(v) && v.length > prev.length) {
      v = `${v},`;
    }
    if (/^\d,\d$/.test(v)) {
      const num = parseFloat(v.replace(",", "."));
      if (num > 5) v = "5,0";
    }
    setRatingStr(v);
    const num = v === "" || v === "," ? 0 : parseFloat(v.replace(",", ".")) || 0;
    selfUpdatedRating.current = true;
    updateConfig({ ratingAverage: num });
  }

  function onRatingBlur() {
    if (ratingStr === "" || ratingStr === ",") {
      setRatingStr("");
      selfUpdatedRating.current = true;
      updateConfig({ ratingAverage: 0 });
      return;
    }
    let v = ratingStr;
    if (/^\d$/.test(v)) v = `${v},0`;
    else if (/^\d,$/.test(v)) v = `${v}0`;
    const num = parseFloat(v.replace(",", ".")) || 0;
    const clamped = Math.min(5, Math.max(0, num));
    const final = clamped.toFixed(1).replace(".", ",");
    setRatingStr(final);
    selfUpdatedRating.current = true;
    updateConfig({ ratingAverage: clamped });
  }

  const fieldLabel: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.textMuted,
    fontFamily: FONT,
    marginBottom: 6,
  };
  const fieldInput: React.CSSProperties = {
    width: "100%",
    height: 44,
    border: `1.5px solid #E4E4E4`,
    borderRadius: 8,
    background: "#FFFFFF",
    color: "#111111",
    fontSize: 15,
    fontFamily: FONT,
    padding: "0 12px",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div>
      <div
        style={{
          border: `1.5px solid ${COLORS.border}`,
          borderRadius: 12,
          background: COLORS.bgSurface,
          padding: 14,
          fontFamily: FONT,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"
              fill="#FFC107"
            />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, fontFamily: FONT }}>
            Avaliações
          </span>
          <span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: FONT }}>(Opcional)</span>
        </div>
        <div
          className="adm-reviews-grid"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <style>{`
            @media (max-width: 480px) {
              .adm-reviews-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
          <div>
            <label style={fieldLabel}>Quantidade de avaliações</label>
            <input
              style={{ ...fieldInput, borderColor: reviewsError ? COLORS.danger : fieldInput.borderColor }}
              inputMode="numeric"
              placeholder="Ex: 150"
              value={reviewsStr}
              onChange={(e) => onReviewsChange(e.target.value)}
              onBlur={onReviewsBlur}
            />
            {reviewsError && (
              <div style={{ marginTop: 6, fontSize: 12, color: COLORS.danger, fontFamily: FONT }}>
                {reviewsError}
              </div>
            )}
          </div>
          <div>
            <label style={fieldLabel}>Média de avaliações</label>
            <input
              style={fieldInput}
              inputMode="decimal"
              placeholder="Ex: 5,0"
              value={ratingStr}
              onChange={(e) => onRatingChange(e.target.value)}
              onBlur={onRatingBlur}
            />
          </div>
        </div>
      </div>
      {showWarning && (
        <div
          className="adm-reviews-warning"
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${COLORS.border}`,
            fontSize: 12,
            lineHeight: 1.5,
            color: COLORS.textMuted,
            fontFamily: FONT,
          }}
        >
          Como a quantidade e a média de avaliações não foram preenchidas, as avaliações modelo não
          aparecerão na página inicial. Apenas avaliações reais dos clientes serão exibidas após
          serem feitas.
        </div>
      )}
    </div>
  );
}
