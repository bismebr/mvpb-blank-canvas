import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Menu, X, ChevronDown } from "lucide-react";
import { SiteFooter } from "./SiteFooter";
import bismeHeaderLogo from "@/assets/bisme-header-logo.svg";

function HeaderMenuModal({
  open,
  onClose,
  headerHeight,
}: {
  open: boolean;
  onClose: () => void;
  headerHeight: number;
}) {
  const [expanded, setExpanded] = useState<"institucional" | "comercial" | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const institucional = [
    { label: "Quem somos", to: "/quem-somos" as const },
    { label: "Termos de uso", to: "/termos-de-servico" as const },
    { label: "Política de privacidade", to: "/politica-privacidade" as const },
  ];
  const comercial = [
    { label: "Planos", to: "/planos" as const },
    { label: "Teste grátis", to: "/empresario/cadastro" as const },
  ];

  return (
    <div
      className="fixed left-0 right-0 bg-white z-50 border-b border-black/5 animate-in slide-in-from-top-2 duration-150"
      style={{ top: headerHeight }}
    >
      <div className="px-6 py-4 md:px-10 md:py-6">
        <div className="max-w-5xl mx-auto space-y-1">
          {(
            [
              { key: "institucional" as const, label: "Institucional", items: institucional },
              { key: "comercial" as const, label: "Comercial", items: comercial },
            ]
          ).map((group) => {
            const isOpen = expanded === group.key;
            return (
              <div key={group.key} className="border-b border-black/[0.04] last:border-b-0">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : group.key)}
                  className="w-full flex items-center gap-2 py-3 text-left font-semibold text-base md:text-lg text-[#1A1A1A] hover:text-[#5690f5] transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    size={18}
                    className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <ul className="pb-2 pl-3 space-y-0.5">
                    {group.items.map((it) => (
                      <li key={it.label}>
                        <Link
                          to={it.to}
                          onClick={onClose}
                          className="block py-2 text-sm md:text-base font-medium text-[#1A1A1A]/75 hover:text-[#5690f5] transition-colors"
                        >
                          {it.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 mb-1 flex justify-center">
          <Link
            to="/empresario/login"
            onClick={onClose}
            className="inline-flex items-center justify-center bg-white text-[#1A1A1A] border border-[#1A1A1A] text-xs font-semibold py-2 px-5 rounded-full outline-none focus:outline-none focus-visible:outline-none hover:bg-white hover:text-[#1A1A1A] active:bg-white active:text-[#1A1A1A] focus:bg-white focus:text-[#1A1A1A] transition-none"
          >
            Já sou cliente
          </Link>
        </div>
      </div>
    </div>
  );
}

export function SiteHeader({ transparent: _transparent = false }: { transparent?: boolean }) {
  void _transparent;
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(72);

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, []);

  return (
    <>
      <nav
        ref={headerRef}
        className="sticky top-0 z-40 bg-white"
        style={{ boxShadow: "0 1px 12px rgba(0, 0, 0, 0.08)" }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center gap-4">
          <Link to="/venda" className="flex items-center" aria-label="bisme">
            <img src={bismeHeaderLogo} alt="bisme" className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/empresario/cadastro"
              className="bg-[#5690f5] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:brightness-110 transition-all"
            >
              Teste grátis
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#1A1A1A] hover:bg-black/5 transition-colors"
            >
              {menuOpen ? <X size={24} strokeWidth={2.5} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>
      <HeaderMenuModal open={menuOpen} onClose={() => setMenuOpen(false)} headerHeight={headerHeight} />
    </>
  );
}

export function FullScreenPage({
  title,
  eyebrow: _eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  void _eyebrow;
  const router = useRouter();
  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) router.history.back();
    else router.navigate({ to: "/venda" });
  }

  return (
    <div
      className="min-h-screen bg-white text-[#1A1A1A] antialiased"
      style={{ fontFamily: '"Open Sans", "Segoe UI", Helvetica, Arial, sans-serif' }}
    >
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            type="button"
            onClick={goBack}
            aria-label="Voltar"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-black/5 text-[#1A1A1A] hover:bg-[#5690f5] hover:text-white hover:border-transparent transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-lg font-bold truncate text-[#1A1A1A]">{title}</h1>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 pt-5 pb-12 md:pt-6 md:pb-16">{children}</main>

      <SiteFooter />
    </div>
  );
}
