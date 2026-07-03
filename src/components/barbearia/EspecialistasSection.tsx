import { useEffect, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import type { FuncionarioAdmin } from "@/components/admin/AppContext";

const ORANGE = "var(--site-primary, #5690f5)";

function DefaultAvatar() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#DFE3E8",
      }}
    >
      <svg viewBox="0 0 24 24" width="62%" height="62%" fill="#FFFFFF" aria-hidden="true">
        <circle cx="12" cy="8.5" r="4" />
        <path d="M3.5 20.5c0-4.142 3.806-7.5 8.5-7.5s8.5 3.358 8.5 7.5v.5h-17v-.5z" />
      </svg>
    </div>
  );
}

export function EspecialistasSection({
  funcionarios,
  selectedId,
  onSelect,
}: {
  funcionarios: FuncionarioAdmin[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [verTodos, setVerTodos] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (selectedId && scrollContainerRef.current && cardRefs.current.has(selectedId)) {
      const card = cardRefs.current.get(selectedId)!;
      const container = scrollContainerRef.current;
      const paddingLeft = parseInt(getComputedStyle(container).paddingLeft, 10) || 0;
      const cardLeft = card.offsetLeft - paddingLeft;
      container.scrollTo({ left: cardLeft, behavior: "smooth" });
    }
  }, [selectedId]);

  if (funcionarios.length < 2) return null;

  const location = useLocation();
  const isServicosTab = location.pathname === "/";
  const hasProfissionais = funcionarios.length >= 2;

  const headerPadding = isServicosTab && hasProfissionais ? "13px 16px 4px" : "6px 16px 4px";

  return (
    <div style={{ background: "var(--site-section-bg, #f8f8f8)", paddingTop: 2 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: headerPadding,
        }}
      >
        <h2
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            color: "var(--site-on-bg, #1A1A1A)",
            margin: 0,
          }}
        >
          Nossos Profissionais
        </h2>
        <button
          onClick={() => setVerTodos(true)}
          style={{
            background: "transparent",
            border: "none",
            color: ORANGE,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            padding: 4,
          }}
        >
          Ver Todos
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        className="sreli-no-scrollbar"
        style={{
          display: "flex",
          gap: 12,
          padding: "4px 16px 12px",
          overflowX: "auto",
          overflowY: "hidden",
          scrollBehavior: "smooth",
          justifyContent: "flex-start",
        }}
      >

        {funcionarios.map((f) => {
          const sel = f.id === selectedId;
          const hasSelection = selectedId !== null;
          const dimmed = hasSelection && !sel;
          return (
              <button
              key={f.id}
              ref={(el) => {
                if (el) cardRefs.current.set(f.id, el);
                else cardRefs.current.delete(f.id);
              }}
              onClick={() => onSelect(sel ? null : f.id)}
              style={{
                flexShrink: 0,
                width: "calc((min(100vw, 480px) - 68px) / 4)",
                background: "var(--site-section-bg, #FFFFFF)",
                border: "2px solid var(--site-section-border, #EEEEEE)",
                borderRadius: 16,
                padding: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                transform: sel ? "scale(1.07) translateY(-4px)" : "scale(1)",
                filter: dimmed ? "grayscale(1)" : "none",
                opacity: dimmed ? 0.45 : 1,
                position: "relative",
                zIndex: sel ? 2 : 1,
                boxShadow: sel
                  ? "0 8px 14px -8px rgba(0,0,0,0.22), 0 3px 6px -3px rgba(0,0,0,0.12)"
                  : "0 2px 6px rgba(0,0,0,0.05)",
                transition: "all 220ms ease",
              }}
            >

              <div
                style={{
                  width: "calc((min(100vw, 480px) - 68px) / 4 - 18px)",
                  height: "calc((min(100vw, 480px) - 68px) / 4 - 18px)",
                  borderRadius: 16,
                  overflow: "hidden",
                  background: "#EEE",
                }}
              >
                {f.fotoUrl ? (
                  <img
                    src={f.fotoUrl}
                    alt={f.nome}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <DefaultAvatar />
                )}
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--site-on-bg, #1A1A1A)",
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                {f.nome.split(" ")[0]}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--site-on-bg-muted, #888)",
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                {f.cargo}
              </span>
            </button>
          );
        })}
      </div>

      {verTodos && (
        <VerTodosModal
          funcionarios={funcionarios}
          onClose={() => setVerTodos(false)}
          onSelect={(id) => {
            onSelect(id);
            setVerTodos(false);
          }}
        />
      )}
    </div>
  );
}

function VerTodosModal({
  funcionarios,
  onClose,
  onSelect,
}: {
  funcionarios: FuncionarioAdmin[];
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#FFFFFF",
        zIndex: 1000,
        overflowY: "auto",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          borderBottom: "1px solid #EEEEEE",
          position: "sticky",
          top: 0,
          background: "#FFFFFF",
          zIndex: 1,
        }}
      >
        <button
          onClick={onClose}
          aria-label="Voltar"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#1A1A1A",
            padding: 4,
            fontSize: 22,
            lineHeight: 1,
          }}
        >
          ←
        </button>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
          Nossos Profissionais
        </h2>
      </header>

      <div style={{ padding: "8px 16px 24px", maxWidth: 480, margin: "0 auto" }}>
        {funcionarios.map((f) => (
          <div
            key={f.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 0",
              borderBottom: "1px solid #F0F0F0",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                overflow: "hidden",
                background: "#EEE",
                flexShrink: 0,
              }}
            >
              {f.fotoUrl ? (
                <img
                  src={f.fotoUrl}
                  alt={f.nome}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <DefaultAvatar />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A" }}>{f.nome}</div>
              <div style={{ fontSize: 13, color: "#888" }}>{f.cargo}</div>
            </div>
            <button
              onClick={() => onSelect(f.id)}
              style={{
                background: ORANGE,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 10,
                padding: "8px 16px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Selecionar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
