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
  padding: "6px 7px",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 0,
};

const logoStyle: CSSProperties = {
  display: "block",
  margin: 0,
};

