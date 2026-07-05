import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, ChevronDown, Star, ArrowLeft, ArrowRight, Instagram, Facebook, Youtube } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import bismeHeaderLogo from "@/assets/bisme-header-logo.svg";
import vendaHero from "@/assets/venda-hero.png";
import vendaAppPreview from "@/assets/venda-app-preview.png";
import vendaRotina from "@/assets/venda-rotina.svg";
import depoRafaela from "@/assets/depoimento-rafaela.jpg";
import depoLucas from "@/assets/depoimento-lucas.jpg";
import depoCamila from "@/assets/depoimento-camila.jpg";
import sitesShowcase from "@/assets/sites-showcase.png";
import dashboardPreview from "@/assets/dashboard-preview.png";

export const Route = createFileRoute("/venda")({
  head: () => ({
    meta: [
      { title: "Bisme — da correria da rotina ao controle da gestão, a Bisme simplifica" },
      {
        name: "description",
        content:
          "Agenda, financeiro, clientes e WhatsApp em um só lugar. Comece o teste grátis da Bisme.",
      },
      { property: "og:title", content: "Bisme — Gestão fácil para o seu negócio" },
      {
        property: "og:description",
        content: "Controle agenda, clientes e financeiro com a Bisme. Teste grátis.",
      },
    ],
  }),
  component: VendaPage,
});

const ORANGE = "#5690f5";

function Placeholder({
  ratio = "4/3",
  label = "Imagem ilustrativa",
  className = "",
}: {
  ratio?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`w-full rounded-2xl md:rounded-3xl overflow-hidden ring-1 ring-black/5 shadow-[0_8px_30px_-12px_rgba(17,24,39,0.15)] flex items-center justify-center ${className}`}
      style={{
        aspectRatio: ratio,
        background:
          "linear-gradient(135deg, #fafafa 0%, #f4f4f4 50%, #f8f8f8 100%)",
      }}
      aria-label={label}
      role="img"
    >
      <span className="text-xs md:text-sm font-medium text-[#9a9a9a] tracking-wide">
        {label}
      </span>
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white" style={{ boxShadow: "0 1px 12px rgba(0, 0, 0, 0.08)" }}>
        <div className="max-w-[1120px] mx-auto px-5 md:px-8 h-16 md:h-[72px] flex items-center justify-between gap-4">
          <Link to="/venda" aria-label="Bisme" className="flex items-center">
            <img src={bismeHeaderLogo} alt="Bisme" className="h-9 md:h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/empresario/cadastro"
              className="text-white text-sm font-semibold px-4 py-2 rounded-full hover:brightness-110 transition"
              style={{ backgroundColor: ORANGE }}
            >
              Teste grátis
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              aria-expanded={open}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#111] hover:bg-black/5 transition"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>
      {open && (
        <div className="fixed left-0 right-0 top-16 md:top-[72px] z-40 bg-white border-b border-black/[0.06] animate-in slide-in-from-top-2 duration-150">
          <div className="max-w-[1120px] mx-auto px-5 md:px-8 py-4">
            <MenuGroup
              label="Institucional"
              items={[
                { label: "Quem somos", to: "/quem-somos" },
                { label: "Termos de uso", to: "/termos-de-servico" },
                { label: "Política de privacidade", to: "/politica-privacidade" },
              ]}
              onNavigate={() => setOpen(false)}
            />
            <MenuGroup
              label="Comercial"
              items={[
                { label: "Planos", to: "/planos" },
                { label: "Teste grátis", to: "/empresario/cadastro" },
                { label: "Entrar", to: "/empresario/login" },
              ]}
              onNavigate={() => setOpen(false)}
            />
            <div className="mt-6 mb-2 flex flex-col items-center gap-[10px]">
              <Link
                to="/empresario/login"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center w-56 bg-white border uppercase tracking-wider text-sm font-bold py-3 px-8 hover:brightness-95 transition-colors"
                style={{ color: "#5690f5", borderColor: "#5690f5", borderWidth: 1, borderRadius: 1 }}
              >
                ENTRAR
              </Link>
              <Link
                to="/empresario/cadastro"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center w-56 text-white uppercase tracking-wider text-sm font-bold py-3 px-8 hover:brightness-110 transition-colors"
                style={{ backgroundColor: "#5690f5", borderColor: "#5690f5", borderWidth: 1, borderRadius: 1 }}
              >
                CADASTRE-SE
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MenuGroup({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: { label: string; to: string }[];
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-black/[0.04] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 py-3 text-left font-semibold text-base text-[#111] hover:text-[color:var(--bisme-orange)] transition"
        style={{ ["--bisme-orange" as string]: ORANGE }}
      >
        <span>{label}</span>
        <ChevronDown size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="pb-2 pl-3 space-y-0.5">
          {items.map((it) => (
            <li key={it.label}>
              <Link
                to={it.to as never}
                onClick={onNavigate}
                className="block py-2 text-sm font-medium text-[#555] hover:text-[color:var(--bisme-orange)]"
                style={{ ["--bisme-orange" as string]: ORANGE }}
              >
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PrimaryButton({ children, to = "/empresario/cadastro", noShadow = false }: { children: React.ReactNode; to?: string; noShadow?: boolean }) {
  return (
    <Link
      to={to as never}
      className={`inline-flex items-center justify-center text-center text-white font-semibold px-7 py-3.5 rounded-full text-base hover:brightness-110 transition${noShadow ? "" : " shadow-[0_8px_24px_-8px_rgba(0,135,255,0.55)]"}`}
      style={{ backgroundColor: "#0087ff" }}
    >
      {children}
    </Link>
  );
}

function Hero() {
  return (
    <section className="max-w-[1120px] mx-auto px-5 md:px-8 pt-8 md:pt-12 pb-8 md:pb-12">
      <div className="grid md:grid-cols-2 md:gap-12 md:items-center">
        <div className="text-left">
          <h1 className="font-extrabold leading-[1.05] tracking-tight text-[#111]" style={{ fontSize: "30px" }}>
            da correria da rotina ao controle da gestão<br />a Bisme simplifica
          </h1>
          <p className="mt-4 text-base md:text-lg text-[#555] leading-relaxed max-w-xl">
            Com a Bisme, você controla sua agenda, organiza seu financeiro, gerencia clientes, envia mensagens pelo WhatsApp e cuida do seu negócio sem complicação.
          </p>
        </div>
        <div className="mt-6 md:mt-0">
          <img
            src={vendaHero}
            alt="Demonstração da Bisme com agenda, reservas e atendimento"
            className="w-full h-auto"
            style={{ aspectRatio: "1/1", objectFit: "contain" }}
          />
        </div>
      </div>
    </section>
  );
}

function RotinaSection() {
  return (
    <section className="max-w-[1120px] mx-auto px-5 md:px-8">
      <div className="text-left max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-extrabold text-[#111] tracking-tight">
          Sua rotina organizada em um só lugar
        </h2>
        <p className="mt-3 text-base md:text-lg text-[#555] leading-relaxed">
          Visualize todos os atendimentos do dia, da semana ou do mês com clareza. Encaixes, cancelamentos e novos horários sem confusão.
        </p>
      </div>
      <div className="mt-6 md:mt-8">
        <img
          src={vendaRotina}
          alt="Sua rotina organizada"
          className="w-full h-auto"
          loading="lazy"
        />
      </div>
    </section>
  );
}

function SiteShowcaseSection() {
  return (
    <section className="max-w-[1120px] mx-auto px-5 md:px-8 py-10 md:py-14">

      <div className="text-left max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-extrabold text-[#111] tracking-tight">
          Um site de agendamento com a cara do seu negócio
        </h2>
        <p className="mt-3 text-base md:text-lg text-[#555] leading-relaxed">
          Personalize cores, capa, logo, serviços e horários. Compartilhe um link único e seus clientes agendam direto, 24 horas por dia.
        </p>
      </div>

      <div className="mt-8 md:mt-10 flex justify-center">
        <img
          src={sitesShowcase}
          alt="Exemplos de sites de agendamento em celulares"
          className="w-full h-auto object-contain max-w-4xl"
          loading="lazy"
        />
      </div>
    </section>
  );
}

function ServicosSection() {
  return (
    <section className="max-w-[1120px] mx-auto px-5 md:px-8 pb-10 md:pb-14">

      <div className="text-left max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-extrabold text-[#111] tracking-tight">
          Tudo que você precisa para gerenciar melhor
        </h2>
        <p className="mt-3 text-base md:text-lg text-[#555] leading-relaxed">
          Acompanhe faturamento, agendamentos, clientes e desempenho em tempo real, no celular ou no computador, com uma visão simples e profissional da sua gestão.
        </p>
      </div>
      <div className="mt-6 md:mt-8 max-w-4xl">
        <img
          src={dashboardPreview}
          alt="Preview do dashboard da Bisme em desktop e mobile"
          className="w-full h-auto"
          loading="lazy"
        />
      </div>
    </section>
  );
}

type Depoimento = { texto: string; nome: string; profissao: string; foto: string };
const DEPOIMENTOS: Depoimento[] = [
  {
    texto:
      "Usava planilha pra tudo e vivia perdendo horário. Hoje o link de agendamento faz o trabalho — o cliente marca sozinho e eu só acesso a minha agenda. Sensacional, muito tempo.",
    nome: "Rafaela Nunes",
    profissao: "Esteticista",
    foto: depoRafaela,
  },
  {
    texto:
      "A organização da agenda mudou meu dia a dia. Os lembretes no WhatsApp reduziram muito as faltas e meus clientes adoraram a praticidade.",
    nome: "Lucas Andrade",
    profissao: "Barbeiro",
    foto: depoLucas,
  },
  {
    texto:
      "Consigo ver tudo em um lugar só: agenda, financeiro e clientes. A Bisme deixou meu trabalho muito mais leve e profissional.",
    nome: "Camila Souza",
    profissao: "Manicure",
    foto: depoCamila,
  },
];

function DepoimentosSection() {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!api) return;
    setSelected(api.selectedScrollSnap());
    const handler = () => setSelected(api.selectedScrollSnap());
    api.on("select", handler);
    return () => {
      api.off("select", handler);
    };
  }, [api]);

  return (
    <section className="bg-white">
      <div className="max-w-[1120px] mx-auto px-5 md:px-8">
        <div className="text-left max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#111] tracking-tight">
            Quem usa a Bisme sente a diferença na rotina
          </h2>
          <p className="mt-3 text-base md:text-lg text-[#555] leading-relaxed">
            Profissionais de diferentes áreas já estão organizando agenda, clientes, financeiro e atendimento em um só lugar.
          </p>
        </div>

        <div className="mt-8 md:mt-10">
          <Carousel setApi={setApi} opts={{ loop: true, align: "start" }}>
            <CarouselContent>
              {DEPOIMENTOS.map((d, i) => (
                <CarouselItem key={i} className="md:basis-1/2 lg:basis-1/3">
                  <article className="h-full bg-[#7BA7F7] rounded-2xl p-6 md:p-7 shadow-[0_4px_20px_-12px_rgba(86,144,245,0.35)]">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} size={18} fill="#FACC15" color="#FACC15" />
                      ))}
                    </div>
                    <p className="text-white text-[15px] leading-relaxed">"{d.texto}"</p>
                    <div className="mt-5 pt-5 border-t border-white/20 flex items-center gap-3">
                      <img
                        src={d.foto}
                        alt={d.nome}
                        width={48}
                        height={48}
                        loading="lazy"
                        className="w-12 h-12 rounded-full object-cover ring-1 ring-white/30 flex-shrink-0"
                      />
                      <div>
                        <p className="font-bold text-white leading-tight">{d.nome}</p>
                        <p className="text-sm text-white/85">{d.profissao}</p>
                      </div>
                    </div>
                  </article>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          <div className="mt-6 flex items-center justify-center gap-2">
            {DEPOIMENTOS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir para depoimento ${i + 1}`}
                onClick={() => api?.scrollTo(i)}
                className="h-2.5 rounded-full transition-all"
                style={{
                  width: selected === i ? 24 : 10,
                  backgroundColor: selected === i ? ORANGE : "#e5e5e5",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQ_ITEMS = [
  {
    q: "O que é a Bisme?",
    a: "A Bisme é uma plataforma de agendamento e gestão pensada para negócios de atendimento. Em um só lugar você organiza agenda, clientes, serviços, financeiro e comunicação.",
  },
  {
    q: "Para quem a Bisme é indicada?",
    a: "Para profissionais autônomos e negócios que vivem de atendimento: salões, barbearias, estética, manicure, estúdios, clínicas e prestadores de serviço em geral.",
  },
  {
    q: "A Bisme envia mensagens pelo WhatsApp?",
    a: "Sim. Você pode enviar lembretes, confirmações e mensagens personalizadas para os seus clientes diretamente pelo WhatsApp.",
  },
  {
    q: "A Bisme tem controle financeiro?",
    a: "Sim. Você acompanha entradas, saídas e a evolução do seu faturamento em um painel simples e direto.",
  },
  {
    q: "A página de agendamento pode ter a identidade do meu negócio?",
    a: "Sim. Você personaliza cores, capa, logo, serviços e horários. O link de agendamento fica com a cara do seu negócio.",
  },
];

function FaqSection() {
  return (
    <section className="max-w-[800px] mx-auto px-5 md:px-8 py-12 md:py-16">
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-[#111] tracking-tight">
          Perguntas frequentes sobre a Bisme
        </h2>
        <p className="mt-4 text-base md:text-lg text-[#555] leading-relaxed">
          Tire suas principais dúvidas sobre como a Bisme ajuda a organizar sua rotina, seus atendimentos e a experiência dos seus clientes.
        </p>
      </div>

      <Accordion type="single" collapsible className="mt-8 md:mt-10 space-y-3">
        {FAQ_ITEMS.map((item, i) => (
          <AccordionItem
            key={i}
            value={`item-${i}`}
            className="bg-white border border-[#eeeeee] rounded-2xl px-5 md:px-6"
          >
            <AccordionTrigger className="text-left text-[15px] md:text-base font-semibold text-[#111] hover:no-underline py-5">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-[#555] text-[15px] leading-relaxed pb-5">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function CtaFinal() {
  return (
    <section className="max-w-[800px] mx-auto px-5 md:px-8 py-10 md:py-14 text-center">
      <h2 className="text-3xl md:text-4xl font-extrabold text-[#111] tracking-tight">
        Ainda ficou com alguma dúvida?
      </h2>
      <p className="mt-3 text-base md:text-lg text-[#555] leading-relaxed max-w-xl mx-auto">
        Comece seu teste grátis e veja na prática como a Bisme pode simplificar sua rotina.
      </p>
      <div className="mt-6 flex justify-center">
        <PrimaryButton noShadow>Teste grátis</PrimaryButton>
      </div>
    </section>
  );
}

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.55a8.16 8.16 0 0 0 4.77 1.52V6.69h-1.84Z" />
    </svg>
  );
}

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.7c0-.92.26-1.55 1.58-1.55H17V4.27A22 22 0 0 0 14.55 4.14c-2.43 0-4.1 1.48-4.1 4.21V10.8H7.75V14h2.7v8h3.05Z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { icon: <Instagram size={18} />, label: "Instagram", href: "https://www.instagram.com/meubisme" },
  { icon: <FacebookIcon size={18} />, label: "Facebook", href: "https://www.facebook.com/meubisme" },
  { icon: <Youtube size={18} />, label: "YouTube", href: "https://www.youtube.com/@meubisme" },
  { icon: <TikTokIcon size={18} />, label: "TikTok", href: "https://www.tiktok.com/@meubisme?is_from_webapp=1&sender_device=pc" },
];

function Footer() {
  return (
    <footer className="bg-white border-t-[3px]" style={{ borderTopColor: ORANGE }}>
      <div className="max-w-[1120px] mx-auto px-5 md:px-8 pt-4 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10">
          <div className="col-span-2">
            <img src={bismeHeaderLogo} alt="Bisme" className="h-10 w-auto mb-3" />
            <p className="text-[#555] text-sm leading-relaxed max-w-xs mb-5">
              A plataforma de agendamento e gestão para negócios que querem crescer com organização.
            </p>
            <h4 className="font-bold text-xs uppercase tracking-wider mb-3" style={{ color: ORANGE }}>
              Nossas redes
            </h4>
            <div className="flex gap-2.5">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-10 h-10 rounded-full bg-[#111] text-white flex items-center justify-center hover:bg-[color:var(--bisme-orange)] transition"
                  style={{ ["--bisme-orange" as string]: ORANGE }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider mb-3" style={{ color: ORANGE }}>
              Institucional
            </h4>
            <ul className="space-y-2 text-sm text-[#555]">
              <li><Link to="/quem-somos" className="hover:text-[color:var(--bisme-orange)]" style={{ ["--bisme-orange" as string]: ORANGE }}>Quem somos</Link></li>
              <li><Link to="/termos-de-servico" className="hover:text-[color:var(--bisme-orange)]" style={{ ["--bisme-orange" as string]: ORANGE }}>Termos de uso</Link></li>
              <li><Link to="/politica-privacidade" className="hover:text-[color:var(--bisme-orange)]" style={{ ["--bisme-orange" as string]: ORANGE }}>Política de Privacidade</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider mb-3" style={{ color: ORANGE }}>
              Comercial
            </h4>
            <ul className="space-y-2 text-sm text-[#555]">
              <li><Link to="/planos" className="hover:text-[color:var(--bisme-orange)]" style={{ ["--bisme-orange" as string]: ORANGE }}>Planos</Link></li>
              <li><Link to="/empresario/cadastro" className="hover:text-[color:var(--bisme-orange)]" style={{ ["--bisme-orange" as string]: ORANGE }}>Teste grátis</Link></li>
              <li><Link to="/empresario/login" className="hover:text-[color:var(--bisme-orange)]" style={{ ["--bisme-orange" as string]: ORANGE }}>Entrar</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="text-center text-xs md:text-sm font-medium text-white py-4 px-5" style={{ backgroundColor: ORANGE }}>
        © 2026 Bisme. Todos os direitos reservados.
      </div>
    </footer>
  );
}

function VendaPage() {
  // mark unused icons as used (kept for potential future use)
  void ArrowLeft; void ArrowRight;
  return (
    <div
      className="min-h-screen bg-white text-[#111] antialiased"
      style={{ fontFamily: '"Open Sans", "Segoe UI", Helvetica, Arial, sans-serif' }}
    >
      <Header />
      <main>
        <Hero />
        <RotinaSection />
        <SiteShowcaseSection />
        <ServicosSection />
        <DepoimentosSection />
        <FaqSection />
        
      </main>
      <Footer />
    </div>
  );
}
