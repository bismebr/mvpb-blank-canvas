import { Link, useLocation } from "@tanstack/react-router";

type GlobalTab = { to: "/" | "/sobre" | "/avaliacoes"; label: string; hash: "" | "sobre" | "avaliacoes" };

const TABS: GlobalTab[] = [
  { to: "/", label: "Serviços", hash: "" },
  { to: "/sobre", label: "Sobre", hash: "sobre" },
  { to: "/avaliacoes", label: "Avaliações", hash: "avaliacoes" },
];

/**
 * Quando `slug` está definido, as abas permanecem dentro de `/{slug}` e
 * trocam de conteúdo usando hash (#sobre / #avaliacoes). Sem slug, mantém
 * o comportamento original do site modelo público (`/`, `/sobre`,
 * `/avaliacoes`).
 */
export function SiteTabs({ slug }: { slug?: string } = {}) {
  const location = useLocation();
  const path = location.pathname;
  const hash = (location.hash || "").replace(/^#/, "");

  return (
    <nav
      style={{
        background: "#FFFFFF",
        padding: 0,
        borderBottom: "1px solid #F0F0F0",
        display: "flex",
        justifyContent: "stretch",
      }}
      aria-label="Seções"
    >
      {TABS.map((t) => {
        const active = slug ? hash === t.hash : path === t.to;
        const linkProps = slug
          ? ({ to: "/$slug", params: { slug }, hash: t.hash || undefined } as const)
          : ({ to: t.to } as const);
        return (
          <Link
            key={t.label}
            {...linkProps}
            preload={false}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 8px 6px",
              fontSize: 14,
              fontWeight: active ? 700 : 500,
              color: "#1A1A1A",
              textDecoration: "none",
              position: "relative",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {t.label}
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "20%",
                right: "20%",
                bottom: -1,
                height: 3,
                borderRadius: 3,
                background: active ? "var(--site-primary, #5690f5)" : "transparent",
                transition: "background 180ms ease",
              }}
            />
          </Link>
        );
      })}
    </nav>
  );
}
