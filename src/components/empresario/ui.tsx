import type { CSSProperties, ReactNode } from "react";
import { COLORS as ADMIN_COLORS } from "@/components/admin/ui";

// Tipografia Inter (carregada no __root.tsx) com fallbacks seguros.
export const FONT =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// Paleta refinada do fluxo do empresário — mantém o laranja Bisme.
export const COLORS = {
  ...ADMIN_COLORS,
  bgPage: "#F7F5F2",
  cardBg: "#FFFFFF",
  inputBg: "#F9FAFB",
  border: "#E5E7EB",
  textPrimary: "#1A1A1A",
  textMuted: "#717171",
  textPlaceholder: "#A1A1A1",
  accent: "#F6671B",
  accentHover: "#E05612",
  danger: "#5690f5",
};

export const pageShell: CSSProperties = {
  minHeight: "100vh",
  background: COLORS.bgPage,
  fontFamily: FONT,
  color: COLORS.textPrimary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px 16px",
  WebkitFontSmoothing: "antialiased",
};

export const authCard: CSSProperties = {
  width: "100%",
  maxWidth: 440,
  background: COLORS.cardBg,
  border: "1px solid #FFFFFF",
  borderRadius: 32,
  padding: "40px 32px",
  boxShadow: "0 20px 50px rgba(0,0,0,0.06)",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

export const fieldLabel: CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 600,
  color: COLORS.textPrimary,
  marginBottom: 8,
  marginLeft: 4,
  fontFamily: FONT,
};

export const fieldInput: CSSProperties = {
  width: "100%",
  height: 52,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 16,
  padding: "0 20px",
  fontSize: 15,
  background: COLORS.inputBg,
  color: COLORS.textPrimary,
  outline: "none",
  fontFamily: FONT,
  boxSizing: "border-box",
  transition: "border-color 200ms, box-shadow 200ms, background 200ms",
};

export const primaryButton: CSSProperties = {
  width: "100%",
  height: 56,
  borderRadius: 16,
  background: COLORS.accent,
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: 16,
  border: "none",
  cursor: "pointer",
  fontFamily: FONT,
  boxShadow: "0 12px 24px rgba(246, 103, 27, 0.25)",
  transition: "background 200ms, transform 200ms, box-shadow 200ms, opacity 200ms",
  marginTop: 8,
  letterSpacing: 0.1,
};

export const googleButton: CSSProperties = {
  width: "100%",
  height: 56,
  borderRadius: 16,
  background: "#FFFFFF",
  color: COLORS.textPrimary,
  fontWeight: 600,
  fontSize: 15,
  border: `1px solid ${COLORS.border}`,
  cursor: "pointer",
  fontFamily: FONT,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  transition: "background 200ms, border-color 200ms",
};

export function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function Divider({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "32px 0",
        width: "100%",
      }}
    >
      <div style={{ flex: 1, height: 1, background: COLORS.border }} />
      <span
        style={{
          fontSize: 11,
          color: COLORS.textPlaceholder,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: COLORS.border }} />
    </div>
  );
}

export function BrandHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 32, width: "100%" }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: COLORS.accent,
          margin: "0 auto 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFFFFF",
          fontWeight: 700,
          fontSize: 24,
          letterSpacing: -0.5,
          boxShadow: "0 8px 20px rgba(246, 103, 27, 0.3)",
        }}
      >
        B
      </div>
      <h1
        style={{
          margin: 0,
          fontSize: 24,
          fontWeight: 700,
          color: COLORS.textPrimary,
          letterSpacing: -0.4,
          lineHeight: 1.2,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          margin: "8px auto 0",
          fontSize: 15,
          color: COLORS.textMuted,
          lineHeight: 1.55,
          maxWidth: 320,
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}
