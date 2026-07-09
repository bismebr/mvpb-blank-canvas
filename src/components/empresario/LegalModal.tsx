import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export type LegalKind = "terms" | "privacy";

interface Props {
  kind: LegalKind;
  onClose: () => void;
}

const FONT =
  'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export function LegalModal({ kind, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = kind === "terms" ? "Termos de Uso" : "Política de Privacidade";

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        minHeight: "100%",
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "24px 12px",
        zIndex: 50,
        fontFamily: FONT,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 720,
          background: "#FFFFFF",
          borderRadius: 14,
          padding: "20px 22px 22px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#111",
            }}
          >
            <X size={22} />
          </button>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111" }}>{title}</h2>
        </div>

        <div
          style={{
            color: "#1a1a1a",
            fontSize: 15,
            lineHeight: 1.7,
            textAlign: "justify",
          }}
        >
          {kind === "privacy" ? <PrivacyContent /> : <TermsContent />}
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 28,
            width: "100%",
            height: 56,
            background: "#111111",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 0.5,
            cursor: "pointer",
            fontFamily: FONT,
          }}
        >
          OK, ENTENDI
        </button>
      </div>
    </div>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p style={{ margin: "0 0 14px" }}>{children}</p>;
}
function H({ children }: { children: ReactNode }) {
  return (
    <h3 style={{ margin: "22px 0 10px", fontSize: 16, fontWeight: 700, color: "#111" }}>
      {children}
    </h3>
  );
}

export function PrivacyContent() {
  return (
    <>
      <h3 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 700, color: "#111" }}>
        Política de Privacidade
      </h3>
      <P>Esta Política de Privacidade explica como o Bisme coleta, utiliza, armazena e protege as informações fornecidas por empresários, clientes e visitantes que utilizam nossa plataforma de gestão e agendamentos.</P>
      <P>O Bisme é uma plataforma digital criada para ajudar empresas a divulgarem seus serviços, organizarem horários, receberem agendamentos e gerenciarem informações relacionadas ao atendimento de seus clientes.</P>
      <P>Ao utilizar o Bisme, você declara estar ciente de que alguns dados pessoais poderão ser coletados e tratados para permitir o funcionamento correto da plataforma.</P>
      <H>1. Informações que podemos coletar</H>
      <P>Podemos coletar informações fornecidas diretamente por você, como nome, e-mail, senha, telefone/WhatsApp, nome do negócio, endereço comercial, imagem de perfil, imagem de capa, serviços cadastrados, funcionários cadastrados, horários disponíveis e demais informações necessárias para configurar o site de agendamentos.</P>
      <P>Quando um cliente realiza um agendamento em uma empresa que utiliza o Bisme, também poderemos coletar dados como nome, e-mail, telefone/WhatsApp, serviço escolhido, funcionário escolhido, data, horário e histórico de agendamentos.</P>
      <P>Também poderemos coletar informações técnicas básicas, como dados de acesso, dispositivo utilizado, navegador, páginas visitadas e registros necessários para segurança e melhoria da plataforma.</P>
      <H>2. Como usamos as informações</H>
      <P>As informações coletadas podem ser utilizadas para:</P>
      <ul style={{ margin: "0 0 14px", paddingLeft: 20 }}>
        <li>Criar e manter a conta do usuário.</li>
        <li>Permitir o acesso ao painel administrativo.</li>
        <li>Criar e exibir o site de agendamento da empresa.</li>
        <li>Permitir que clientes realizem agendamentos.</li>
        <li>Organizar serviços, horários, funcionários e clientes.</li>
        <li>Melhorar a experiência de uso da plataforma.</li>
        <li>Enviar comunicações importantes sobre conta, segurança, suporte ou funcionamento do serviço.</li>
        <li>Cumprir obrigações legais, regulatórias ou solicitações de autoridades competentes.</li>
      </ul>
      <H>3. Compartilhamento de informações</H>
      <P>O Bisme não vende dados pessoais.</P>
      <P>As informações podem ser compartilhadas apenas quando necessário para o funcionamento da plataforma, cumprimento de obrigações legais, proteção dos direitos do Bisme, prevenção de fraudes, segurança do serviço ou utilização de ferramentas essenciais, como serviços de autenticação, hospedagem, banco de dados, processamento de pagamentos ou envio de comunicações.</P>
      <P>Empresas que utilizam o Bisme também podem visualizar os dados dos clientes que realizam agendamentos em seus respectivos sites, exclusivamente para fins de atendimento, organização e gestão dos agendamentos.</P>
      <H>4. Responsabilidade das empresas cadastradas</H>
      <P>Cada empresa que utiliza o Bisme é responsável pelas informações que cadastra na plataforma, pelos serviços oferecidos, pelos horários disponibilizados e pelo uso adequado dos dados de seus próprios clientes.</P>
      <P>O Bisme fornece a tecnologia para gestão e agendamento, mas não realiza diretamente os serviços oferecidos pelas empresas cadastradas.</P>
      <H>5. Segurança dos dados</H>
      <P>Adotamos medidas razoáveis para proteger as informações contra acessos não autorizados, perda, alteração, divulgação indevida ou uso inadequado.</P>
      <P>Apesar dos esforços de segurança, nenhum sistema digital é totalmente livre de riscos. Por isso, o usuário também deve proteger seus dados de acesso, utilizar senhas seguras e não compartilhar sua conta com terceiros.</P>
      <H>6. Retenção das informações</H>
      <P>Os dados poderão ser mantidos enquanto forem necessários para o funcionamento da conta, prestação dos serviços, cumprimento de obrigações legais, resolução de disputas, prevenção de fraudes ou proteção dos direitos do Bisme.</P>
      <P>Quando possível e aplicável, o usuário poderá solicitar a exclusão ou correção de seus dados.</P>
      <H>7. Direitos do titular dos dados</H>
      <P>O usuário poderá solicitar informações sobre o tratamento de seus dados pessoais, bem como pedir acesso, correção, atualização, exclusão ou outras providências previstas na legislação aplicável.</P>
      <P>As solicitações poderão ser feitas pelo canal de contato oficial do Bisme.</P>
      <H>8. Cookies e tecnologias semelhantes</H>
      <P>O Bisme poderá utilizar cookies ou tecnologias semelhantes para melhorar a navegação, manter sessões ativas, entender o uso da plataforma e aprimorar a experiência do usuário.</P>
      <P>O usuário poderá gerenciar cookies diretamente nas configurações do navegador, quando aplicável.</P>
      <H>9. Alterações nesta Política</H>
      <P>Esta Política de Privacidade poderá ser atualizada periodicamente para refletir melhorias na plataforma, alterações legais ou mudanças operacionais.</P>
      <P>Quando houver alterações relevantes, poderemos informar os usuários por meio da própria plataforma ou por outros canais de comunicação.</P>
      <H>10. Contato</H>
      <P>Em caso de dúvidas sobre esta Política de Privacidade ou sobre o tratamento de dados pessoais, entre em contato pelo e-mail:</P>
      <P><strong>suporte@bisme.com.br</strong></P>
    </>
  );
}

export function TermsContent() {
  return (
    <>
      <h3 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 700, color: "#111" }}>
        Termos de Uso
      </h3>
      <P>Estes Termos de Serviço regulam o uso da plataforma Bisme, uma solução digital para criação de sites de agendamento, organização de serviços, horários, funcionários, clientes e gestão de atendimentos.</P>
      <P>Ao criar uma conta ou utilizar o Bisme, você declara que leu, entendeu e concorda com estes Termos.</P>
      <H>1. Sobre o Bisme</H>
      <P>O Bisme é uma plataforma online que permite que empresas criem um site próprio de agendamentos, cadastrem serviços, horários, funcionários e acompanhem os agendamentos realizados por seus clientes.</P>
      <P>O Bisme não presta os serviços cadastrados pelas empresas. A responsabilidade pela execução dos serviços, atendimento aos clientes, preços, horários, cancelamentos e informações exibidas no site de agendamento é da própria empresa cadastrada.</P>
      <H>2. Cadastro e conta</H>
      <P>Para utilizar o painel administrativo do Bisme, o empresário deverá criar uma conta informando dados verdadeiros, completos e atualizados.</P>
      <P>O usuário é responsável por manter a confidencialidade de sua senha e por todas as atividades realizadas em sua conta.</P>
      <P>O Bisme poderá suspender ou encerrar contas que apresentem informações falsas, uso indevido, violação destes Termos ou comportamento que comprometa a segurança da plataforma.</P>
      <H>3. Uso da plataforma</H>
      <P>O usuário se compromete a utilizar o Bisme de forma legal, ética e adequada.</P>
      <P>É proibido utilizar a plataforma para:</P>
      <ul style={{ margin: "0 0 14px", paddingLeft: 20 }}>
        <li>Cadastrar informações falsas, enganosas ou ofensivas.</li>
        <li>Oferecer serviços ilegais ou proibidos.</li>
        <li>Violar direitos de terceiros.</li>
        <li>Tentar acessar áreas restritas sem autorização.</li>
        <li>Copiar, modificar ou explorar indevidamente partes da plataforma.</li>
        <li>Praticar fraudes, abusos ou qualquer conduta que prejudique o Bisme, outros usuários ou clientes.</li>
      </ul>
      <H>4. Site de agendamento</H>
      <P>Ao criar seu site de agendamento no Bisme, a empresa é responsável por manter atualizadas as informações exibidas, incluindo nome do negócio, endereço, serviços, preços, horários, funcionários, imagens, links e formas de contato.</P>
      <P>O Bisme poderá remover, bloquear ou solicitar alteração de conteúdos que violem estes Termos, leis aplicáveis ou direitos de terceiros.</P>
      <H>5. Agendamentos</H>
      <P>Os agendamentos realizados pelos clientes são registrados conforme as informações configuradas pela empresa no painel administrativo.</P>
      <P>A empresa é responsável por acompanhar seus agendamentos, cumprir os horários disponibilizados, atender seus clientes e comunicar eventuais alterações ou cancelamentos.</P>
      <P>O Bisme apenas fornece a ferramenta tecnológica para facilitar essa organização.</P>
      <H>6. Planos, assinatura e pagamento</H>
      <P>O Bisme poderá oferecer planos pagos, testes gratuitos ou condições promocionais.</P>
      <P>As informações sobre valores, período de teste, renovação, troca de plano, cancelamento e bloqueio por inadimplência serão apresentadas dentro da plataforma ou em canais oficiais do Bisme.</P>
      <P>Caso o pagamento não seja realizado dentro do prazo definido, o acesso à plataforma e ao site de agendamento poderá ser limitado, suspenso ou bloqueado até a regularização.</P>
      <H>7. Cancelamento</H>
      <P>O usuário poderá solicitar o cancelamento de sua assinatura ou conta conforme as opções disponíveis na plataforma ou pelos canais oficiais de atendimento.</P>
      <P>O cancelamento não elimina automaticamente obrigações anteriores, valores pendentes ou responsabilidades relacionadas ao uso da plataforma antes do encerramento.</P>
      <H>8. Disponibilidade da plataforma</H>
      <P>O Bisme buscará manter a plataforma disponível e funcionando corretamente, mas não garante que o serviço ficará livre de interrupções, instabilidades, erros ou manutenções.</P>
      <P>Poderemos realizar atualizações, melhorias, correções ou alterações na plataforma a qualquer momento, buscando melhorar a experiência dos usuários.</P>
      <H>9. Propriedade intelectual</H>
      <P>A marca Bisme, o layout da plataforma, os elementos visuais, textos, funcionalidades, códigos, fluxos e demais componentes pertencem ao Bisme ou a seus respectivos titulares.</P>
      <P>O uso da plataforma não concede ao usuário qualquer direito de propriedade sobre o Bisme ou seus componentes.</P>
      <H>10. Limitação de responsabilidade</H>
      <P>O Bisme não se responsabiliza por serviços prestados pelas empresas cadastradas, atrasos, cancelamentos, atendimento ao consumidor final, informações publicadas pelas empresas ou relações comerciais entre empresa e cliente.</P>
      <P>O Bisme também não se responsabiliza por prejuízos causados por mau uso da plataforma, informações incorretas cadastradas pelo usuário, falhas de conexão, indisponibilidade de serviços de terceiros ou eventos fora de seu controle razoável.</P>
      <H>11. Alterações nos Termos</H>
      <P>Estes Termos poderão ser atualizados periodicamente para refletir melhorias na plataforma, mudanças operacionais ou exigências legais.</P>
      <P>O uso contínuo do Bisme após alterações significa que o usuário concorda com a versão atualizada dos Termos.</P>
      <H>12. Contato</H>
      <P>Em caso de dúvidas sobre estes Termos de Serviço, entre em contato pelo e-mail:</P>
      <P><strong>suporte@bisme.com.br</strong></P>
    </>
  );
}
