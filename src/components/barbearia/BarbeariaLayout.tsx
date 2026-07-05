import { useEffect, useState, type ReactNode } from "react";
import { Hero } from "./Hero";
import { InfoBlock } from "./InfoBlock";
import { SiteTabs } from "./SiteTabs";
import { LoginFullScreen } from "./LoginFullScreen";

import { initLocalStorage, type Usuario } from "./data";
import { useClientUser } from "./ClientUserContext";
import { useSiteConfig } from "@/components/admin/SiteConfigContext";
import { buildTemplateCss, getTemplate } from "@/lib/siteTemplates";

type RenderProps = {
  usuario: Usuario | null;
  abrirLogin: (mode?: "login" | "cadastro", initialWhatsapp?: string) => void;
};

export function BarbeariaLayout({
  children,
  slug,
}: {
  children: ReactNode | ((props: RenderProps) => ReactNode);
  slug?: string;
}) {
  const { usuario, setUsuario } = useClientUser();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginWhatsapp, setLoginWhatsapp] = useState("");
  const { config } = useSiteConfig();

  useEffect(() => {
    initLocalStorage();
  }, []);

  function abrirLogin(mode: "login" | "cadastro" = "cadastro", initialWhatsapp = "") {
    // O fluxo do cliente final sempre abre primeiro na tela de cadastro
    void mode;
    setLoginWhatsapp(initialWhatsapp);
    setLoginOpen(true);
  }

  const template = getTemplate(config.template);
  const themeCss = buildTemplateCss(template);

  return (
    <div className="sreli-root">
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      <Hero />
      <InfoBlock onEntrarClick={() => abrirLogin("cadastro")} slug={slug} />
      <SiteTabs slug={slug} />

      {typeof children === "function" ? children({ usuario, abrirLogin }) : children}



      <LoginFullScreen
        open={loginOpen}
        initialMode="cadastro"
        initialWhatsapp={loginWhatsapp}
        onClose={() => setLoginOpen(false)}
        onLogged={(u) => {
          setUsuario(u);
          setLoginOpen(false);
        }}
      />
    </div>
  );
}
