import type { CSSProperties } from "react";
import bismeHeaderLogo from "@/assets/bisme-header-logo.svg";
const headerLogoAsset = bismeHeaderLogo;

const FONT =
  'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export type EmpresarioHeaderVariant = "default" | "onboarding";

/**
 * Header unificado para Login, Cadastro e Onboarding.
 * Logo versionada como asset do projeto.
 */
export function EmpresarioHeader(
  _props: { variant?: EmpresarioHeaderVariant } = {},
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
  padding: "10px 7px 12px",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 0,
};

const logoStyle: CSSProperties = {
  display: "block",
  margin: "0 auto 4px",
};

const logoWrap: CSSProperties = {
  margin: 0,
  display: "block",
};

const tagline: CSSProperties = {
  margin: 0,
  textAlign: "center",
  fontSize: 12.5,
  fontWeight: 500,
  lineHeight: 1.35,
  color: "#1a1a1a",
  width: "100%",
};

