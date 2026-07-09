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
function SH({ children }: { children: ReactNode }) {
  return (
    <h4 style={{ margin: "16px 0 8px", fontSize: 15, fontWeight: 700, color: "#111" }}>
      {children}
    </h4>
  );
}
function A({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} style={{ color: "#111", textDecoration: "underline" }}>{children}</a>;
}
function UL({ children }: { children: ReactNode }) {
  return <ul style={{ margin: "0 0 14px", paddingLeft: 20 }}>{children}</ul>;
}
function LI({ children }: { children: ReactNode }) {
  return <li style={{ marginBottom: 6 }}>{children}</li>;
}

export function PrivacyContent() {
  return (
    <>
      <h3 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 700, color: "#111" }}>
        Política de Privacidade da Bisme
      </h3>
      <P>A Bisme valoriza a privacidade, a segurança e a transparência no tratamento dos dados pessoais de seus usuários. Esta Política de Privacidade explica como coletamos, usamos, armazenamos, compartilhamos e protegemos os dados pessoais tratados por meio da nossa plataforma, incluindo o site, as páginas de agendamento, as telas de cadastro e login, os painéis administrativos, os fluxos de criação de conta e demais funcionalidades relacionadas aos serviços da Bisme.</P>
      <P>Ao acessar, criar uma conta, utilizar a plataforma, realizar um agendamento, administrar um negócio, cadastrar serviços, funcionários, horários, informações comerciais ou interagir com qualquer recurso da Bisme, você declara que leu e compreendeu esta Política de Privacidade.</P>
      <P>Esta Política se aplica aos clientes finais que utilizam páginas de agendamento, aos empresários, profissionais, funcionários cadastrados, administradores de negócios e demais usuários que interagem com a plataforma Bisme.</P>

      <H>1. Sobre a Bisme</H>
      <P>A Bisme é uma plataforma digital voltada para criação de sites de agendamento, gestão de serviços, horários, profissionais e atendimentos. Por meio da Bisme, empresários podem configurar páginas de agendamento próprias, cadastrar serviços, disponibilizar horários, gerenciar profissionais e permitir que clientes finais realizem agendamentos online.</P>
      <P>Para fins desta Política, “Bisme”, “nós” ou “nossa plataforma” se refere à plataforma Bisme e aos serviços digitais relacionados.</P>
      <P>A Bisme não possui endereço físico fixo para atendimento ao público. O contato oficial para assuntos relacionados à privacidade, proteção de dados e demais solicitações é feito exclusivamente pelo e-mail:</P>
      <P><A href="mailto:atendimento@bisme.com.br">atendimento@bisme.com.br</A></P>
      <P>A Bisme não realiza atendimento oficial por WhatsApp.</P>

      <H>2. Definições importantes</H>
      <P>Para facilitar a compreensão desta Política, usamos os seguintes termos:</P>
      <P><strong>“Dados pessoais”</strong> são informações que identificam ou podem identificar uma pessoa natural, como nome, e-mail, telefone, foto, dados de conta, dados de agendamento e informações de acesso.</P>
      <P><strong>“Dados pessoais sensíveis”</strong> são dados que podem revelar informações como origem racial ou étnica, convicção religiosa, opinião política, filiação sindical, dados referentes à saúde, vida sexual, dados genéticos ou biométricos, entre outros previstos em lei.</P>
      <P><strong>“Cliente final”</strong> é a pessoa que acessa uma página de agendamento criada por um empresário ou negócio dentro da Bisme para visualizar serviços, criar conta, fazer login, realizar agendamentos, consultar agendamentos ou editar seu perfil.</P>
      <P><strong>“Empresário”</strong> ou <strong>“cliente empresarial”</strong> é o usuário que utiliza a Bisme para criar, configurar e administrar seu site de agendamento, serviços, horários, profissionais, informações comerciais e demais recursos disponíveis.</P>
      <P><strong>“Profissional”</strong> ou <strong>“funcionário”</strong> é a pessoa cadastrada pelo empresário para prestar serviços, aparecer em agendas, receber agendamentos ou participar da operação do negócio.</P>
      <P><strong>“Tratamento de dados”</strong> significa qualquer operação realizada com dados pessoais, como coleta, armazenamento, uso, organização, consulta, compartilhamento, exclusão ou atualização.</P>

      <H>3. Quais dados podemos coletar</H>
      <P>A Bisme pode coletar diferentes tipos de dados, dependendo da forma como você utiliza a plataforma.</P>

      <SH>3.1. Dados de clientes finais</SH>
      <P>Quando um cliente final utiliza uma página de agendamento criada na Bisme, podemos tratar dados como:</P>
      <UL>
        <LI>Nome e sobrenome;</LI>
        <LI>E-mail;</LI>
        <LI>Telefone;</LI>
        <LI>Senha ou credenciais de autenticação, quando aplicável;</LI>
        <LI>Informações de login por provedores externos, como Google ou Facebook, quando o usuário optar por esse meio de acesso;</LI>
        <LI>Foto de perfil ou avatar, caso o usuário adicione uma imagem;</LI>
        <LI>Serviços selecionados;</LI>
        <LI>Data e horário do agendamento;</LI>
        <LI>Profissional escolhido, quando essa opção estiver disponível;</LI>
        <LI>Observações ou pedidos informados no campo de nota do agendamento;</LI>
        <LI>Histórico de agendamentos;</LI>
        <LI>Status dos agendamentos, como confirmado, cancelado ou concluído;</LI>
        <LI>Dados de navegação, dispositivo, navegador, endereço IP e registros técnicos de acesso;</LI>
        <LI>Preferências visuais ou interações realizadas dentro da página de agendamento.</LI>
      </UL>
      <P>O cliente final deve evitar inserir dados sensíveis no campo de observações do agendamento, salvo quando forem estritamente necessários para a prestação do serviço solicitado.</P>

      <SH>3.2. Dados de empresários e administradores</SH>
      <P>Quando um empresário ou administrador utiliza a Bisme para criar e gerenciar um site de agendamento, podemos tratar dados como:</P>
      <UL>
        <LI>Nome;</LI>
        <LI>E-mail;</LI>
        <LI>Telefone, quando informado;</LI>
        <LI>Dados de login e autenticação;</LI>
        <LI>Nome do negócio;</LI>
        <LI>Descrição do negócio;</LI>
        <LI>Área de atuação;</LI>
        <LI>Slug, link ou identificador público da página de agendamento;</LI>
        <LI>Serviços cadastrados;</LI>
        <LI>Preços, duração dos serviços e configurações relacionadas;</LI>
        <LI>Horários de funcionamento;</LI>
        <LI>Pausas, bloqueios de agenda e disponibilidade;</LI>
        <LI>Informações sobre profissionais e funcionários cadastrados;</LI>
        <LI>Fotos, imagens, logotipos, banners ou outros elementos visuais adicionados à página;</LI>
        <LI>Endereço ou localização do negócio, quando o próprio empresário optar por informar;</LI>
        <LI>Comodidades, redes sociais, informações institucionais e comerciais;</LI>
        <LI>Configurações de aparência, modelo visual, tema, cores e demais preferências do site de agendamento;</LI>
        <LI>Dados de uso do painel administrativo;</LI>
        <LI>Informações relacionadas a planos, assinatura, cobrança ou faturamento, quando aplicável.</LI>
      </UL>

      <SH>3.3. Dados de profissionais ou funcionários cadastrados</SH>
      <P>Quando o empresário cadastra profissionais ou funcionários na plataforma, podemos tratar dados como:</P>
      <UL>
        <LI>Nome do profissional;</LI>
        <LI>Função ou cargo;</LI>
        <LI>Serviços realizados;</LI>
        <LI>Horários de atendimento;</LI>
        <LI>Disponibilidade;</LI>
        <LI>Agendamentos vinculados ao profissional;</LI>
        <LI>Foto ou imagem de perfil, quando adicionada;</LI>
        <LI>Informações operacionais necessárias para organizar a agenda do negócio.</LI>
      </UL>
      <P>O empresário é responsável por garantir que possui autorização ou base legal adequada para cadastrar dados de profissionais, funcionários ou colaboradores na plataforma.</P>

      <SH>3.4. Dados técnicos e de navegação</SH>
      <P>Também podemos coletar automaticamente alguns dados técnicos quando você acessa ou utiliza a plataforma, como:</P>
      <UL>
        <LI>Endereço IP;</LI>
        <LI>Tipo de dispositivo;</LI>
        <LI>Sistema operacional;</LI>
        <LI>Navegador utilizado;</LI>
        <LI>Data e horário de acesso;</LI>
        <LI>Páginas acessadas;</LI>
        <LI>Eventos de uso;</LI>
        <LI>Identificadores de sessão;</LI>
        <LI>Dados de desempenho, erros, logs e segurança;</LI>
        <LI>Cookies e tecnologias semelhantes.</LI>
      </UL>
      <P>Esses dados são usados para manter a plataforma funcionando corretamente, melhorar a experiência do usuário, reforçar a segurança, prevenir fraudes, corrigir erros e aprimorar nossos serviços.</P>

      <H>4. Como usamos os dados pessoais</H>
      <P>A Bisme utiliza os dados pessoais para finalidades relacionadas ao funcionamento da plataforma e à prestação dos serviços oferecidos. Podemos usar os dados para:</P>
      <UL>
        <LI>Criar e manter contas de usuários;</LI>
        <LI>Permitir login e autenticação;</LI>
        <LI>Permitir login por Google, Facebook ou outros provedores externos, quando disponíveis;</LI>
        <LI>Criar, exibir e gerenciar páginas de agendamento;</LI>
        <LI>Permitir que clientes finais realizem agendamentos;</LI>
        <LI>Permitir que empresários gerenciem serviços, horários, profissionais e clientes;</LI>
        <LI>Exibir informações públicas configuradas pelo empresário na página de agendamento;</LI>
        <LI>Confirmar, organizar, cancelar ou consultar agendamentos;</LI>
        <LI>Permitir que o cliente final visualize seus próprios agendamentos;</LI>
        <LI>Permitir que o empresário visualize e gerencie agendamentos recebidos;</LI>
        <LI>Personalizar a experiência visual conforme o modelo de site escolhido;</LI>
        <LI>Salvar preferências, configurações e informações necessárias ao uso da plataforma;</LI>
        <LI>Processar solicitações de suporte;</LI>
        <LI>Responder dúvidas enviadas ao e-mail oficial de contato;</LI>
        <LI>Enviar comunicações importantes sobre conta, segurança, alterações de serviço ou funcionamento da plataforma;</LI>
        <LI>Monitorar estabilidade, desempenho e segurança;</LI>
        <LI>Prevenir acessos não autorizados, uso indevido, fraudes ou atividades suspeitas;</LI>
        <LI>Cumprir obrigações legais, regulatórias ou determinações de autoridades competentes;</LI>
        <LI>Proteger direitos da Bisme, dos usuários, dos empresários, dos clientes finais e de terceiros;</LI>
        <LI>Melhorar funcionalidades, corrigir falhas e desenvolver novos recursos.</LI>
      </UL>

      <H>5. Bases legais para o tratamento dos dados</H>
      <P>Tratamos dados pessoais de acordo com as bases legais previstas na legislação aplicável, especialmente a Lei Geral de Proteção de Dados Pessoais.</P>
      <P>Dependendo da situação, o tratamento poderá ocorrer com base em:</P>
      <UL>
        <LI>Execução de contrato ou procedimentos preliminares relacionados ao uso da plataforma;</LI>
        <LI>Consentimento do usuário, quando necessário;</LI>
        <LI>Cumprimento de obrigação legal ou regulatória;</LI>
        <LI>Legítimo interesse da Bisme, dos empresários ou de terceiros, sempre respeitando os direitos e liberdades dos titulares;</LI>
        <LI>Exercício regular de direitos em processos judiciais, administrativos ou arbitrais;</LI>
        <LI>Proteção do crédito, prevenção a fraudes e segurança da plataforma, quando aplicável.</LI>
      </UL>
      <P>Quando o tratamento depender de consentimento, o usuário poderá solicitar sua revogação, observadas as limitações legais e contratuais aplicáveis.</P>

      <H>6. Dados inseridos pelo cliente final nas páginas de agendamento</H>
      <P>Ao realizar um agendamento em uma página criada por um empresário dentro da Bisme, os dados do cliente final poderão ser acessados pelo respectivo empresário, administrador do negócio ou profissional autorizado, conforme necessário para a prestação do serviço.</P>
      <P>Isso pode incluir nome, telefone, e-mail, serviço escolhido, data, horário, observações do agendamento e demais informações necessárias para organizar o atendimento.</P>
      <P>A Bisme fornece a tecnologia para que o agendamento seja realizado e gerenciado, mas o empresário é responsável pelo uso adequado dos dados dos clientes finais dentro de seu negócio, inclusive pelo atendimento, prestação do serviço e eventuais contatos decorrentes do agendamento.</P>

      <H>7. Dados públicos nas páginas de agendamento</H>
      <P>Algumas informações configuradas pelo empresário poderão ficar públicas na página de agendamento, como:</P>
      <UL>
        <LI>Nome do negócio;</LI>
        <LI>Descrição do negócio;</LI>
        <LI>Serviços oferecidos;</LI>
        <LI>Preços;</LI>
        <LI>Duração dos serviços;</LI>
        <LI>Horários de funcionamento;</LI>
        <LI>Fotos, imagens ou logotipo;</LI>
        <LI>Informações sobre profissionais, quando exibidas;</LI>
        <LI>Comodidades;</LI>
        <LI>Redes sociais;</LI>
        <LI>Endereço ou localização, quando informados;</LI>
        <LI>Avaliações ou conteúdos públicos, quando disponíveis.</LI>
      </UL>
      <P>O empresário deve garantir que possui direito de uso sobre os conteúdos, imagens e informações publicados em sua página de agendamento.</P>

      <H>8. Compartilhamento de dados</H>
      <P>A Bisme não vende dados pessoais.</P>
      <P>Podemos compartilhar dados pessoais apenas quando necessário para o funcionamento da plataforma, cumprimento de obrigações legais, segurança ou prestação dos serviços. Esse compartilhamento pode ocorrer com:</P>
      <UL>
        <LI>Empresários ou administradores responsáveis pela página de agendamento utilizada pelo cliente final;</LI>
        <LI>Profissionais ou funcionários vinculados ao negócio, quando necessário para o atendimento;</LI>
        <LI>Prestadores de serviços de tecnologia, hospedagem, banco de dados, autenticação, armazenamento, segurança, análise de desempenho, suporte e infraestrutura;</LI>
        <LI>Provedores de login social, como Google ou Facebook, quando o usuário optar por esse tipo de autenticação;</LI>
        <LI>Serviços de pagamento, cobrança ou emissão de documentos, quando aplicável;</LI>
        <LI>Autoridades públicas, judiciais, administrativas ou regulatórias, quando houver obrigação legal ou ordem válida;</LI>
        <LI>Terceiros envolvidos em operações societárias, reorganizações, fusões, aquisições ou transferência de ativos, desde que respeitados os direitos dos titulares.</LI>
      </UL>
      <P>Sempre que possível, adotamos medidas para limitar o compartilhamento ao mínimo necessário para a finalidade correspondente.</P>

      <H>9. Login por Google, Facebook e outros provedores externos</H>
      <P>A Bisme poderá permitir que usuários realizem cadastro ou login por meio de contas externas, como Google ou Facebook.</P>
      <P>Quando o usuário escolhe esse tipo de acesso, o provedor externo pode compartilhar conosco informações básicas necessárias para autenticação, como nome, e-mail, identificador da conta e imagem de perfil, conforme as permissões concedidas pelo próprio usuário.</P>
      <P>O uso desses provedores também está sujeito às políticas de privacidade e termos próprios de cada plataforma externa. A Bisme não controla as práticas de privacidade desses terceiros.</P>

      <H>10. Cookies e tecnologias semelhantes</H>
      <P>Podemos utilizar cookies, armazenamento local e tecnologias semelhantes para:</P>
      <UL>
        <LI>Manter o usuário conectado;</LI>
        <LI>Preservar sessões de navegação;</LI>
        <LI>Lembrar preferências;</LI>
        <LI>Melhorar a experiência de uso;</LI>
        <LI>Medir desempenho;</LI>
        <LI>Identificar erros;</LI>
        <LI>Reforçar a segurança;</LI>
        <LI>Entender como a plataforma é utilizada;</LI>
        <LI>Prevenir fraudes ou acessos indevidos.</LI>
      </UL>
      <P>O usuário pode configurar seu navegador para bloquear ou excluir cookies. No entanto, algumas funcionalidades da plataforma podem não funcionar corretamente caso determinados cookies ou recursos técnicos sejam desativados.</P>

      <H>11. Armazenamento e segurança dos dados</H>
      <P>A Bisme adota medidas técnicas e organizacionais para proteger os dados pessoais contra acessos não autorizados, perda, alteração, divulgação indevida ou uso inadequado.</P>
      <P>Essas medidas podem incluir controles de acesso, autenticação, armazenamento seguro, monitoramento técnico, restrição de permissões, logs de segurança, boas práticas de desenvolvimento e uso de provedores de infraestrutura confiáveis.</P>
      <P>Apesar dos esforços de segurança, nenhum sistema digital é absolutamente imune a riscos. Por isso, o usuário também deve adotar cuidados, como manter sua senha em sigilo, não compartilhar credenciais, usar dispositivos seguros e informar a Bisme caso identifique qualquer uso indevido de sua conta.</P>

      <H>12. Senhas e credenciais de acesso</H>
      <P>As senhas e credenciais de acesso devem ser mantidas em sigilo pelo usuário.</P>
      <P>A Bisme nunca solicitará a senha do usuário por e-mail. Caso o usuário receba mensagens suspeitas em nome da Bisme, deve evitar clicar em links desconhecidos e entrar em contato pelo e-mail oficial:</P>
      <P><A href="mailto:atendimento@bisme.com.br">atendimento@bisme.com.br</A></P>

      <H>13. Retenção dos dados</H>
      <P>Manteremos os dados pessoais pelo tempo necessário para cumprir as finalidades descritas nesta Política, permitir o uso da plataforma, cumprir obrigações legais ou regulatórias, resolver disputas, preservar direitos, prevenir fraudes e manter registros de segurança.</P>
      <P>Os dados poderão ser mantidos enquanto a conta estiver ativa ou enquanto forem necessários para a prestação dos serviços.</P>
      <P>Após o encerramento da conta ou solicitação de exclusão, os dados poderão ser excluídos, anonimizados ou mantidos quando houver base legal para retenção, como cumprimento de obrigação legal, exercício regular de direitos, prevenção a fraudes ou necessidade de preservação de registros.</P>

      <H>14. Exclusão de conta e dados pessoais</H>
      <P>O usuário poderá solicitar a exclusão de sua conta ou de seus dados pessoais, quando aplicável, por meio do e-mail:</P>
      <P><A href="mailto:atendimento@bisme.com.br">atendimento@bisme.com.br</A></P>
      <P>A solicitação será analisada conforme a legislação aplicável, as obrigações legais da Bisme, a necessidade de preservação de registros e os direitos de terceiros.</P>
      <P>Em alguns casos, a exclusão de determinados dados pode impedir o funcionamento da conta, o acesso a agendamentos ou o uso de recursos da plataforma.</P>

      <H>15. Direitos dos titulares de dados</H>
      <P>Nos termos da legislação aplicável, o titular dos dados pessoais pode solicitar:</P>
      <UL>
        <LI>Confirmação da existência de tratamento de dados pessoais;</LI>
        <LI>Acesso aos dados pessoais tratados;</LI>
        <LI>Correção de dados incompletos, inexatos ou desatualizados;</LI>
        <LI>Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a lei;</LI>
        <LI>Portabilidade dos dados, quando aplicável;</LI>
        <LI>Informações sobre compartilhamento de dados;</LI>
        <LI>Informações sobre a possibilidade de não fornecer consentimento e suas consequências;</LI>
        <LI>Revogação do consentimento, quando o tratamento for baseado em consentimento;</LI>
        <LI>Eliminação dos dados tratados com base no consentimento, observadas as hipóteses legais de retenção;</LI>
        <LI>Revisão de decisões tomadas unicamente com base em tratamento automatizado de dados pessoais, quando aplicável;</LI>
        <LI>Oposição ao tratamento realizado com fundamento em uma das hipóteses de dispensa de consentimento, quando houver descumprimento da lei.</LI>
      </UL>
      <P>Para exercer seus direitos, o titular deve entrar em contato pelo e-mail:</P>
      <P><A href="mailto:atendimento@bisme.com.br">atendimento@bisme.com.br</A></P>
      <P>Poderemos solicitar informações adicionais para confirmar a identidade do solicitante e garantir que os dados sejam fornecidos apenas ao titular ou a pessoa legalmente autorizada.</P>

      <H>16. Dados de menores de idade</H>
      <P>A Bisme não é direcionada especificamente a menores de idade.</P>
      <P>Caso um menor de idade utilize a plataforma, o uso deverá ocorrer com ciência e autorização dos pais ou responsáveis legais, especialmente quando houver criação de conta, realização de agendamento ou fornecimento de dados pessoais.</P>
      <P>Se identificarmos tratamento inadequado de dados de menores, poderemos adotar medidas para restringir, excluir ou regularizar as informações, conforme a legislação aplicável.</P>

      <H>17. Dados sensíveis</H>
      <P>A Bisme não solicita, como regra, dados pessoais sensíveis para criação de conta ou realização de agendamentos comuns.</P>
      <P>No entanto, o usuário pode inserir voluntariamente informações em campos livres, como observações do agendamento. Recomendamos que o usuário não informe dados sensíveis nesses campos, salvo se forem realmente necessários para a prestação do serviço solicitado.</P>
      <P>Quando dados sensíveis forem inseridos voluntariamente pelo usuário, eles poderão ser tratados apenas na medida necessária para viabilizar o agendamento, o atendimento solicitado, o cumprimento de obrigações legais ou outras hipóteses permitidas pela legislação aplicável.</P>

      <H>18. Comunicações da Bisme</H>
      <P>A Bisme poderá enviar comunicações relacionadas à conta, segurança, funcionamento da plataforma, alterações importantes, suporte, notificações operacionais e informações necessárias ao uso dos serviços.</P>
      <P>Quando houver comunicações promocionais ou de marketing, o usuário poderá solicitar o cancelamento do recebimento, quando aplicável.</P>
      <P>Comunicações importantes sobre segurança, conta, alterações legais ou funcionamento essencial da plataforma poderão continuar sendo enviadas mesmo que o usuário opte por não receber mensagens promocionais.</P>

      <H>19. Integrações e serviços de terceiros</H>
      <P>A plataforma pode utilizar serviços de terceiros para hospedagem, banco de dados, autenticação, armazenamento de arquivos, envio de e-mails, análise técnica, segurança, pagamentos ou outras funcionalidades necessárias ao funcionamento da Bisme.</P>
      <P>Esses terceiros podem tratar dados pessoais de acordo com as instruções da Bisme e/ou conforme suas próprias políticas, quando atuarem de forma independente.</P>
      <P>A Bisme busca utilizar fornecedores compatíveis com boas práticas de segurança e proteção de dados.</P>

      <H>20. Links externos</H>
      <P>As páginas criadas na Bisme podem conter links para redes sociais, sites externos, mapas, páginas institucionais ou outros canais configurados pelo empresário.</P>
      <P>A Bisme não é responsável pelas práticas de privacidade, conteúdo, segurança ou funcionamento de sites e serviços externos. Recomendamos que o usuário leia as políticas de privacidade de terceiros antes de fornecer dados fora da plataforma Bisme.</P>

      <H>21. Responsabilidades dos empresários que usam a Bisme</H>
      <P>O empresário que utiliza a Bisme para criar uma página de agendamento deve tratar os dados dos clientes finais de forma adequada, segura e compatível com a legislação aplicável.</P>
      <P>Cabe ao empresário:</P>
      <UL>
        <LI>Informar corretamente os dados de seu negócio;</LI>
        <LI>Usar os dados dos clientes apenas para finalidades legítimas relacionadas ao atendimento, agendamento, relacionamento comercial ou obrigações legais;</LI>
        <LI>Evitar compartilhar dados de clientes com pessoas não autorizadas;</LI>
        <LI>Manter confidencialidade sobre informações acessadas pelo painel;</LI>
        <LI>Cadastrar apenas profissionais, funcionários e informações que esteja autorizado a utilizar;</LI>
        <LI>Manter atualizadas as informações exibidas na página de agendamento;</LI>
        <LI>Responder adequadamente aos clientes finais quando utilizar os dados acessados por meio da plataforma.</LI>
      </UL>
      <P>A Bisme poderá adotar medidas em caso de uso indevido da plataforma ou violação desta Política, dos Termos de Uso ou da legislação aplicável.</P>

      <H>22. Transferência internacional de dados</H>
      <P>Dependendo dos fornecedores de tecnologia utilizados, alguns dados pessoais poderão ser armazenados ou processados fora do Brasil.</P>
      <P>Quando isso ocorrer, a Bisme buscará adotar medidas compatíveis com a legislação aplicável para proteger os dados pessoais e garantir nível adequado de segurança.</P>

      <H>23. Incidentes de segurança</H>
      <P>Em caso de incidente de segurança que possa gerar risco ou dano relevante aos titulares de dados pessoais, a Bisme adotará as medidas cabíveis para avaliar o ocorrido, reduzir impactos, corrigir falhas e realizar comunicações necessárias, quando exigido pela legislação aplicável.</P>
      <P>Usuários que suspeitarem de uso indevido de conta, acesso não autorizado ou falha de segurança devem entrar em contato pelo e-mail:</P>
      <P><A href="mailto:atendimento@bisme.com.br">atendimento@bisme.com.br</A></P>

      <H>24. Atualizações desta Política de Privacidade</H>
      <P>Esta Política de Privacidade poderá ser atualizada a qualquer momento para refletir alterações na plataforma, mudanças legais, ajustes operacionais ou melhorias nos serviços.</P>
      <P>Quando houver alterações relevantes, poderemos comunicar os usuários por meios razoáveis, como aviso na plataforma, e-mail ou atualização da data no início desta Política.</P>
      <P>Recomendamos que o usuário revise esta Política periodicamente.</P>

      <H>25. Canal de contato</H>
      <P>Para dúvidas, solicitações, reclamações ou exercício de direitos relacionados à privacidade e proteção de dados pessoais, entre em contato com a Bisme pelo e-mail:</P>
      <P><A href="mailto:atendimento@bisme.com.br">atendimento@bisme.com.br</A></P>
      <P>A Bisme não possui endereço físico fixo para atendimento ao público e não realiza atendimento oficial por WhatsApp.</P>

      <H>26. Disposições finais</H>
      <P>Ao utilizar a Bisme, o usuário reconhece que leu e compreendeu esta Política de Privacidade.</P>
      <P>Caso não concorde com esta Política, o usuário deve interromper o uso da plataforma.</P>
      <P>Esta Política deve ser interpretada em conjunto com os Termos de Uso da Bisme e demais documentos aplicáveis à utilização da plataforma.</P>
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