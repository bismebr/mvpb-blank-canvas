import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconChat, IconInstagram, IconTiktok, IconFacebook, IconYoutube, IconLink, IconPin } from "./icons";
import {
  useSiteConfig,
  buildWhatsappLink,
  buildInstagramLink,
  buildTiktokLink,
  buildGoogleMapsLink,
} from "@/components/admin/SiteConfigContext";
import { useApp } from "@/components/admin/AppContext";
import { Comodidades } from "./Comodidades";

const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function HorarioFuncionamento() {
  const { horarios, pausas } = useApp();
  const ordem = [1, 2, 3, 4, 5, 6, 0];
  const hojeDow = new Date().getDay();

  function intervalosDoDia(abre: string, fecha: string, dow: number): { ini: string; fim: string }[] {
    // pausas que afetam o negócio inteiro (sem funcionarioId), para este dia ou todos os dias
    const pausasDia = pausas
      .filter((p) => !p.funcionarioId && (p.diaSemana === null || p.diaSemana === dow))
      .map((p) => ({ ini: p.inicio, fim: p.fim }))
      .filter((p) => p.ini && p.fim && p.fim > p.ini)
      .sort((a, b) => a.ini.localeCompare(b.ini));

    let blocos: { ini: string; fim: string }[] = [{ ini: abre, fim: fecha }];
    for (const pausa of pausasDia) {
      const novos: { ini: string; fim: string }[] = [];
      for (const b of blocos) {
        // sem sobreposição
        if (pausa.fim <= b.ini || pausa.ini >= b.fim) { novos.push(b); continue; }
        if (pausa.ini > b.ini) novos.push({ ini: b.ini, fim: pausa.ini < b.fim ? pausa.ini : b.fim });
        if (pausa.fim < b.fim) novos.push({ ini: pausa.fim > b.ini ? pausa.fim : b.ini, fim: b.fim });
      }
      blocos = novos.filter((b) => b.fim > b.ini);
      if (blocos.length === 0) break;
    }
    return blocos;
  }

  return (
    <section style={{ padding: "20px 16px 0" }}>
      <h3 style={{ fontWeight: 700, fontSize: 18, color: "#1A1A1A", marginBottom: 16, textAlign: "center" }}>
        Horário de funcionamento
      </h3>
      <div
        style={{
          background: "#f8f8f8",
          border: "1px solid #EEEEEE",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {ordem.map((dow, i) => {
          const cfg = horarios.find((h) => h.diaSemana === dow);
          const aberto = cfg?.aberto;
          const isHoje = dow === hojeDow;
          const blocos = aberto && cfg ? intervalosDoDia(cfg.abre, cfg.fecha, dow) : [];
          return (
            <div
              key={dow}
              className={isHoje ? "sreli-today-row" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 16px",
                borderTop: i === 0 ? "none" : "1px solid #EFEFEF",
                background: isHoje ? "rgba(0,0,0,0.04)" : "transparent",
                position: "relative",
              }}
            >

              <span style={{ fontSize: 14, fontWeight: isHoje ? 700 : 500, color: "#1A1A1A" }}>
                {DIAS_SEMANA[dow]}
              </span>
              {aberto && cfg ? (
                blocos.length === 0 ? (
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Fechado</span>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                    {blocos.map((b, idx) => (
                      <span key={idx} style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>
                        {b.ini} - {b.fim}
                      </span>
                    ))}
                  </div>
                )
              ) : (
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Fechado</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MidiasSociais() {
  const { config } = useSiteConfig();

  const redes: { key: string; label: string; href: string; icon: ReactNode }[] = [];
  // WhatsApp é obrigatório, sempre aparece.
  redes.push({ key: "whatsapp", label: "WhatsApp", href: buildWhatsappLink(config.whatsapp), icon: <IconChat width={22} height={22} /> });
  if (config.instagram?.trim())
    redes.push({ key: "instagram", label: "Instagram", href: buildInstagramLink(config.instagram), icon: <IconInstagram width={22} height={22} /> });
  if (config.tiktok?.trim())
    redes.push({ key: "tiktok", label: "TikTok", href: buildTiktokLink(config.tiktok), icon: <IconTiktok width={22} height={22} /> });
  if (config.facebook?.trim())
    redes.push({ key: "facebook", label: "Facebook", href: config.facebook.trim(), icon: <IconFacebook width={22} height={22} /> });
  if (config.youtube?.trim())
    redes.push({ key: "youtube", label: "YouTube", href: config.youtube.trim(), icon: <IconYoutube width={22} height={22} /> });
  if (config.site?.trim())
    redes.push({ key: "site", label: "Site", href: config.site.trim(), icon: <IconLink width={22} height={22} /> });
  // Localização: gerada automaticamente a partir do endereço cadastrado.
  const enderecoCompleto = (config.address || "").trim();
  if (enderecoCompleto) {
    redes.push({
      key: "localizacao",
      label: "Localização",
      href: buildGoogleMapsLink(enderecoCompleto),
      icon: <IconPin width={22} height={22} />,
    });
  }

  return (
    <section style={{ padding: "20px 16px 0" }}>
      <h3 style={{ fontWeight: 700, fontSize: 18, color: "#1A1A1A", marginBottom: 16, textAlign: "center" }}>
        NOSSAS REDES
      </h3>
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8 }}>
        {redes.map((r) => (
          <a
            key={r.key}
            href={r.href}
            target="_blank"
            rel="noreferrer"
            aria-label={r.label}
            title={r.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(var(--site-primary-rgb, 191, 6, 3), 0.06)",
              color: "var(--site-primary, #5690f5)",
              textDecoration: "none",
            }}
          >
            {r.icon}
          </a>
        ))}
      </div>
    </section>
  );
}

function NossoTrabalhoCarrossel({ works }: { works: string[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: "auto" });
    setActive(0);
  }, []);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let nearest = 0;
    let min = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const child = c as HTMLElement;
      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const d = Math.abs(childCenter - center);
      if (d < min) { min = d; nearest = i; }
    });
    setActive(nearest);
  };

  if (works.length === 0) return null;

  // Apenas 1 imagem: layout estático centralizado, sem carrossel.
  if (works.length === 1) {
    return (
      <section className="fade-in-up" style={{ padding: "20px 16px 0" }}>
        <div className="max-w-5xl mx-auto">
          <div style={{ marginBottom: 12 }}>
            <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A" }}>Nosso trabalho</h2>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            {works.map((src, i) => (
              <div
                key={i}
                className="bg-[#1A1A1A] rounded-xl overflow-hidden"
                style={{ width: "min(80vw, 320px)", aspectRatio: "1 / 1" }}
              >
                <img alt={`Trabalho ${i + 1}`} className="w-full h-full object-cover" loading="lazy" src={src} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // 2+ imagens: carrossel iniciando alinhado à esquerda.
  return (
    <section className="fade-in-up" style={{ padding: "20px 16px 0" }}>
      <div className="max-w-5xl mx-auto">
        <div style={{ marginBottom: 12 }}>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A" }}>Nosso trabalho</h2>
        </div>
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          onWheel={(e) => {
            const el = scrollerRef.current;
            if (!el) return;
            // Mouse wheel (desktop): translate vertical wheel into horizontal scroll
            if (e.deltaY !== 0 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              el.scrollLeft += e.deltaY;
              e.preventDefault();
            }
          }}
          onPointerDown={(e) => {
            if (e.pointerType !== "mouse") return; // não interfere no touch nativo
            const el = scrollerRef.current;
            if (!el) return;
            const startX = e.clientX;
            const startScroll = el.scrollLeft;
            let moved = false;
            const onMove = (ev: PointerEvent) => {
              const dx = ev.clientX - startX;
              if (Math.abs(dx) > 3) moved = true;
              el.scrollLeft = startScroll - dx;
            };
            const onUp = () => {
              window.removeEventListener("pointermove", onMove);
              window.removeEventListener("pointerup", onUp);
              if (moved) {
                // evita disparar click após arrastar
                const blockClick = (ev: MouseEvent) => {
                  ev.stopPropagation();
                  ev.preventDefault();
                  window.removeEventListener("click", blockClick, true);
                };
                window.addEventListener("click", blockClick, true);
              }
            };
            window.addEventListener("pointermove", onMove);
            window.addEventListener("pointerup", onUp);
          }}
          className="flex gap-3 overflow-x-auto sreli-no-scrollbar"
          style={{
            marginLeft: -3,
            marginRight: -16,
            paddingLeft: 16,
            paddingRight: 16,
            overscrollBehaviorX: "contain",
            overscrollBehaviorY: "auto",
            touchAction: "pan-x pan-y",
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "x proximity",
            cursor: "grab",
          }}
        >

          {works.map((src, i) => (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => {
                const el = scrollerRef.current;
                if (!el) return;
                if (i === active) return;
                const target = el.children[i] as HTMLElement | undefined;
                if (!target) return;
                const left = target.offsetLeft - (el.clientWidth - target.clientWidth) / 2;
                const max = el.scrollWidth - el.clientWidth;
                el.scrollTo({ left: Math.max(0, Math.min(left, max)), behavior: "smooth" });
              }}
              className="flex-shrink-0 bg-[#1A1A1A] rounded-xl overflow-hidden cursor-pointer"
              style={{ width: "min(70vw, 320px)", aspectRatio: "1 / 1", scrollSnapAlign: "center" }}
            >
              <img alt={`Trabalho ${i + 1}`} className="w-full h-full object-cover pointer-events-none" loading="lazy" src={src} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
          <div
            className="flex items-center"
            style={{
              padding: "6px 10px",
              borderRadius: 20,
              gap: 5,
            }}
          >
            {works.map((_, i) => {
              const isActive = i === active;
              return (
                <div
                  key={i}
                  style={{
                    width: isActive ? 18 : 5,
                    height: 5,
                    borderRadius: 3,
                    background: isActive ? "var(--site-primary, #5690f5)" : "rgba(var(--site-primary-rgb, 191, 6, 3),0.5)",
                    transition: "width 0.35s cubic-bezier(0.4,0,0.2,1), background 0.35s",
                  }}
                />
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}

export function AboutTab({ onAgendar }: { onAgendar: () => void }) {
  const { config } = useSiteConfig();

  return (
    <div>
      <section style={{ padding: "20px 16px 0", display: "flex", justifyContent: "center" }}>
        {config.aboutImage ? (
          <img
            src={config.aboutImage}
            alt={`Sobre ${config.businessName}`}
            style={{ width: 375, height: 375, maxWidth: "100%", objectFit: "cover", borderRadius: 16 }}
          />
        ) : (
          <div
            aria-label="Imagem principal"
            style={{
              width: 375,
              height: 375,
              maxWidth: "100%",
              borderRadius: 16,
              border: "1.5px dashed #D4D4D8",
              background: "#F4F4F5",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: "#71717A",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Imagem principal</span>
          </div>
        )}
      </section>

      <section style={{ padding: "20px 16px 0" }}>
        <h3 style={{ fontWeight: 700, fontSize: 18, color: "#1A1A1A", marginBottom: 8 }}>Sobre nós</h3>
        <p style={{ fontSize: 14, color: "#444444", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
          {config.aboutText}
        </p>
      </section>



      <NossoTrabalhoCarrossel works={config.workGallery} />

      <HorarioFuncionamento />

      <MidiasSociais />

      <Comodidades />

      <div style={{ padding: "20px 16px" }}>
        <button
          onClick={onAgendar}
          style={{
            background: "var(--site-primary, #5690f5)",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: 16,
            height: 52,
            borderRadius: 14,
            width: "100%",
            border: "none",
            cursor: "pointer",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "var(--site-primary, #5690f5)")}
          onMouseOut={(e) => (e.currentTarget.style.background = "var(--site-primary, #5690f5)")}
        >
          Agendar agora
        </button>
      </div>
    </div>
  );
}