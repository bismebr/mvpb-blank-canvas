import { useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { IconChat, IconGrid, IconUsers, IconClipboardStar } from "./icons";
import {
  useSiteConfig,
  buildWhatsappLink,
  buildGoogleMapsLink,
} from "@/components/admin/SiteConfigContext";

let hasInteractedGlobal = false;

type ActionItem = {
  icon: ReactNode;
  label: string;
  href?: string;
  to?: string;
  onClick?: () => void;
  onNavigate?: () => void;
  primary?: boolean;
  active?: boolean;
};

function ActionButton({ icon, label, href, to, onClick, onNavigate, primary, active }: ActionItem) {
  const iconWrap = (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        background: primary ? "var(--site-primary, #5690f5)" : "var(--site-secondary, #FBF4D7)",
        border: `2px solid ${active ? "var(--site-primary, #5690f5)" : "transparent"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: primary ? "#FFFFFF" : "var(--site-primary, #5690f5)",
      }}
    >
      {icon}
    </div>
  );

  const labelEl = (
    <span
      style={{
        fontSize: 12,
        fontWeight: 500,
        color: "#888888",
        textAlign: "center",
      }}
    >
      {label}
    </span>
  );

  const sharedStyle = {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
    cursor: "pointer",
    textDecoration: "none",
    WebkitTapHighlightColor: "transparent",
    outline: "none",
    border: "none",
    background: "transparent",
  };

  if (to) {
    return (
      <Link to={to} style={sharedStyle} activeProps={{ style: sharedStyle }} onClick={onNavigate}>
        {iconWrap}
        {labelEl}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" style={sharedStyle} onClick={onNavigate}>
        {iconWrap}
        {labelEl}
      </a>
    );
  }

  return (
    <div
      onClick={() => { onNavigate?.(); onClick?.(); }}
      style={{ ...sharedStyle, cursor: onClick ? "pointer" : "default" }}
    >
      {iconWrap}
      {labelEl}
    </div>
  );
}

export function QuickActions() {
  const location = useLocation();
  const { config } = useSiteConfig();
  const [interacted, setInteracted] = useState(hasInteractedGlobal);

  const hasAddress = !!config.address?.trim() && config.showAddress !== false;
  const mapsUrl = hasAddress ? buildGoogleMapsLink(config.address) : "";
  const path = location.pathname;
  const markInteracted = () => {
    if (!hasInteractedGlobal) {
      hasInteractedGlobal = true;
      setInteracted(true);
    }
  };

  return (
    <section
      style={{
        background: "#FFFFFF",
        padding: "0px 12px 16px",
        display: "flex",
        justifyContent: "center",
        gap: 4,
      }}
    >
      <ActionButton icon={<IconGrid width={22} height={22} />} label="Serviços" to="/" active={interacted && path === "/"} onNavigate={markInteracted} />
      <ActionButton icon={<IconUsers width={22} height={22} />} label="Sobre" to="/sobre" active={interacted && path === "/sobre"} onNavigate={markInteracted} />
      <ActionButton icon={<IconClipboardStar width={22} height={22} />} label="Avaliações" to="/avaliacoes" active={interacted && path === "/avaliacoes"} onNavigate={markInteracted} />
      <ActionButton icon={<IconChat width={22} height={22} />} label="WhatsApp" href={buildWhatsappLink(config.whatsapp)} primary onNavigate={markInteracted} />
      {hasAddress && (
        <ActionButton icon={<MapPin size={22} />} label="Localização" href={mapsUrl} primary onNavigate={markInteracted} />
      )}
    </section>
  );
}
