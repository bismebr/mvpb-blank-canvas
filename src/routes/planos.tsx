import { createFileRoute, Link } from "@tanstack/react-router";
import { FullScreenPage } from "@/components/paginadevenda/PageShell";
import { Check, Sparkles } from "lucide-react";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos — Bisme" },
      {
        name: "description",
        content:
          "Planos da Bisme para todos os momentos do seu negócio. Mensal ou anual, comece grátis.",
      },
      { property: "og:title", content: "Planos — Bisme" },
      { property: "og:description", content: "Planos da Bisme com teste grátis." },
    ],
  }),
  component: PlanosPage,
});

type Plano = {
  nome: string;
  preco: string;
  periodo: string;
  descricao: string;
  beneficios: string[];
  destaque?: boolean;
};

const PLANOS: Plano[] = [
  {
    nome: "Plano Mensal",
    preco: "R$ 29,90",
    periodo: "/mês",
    descricao: "Ideal para testar, começar com calma e organizar sua rotina mês a mês.",
    beneficios: [
      "Agenda online personalizada",
      "Cadastro de serviços e profissionais",
      "Controle de clientes",
      "Mensagens pelo WhatsApp",
      "Link próprio para agendamentos",
      "Acesso ao painel administrativo",
    ],
  },
  {
    nome: "Plano Anual",
    preco: "R$ 239,90",
    periodo: "/ano",
    destaque: true,
    descricao:
      "A melhor escolha para quem quer economizar e manter a gestão do negócio sempre organizada.",
    beneficios: [
      "Todos os recursos do plano mensal",
      "Economia em relação ao pagamento mensal",
      "Mais tranquilidade para planejar o crescimento do negócio",
      "Ideal para negócios em crescimento",
    ],
  },
];

function PlanosPage() {
  return (
    <FullScreenPage title="Planos">
      <div className="space-y-8" style={{ fontFamily: '"Open Sans", "Segoe UI", Helvetica, Arial, sans-serif' }}>
        <header className="text-left">
          <h2 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3 text-[#1A1A1A]">
            Planos para todos os momentos do seu negócio
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-2xl">
            Seja para quem está começando ou para quem já atende todos os dias, a Bisme tem um plano
            simples, acessível e completo para organizar sua agenda, seus clientes e sua gestão.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-5 md:gap-6">
          {PLANOS.map((p) => (
            <div
              key={p.nome}
              className={`relative rounded-2xl p-7 md:p-8 flex flex-col bg-white ${
                p.destaque
                  ? "border-2 border-[#5690f5] shadow-lg shadow-[#5690f5]/10"
                  : "border border-black/10 shadow-sm"
              }`}
            >
              {p.destaque && (
                <span className="absolute -top-3 left-6 inline-flex items-center bg-[#5690f5] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Melhor custo-benefício
                </span>
              )}
              <h3 className="text-lg font-bold mb-1 text-[#1A1A1A]">{p.nome}</h3>
              <div className="mb-3">
                <span className="text-3xl md:text-4xl font-extrabold text-[#1A1A1A]">{p.preco}</span>
                <span className="ml-1 text-sm text-gray-500">{p.periodo}</span>
              </div>
              <p className="text-sm text-gray-600 mb-6">{p.descricao}</p>
              <ul className="space-y-3">
                {p.beneficios.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-[#5690f5]/10 text-[#5690f5]">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="text-[#1A1A1A]">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center text-center pt-2">
          <Link
            to="/empresario/cadastro"
            className="inline-flex items-center justify-center bg-[#5690f5] text-white px-10 py-4 rounded-full text-sm font-bold uppercase tracking-wide hover:brightness-110 transition-all"
          >
            Teste grátis
          </Link>
          <p className="text-sm text-gray-600 mt-3 max-w-md">
            Comece grátis e veja como a Bisme pode simplificar a rotina do seu negócio.
          </p>
        </div>
      </div>
    </FullScreenPage>
  );
}
