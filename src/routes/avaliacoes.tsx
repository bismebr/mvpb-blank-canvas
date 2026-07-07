import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AvaliacoesTab } from "@/components/barbearia/AvaliacoesTab";
import { BarbeariaLayout } from "@/components/barbearia/BarbeariaLayout";

export const Route = createFileRoute("/avaliacoes")({
  head: () => ({
    meta: [
      { title: "Avaliações — Barbearia Sr. Eli" },
      { name: "description", content: "Veja as avaliações da Barbearia Sr. Eli." },
    ],
  }),
  component: AvaliacoesPage,
});

function AvaliacoesPage() {
  const navigate = useNavigate();
  return (
    <BarbeariaLayout>
      {({ usuario, abrirLogin }) => (
        <AvaliacoesTab
          onAgendar={() => navigate({ to: "/" })}
          usuario={usuario}
          abrirLogin={abrirLogin}
        />
      )}
    </BarbeariaLayout>
  );
}
