/**
 * Spinner circular de pontos usado em todos os estados de loading do
 * site de agendamento (página pública). Não exibe texto.
 *
 * A cor segue a cor principal do modelo do site (var --site-primary),
 * definida em src/lib/siteTemplates.ts. No modelo escuro, essa cor
 * primária já é amarela (#F5B324), então nenhum override adicional é
 * necessário.
 */
export function DotsSpinner({
  size = 32,
  count = 8,
}: {
  size?: number;
  count?: number;
}) {
  const dotSize = Math.max(3, Math.round(size / 8));
  const radius = size / 2 - dotSize / 2;
  const dots = Array.from({ length: count });
  return (
    <span
      role="status"
      aria-label="Carregando"
      style={{
        position: "relative",
        display: "inline-block",
        width: size,
        height: size,
        verticalAlign: "middle",
      }}
    >
      <style>{`
        @keyframes sreli-dots-fade {
          0%, 39%, 100% { opacity: 0.18; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      {dots.map((_, i) => {
        const angle = (360 / count) * i;
        const delay = -(1.1 / count) * (count - i);
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: dotSize,
              height: dotSize,
              marginTop: -dotSize / 2,
              marginLeft: -dotSize / 2,
              borderRadius: "50%",
              background: "var(--site-primary, #5690f5)",
              transform: `rotate(${angle}deg) translateY(-${radius}px)`,
              transformOrigin: "center",
              animation: "sreli-dots-fade 1.1s linear infinite",
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </span>
  );
}
