import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  useSiteConfig,
  formatAddressParts,
} from "@/components/admin/SiteConfigContext";
import { useApp } from "@/components/admin/AppContext";
import { useClientUser } from "./ClientUserContext";
import { ProfileModal } from "./ProfileModal";
import { IconUserAvatar } from "./icons";

function firstTwoNames(nome: string) {
  const parts = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1]}`;
}


/**
 * Endereço exibido no site usa SOMENTE os campos separados do painel:
 * Rua, número, Cidade - UF (sem bairro/complemento/CEP).
 */
function displayAddress(cfg: {
  addressStreet?: string;
  addressNumber?: string;
  addressCity?: string;
  addressState?: string;
}): string {
  return formatAddressParts(cfg);
}

/**
 * Renderiza 5 estrelas com preenchimento parcial proporcional à média.
 * Estrelas preenchidas: dourado (#FFC107). Vazias: cinza claro (#E5E5E5).
 */
function RatingStars({ average, size = 14 }: { average: number; size?: number }) {
  const clamped = Math.max(0, Math.min(5, average));
  const pct = (clamped / 5) * 100;
  return (
    <span
      aria-hidden="true"
      style={{ position: "relative", display: "inline-block", lineHeight: 0, flexShrink: 0 }}
    >
      <span style={{ display: "inline-flex", gap: 1, color: "#E5E5E5" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={size} />
        ))}
      </span>
      <span
        style={{
          position: "absolute",
          inset: 0,
          width: `${pct}%`,
          overflow: "hidden",
          display: "inline-flex",
          gap: 1,
          color: "#FFC107",
          pointerEvents: "none",
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={size} />
        ))}
      </span>
    </span>
  );
}

function Star({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ display: "block", flexShrink: 0 }}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

/** Retorna o status atual: aberto (com horário de fechamento) ou fechado. */
function useOpenStatus(): { aberto: boolean; fecha?: string; hydrated: boolean } {
  const { horarios } = useApp();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const now = new Date();
  const dow = now.getDay();
  const cfg = horarios.find((h) => h.diaSemana === dow);
  if (!cfg || !cfg.aberto) return { aberto: false, hydrated };
  const [aH, aM] = cfg.abre.split(":").map((n) => parseInt(n, 10));
  const [fH, fM] = cfg.fecha.split(":").map((n) => parseInt(n, 10));
  const cur = now.getHours() * 60 + now.getMinutes();
  const ini = aH * 60 + aM;
  const fim = fH * 60 + fM;
  if (cur < ini || cur >= fim) return { aberto: false, hydrated };
  return { aberto: true, fecha: cfg.fecha, hydrated };
}

export function InfoBlock({
  onEntrarClick,
  slug,
}: {
  onEntrarClick: () => void;
  slug?: string;
}) {

  const navigate = useNavigate();
  const { config } = useSiteConfig();
  const { usuario } = useClientUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const statusText = useOpenStatus();

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);
  return (
    <section
      style={{
        background: "#FFFFFF",
        padding: "45px 16px 4px",
        position: "relative",
      }}
    >
      {/* Área de conta — canto superior direito */}
      {usuario ? (
        <div ref={menuRef} style={{ position: "absolute", top: 9, right: 16, zIndex: 30, display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "var(--site-primary, #5690f5)",
              border: "none",
              outline: "none",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              WebkitTapHighlightColor: "transparent",
              borderRadius: 22,
              padding: "2px 7px 2px 2px",
              cursor: "pointer",
              maxWidth: 180,
            }}
          >
            {usuario.fotoUrl ? (
              <img
                src={usuario.fotoUrl}
                alt={usuario.nome}
                style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1.5px solid #FFFFFF" }}
              />
            ) : (
              <span
                style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: "rgba(255,255,255,0.18)", color: "#FFFFFF",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  border: "1.5px solid #FFFFFF",
                }}
              >
                <IconUserAvatar width={16} height={16} color="#FFFFFF" />
              </span>
            )}
            <span style={{ fontSize: 12, fontWeight: 600, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {firstTwoNames(usuario.nome)}
            </span>
          </button>





          {menuOpen && (
            <div
              style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0,
                background: "#FFFFFF", border: "1px solid #EEEEEE", borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden", minWidth: 180,
              }}
            >
              <button
                onClick={() => { setMenuOpen(false); navigate({ to: "/meus-agendamentos", search: slug ? { slug } : {} }); }}
                style={menuItemStyle}
              >
                Meus agendamentos
              </button>
              <button
                onClick={() => { setMenuOpen(false); setProfileOpen(true); }}
                style={{ ...menuItemStyle, borderTop: "1px solid #F0F0F0" }}
              >
                Meu perfil
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={onEntrarClick}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "var(--site-primary, #5690f5)", color: "#FFFFFF",
            fontWeight: 700, fontSize: 13, padding: "7px 11px", borderRadius: 15,
            border: "none", whiteSpace: "nowrap", cursor: "pointer", lineHeight: 1.2,
          }}
        >
          Entrar
        </button>
      )}

      {/* Logo flutuante - exibe logo enviada ou avatar padrão */}
      <div
        style={{
          position: "absolute",
          top: -40,
          left: 16,
          zIndex: 10,
          width: 80,
          height: 80,
          borderRadius: "50%",
          border: "3px solid #FFFFFF",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0)",
          overflow: "hidden",
        }}
      >
        {config.logo ? (
          <img
            src={config.logo}
            alt={`Logo ${config.businessName}`}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#F5F5F5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconUserAvatar width={40} height={40} color="#AAAAAA" />
          </div>
        )}
      </div>

      {/* Bloco coeso de informações */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
        <h1 style={{ fontWeight: 700, fontSize: 20, color: "#1A1A1A", margin: 0, lineHeight: 1, whiteSpace: "nowrap" }}>
          {config.businessName}
        </h1>

        {config.showAddress !== false && displayAddress(config) ? (
          <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
            <span
              style={{ fontSize: 13, color: "#888888", pointerEvents: "none", userSelect: "text" }}
              translate="no"
              {...({ "x-apple-data-detectors": "false" } as Record<string, string>)}
            >
              {displayAddress(config).split("").map((ch, i) => (
                <span key={i}>{ch}</span>
              ))}
            </span>
          </div>
        ) : null}

        {config.reviewsCount > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 400, color: "#888888", lineHeight: 1 }}>
              {config.ratingAverage.toFixed(1).replace(".", ",")}
            </span>
            <RatingStars average={config.ratingAverage} size={14} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--site-primary, #5690f5)", lineHeight: 1 }}>
              ({config.reviewsCount} avaliações)
            </span>
          </div>
        ) : null}

        {statusText.hydrated ? (
          statusText.aberto ? (
            <span
              style={{
                fontSize: 13,
                fontWeight: 400,
                color: "#888888",
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ color: "var(--site-primary, #5690f5)", fontWeight: 700 }}>
                Aberto agora
              </span>
              <span
                aria-hidden="true"
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: "50%",
                  background: "#888888",
                  display: "inline-block",
                }}
              />
              <span>Fecha às {statusText.fecha}</span>
            </span>
          ) : (
            <span
              style={{
                fontSize: 13,
                fontWeight: 400,
                color: "#888888",
                lineHeight: 1,
              }}
            >
              Fechado agora
            </span>
          )
        ) : (
          <span
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: "#888888",
              lineHeight: 1,
            }}
          >
            Carregando...
          </span>
        )}
      </div>


      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </section>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "12px 14px",
  background: "#FFFFFF",
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  color: "#1A1A1A",
};
