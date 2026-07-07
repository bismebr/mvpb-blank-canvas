import { Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import bismeHeaderLogo from "@/assets/bisme-header-logo.svg";

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.55a8.16 8.16 0 0 0 4.77 1.52V6.69h-1.84Z" />
    </svg>
  );
}

function YoutubeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z" />
    </svg>
  );
}



export function SiteFooter() {
  return (
    <footer className="bg-white border-t-4 border-[#5690f5] pt-6">
      <div className="max-w-7xl mx-auto px-5 md:px-6 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10 mb-10">
          <div className="col-span-2">
            <div className="mb-3 flex items-center">
              <img src={bismeHeaderLogo} alt="bisme" className="h-10 w-auto" />
            </div>
            <p className="text-gray-500 mb-4 max-w-xs text-sm leading-relaxed">
              A plataforma de agendamento e gestão para negócios que vivem de atendimento.
            </p>
            <h4 className="font-bold mb-3 text-[#5690f5] text-sm uppercase tracking-wider">Nossas redes</h4>
            <div className="flex gap-2.5">
              {[
                { icon: <Instagram size={20} />, label: "Instagram" },
                { icon: <YoutubeIcon size={20} />, label: "YouTube" },
                { icon: <TikTokIcon size={20} />, label: "TikTok" },
              ].map((s) => (
                <button
                  key={s.label}
                  type="button"
                  aria-label={s.label}
                  className="w-10 h-10 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center hover:bg-[#5690f5] transition-colors"
                >
                  {s.icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-[#5690f5] text-sm uppercase tracking-wider">Institucional</h4>
            <ul className="space-y-2 text-gray-500 text-sm">
              <li><Link to="/quem-somos" className="hover:text-[#5690f5] transition-colors">Quem somos</Link></li>
              <li><Link to="/termos-de-servico" className="hover:text-[#5690f5] transition-colors">Termos de Uso</Link></li>
              <li><Link to="/politica-privacidade" className="hover:text-[#5690f5] transition-colors">Política de Privacidade</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-[#5690f5] text-sm uppercase tracking-wider">Comercial</h4>
            <ul className="space-y-2 text-gray-500 text-sm">
              <li><Link to="/planos" className="hover:text-[#5690f5] transition-colors">Planos</Link></li>
              <li><Link to="/empresario/cadastro" className="hover:text-[#5690f5] transition-colors">Teste grátis</Link></li>
              <li><Link to="/empresario/login" className="hover:text-[#5690f5] transition-colors">Entrar</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-[#5690f5]">
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-4 flex flex-col md:flex-row justify-center items-center gap-2 text-xs text-white">
          <p>© {new Date().getFullYear()} Bisme. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>

  );
}
