import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AboutTab } from "@/components/barbearia/AboutTab";
import { BarbeariaLayout } from "@/components/barbearia/BarbeariaLayout";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — Barbearia Sr. Eli" },
      { name: "description", content: "Conheça a Barbearia Sr. Eli em Timon, MA." },
    ],
  }),
  component: SobrePage,
});

function SobrePage() {
  const navigate = useNavigate();
  return (
    <BarbeariaLayout>
      <AboutTab onAgendar={() => navigate({ to: "/" })} />
    </BarbeariaLayout>
  );
}
