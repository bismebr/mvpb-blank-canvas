import { useEffect, useState } from "react";
import { ExternalLink, Copy, Share2, Globe, Check } from "lucide-react";
import { COLORS, FONT, cardStyle, primaryBtn, secondaryBtn, PageHeader } from "./ui";
import { useSiteConfig, SITE_PUBLIC_BASE } from "./SiteConfigContext";

interface Props {
  onGoToConfig: () => void;
}

export function MeuLinkTela({ onGoToConfig }: Props) {
  const { config } = useSiteConfig();
  const username = config.username || "seunegocio";
  // Em produção use bisme.com.br; em preview/dev use a origem atual.
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);
  const usePublic = !origin || /(?:^|\.)bisme\.com\.br$/i.test(new URL(origin || "https://x").hostname);
  const fullUrl = usePublic
    ? `https://${SITE_PUBLIC_BASE}${username}`
    : `${origin}/${username}`;
  const displayLink = fullUrl.replace(/^https?:\/\//, "");
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=8&data=${encodeURIComponent(fullUrl)}`;

  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: config.businessName || "Meu site", url: fullUrl });
      } catch {
        // ignore cancel
      }
    } else {
      handleCopy();
    }
  }

  function handleOpen() {
    window.open(fullUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ padding: "30px 16px 8px", maxWidth: 720, margin: "0 auto", fontFamily: FONT, color: COLORS.textPrimary }}>
      <PageHeader
        title="Link do site de agendamento"
        subtitle="Compartilhe seu link nas redes sociais, com clientes e amigos, para que todos possam acessar sua página de agendamento."
      />
      <section style={{ ...cardStyle, marginTop: 0 }}>
        <div style={{
          fontSize: 12, color: COLORS.textMuted, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
        }}>
          Seu link público
        </div>
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block", fontSize: 16, fontWeight: 700,
            color: COLORS.accent, wordBreak: "break-all", textDecoration: "none",
            marginBottom: 16,
          }}
        >
          {displayLink}
        </a>

        <div style={{ display: "flex", gap: 16, alignItems: "stretch", flexWrap: "wrap" }}>
          <div style={{
            width: 160, height: 160, flexShrink: 0,
            background: "#FFFFFF", border: `1.5px solid ${COLORS.border}`,
            borderRadius: 12, padding: 8, display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <img src={qrSrc} alt="QR Code do seu site" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>

          <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 10, minWidth: 200 }}>
            <button onClick={handleOpen} style={{ ...primaryBtn, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <ExternalLink size={16} /> Entrar no link
            </button>
            <button onClick={handleCopy} className="bisme-light-border" style={{ ...secondaryBtn, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {copied ? <><Check size={16} /> Copiado!</> : <><Copy size={16} /> Copiar link</>}
            </button>
            <button onClick={handleShare} className="bisme-light-border" style={{ ...secondaryBtn, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Share2 size={16} /> Compartilhar link
            </button>
          </div>
        </div>
      </section>

      <section style={{ ...cardStyle, marginTop: 16 }}>
        <p style={{ margin: 0, fontSize: 14, color: COLORS.textMuted, lineHeight: 1.55 }}>
          Você está vendo o site como ele está configurado agora. Para modificar ou personalizar seu site de agendamento, clique no botão abaixo.
        </p>
        <button
          onClick={onGoToConfig}
          style={{ ...primaryBtn, marginTop: 14, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <Globe size={18} /> Meu site
        </button>
      </section>
    </div>
  );
}
