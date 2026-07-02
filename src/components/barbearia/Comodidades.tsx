import {
  Car,
  CreditCard,
  Wifi,
  Accessibility,
  Baby,
  PawPrint,
  Snowflake,
  CalendarCheck,
  type LucideIcon,
} from "lucide-react";
import { useSiteConfig } from "@/components/admin/SiteConfigContext";

export const COMODIDADES_OPTIONS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "estacionamento", label: "Estacionamento", Icon: Car },
  { id: "cartao", label: "Cartão de crédito", Icon: CreditCard },
  { id: "wifi", label: "Wi-Fi grátis", Icon: Wifi },
  { id: "pcd", label: "Acessível para PCD", Icon: Accessibility },
  { id: "infantil", label: "Área infantil", Icon: Baby },
  { id: "pets", label: "Pets permitidos", Icon: PawPrint },
  { id: "climatizado", label: "Ambiente climatizado", Icon: Snowflake },
  { id: "hora-marcada", label: "Atendimento sem hora marcada", Icon: CalendarCheck },
];

export function Comodidades() {
  const { config } = useSiteConfig();
  const selected = config.comodidades ?? [];
  if (selected.length === 0) return null;

  const items = COMODIDADES_OPTIONS.filter((o) => selected.includes(o.id));

  return (
    <section className="fade-in-up" style={{ padding: "20px 16px 4px" }}>
      <div className="max-w-5xl mx-auto">
        <h2
          className="font-display"
          style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A", marginBottom: 16, textAlign: "left" }}
        >
          Comodidades
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          {items.map(({ id, label, Icon }) => (
            <div
              key={id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background: "#f8f8f8",
                border: "1px solid #EEEEEE",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 500,
                color: "#1A1A1A",
                minHeight: 44,
              }}
            >
              <Icon size={18} color="var(--site-primary, #5690f5)" strokeWidth={2} />
              <span style={{ lineHeight: 1.2 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
