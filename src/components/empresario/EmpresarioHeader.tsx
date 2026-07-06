import type { CSSProperties, ReactNode } from "react";
import bismeHeaderLogo from "@/assets/bisme-header-logo.svg";
const headerLogoAsset = bismeHeaderLogo;

const FONT =
  'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export type EmpresarioHeaderVariant = "default" | "onboarding";

/**
 * Header unificado para Login, Cadastro e Onboarding.
 * Logo versionada como asset do projeto.
 * `right` renderiza um slot opcional no canto direito (ex.: seletor de idioma).
 */
export function EmpresarioHeader(
  props: { variant?: EmpresarioHeaderVariant; right?: ReactNode } = {},
) {
  return (
    <header style={headerStyle}>
      <div style={inner}>
        <img
          src={headerLogoAsset}
          alt="Bisme"
          className="h-9 md:h-10 w-auto object-contain"
          style={logoStyle}
        />
        {props.right ? <div style={rightSlot}>{props.right}</div> : null}
      </div>
    </header>
  );
}

const headerStyle: CSSProperties = {
  width: "100%",
  background: "#FFFFFF",
  borderBottom: "1px solid #F0F0F0",
  fontFamily: FONT,
};

const inner: CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "6px 12px 6px 7px",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const logoStyle: CSSProperties = {
  display: "block",
  margin: 0,
};

const rightSlot: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

