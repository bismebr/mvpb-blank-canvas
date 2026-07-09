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
        Termos de Uso da Bisme
      </h3>
      <P>Estes Termos de Uso regulam o acesso e a utilização da plataforma Bisme, incluindo o site, as páginas de agendamento, os painéis administrativos, as telas de login e cadastro, os recursos de criação de sites de agendamento, gestão de serviços, horários, profissionais, clientes, agendamentos e demais funcionalidades oferecidas pela Bisme.</P>
      <P>Ao acessar, criar uma conta ou utilizar qualquer funcionalidade da Bisme, você declara que leu, compreendeu e concorda com estes Termos de Uso e com a Política de Privacidade da Bisme.</P>
      <P>Caso você não concorde com estes Termos, não utilize a plataforma.</P>

      <H>1. Sobre a Bisme</H>
      <P>A Bisme é uma plataforma digital que permite que empresários, prestadores de serviços e negócios criem páginas próprias de agendamento online, cadastrem serviços, configurem horários, adicionem profissionais, recebam reservas/agendamentos e gerenciem sua operação por meio de ferramentas digitais.</P>
      <P>A Bisme também permite que clientes finais acessem páginas de agendamento, criem contas, façam login, escolham serviços, selecionem horários disponíveis, realizem agendamentos, consultem seus próprios agendamentos e atualizem informações de perfil.</P>
      <P>A Bisme fornece a tecnologia para facilitar a conexão entre negócios e clientes finais, mas não é responsável pela execução direta dos serviços oferecidos pelos empresários dentro da plataforma.</P>
      <P>O contato oficial da Bisme é feito exclusivamente pelo e-mail:</P>
      <P><A href="mailto:atendimento@bisme.com.br">atendimento@bisme.com.br</A></P>
      <P>A Bisme não possui endereço físico fixo para atendimento ao público e não realiza atendimento oficial por WhatsApp.</P>

      <H>2. Definições</H>
      <P>Para facilitar a leitura destes Termos, usamos as seguintes definições:</P>
      <P>“Bisme”, “plataforma”, “nós” ou “nossos serviços” significa a plataforma digital Bisme e todos os recursos relacionados.</P>
      <P>“Usuário” significa qualquer pessoa que acesse ou utilize a Bisme, incluindo clientes finais, empresários, administradores, profissionais cadastrados ou visitantes.</P>
      <P>“Cliente final” é a pessoa que utiliza uma página de agendamento criada na Bisme para visualizar serviços, criar conta, fazer login, realizar agendamentos ou consultar seus próprios agendamentos.</P>
      <P>“Empresário” ou “cliente empresarial” é o usuário que utiliza a Bisme para criar, configurar e administrar uma página de agendamento, cadastrar serviços, horários, profissionais, informações comerciais e demais conteúdos do seu negócio.</P>
      <P>“Profissional” ou “funcionário” é a pessoa cadastrada pelo empresário para realizar serviços, aparecer em agendas, receber agendamentos ou compor a operação do negócio.</P>
      <P>“Página de agendamento” é a página pública ou compartilhável criada por um empresário dentro da Bisme para apresentar seu negócio, serviços, horários, profissionais e permitir reservas/agendamentos.</P>
      <P>“Conteúdo do usuário” significa qualquer informação, texto, imagem, foto, logotipo, descrição, serviço, preço, horário, avaliação, observação, link, dado comercial ou material inserido, publicado ou enviado por um usuário dentro da Bisme.</P>

      <H>3. Aceitação dos Termos</H>
      <P>Ao utilizar a Bisme, você concorda em cumprir estes Termos de Uso, a Política de Privacidade e demais regras, avisos ou instruções exibidos dentro da plataforma.</P>
      <P>Se você estiver utilizando a Bisme em nome de uma empresa, negócio, salão, barbearia, clínica, estúdio, equipe, marca ou qualquer outra organização, você declara que possui autorização para aceitar estes Termos em nome desse negócio.</P>
      <P>Você também declara que as informações fornecidas à Bisme são verdadeiras, atualizadas e completas.</P>

      <H>4. Quem pode usar a Bisme</H>
      <P>A Bisme pode ser utilizada por pessoas capazes de praticar atos da vida civil, conforme a legislação aplicável.</P>
      <P>Caso o usuário seja menor de idade, o uso da plataforma deve ocorrer com autorização e supervisão dos pais ou responsáveis legais.</P>
      <P>O empresário que cria uma página de agendamento declara que possui autorização para divulgar o negócio, cadastrar profissionais, oferecer serviços, publicar imagens, definir preços, disponibilizar horários e receber agendamentos por meio da plataforma.</P>

      <H>5. Conta de usuário</H>
      <P>Para acessar determinadas funcionalidades, pode ser necessário criar uma conta ou fazer login.</P>
      <P>O usuário é responsável por:</P>
      <UL>
        <LI>Fornecer informações verdadeiras e atualizadas;</LI>
        <LI>Manter a confidencialidade de suas credenciais de acesso;</LI>
        <LI>Não compartilhar senha ou acesso com terceiros não autorizados;</LI>
        <LI>Comunicar a Bisme caso identifique uso indevido ou acesso não autorizado;</LI>
        <LI>Utilizar a conta de forma responsável e de acordo com estes Termos.</LI>
      </UL>
      <P>A Bisme poderá restringir, suspender ou encerrar contas que apresentem indícios de uso indevido, fraude, violação destes Termos, risco à segurança da plataforma ou descumprimento da legislação aplicável.</P>

      <H>6. Login por terceiros</H>
      <P>A Bisme poderá permitir login ou cadastro por meio de provedores externos, como Google, Facebook ou outros serviços semelhantes.</P>
      <P>Ao escolher esse tipo de acesso, o usuário entende que também poderá estar sujeito aos termos e políticas desses terceiros.</P>
      <P>A Bisme não controla as práticas, políticas, disponibilidade ou funcionamento de plataformas externas de autenticação.</P>

      <H>7. Uso permitido da plataforma</H>
      <P>O usuário deve utilizar a Bisme de forma ética, responsável, legal e compatível com a finalidade da plataforma.</P>
      <P>O empresário pode usar a Bisme para:</P>
      <UL>
        <LI>Criar uma página de agendamento para seu negócio;</LI>
        <LI>Cadastrar serviços;</LI>
        <LI>Informar preços, duração e descrições;</LI>
        <LI>Configurar horários de funcionamento;</LI>
        <LI>Adicionar profissionais ou funcionários;</LI>
        <LI>Gerenciar disponibilidade;</LI>
        <LI>Receber agendamentos;</LI>
        <LI>Visualizar clientes agendados;</LI>
        <LI>Organizar sua agenda;</LI>
        <LI>Personalizar visualmente sua página;</LI>
        <LI>Divulgar seu link de agendamento;</LI>
        <LI>Apresentar informações legítimas sobre seu negócio.</LI>
      </UL>
      <P>O cliente final pode usar a Bisme para:</P>
      <UL>
        <LI>Acessar páginas de agendamento;</LI>
        <LI>Criar conta;</LI>
        <LI>Fazer login;</LI>
        <LI>Visualizar serviços;</LI>
        <LI>Selecionar datas e horários disponíveis;</LI>
        <LI>Realizar agendamentos;</LI>
        <LI>Consultar seus próprios agendamentos;</LI>
        <LI>Atualizar informações de perfil;</LI>
        <LI>Entrar em contato com o negócio pelos canais informados pelo próprio empresário, quando disponíveis.</LI>
      </UL>

      <H>8. Regras de boa convivência e bom senso</H>
      <P>A Bisme busca oferecer um ambiente seguro, profissional e confiável para empresários e clientes finais.</P>
      <P>Ao utilizar a plataforma, o usuário concorda em agir com bom senso, respeito, honestidade e responsabilidade.</P>
      <P>Não é permitido utilizar a Bisme para prejudicar outras pessoas, enganar clientes, publicar conteúdo abusivo, divulgar informações falsas, violar direitos de terceiros ou usar a plataforma para finalidades incompatíveis com um ambiente profissional de agendamento.</P>
      <P>A Bisme poderá avaliar conteúdos, páginas, contas ou comportamentos que contrariem essas regras e tomar medidas proporcionais, incluindo aviso, remoção de conteúdo, limitação de recursos, suspensão ou encerramento de conta.</P>

      <H>9. Conteúdos proibidos</H>
      <P>A Bisme não permite o uso da plataforma para publicar, divulgar, vender, reservar, promover ou facilitar conteúdos, serviços ou materiais ilegais, abusivos, enganosos ou incompatíveis com a finalidade da plataforma.</P>
      <P>É expressamente proibido ao empresário ou a qualquer usuário publicar, enviar, cadastrar, divulgar ou utilizar na Bisme:</P>
      <UL>
        <LI>Conteúdo sexual explícito, pornografia, nudez explícita ou fotos pornográficas para fins de reserva, divulgação, venda, promoção ou agendamento;</LI>
        <LI>Imagens, textos ou materiais que explorem sexualmente qualquer pessoa;</LI>
        <LI>Qualquer conteúdo sexual envolvendo menores de idade, ainda que simulado, ilustrado ou sugerido;</LI>
        <LI>Conteúdo que incentive violência, abuso, exploração, assédio ou humilhação;</LI>
        <LI>Conteúdo discriminatório, ofensivo, ameaçador, difamatório ou de ódio;</LI>
        <LI>Conteúdo que viole direitos autorais, marcas, imagem, privacidade ou outros direitos de terceiros;</LI>
        <LI>Informações falsas, enganosas ou fraudulentas sobre serviços, preços, profissionais, horários ou condições de atendimento;</LI>
        <LI>Golpes, fraudes, esquemas financeiros, promessas enganosas ou práticas abusivas;</LI>
        <LI>Venda ou promoção de produtos ou serviços ilegais;</LI>
        <LI>Uso da plataforma para atividades criminosas ou contrárias à legislação;</LI>
        <LI>Links maliciosos, arquivos infectados, spam, automações abusivas ou tentativas de comprometer a segurança da plataforma;</LI>
        <LI>Conteúdo que exponha dados pessoais de terceiros sem autorização;</LI>
        <LI>Qualquer uso que possa prejudicar a Bisme, seus usuários, clientes finais, empresários, profissionais, parceiros ou terceiros.</LI>
      </UL>
      <P>A regra sobre conteúdo sexual explícito e pornografia é uma regra central da Bisme. A plataforma não deve ser usada para divulgar fotos explícitas de pornografia, criar páginas de reserva com esse tipo de material ou promover serviços associados a conteúdo pornográfico explícito.</P>
      <P>A Bisme poderá remover, limitar ou bloquear conteúdos que, a seu critério razoável, violem estes Termos, apresentem risco à plataforma ou contrariem o bom senso esperado para um ambiente profissional de agendamento.</P>

      <H>10. Conteúdo do empresário</H>
      <P>O empresário é responsável por todo conteúdo que cadastrar, publicar ou disponibilizar em sua página de agendamento.</P>
      <P>Isso inclui, entre outros:</P>
      <UL>
        <LI>Nome do negócio;</LI>
        <LI>Descrição;</LI>
        <LI>Fotos;</LI>
        <LI>Logotipo;</LI>
        <LI>Imagens de capa;</LI>
        <LI>Serviços;</LI>
        <LI>Preços;</LI>
        <LI>Duração dos serviços;</LI>
        <LI>Horários;</LI>
        <LI>Profissionais;</LI>
        <LI>Comodidades;</LI>
        <LI>Redes sociais;</LI>
        <LI>Informações comerciais;</LI>
        <LI>Endereço ou localização, quando informado;</LI>
        <LI>Links externos;</LI>
        <LI>Qualquer outro conteúdo exibido na página.</LI>
      </UL>
      <P>O empresário declara que possui todos os direitos, autorizações e permissões necessárias para publicar esses conteúdos.</P>
      <P>O empresário também se compromete a manter as informações corretas e atualizadas, principalmente informações de preço, horário, serviço, disponibilidade e condições de atendimento.</P>
      <P>A Bisme não é obrigada a revisar previamente todo conteúdo publicado pelos empresários, mas poderá remover ou restringir conteúdos que violem estes Termos, a legislação ou direitos de terceiros.</P>

      <H>11. Responsabilidade sobre serviços oferecidos</H>
      <P>A Bisme fornece uma ferramenta tecnológica para criação de páginas de agendamento e gestão de reservas.</P>
      <P>Os serviços oferecidos nas páginas de agendamento são de responsabilidade do respectivo empresário, negócio ou profissional.</P>
      <P>A Bisme não executa diretamente os serviços anunciados pelos empresários e não se responsabiliza por:</P>
      <UL>
        <LI>Qualidade do serviço prestado pelo empresário;</LI>
        <LI>Comparecimento ou ausência do empresário, profissional ou cliente final;</LI>
        <LI>Cancelamentos realizados pelo negócio;</LI>
        <LI>Atrasos;</LI>
        <LI>Alterações de preço feitas pelo empresário;</LI>
        <LI>Informações incorretas publicadas pelo empresário;</LI>
        <LI>Atendimento prestado fora da plataforma;</LI>
        <LI>Promessas, garantias ou condições comerciais oferecidas pelo empresário;</LI>
        <LI>Relação direta entre cliente final e negócio.</LI>
      </UL>
      <P>O cliente final deve verificar as informações do serviço antes de concluir um agendamento.</P>
      <P>O empresário é responsável por cumprir as condições que divulgar em sua página de agendamento.</P>

      <H>12. Agendamentos</H>
      <P>A Bisme permite que clientes finais solicitem ou realizem agendamentos conforme a disponibilidade configurada pelo empresário.</P>
      <P>O agendamento pode incluir informações como serviço escolhido, data, horário, profissional, observações e dados de contato do cliente.</P>
      <P>O empresário é responsável por manter sua agenda atualizada e por honrar os horários disponibilizados, salvo em casos de imprevistos, cancelamentos ou ajustes necessários.</P>
      <P>A Bisme poderá exibir status de agendamento, como confirmado, cancelado, concluído ou outros estados definidos pela plataforma.</P>
      <P>A existência de um agendamento dentro da Bisme não garante, por si só, a prestação do serviço caso o empresário cancele, altere ou não realize o atendimento. Nesses casos, a responsabilidade pela relação de atendimento é do respectivo empresário.</P>

      <H>13. Cancelamentos, atrasos e alterações</H>
      <P>As regras de cancelamento, atraso, remarcação, tolerância e não comparecimento podem variar conforme cada negócio.</P>
      <P>Quando o empresário informar regras específicas em sua página, o cliente final deverá observá-las.</P>
      <P>Na ausência de regras específicas, o cliente final e o empresário devem agir com bom senso, respeito e comunicação adequada.</P>
      <P>A Bisme poderá futuramente disponibilizar recursos para facilitar cancelamentos, remarcações ou avisos, mas não assume responsabilidade direta pelas decisões comerciais de cada empresário.</P>

      <H>14. Planos, pagamentos e cobranças</H>
      <P>A Bisme poderá oferecer planos gratuitos, pagos, testes gratuitos, recursos premium, assinaturas ou funcionalidades adicionais.</P>
      <P>As condições de preço, cobrança, renovação, cancelamento, período de teste e recursos incluídos serão informadas na própria plataforma ou em páginas específicas, quando aplicável.</P>
      <P>Ao contratar um plano pago, o empresário concorda em pagar os valores informados no momento da contratação.</P>
      <P>A ausência de pagamento, falha na cobrança ou violação destes Termos poderá resultar na limitação, suspensão ou encerramento do acesso a recursos pagos.</P>
      <P>A Bisme poderá alterar preços, planos e funcionalidades, respeitando comunicações e regras aplicáveis.</P>

      <H>15. Conteúdo público e visibilidade</H>
      <P>Algumas informações cadastradas pelo empresário podem ficar visíveis publicamente na página de agendamento.</P>
      <P>O empresário entende que, ao publicar informações na página, elas poderão ser acessadas por clientes finais, visitantes e outras pessoas que tenham acesso ao link.</P>
      <P>O empresário deve evitar publicar informações privadas, sensíveis, confidenciais ou que não deseja tornar públicas.</P>
      <P>A Bisme poderá disponibilizar opções de personalização e visibilidade, mas é responsabilidade do empresário revisar o que está sendo exibido em sua página.</P>

      <H>16. Fotos, imagens e direitos de imagem</H>
      <P>Ao enviar fotos, imagens, logotipos ou qualquer material visual para a Bisme, o usuário declara que:</P>
      <UL>
        <LI>Possui direito de uso sobre o material;</LI>
        <LI>Não está violando direitos autorais, marcas, imagem ou privacidade de terceiros;</LI>
        <LI>Possui autorização das pessoas retratadas, quando necessário;</LI>
        <LI>Não está publicando conteúdo proibido por estes Termos;</LI>
        <LI>Assume responsabilidade pelo conteúdo enviado.</LI>
      </UL>
      <P>A Bisme poderá remover imagens que violem estes Termos ou que sejam denunciadas por violação de direitos.</P>

      <H>17. Licença de uso do conteúdo enviado</H>
      <P>Ao publicar ou enviar conteúdo para a Bisme, o usuário concede à plataforma uma licença limitada, não exclusiva, gratuita e necessária para hospedar, armazenar, reproduzir, exibir, adaptar tecnicamente e disponibilizar esse conteúdo dentro da plataforma.</P>
      <P>Essa licença existe apenas para permitir o funcionamento da Bisme, como exibir a página de agendamento, mostrar fotos, apresentar serviços, organizar informações e disponibilizar o conteúdo aos clientes finais.</P>
      <P>O usuário continua sendo responsável e titular dos direitos que possuir sobre seu próprio conteúdo.</P>

      <H>18. Moderação da plataforma</H>
      <P>A Bisme poderá, mas não é obrigada a, analisar conteúdos, páginas, contas, denúncias ou comportamentos de usuários.</P>
      <P>A moderação poderá ocorrer quando houver:</P>
      <UL>
        <LI>Denúncia de usuário;</LI>
        <LI>Suspeita de violação destes Termos;</LI>
        <LI>Risco à segurança da plataforma;</LI>
        <LI>Conteúdo proibido;</LI>
        <LI>Uso fraudulento;</LI>
        <LI>Violação de direitos de terceiros;</LI>
        <LI>Determinação legal ou de autoridade competente;</LI>
        <LI>Conduta incompatível com a proposta da Bisme.</LI>
      </UL>
      <P>Medidas de moderação podem incluir:</P>
      <UL>
        <LI>Aviso ao usuário;</LI>
        <LI>Solicitação de ajuste;</LI>
        <LI>Remoção de conteúdo;</LI>
        <LI>Restrição de visibilidade;</LI>
        <LI>Bloqueio temporário de recursos;</LI>
        <LI>Suspensão da conta;</LI>
        <LI>Encerramento da conta;</LI>
        <LI>Preservação de registros quando necessário;</LI>
        <LI>Comunicação a autoridades competentes, quando exigido ou permitido por lei.</LI>
      </UL>

      <H>19. Denúncias</H>
      <P>Usuários, clientes finais, empresários ou terceiros podem comunicar à Bisme conteúdos, páginas ou comportamentos que violem estes Termos.</P>
      <P>As denúncias devem ser enviadas para:</P>
      <P><A href="mailto:atendimento@bisme.com.br">atendimento@bisme.com.br</A></P>
      <P>A denúncia deve conter, sempre que possível:</P>
      <UL>
        <LI>Link da página ou conteúdo;</LI>
        <LI>Descrição do problema;</LI>
        <LI>Prints ou evidências;</LI>
        <LI>Nome do negócio ou usuário envolvido;</LI>
        <LI>Motivo da denúncia;</LI>
        <LI>Dados de contato do denunciante, quando aplicável.</LI>
      </UL>
      <P>A Bisme poderá analisar a denúncia e tomar as medidas que entender adequadas conforme a gravidade do caso, as evidências disponíveis e a legislação aplicável.</P>

      <H>20. Suspensão e encerramento de contas</H>
      <P>A Bisme poderá suspender, limitar ou encerrar o acesso de usuários que:</P>
      <UL>
        <LI>Violem estes Termos;</LI>
        <LI>Publiquem conteúdo proibido;</LI>
        <LI>Utilizem a plataforma para fins ilegais;</LI>
        <LI>Pratiquem fraude;</LI>
        <LI>Tentem comprometer a segurança da Bisme;</LI>
        <LI>Desrespeitem outros usuários;</LI>
        <LI>Causem prejuízo à plataforma ou a terceiros;</LI>
        <LI>Forneçam informações falsas;</LI>
        <LI>Utilizem a plataforma de forma abusiva;</LI>
        <LI>Descumpram obrigações de pagamento, quando aplicável.</LI>
      </UL>
      <P>A suspensão ou encerramento poderá ocorrer com ou sem aviso prévio, dependendo da gravidade da situação.</P>
      <P>Em casos graves, como conteúdo pornográfico explícito, exploração sexual, fraude, ameaça à segurança ou atividade ilegal, a Bisme poderá agir imediatamente.</P>

      <H>21. Segurança da plataforma</H>
      <P>O usuário não deve tentar acessar áreas restritas, contornar proteções, explorar falhas, realizar engenharia reversa, interferir no funcionamento da plataforma ou usar métodos automatizados abusivos.</P>
      <P>É proibido:</P>
      <UL>
        <LI>Invadir contas;</LI>
        <LI>Testar vulnerabilidades sem autorização;</LI>
        <LI>Usar bots, scripts ou automações abusivas;</LI>
        <LI>Copiar dados da plataforma em massa;</LI>
        <LI>Interferir em servidores, banco de dados ou infraestrutura;</LI>
        <LI>Tentar obter dados de outros usuários sem permissão;</LI>
        <LI>Inserir vírus, malware ou código malicioso;</LI>
        <LI>Utilizar a Bisme de forma que prejudique a estabilidade do serviço.</LI>
      </UL>
      <P>A Bisme poderá adotar medidas técnicas e jurídicas para proteger sua plataforma e seus usuários.</P>

      <H>22. Privacidade e proteção de dados</H>
      <P>O tratamento de dados pessoais realizado pela Bisme está descrito na Política de Privacidade.</P>
      <P>Ao utilizar a plataforma, o usuário também concorda com a Política de Privacidade da Bisme.</P>
      <P>O empresário reconhece que poderá acessar dados de clientes finais relacionados aos agendamentos recebidos e se compromete a tratar essas informações com responsabilidade, segurança, confidencialidade e de acordo com a legislação aplicável.</P>
      <P>O empresário não deve usar dados de clientes finais para finalidades abusivas, ilegais, invasivas ou incompatíveis com o contexto do agendamento.</P>

      <H>23. Comunicações</H>
      <P>A Bisme poderá enviar comunicações relacionadas à conta, segurança, alterações nos Termos, suporte, funcionamento da plataforma, cobranças, planos, atualizações ou informações operacionais importantes.</P>
      <P>As comunicações poderão ocorrer por e-mail, avisos dentro da plataforma ou outros meios disponibilizados oficialmente.</P>
      <P>O canal oficial de contato da Bisme é:</P>
      <P><A href="mailto:atendimento@bisme.com.br">atendimento@bisme.com.br</A></P>
      <P>A Bisme não realiza atendimento oficial por WhatsApp.</P>

      <H>24. Propriedade intelectual da Bisme</H>
      <P>A Bisme, incluindo seu nome, marca, identidade visual, interface, estrutura, código, design, textos, recursos, funcionalidades, componentes, banco de dados, fluxos, elementos visuais e demais materiais próprios, pertence à Bisme ou a seus respectivos licenciadores.</P>
      <P>O usuário não recebe qualquer direito de propriedade sobre a plataforma ao utilizá-la.</P>
      <P>É proibido copiar, reproduzir, modificar, vender, sublicenciar, distribuir, explorar comercialmente ou criar produtos derivados da Bisme sem autorização prévia.</P>
      <P>O usuário recebe apenas uma licença limitada, revogável, não exclusiva e intransferível para utilizar a plataforma conforme estes Termos.</P>

      <H>25. Disponibilidade da plataforma</H>
      <P>A Bisme busca manter a plataforma disponível, estável e segura, mas não garante funcionamento ininterrupto, livre de erros ou disponível em todos os momentos.</P>
      <P>A plataforma poderá ficar temporariamente indisponível por:</P>
      <UL>
        <LI>Manutenção;</LI>
        <LI>Atualizações;</LI>
        <LI>Falhas técnicas;</LI>
        <LI>Problemas de infraestrutura;</LI>
        <LI>Ataques externos;</LI>
        <LI>Casos fortuitos ou força maior;</LI>
        <LI>Problemas em serviços de terceiros;</LI>
        <LI>Necessidade de segurança;</LI>
        <LI>Outros fatores fora do controle razoável da Bisme.</LI>
      </UL>
      <P>A Bisme poderá modificar, suspender ou descontinuar funcionalidades, desde que isso não viole obrigações legais ou contratuais aplicáveis.</P>

      <H>26. Serviços e links de terceiros</H>
      <P>A Bisme pode integrar ou permitir acesso a serviços de terceiros, como provedores de autenticação, hospedagem, armazenamento, pagamentos, mapas, redes sociais, ferramentas de análise ou links externos adicionados pelos empresários.</P>
      <P>A Bisme não é responsável pelo conteúdo, funcionamento, segurança, disponibilidade ou políticas desses terceiros.</P>
      <P>O uso de serviços externos pode estar sujeito aos termos e políticas próprios de cada fornecedor.</P>

      <H>27. Responsabilidade do usuário</H>
      <P>O usuário é responsável por sua conduta dentro da Bisme e por todo conteúdo que inserir, publicar, enviar ou disponibilizar.</P>
      <P>O usuário concorda em indenizar ou ressarcir a Bisme caso sua conduta, conteúdo ou violação destes Termos gere prejuízos, reclamações, disputas, multas, condenações, custos ou responsabilidades para a plataforma.</P>
      <P>Isso inclui, por exemplo, violação de direitos autorais, uso indevido de imagem, publicação de conteúdo proibido, fraude, informações falsas ou descumprimento da legislação aplicável.</P>

      <H>28. Limitação de responsabilidade da Bisme</H>
      <P>Na máxima medida permitida pela legislação aplicável, a Bisme não será responsável por:</P>
      <UL>
        <LI>Serviços prestados diretamente pelos empresários;</LI>
        <LI>Conduta de clientes finais;</LI>
        <LI>Conduta de profissionais cadastrados;</LI>
        <LI>Informações publicadas pelos empresários;</LI>
        <LI>Conteúdos enviados por usuários;</LI>
        <LI>Atrasos, cancelamentos ou não comparecimentos;</LI>
        <LI>Perdas decorrentes de uso indevido da conta pelo usuário;</LI>
        <LI>Falhas causadas por terceiros;</LI>
        <LI>Indisponibilidade temporária da plataforma;</LI>
        <LI>Decisões comerciais tomadas pelos empresários;</LI>
        <LI>Danos indiretos, lucros cessantes ou perdas de oportunidade, quando permitido por lei.</LI>
      </UL>
      <P>Nada nestes Termos exclui responsabilidades que não possam ser excluídas pela legislação aplicável.</P>

      <H>29. Alterações na plataforma</H>
      <P>A Bisme poderá alterar, melhorar, remover ou adicionar funcionalidades à plataforma.</P>
      <P>Essas alterações podem ocorrer para melhorar a experiência do usuário, corrigir erros, reforçar segurança, adaptar a plataforma a novas necessidades, cumprir exigências legais ou desenvolver novos recursos.</P>
      <P>Nem todas as funcionalidades estarão disponíveis para todos os usuários, planos, modelos de site ou regiões.</P>

      <H>30. Alterações destes Termos</H>
      <P>A Bisme poderá atualizar estes Termos de Uso a qualquer momento.</P>
      <P>Quando houver alterações relevantes, poderemos comunicar os usuários por meio da plataforma, por e-mail ou pela atualização da data no início deste documento.</P>
      <P>O uso contínuo da Bisme após a publicação de alterações significa que o usuário concorda com a versão atualizada dos Termos.</P>
      <P>Caso não concorde com as alterações, o usuário deve interromper o uso da plataforma.</P>

      <H>31. Encerramento do uso pelo usuário</H>
      <P>O usuário pode deixar de utilizar a Bisme a qualquer momento.</P>
      <P>Empresários podem solicitar cancelamento de conta ou encerramento de uso pelo e-mail:</P>
      <P><A href="mailto:atendimento@bisme.com.br">atendimento@bisme.com.br</A></P>
      <P>Alguns dados poderão ser mantidos pelo período necessário para cumprimento de obrigações legais, segurança, prevenção a fraudes, resolução de disputas ou exercício regular de direitos, conforme descrito na Política de Privacidade.</P>

      <H>32. Regras específicas para empresários</H>
      <P>Além das demais regras destes Termos, o empresário concorda em:</P>
      <UL>
        <LI>Cadastrar apenas informações verdadeiras sobre seu negócio;</LI>
        <LI>Não oferecer serviços ilegais;</LI>
        <LI>Não publicar fotos pornográficas explícitas ou conteúdo sexual explícito para reserva;</LI>
        <LI>Não usar imagens de terceiros sem autorização;</LI>
        <LI>Não enganar clientes sobre preço, serviço, localização, disponibilidade ou profissional;</LI>
        <LI>Manter seus horários atualizados;</LI>
        <LI>Atender clientes de forma respeitosa;</LI>
        <LI>Usar dados dos clientes apenas para finalidades relacionadas ao agendamento e atendimento;</LI>
        <LI>Não vender, expor ou compartilhar dados de clientes indevidamente;</LI>
        <LI>Não usar a Bisme para spam, fraude ou abuso;</LI>
        <LI>Cumprir as leis aplicáveis ao seu ramo de atividade;</LI>
        <LI>Obter autorizações necessárias para cadastrar profissionais, funcionários, fotos e informações do negócio.</LI>
      </UL>
      <P>O empresário é o principal responsável pela operação do seu negócio, pelos serviços oferecidos e pelo relacionamento com seus clientes.</P>

      <H>33. Regras específicas para clientes finais</H>
      <P>Além das demais regras destes Termos, o cliente final concorda em:</P>
      <UL>
        <LI>Fornecer informações verdadeiras ao se cadastrar ou agendar;</LI>
        <LI>Não realizar agendamentos falsos;</LI>
        <LI>Não usar dados de terceiros sem autorização;</LI>
        <LI>Não enviar mensagens ofensivas, abusivas ou ilegais;</LI>
        <LI>Comparecer ao horário agendado ou cancelar/remarcar quando necessário;</LI>
        <LI>Respeitar as regras informadas pelo negócio;</LI>
        <LI>Não utilizar a plataforma para prejudicar empresários, profissionais ou outros usuários.</LI>
      </UL>
      <P>O cliente final entende que o atendimento, a execução do serviço e as condições comerciais são de responsabilidade do respectivo empresário.</P>

      <H>34. Uso aceitável e estilo de comunidade</H>
      <P>A Bisme funciona melhor quando todos os usuários agem com responsabilidade.</P>
      <P>Por isso, a plataforma adota regras de comunidade semelhantes às de ambientes digitais modernos: seja verdadeiro, respeite os outros, não publique conteúdo proibido, não tente enganar pessoas, não explore a plataforma de forma abusiva e não utilize a Bisme para finalidades incompatíveis com um ambiente profissional.</P>
      <P>A Bisme não pretende controlar a criatividade, identidade visual ou forma de apresentação dos negócios, mas poderá intervir quando houver abuso, risco, ilegalidade, nudez explícita, pornografia, fraude, violência, violação de direitos ou uso contrário ao bom senso.</P>

      <H>35. Legislação aplicável</H>
      <P>Estes Termos de Uso serão interpretados de acordo com as leis da República Federativa do Brasil.</P>
      <P>Eventuais conflitos deverão ser resolvidos preferencialmente de forma amigável, por meio do contato:</P>
      <P><A href="mailto:atendimento@bisme.com.br">atendimento@bisme.com.br</A></P>
      <P>Caso não seja possível uma solução amigável, poderão ser utilizados os meios legais competentes conforme a legislação aplicável.</P>

      <H>36. Disposições finais</H>
      <P>Se qualquer parte destes Termos for considerada inválida ou inexequível, as demais disposições continuarão válidas e aplicáveis.</P>
      <P>A eventual tolerância da Bisme quanto ao descumprimento de alguma regra não significa renúncia ao direito de exigir seu cumprimento posteriormente.</P>
      <P>Estes Termos, juntamente com a Política de Privacidade e demais documentos aplicáveis, constituem o acordo entre o usuário e a Bisme para uso da plataforma.</P>
      <P>Ao utilizar a Bisme, o usuário declara que leu, entendeu e concorda com estes Termos de Uso.</P>
    </>
  );
}
