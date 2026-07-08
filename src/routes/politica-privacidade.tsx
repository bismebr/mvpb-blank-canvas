import { createFileRoute } from "@tanstack/react-router";
import { FullScreenPage } from "@/components/paginadevenda/PageShell";
import { PrivacyContent } from "@/components/empresario/LegalModal";

export const Route = createFileRoute("/politica-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Bisme" },
      { name: "description", content: "Como a Bisme trata e protege seus dados." },
      { property: "og:title", content: "Política de Privacidade — Bisme" },
      { property: "og:description", content: "Como a Bisme trata e protege seus dados." },
    ],
  }),
  component: PoliticaPrivacidadePage,
});

function PoliticaPrivacidadePage() {
  return (
    <FullScreenPage title="Política de Privacidade" eyebrow="Legal">
      <article className="text-[15px] leading-[1.8] text-[#1A1A1A] [&_h3]:text-[#1A1A1A] [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:mb-4">
        <PrivacyContent />
      </article>
    </FullScreenPage>
  );
}
