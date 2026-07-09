import { createFileRoute } from "@tanstack/react-router";
import { FullScreenPage } from "@/components/paginadevenda/PageShell";
import { TermsContent } from "@/components/empresario/LegalModal";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Bisme" },
      { name: "description", content: "Regras de uso da plataforma Bisme." },
      { property: "og:title", content: "Termos de Uso — Bisme" },
      { property: "og:description", content: "Regras de uso da plataforma Bisme." },
    ],
  }),
  component: TermosDeServicoPage,
});

function TermosDeServicoPage() {
  return (
    <FullScreenPage title="Termos de Uso" eyebrow="Legal">
      <article className="text-[15px] leading-[1.8] text-[#1A1A1A] [&_h3]:text-[#1A1A1A] [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:mb-4">
        <TermsContent />
      </article>
    </FullScreenPage>
  );
}
