export function LoadingOverlay({ message = "Preparando seu agendamento..." }: { message?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        background: "#FFFFFF",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: 24,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: "4px solid #EEEEEE",
          borderTopColor: "var(--site-primary, #5690f5)",
          borderRadius: "50%",
          animation: "sreli-spin 0.9s linear infinite",
        }}
      />
      <p
        style={{
          margin: 0,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 15,
          fontWeight: 500,
          color: "#1A1A1A",
          textAlign: "center",
        }}
      >
        {message}
      </p>
      <style>{`@keyframes sreli-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
