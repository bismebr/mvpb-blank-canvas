import { createFileRoute, Link } from "@tanstack/react-router";
import { FullScreenPage } from "@/components/paginadevenda/PageShell";
import { Heart, Target, Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/quem-somos")({
  head: () => ({
    meta: [
      { title: "Quem somos — Bisme" },
      {
        name: "description",
        content:
          "Conheça a Bisme, a plataforma que ajuda empresários e profissionais autônomos a criarem seu site de agendamentos e gerirem o negócio em um só lugar.",
      },
      { property: "og:title", content: "Quem somos — Bisme" },
      {
        property: "og:description",
        content: "A história e a missão da Bisme.",
      },
    ],
  }),
  component: QuemSomos,
});

function QuemSomos() {
  return (
    <FullScreenPage title="Quem somos" eyebrow="Nossa história">
      <div className="space-y-10">
        <header>
          <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-5">
            Quem vive de atendimento não tem tempo a perder. A <span className="text-[#5690f5]">Bisme</span> existe por isso
          </h2>
          <p className="text-gray-600 text-base md:text-lg leading-relaxed">
            Todo empresário, autônomo e negócio local merece uma presença digital profissional — sem
            precisar entender de tecnologia. Com a Bisme, em poucos minutos você tem um site de
            agendamentos completo: link próprio, serviços, horários, equipe e clientes organizados em um
            só lugar.
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              icon: <Target size={22} />,
              title: "Nossa missão",
              text: "Dar a pequenos e médios negócios as mesmas ferramentas que as grandes empresas usam — de forma simples e acessível.",
            },
            {
              icon: <Heart size={22} />,
              title: "O que nos move",
              text: "Ver donos de salões, barbearias, clínicas e estúdios ganharem tempo de volta e crescerem com tranquilidade.",
            },
            {
              icon: <Users size={22} />,
              title: "Para quem fazemos",
              text: "Para empresários e autônomos que vivem da relação direta com seus clientes e querem ser encontrados online.",
            },
          ].map((b) => (
            <div key={b.title} className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-[#5690f5]/10 text-[#5690f5] flex items-center justify-center mb-4">
                {b.icon}
              </div>
              <h3 className="font-bold text-[#1A1A1A] mb-2">{b.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{b.text}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#7ba7f7] rounded-3xl p-8 md:p-10">
          <h3 className="text-xl md:text-2xl font-extrabold mb-3 text-white">O que oferecemos</h3>
          <p className="text-white leading-relaxed mb-5">
            Uma plataforma completa de agendamentos e gestão: página própria com link personalizado, agenda
            inteligente, cadastro de serviços e profissionais, controle de clientes, mensagens prontas pelo
            WhatsApp, painel administrativo e total personalização visual do seu site.
          </p>
          <Link
            to="/empresario/cadastro"
            className="inline-flex items-center gap-2 bg-white text-[#7ba7f7] border border-[#7ba7f7] px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
          >
            Teste grátis <ArrowRight size={16} />
          </Link>
        </div>

      </div>
    </FullScreenPage>
  );
}
