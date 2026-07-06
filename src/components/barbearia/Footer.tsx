import { ArrowRight } from "lucide-react";
import { BISME_LOGOS } from "@/config/assets";
const bismeLogo = BISME_LOGOS.user;

type FooterProps = {
  barbeariaNome?: string;
};

export function Footer({ barbeariaNome = "Barbearia Sr. Eli" }: FooterProps) {
  return (
    <footer style={{ background: "#fff" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "24px 16px",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: "linear-gradient(145deg, #f3f4f6, #ffffff)",
              flexShrink: 0,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                "inset 0 2px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)",
              border: "1px solid rgba(0,0,0,0.06)",
              position: "relative",
            }}
          >
            <img
              src={bismeLogo}
              alt="Bisme"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>
          <span style={{ fontWeight: 700, fontSize: 22, color: "#000" }}>
            bisme
          </span>
          <div
            style={{
              width: 1,
              height: 32,
              background: "#e5e7eb",
            }}
          />
          <div style={{ fontSize: 11, color: "#000", lineHeight: 1.5 }}>
            <span style={{ display: "block" }}>
              A melhor plataforma para gestão
            </span>
            <span style={{ display: "block" }}>e agendamentos online</span>
          </div>
        </div>

        <a
          href="https://linktr.ee/bismebr"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            backgroundColor: "#5690f5",
            borderRadius: 999,
            padding: "12px 20px",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            width: "fit-content",
            border: "none",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: "#fff",
              whiteSpace: "nowrap",
            }}
          >
            Junte-se à {barbeariaNome} na bisme
          </span>
          <ArrowRight size={14} color="#fff" />
        </a>
      </div>

    </footer>
  );
}
