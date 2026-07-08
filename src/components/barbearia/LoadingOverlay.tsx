import { DotsSpinner } from "./DotsSpinner";

// Props mantidas por compatibilidade — `message` é ignorado por design
// (os loadings do site de agendamento não exibem texto).
export function LoadingOverlay(_props: { message?: string } = {}) {
  void _props;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando"
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--site-page-bg, #FFFFFF)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <DotsSpinner size={44} />
    </div>
  );
}
