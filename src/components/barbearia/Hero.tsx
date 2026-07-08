import { useSiteConfig } from "@/components/admin/SiteConfigContext";

export function Hero() {
  const { config } = useSiteConfig();
  const src = config.coverImage;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 260,
        backgroundColor: "#E8E8E8",
        overflow: "hidden",
        margin: 0,
        padding: 0,
      }}
      className="sreli-hero"
    >
      {src && (
        <img
          src={src}
          alt={`${config.businessName} — atendimento`}
          loading="eager"
          decoding="async"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 20%",
            display: "block",
          }}
        />
      )}
    </div>
  );
}
