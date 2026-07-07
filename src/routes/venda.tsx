import { createFileRoute, Link } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Menu, X, ChevronDown, Star, ArrowLeft, ArrowRight, Instagram, Youtube, Check } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import bismeHeaderLogo from "@/assets/bisme-header-logo.svg";
import vendaHero from "@/assets/venda-hero.png";
import vendaRotina from "@/assets/venda-rotina.svg";
import depoRafaela from "@/assets/depoimento-rafaela.jpg";
import depoLucas from "@/assets/depoimento-lucas.jpg";
import depoCamila from "@/assets/depoimento-camila.jpg";
import sitesShowcase from "@/assets/sites-showcase.png";
import dashboardPreview from "@/assets/dashboard-preview.png";

export const Route = createFileRoute("/venda")({
  head: () => ({
    meta: [
      { title: "Bisme — da correria da rotina ao controle da gestão, a Bisme simplifica" },
      {
        name: "description",
        content:
          "Agenda, financeiro, clientes e WhatsApp em um só lugar. Comece o teste grátis da Bisme.",
      },
      { property: "og:title", content: "Bisme — Gestão fácil para o seu negócio" },
      {
        property: "og:description",
        content: "Controle agenda, clientes e financeiro com a Bisme. Teste grátis.",
      },
    ],
  }),
  component: VendaPage,
});

const ORANGE = "#5690f5";
const MODAL_TEXT = "#464646";
const BISME_BLUE = "#5690f5";

// ==================== i18n (scoped to /venda only) ====================

type Lang = "pt-BR" | "en" | "es" | "fr" | "it";

const LANG_STORAGE_KEY = "bisme.venda.lang";

const LANGUAGES: { code: Lang; label: string; short: string }[] = [
  { code: "pt-BR", label: "Português brasileiro", short: "PT-BR" },
  { code: "en", label: "Inglês", short: "EN" },
  { code: "es", label: "Espanhol", short: "ES" },
  { code: "fr", label: "Francês", short: "FR" },
  { code: "it", label: "Italiano", short: "IT" },
];

type Dict = Record<string, string>;

const translations: Record<Lang, Dict> = {
  "pt-BR": {
    // header / menu
    "cta.trial": "Teste grátis",
    "menu.institucional": "Institucional",
    "menu.quemsomos": "Quem somos",
    "menu.termos": "Termos de uso",
    "menu.privacidade": "Política de privacidade",
    "menu.comercial": "Comercial",
    "menu.planos": "Planos",
    "menu.testegratis": "Teste grátis",
    "menu.entrar": "Entrar",
    "menu.idioma": "Idioma",
    "menu.idiomaAtual": "Português brasileiro",
    "menu.lang.pt-BR": "Português brasileiro",
    "menu.lang.en": "Inglês",
    "menu.lang.es": "Espanhol",
    "menu.lang.fr": "Francês",
    "menu.lang.it": "Italiano",
    "btn.entrar": "ENTRAR",
    "btn.cadastrar": "CADASTRE-SE",
    // hero
    "hero.title.l1": "da correria da rotina ao controle da gestão",
    "hero.title.l2": "a Bisme simplifica",
    "hero.sub":
      "Com a Bisme, você controla sua agenda, organiza seu financeiro, gerencia clientes, envia mensagens pelo WhatsApp e cuida do seu negócio sem complicação.",
    "hero.imgAlt": "Demonstração da Bisme com agenda, reservas e atendimento",
    // rotina
    "rotina.title": "Sua rotina organizada em um só lugar",
    "rotina.sub":
      "Visualize todos os atendimentos do dia, da semana ou do mês com clareza. Encaixes, cancelamentos e novos horários sem confusão.",
    "rotina.imgAlt": "Sua rotina organizada",
    // sites
    "sites.title": "Um site de agendamento com a cara do seu negócio",
    "sites.sub":
      "Personalize cores, capa, logo, serviços e horários. Compartilhe um link único e seus clientes agendam direto, 24 horas por dia.",
    "sites.imgAlt": "Exemplos de sites de agendamento em celulares",
    // servicos / dashboard
    "servicos.title": "Tudo que você precisa para gerenciar melhor",
    "servicos.sub":
      "Acompanhe faturamento, agendamentos, clientes e desempenho em tempo real, no celular ou no computador, com uma visão simples e profissional da sua gestão.",
    "servicos.imgAlt": "Preview do dashboard da Bisme em desktop e mobile",
    // depoimentos
    "depo.title": "Quem usa a Bisme sente a diferença na rotina",
    "depo.sub":
      "Profissionais de diferentes áreas já estão organizando agenda, clientes, financeiro e atendimento em um só lugar.",
    "depo.1.texto":
      "Usava planilha pra tudo e vivia perdendo horário. Hoje o link de agendamento faz o trabalho — o cliente marca sozinho e eu só acesso a minha agenda. Sensacional, muito tempo.",
    "depo.1.nome": "Rafaela Nunes",
    "depo.1.prof": "Esteticista",
    "depo.2.texto":
      "A organização da agenda mudou meu dia a dia. Os lembretes no WhatsApp reduziram muito as faltas e meus clientes adoraram a praticidade.",
    "depo.2.nome": "Lucas Andrade",
    "depo.2.prof": "Barbeiro",
    "depo.3.texto":
      "Consigo ver tudo em um lugar só: agenda, financeiro e clientes. A Bisme deixou meu trabalho muito mais leve e profissional.",
    "depo.3.nome": "Camila Souza",
    "depo.3.prof": "Manicure",
    // faq
    "faq.title": "Perguntas frequentes sobre a Bisme",
    "faq.sub":
      "Tire suas principais dúvidas sobre como a Bisme ajuda a organizar sua rotina, seus atendimentos e a experiência dos seus clientes.",
    "faq.q1": "O que é a Bisme?",
    "faq.a1":
      "A Bisme é uma plataforma de agendamento e gestão pensada para negócios de atendimento. Em um só lugar você organiza agenda, clientes, serviços, financeiro e comunicação.",
    "faq.q2": "Para quem a Bisme é indicada?",
    "faq.a2":
      "Para profissionais autônomos e negócios que vivem de atendimento: salões, barbearias, estética, manicure, estúdios, clínicas e prestadores de serviço em geral.",
    "faq.q3": "A Bisme envia mensagens pelo WhatsApp?",
    "faq.a3":
      "Sim. Você pode enviar lembretes, confirmações e mensagens personalizadas para os seus clientes diretamente pelo WhatsApp.",
    "faq.q4": "A Bisme tem controle financeiro?",
    "faq.a4":
      "Sim. Você acompanha entradas, saídas e a evolução do seu faturamento em um painel simples e direto.",
    "faq.q5": "A página de agendamento pode ter a identidade do meu negócio?",
    "faq.a5":
      "Sim. Você personaliza cores, capa, logo, serviços e horários. O link de agendamento fica com a cara do seu negócio.",
    // cta final
    "cta.title": "Ainda ficou com alguma dúvida?",
    "cta.sub": "Comece seu teste grátis e veja na prática como a Bisme pode simplificar sua rotina.",
    "cta.btn": "Teste grátis",
    // footer
    "footer.desc":
      "A plataforma de agendamento e gestão para negócios que querem crescer com organização.",
    "footer.redes": "Nossas redes",
    "footer.institucional": "Institucional",
    "footer.comercial": "Comercial",
    "footer.copy": "© 2026 Bisme. Todos os direitos reservados.",
  },
  en: {
    "cta.trial": "Free trial",
    "menu.institucional": "Company",
    "menu.quemsomos": "About us",
    "menu.termos": "Terms of use",
    "menu.privacidade": "Privacy policy",
    "menu.comercial": "Business",
    "menu.planos": "Plans",
    "menu.testegratis": "Free trial",
    "menu.entrar": "Sign in",
    "menu.idioma": "Language",
    "menu.idiomaAtual": "English",
    "menu.lang.pt-BR": "Brazilian Portuguese",
    "menu.lang.en": "English",
    "menu.lang.es": "Spanish",
    "menu.lang.fr": "French",
    "menu.lang.it": "Italian",
    "btn.entrar": "SIGN IN",
    "btn.cadastrar": "SIGN UP",
    "hero.title.l1": "from the busy routine to full management control",
    "hero.title.l2": "Bisme makes it simple",
    "hero.sub":
      "With Bisme you control your calendar, organize your finances, manage clients, send WhatsApp messages and take care of your business without hassle.",
    "hero.imgAlt": "Bisme demo showing calendar, bookings and service",
    "rotina.title": "Your routine organized in one place",
    "rotina.sub":
      "See every appointment for the day, week or month clearly. Fit-ins, cancellations and new times without confusion.",
    "rotina.imgAlt": "Your organized routine",
    "sites.title": "A booking site with your business identity",
    "sites.sub":
      "Customize colors, cover, logo, services and hours. Share a unique link and your clients book directly, 24 hours a day.",
    "sites.imgAlt": "Examples of booking sites on phones",
    "servicos.title": "Everything you need to manage better",
    "servicos.sub":
      "Track revenue, bookings, clients and performance in real time, on your phone or computer, with a simple and professional view of your business.",
    "servicos.imgAlt": "Preview of the Bisme dashboard on desktop and mobile",
    "depo.title": "People using Bisme feel the difference in their routine",
    "depo.sub":
      "Professionals from different areas are already organizing calendar, clients, finances and service in one place.",
    "depo.1.texto":
      "I used spreadsheets for everything and kept missing appointments. Now the booking link does the job — the client books alone and I just check my calendar. Amazing, so much time saved.",
    "depo.1.nome": "Rafaela Nunes",
    "depo.1.prof": "Aesthetician",
    "depo.2.texto":
      "Organizing my calendar changed my day-to-day. WhatsApp reminders greatly reduced no-shows and my clients loved the convenience.",
    "depo.2.nome": "Lucas Andrade",
    "depo.2.prof": "Barber",
    "depo.3.texto":
      "I can see everything in one place: calendar, finances and clients. Bisme made my work much lighter and more professional.",
    "depo.3.nome": "Camila Souza",
    "depo.3.prof": "Manicurist",
    "faq.title": "Frequently asked questions about Bisme",
    "faq.sub":
      "Get answers to your main questions on how Bisme helps organize your routine, appointments and client experience.",
    "faq.q1": "What is Bisme?",
    "faq.a1":
      "Bisme is a booking and management platform designed for service businesses. In one place you organize calendar, clients, services, finances and communication.",
    "faq.q2": "Who is Bisme for?",
    "faq.a2":
      "For freelancers and service businesses: salons, barbershops, aesthetics, manicure, studios, clinics and service providers in general.",
    "faq.q3": "Does Bisme send WhatsApp messages?",
    "faq.a3":
      "Yes. You can send reminders, confirmations and personalized messages to your clients directly via WhatsApp.",
    "faq.q4": "Does Bisme have financial control?",
    "faq.a4":
      "Yes. You track income, expenses and revenue growth in a simple and direct dashboard.",
    "faq.q5": "Can the booking page have my business identity?",
    "faq.a5":
      "Yes. You customize colors, cover, logo, services and hours. The booking link looks like your business.",
    "cta.title": "Still have any questions?",
    "cta.sub": "Start your free trial and see in practice how Bisme can simplify your routine.",
    "cta.btn": "Free trial",
    "footer.desc":
      "The booking and management platform for businesses that want to grow with organization.",
    "footer.redes": "Our socials",
    "footer.institucional": "Company",
    "footer.comercial": "Business",
    "footer.copy": "© 2026 Bisme. All rights reserved.",
  },
  es: {
    "cta.trial": "Prueba gratis",
    "menu.institucional": "Institucional",
    "menu.quemsomos": "Quiénes somos",
    "menu.termos": "Términos de uso",
    "menu.privacidade": "Política de privacidad",
    "menu.comercial": "Comercial",
    "menu.planos": "Planes",
    "menu.testegratis": "Prueba gratis",
    "menu.entrar": "Iniciar sesión",
    "menu.idioma": "Idioma",
    "menu.idiomaAtual": "Español",
    "menu.lang.pt-BR": "Portugués brasileño",
    "menu.lang.en": "Inglés",
    "menu.lang.es": "Español",
    "menu.lang.fr": "Francés",
    "menu.lang.it": "Italiano",
    "btn.entrar": "INICIAR SESIÓN",
    "btn.cadastrar": "REGÍSTRATE",
    "hero.title.l1": "de la rutina agitada al control de la gestión",
    "hero.title.l2": "Bisme lo simplifica",
    "hero.sub":
      "Con Bisme controlas tu agenda, organizas tus finanzas, gestionas clientes, envías mensajes por WhatsApp y cuidas tu negocio sin complicaciones.",
    "hero.imgAlt": "Demostración de Bisme con agenda, reservas y atención",
    "rotina.title": "Tu rutina organizada en un solo lugar",
    "rotina.sub":
      "Visualiza todas las citas del día, la semana o el mes con claridad. Encajes, cancelaciones y nuevos horarios sin confusión.",
    "rotina.imgAlt": "Tu rutina organizada",
    "sites.title": "Un sitio de reservas con la cara de tu negocio",
    "sites.sub":
      "Personaliza colores, portada, logo, servicios y horarios. Comparte un enlace único y tus clientes reservan directamente, las 24 horas.",
    "sites.imgAlt": "Ejemplos de sitios de reserva en móviles",
    "servicos.title": "Todo lo que necesitas para gestionar mejor",
    "servicos.sub":
      "Sigue facturación, reservas, clientes y desempeño en tiempo real, en el móvil o en el ordenador, con una vista simple y profesional de tu gestión.",
    "servicos.imgAlt": "Vista previa del panel de Bisme en escritorio y móvil",
    "depo.title": "Quien usa Bisme siente la diferencia en la rutina",
    "depo.sub":
      "Profesionales de distintas áreas ya están organizando agenda, clientes, finanzas y atención en un solo lugar.",
    "depo.1.texto":
      "Usaba una hoja de cálculo para todo y perdía horarios. Hoy el enlace de reserva hace el trabajo — el cliente reserva solo y yo solo consulto mi agenda. Increíble, ahorro mucho tiempo.",
    "depo.1.nome": "Rafaela Nunes",
    "depo.1.prof": "Esteticista",
    "depo.2.texto":
      "La organización de la agenda cambió mi día a día. Los recordatorios por WhatsApp redujeron mucho las ausencias y mis clientes adoraron la practicidad.",
    "depo.2.nome": "Lucas Andrade",
    "depo.2.prof": "Barbero",
    "depo.3.texto":
      "Puedo ver todo en un solo lugar: agenda, finanzas y clientes. Bisme hizo mi trabajo mucho más ligero y profesional.",
    "depo.3.nome": "Camila Souza",
    "depo.3.prof": "Manicurista",
    "faq.title": "Preguntas frecuentes sobre Bisme",
    "faq.sub":
      "Resuelve tus principales dudas sobre cómo Bisme ayuda a organizar tu rutina, tus citas y la experiencia de tus clientes.",
    "faq.q1": "¿Qué es Bisme?",
    "faq.a1":
      "Bisme es una plataforma de reservas y gestión pensada para negocios de atención. En un solo lugar organizas agenda, clientes, servicios, finanzas y comunicación.",
    "faq.q2": "¿Para quién es Bisme?",
    "faq.a2":
      "Para autónomos y negocios de atención: salones, barberías, estética, manicura, estudios, clínicas y prestadores de servicios en general.",
    "faq.q3": "¿Bisme envía mensajes por WhatsApp?",
    "faq.a3":
      "Sí. Puedes enviar recordatorios, confirmaciones y mensajes personalizados a tus clientes directamente por WhatsApp.",
    "faq.q4": "¿Bisme tiene control financiero?",
    "faq.a4":
      "Sí. Sigues entradas, salidas y la evolución de tu facturación en un panel simple y directo.",
    "faq.q5": "¿La página de reservas puede tener la identidad de mi negocio?",
    "faq.a5":
      "Sí. Personalizas colores, portada, logo, servicios y horarios. El enlace de reserva queda con la cara de tu negocio.",
    "cta.title": "¿Aún tienes alguna duda?",
    "cta.sub": "Empieza tu prueba gratis y ve en la práctica cómo Bisme puede simplificar tu rutina.",
    "cta.btn": "Prueba gratis",
    "footer.desc":
      "La plataforma de reservas y gestión para negocios que quieren crecer con organización.",
    "footer.redes": "Nuestras redes",
    "footer.institucional": "Institucional",
    "footer.comercial": "Comercial",
    "footer.copy": "© 2026 Bisme. Todos los derechos reservados.",
  },
  fr: {
    "cta.trial": "Essai gratuit",
    "menu.institucional": "Institutionnel",
    "menu.quemsomos": "Qui sommes-nous",
    "menu.termos": "Conditions d'utilisation",
    "menu.privacidade": "Politique de confidentialité",
    "menu.comercial": "Commercial",
    "menu.planos": "Forfaits",
    "menu.testegratis": "Essai gratuit",
    "menu.entrar": "Se connecter",
    "menu.idioma": "Langue",
    "menu.idiomaAtual": "Français",
    "menu.lang.pt-BR": "Portugais brésilien",
    "menu.lang.en": "Anglais",
    "menu.lang.es": "Espagnol",
    "menu.lang.fr": "Français",
    "menu.lang.it": "Italien",
    "btn.entrar": "SE CONNECTER",
    "btn.cadastrar": "S'INSCRIRE",
    "hero.title.l1": "de la routine effrénée au contrôle de la gestion",
    "hero.title.l2": "Bisme simplifie",
    "hero.sub":
      "Avec Bisme, vous contrôlez votre agenda, organisez vos finances, gérez vos clients, envoyez des messages WhatsApp et prenez soin de votre entreprise sans complication.",
    "hero.imgAlt": "Démo de Bisme avec agenda, réservations et service",
    "rotina.title": "Votre routine organisée en un seul endroit",
    "rotina.sub":
      "Visualisez tous les rendez-vous du jour, de la semaine ou du mois clairement. Ajouts, annulations et nouveaux horaires sans confusion.",
    "rotina.imgAlt": "Votre routine organisée",
    "sites.title": "Un site de réservation à l'image de votre entreprise",
    "sites.sub":
      "Personnalisez couleurs, couverture, logo, services et horaires. Partagez un lien unique et vos clients réservent directement, 24 h/24.",
    "sites.imgAlt": "Exemples de sites de réservation sur mobile",
    "servicos.title": "Tout ce qu'il vous faut pour mieux gérer",
    "servicos.sub":
      "Suivez chiffre d'affaires, rendez-vous, clients et performance en temps réel, sur mobile ou ordinateur, avec une vue simple et professionnelle.",
    "servicos.imgAlt": "Aperçu du tableau de bord Bisme sur desktop et mobile",
    "depo.title": "Ceux qui utilisent Bisme sentent la différence",
    "depo.sub":
      "Des professionnels de divers domaines organisent déjà agenda, clients, finances et service en un seul endroit.",
    "depo.1.texto":
      "J'utilisais un tableur pour tout et je ratais des rendez-vous. Maintenant le lien de réservation fait le travail — le client réserve seul et je consulte juste mon agenda. Génial, gain de temps énorme.",
    "depo.1.nome": "Rafaela Nunes",
    "depo.1.prof": "Esthéticienne",
    "depo.2.texto":
      "L'organisation de l'agenda a changé mon quotidien. Les rappels WhatsApp ont beaucoup réduit les absences et mes clients ont adoré la simplicité.",
    "depo.2.nome": "Lucas Andrade",
    "depo.2.prof": "Barbier",
    "depo.3.texto":
      "Je vois tout au même endroit : agenda, finances et clients. Bisme a rendu mon travail plus léger et professionnel.",
    "depo.3.nome": "Camila Souza",
    "depo.3.prof": "Manucure",
    "faq.title": "Questions fréquentes sur Bisme",
    "faq.sub":
      "Trouvez vos réponses sur la façon dont Bisme aide à organiser votre routine, vos rendez-vous et l'expérience client.",
    "faq.q1": "Qu'est-ce que Bisme ?",
    "faq.a1":
      "Bisme est une plateforme de réservation et de gestion pensée pour les entreprises de service. Vous y organisez agenda, clients, services, finances et communication.",
    "faq.q2": "À qui s'adresse Bisme ?",
    "faq.a2":
      "Aux indépendants et entreprises de service : salons, barbiers, esthétique, manucure, studios, cliniques et prestataires en général.",
    "faq.q3": "Bisme envoie-t-il des messages WhatsApp ?",
    "faq.a3":
      "Oui. Vous pouvez envoyer rappels, confirmations et messages personnalisés à vos clients directement via WhatsApp.",
    "faq.q4": "Bisme a-t-il un contrôle financier ?",
    "faq.a4":
      "Oui. Vous suivez entrées, sorties et l'évolution de votre chiffre d'affaires sur un tableau simple et direct.",
    "faq.q5": "La page de réservation peut-elle avoir l'identité de mon entreprise ?",
    "faq.a5":
      "Oui. Vous personnalisez couleurs, couverture, logo, services et horaires. Le lien de réservation ressemble à votre entreprise.",
    "cta.title": "Encore des questions ?",
    "cta.sub": "Commencez votre essai gratuit et voyez comment Bisme peut simplifier votre routine.",
    "cta.btn": "Essai gratuit",
    "footer.desc":
      "La plateforme de réservation et de gestion pour les entreprises qui veulent grandir avec organisation.",
    "footer.redes": "Nos réseaux",
    "footer.institucional": "Institutionnel",
    "footer.comercial": "Commercial",
    "footer.copy": "© 2026 Bisme. Tous droits réservés.",
  },
  it: {
    "cta.trial": "Prova gratuita",
    "menu.institucional": "Istituzionale",
    "menu.quemsomos": "Chi siamo",
    "menu.termos": "Termini d'uso",
    "menu.privacidade": "Politica sulla privacy",
    "menu.comercial": "Commerciale",
    "menu.planos": "Piani",
    "menu.testegratis": "Prova gratuita",
    "menu.entrar": "Accedi",
    "menu.idioma": "Lingua",
    "menu.idiomaAtual": "Italiano",
    "menu.lang.pt-BR": "Portoghese brasiliano",
    "menu.lang.en": "Inglese",
    "menu.lang.es": "Spagnolo",
    "menu.lang.fr": "Francese",
    "menu.lang.it": "Italiano",
    "btn.entrar": "ACCEDI",
    "btn.cadastrar": "REGISTRATI",
    "hero.title.l1": "dalla frenesia della routine al controllo della gestione",
    "hero.title.l2": "Bisme semplifica",
    "hero.sub":
      "Con Bisme controlli la tua agenda, organizzi le finanze, gestisci i clienti, invii messaggi WhatsApp e ti prendi cura del tuo business senza complicazioni.",
    "hero.imgAlt": "Demo di Bisme con agenda, prenotazioni e servizio",
    "rotina.title": "La tua routine organizzata in un unico posto",
    "rotina.sub":
      "Visualizza tutti gli appuntamenti del giorno, della settimana o del mese con chiarezza. Incastri, cancellazioni e nuovi orari senza confusione.",
    "rotina.imgAlt": "La tua routine organizzata",
    "sites.title": "Un sito di prenotazioni con l'immagine del tuo business",
    "sites.sub":
      "Personalizza colori, copertina, logo, servizi e orari. Condividi un link unico e i tuoi clienti prenotano direttamente, 24 ore su 24.",
    "sites.imgAlt": "Esempi di siti di prenotazione su cellulari",
    "servicos.title": "Tutto ciò che ti serve per gestire meglio",
    "servicos.sub":
      "Monitora fatturato, prenotazioni, clienti e performance in tempo reale, su cellulare o computer, con una vista semplice e professionale.",
    "servicos.imgAlt": "Anteprima della dashboard Bisme su desktop e mobile",
    "depo.title": "Chi usa Bisme sente la differenza nella routine",
    "depo.sub":
      "Professionisti di diverse aree stanno già organizzando agenda, clienti, finanze e servizio in un unico posto.",
    "depo.1.texto":
      "Usavo fogli di calcolo per tutto e perdevo appuntamenti. Ora il link di prenotazione fa il lavoro — il cliente prenota da solo e io controllo solo la mia agenda. Fantastico, tanto tempo risparmiato.",
    "depo.1.nome": "Rafaela Nunes",
    "depo.1.prof": "Estetista",
    "depo.2.texto":
      "L'organizzazione dell'agenda ha cambiato la mia giornata. I promemoria WhatsApp hanno ridotto molto le assenze e i clienti hanno adorato la praticità.",
    "depo.2.nome": "Lucas Andrade",
    "depo.2.prof": "Barbiere",
    "depo.3.texto":
      "Vedo tutto in un unico posto: agenda, finanze e clienti. Bisme ha reso il mio lavoro molto più leggero e professionale.",
    "depo.3.nome": "Camila Souza",
    "depo.3.prof": "Manicure",
    "faq.title": "Domande frequenti su Bisme",
    "faq.sub":
      "Trova le risposte alle domande principali su come Bisme aiuta a organizzare la tua routine, gli appuntamenti e l'esperienza dei clienti.",
    "faq.q1": "Cos'è Bisme?",
    "faq.a1":
      "Bisme è una piattaforma di prenotazione e gestione pensata per attività di servizio. In un unico posto organizzi agenda, clienti, servizi, finanze e comunicazione.",
    "faq.q2": "A chi è indicata Bisme?",
    "faq.a2":
      "A professionisti autonomi e attività di servizio: saloni, barbieri, estetica, manicure, studi, cliniche e fornitori di servizi in generale.",
    "faq.q3": "Bisme invia messaggi WhatsApp?",
    "faq.a3":
      "Sì. Puoi inviare promemoria, conferme e messaggi personalizzati ai tuoi clienti direttamente via WhatsApp.",
    "faq.q4": "Bisme ha il controllo finanziario?",
    "faq.a4":
      "Sì. Monitori entrate, uscite ed evoluzione del tuo fatturato in una dashboard semplice e diretta.",
    "faq.q5": "La pagina di prenotazione può avere l'identità della mia attività?",
    "faq.a5":
      "Sì. Personalizzi colori, copertina, logo, servizi e orari. Il link di prenotazione ha l'immagine della tua attività.",
    "cta.title": "Hai ancora dubbi?",
    "cta.sub": "Inizia la tua prova gratuita e vedi in pratica come Bisme può semplificare la tua routine.",
    "cta.btn": "Prova gratuita",
    "footer.desc":
      "La piattaforma di prenotazione e gestione per attività che vogliono crescere con organizzazione.",
    "footer.redes": "I nostri social",
    "footer.institucional": "Istituzionale",
    "footer.comercial": "Commerciale",
    "footer.copy": "© 2026 Bisme. Tutti i diritti riservati.",
  },
};

type I18nCtx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const I18nContext = createContext<I18nCtx | null>(null);
function useI18n(): I18nCtx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside provider");
  return ctx;
}

// ==================== Round flag SVGs ====================

function FlagBR({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="20" height="20" rx="10" fill="#009B3A" />
      <path d="m10.001 2.947 8.805 7.052-8.805 7.053-8.805-7.053 8.805-7.052Z" fill="#FEDF00" />
      <circle cx="10.001" cy="9.998" r="4.12" transform="rotate(3.323 10.001 9.998)" fill="#002776" />
      <path d="M14.094 10.49a12.533 12.533 0 0 0-6.38-2.176 12.725 12.725 0 0 0-1.472 0c-.133.295-.231.609-.291.937.56-.049 1.13-.058 1.708-.024 2.325.135 4.452.942 6.203 2.22.113-.303.193-.623.232-.957Z" fill="#fff" />
    </svg>
  );
}

function FlagGB({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true">
      <defs><clipPath id="fgb"><circle cx="30" cy="30" r="30" /></clipPath></defs>
      <g clipPath="url(#fgb)">
        <rect width="60" height="60" fill="#012169" />
        <path d="M0,0 L60,60 M60,0 L0,60" stroke="#fff" strokeWidth="12" />
        <path d="M0,0 L60,60 M60,0 L0,60" stroke="#C8102E" strokeWidth="5" />
        <path d="M30,0 V60 M0,30 H60" stroke="#fff" strokeWidth="18" />
        <path d="M30,0 V60 M0,30 H60" stroke="#C8102E" strokeWidth="10" />
      </g>
      <circle cx="30" cy="30" r="29" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" />
    </svg>
  );
}
function FlagES({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><clipPath id="fes"><circle cx="12" cy="12" r="12" /></clipPath></defs>
      <g clipPath="url(#fes)">
        <rect width="24" height="24" fill="#c60b1e" />
        <rect y="6" width="24" height="12" fill="#ffc400" />
      </g>
      <circle cx="12" cy="12" r="11.6" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.8" />
    </svg>
  );
}
function FlagFR({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><clipPath id="ffr"><circle cx="12" cy="12" r="12" /></clipPath></defs>
      <g clipPath="url(#ffr)">
        <rect width="8" height="24" fill="#0055A4" />
        <rect x="8" width="8" height="24" fill="#fff" />
        <rect x="16" width="8" height="24" fill="#EF4135" />
      </g>
      <circle cx="12" cy="12" r="11.6" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.8" />
    </svg>
  );
}
function FlagIT({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><clipPath id="fit"><circle cx="12" cy="12" r="12" /></clipPath></defs>
      <g clipPath="url(#fit)">
        <rect width="8" height="24" fill="#008C45" />
        <rect x="8" width="8" height="24" fill="#F4F5F0" />
        <rect x="16" width="8" height="24" fill="#CD212A" />
      </g>
      <circle cx="12" cy="12" r="11.6" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.8" />
    </svg>
  );
}
function FlagFor({ code, size = 22 }: { code: Lang; size?: number }) {
  switch (code) {
    case "pt-BR": return <FlagBR size={size} />;
    case "en": return <FlagGB size={size} />;
    case "es": return <FlagES size={size} />;
    case "fr": return <FlagFR size={size} />;
    case "it": return <FlagIT size={size} />;
  }
}

// ==================== Header + Menu ====================

function Header() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white" style={{ boxShadow: "0 1px 12px rgba(0, 0, 0, 0.08)" }}>
        <div className="max-w-[1120px] mx-auto px-5 md:px-8 h-16 md:h-[72px] flex items-center justify-between gap-4">
          <Link to="/venda" aria-label="Bisme" className="flex items-center">
            <img src={bismeHeaderLogo} alt="Bisme" className="h-9 md:h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/empresario/cadastro"
              className="text-white text-sm font-semibold px-4 py-2 rounded-full hover:brightness-110 transition"
              style={{ backgroundColor: ORANGE }}
            >
              {t("cta.trial")}
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              aria-expanded={open}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 transition"
              style={{ color: MODAL_TEXT }}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>
      {open && (
        <div className="fixed left-0 right-0 top-16 md:top-[72px] z-40 bg-white border-b border-black/[0.06] animate-in slide-in-from-top-2 duration-150">
          {/* divider separating header from modal content */}
          <div className="w-full h-px bg-black/[0.08]" />
          <div className="max-w-[1120px] mx-auto px-5 md:px-8 py-4" style={{ color: MODAL_TEXT }}>
            <MenuGroup
              label={t("menu.institucional")}
              items={[
                { label: t("menu.quemsomos"), to: "/quem-somos" },
                { label: t("menu.termos"), to: "/termos-de-servico" },
                { label: t("menu.privacidade"), to: "/politica-privacidade" },
              ]}
              onNavigate={() => setOpen(false)}
            />
            <MenuGroup
              label={t("menu.comercial")}
              items={[
                { label: t("menu.planos"), to: "/planos" },
                { label: t("menu.testegratis"), to: "/empresario/cadastro" },
                { label: t("menu.entrar"), to: "/empresario/login" },
              ]}
              onNavigate={() => setOpen(false)}
            />
            <LanguageGroup />
            <div className="mt-6 mb-2 flex flex-col items-center gap-[10px]">
              <Link
                to="/empresario/login"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center w-56 bg-white border uppercase tracking-wider text-sm font-bold py-3 px-8 hover:brightness-95 transition-colors"
                style={{ color: "#5690f5", borderColor: "#5690f5", borderWidth: 1, borderRadius: 1 }}
              >
                {t("btn.entrar")}
              </Link>
              <Link
                to="/empresario/cadastro"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center w-56 text-white uppercase tracking-wider text-sm font-bold py-3 px-8 hover:brightness-110 transition-colors"
                style={{ backgroundColor: "#5690f5", borderColor: "#5690f5", borderWidth: 1, borderRadius: 1 }}
              >
                {t("btn.cadastrar")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MenuGroup({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: { label: string; to: string }[];
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-black/[0.04] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-3 text-left font-semibold text-base transition"
        style={{ color: MODAL_TEXT }}
      >
        <span>{label}</span>
        <ChevronDown size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="pb-2 pl-3 space-y-0.5">
          {items.map((it) => (
            <li key={it.label}>
              <Link
                to={it.to as never}
                onClick={onNavigate}
                className="block py-2 text-sm font-medium hover:opacity-80"
                style={{ color: MODAL_TEXT }}
              >
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LanguageGroup() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  return (
    <div className="border-b border-black/[0.04] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-3 text-left font-semibold text-base transition"
        style={{ color: MODAL_TEXT }}
        aria-expanded={open}
      >
        <span className="flex items-center gap-3">
          <FlagFor code={current.code} />
          <span>{t(`menu.lang.${current.code}`)}</span>
        </span>
        <ChevronDown size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="pb-2 pl-1 space-y-0.5">
          {LANGUAGES.map((l) => {
            const selected = l.code === lang;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  onClick={() => { setLang(l.code); setOpen(false); }}
                  className="w-full flex items-center justify-between py-2 px-2 rounded-md hover:bg-black/[0.03] text-sm font-medium"
                  style={{ color: MODAL_TEXT }}
                >
                  <span className="flex items-center gap-3">
                    <FlagFor code={l.code} size={20} />
                    <span>{t(`menu.lang.${l.code}`)}</span>
                  </span>
                  {selected && <Check size={18} style={{ color: BISME_BLUE }} strokeWidth={3} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ==================== Buttons ====================

function PrimaryButton({ children, to = "/empresario/cadastro", noShadow = false }: { children: React.ReactNode; to?: string; noShadow?: boolean }) {
  return (
    <Link
      to={to as never}
      className={`inline-flex items-center justify-center text-center text-white font-semibold px-7 py-3.5 rounded-full text-base hover:brightness-110 transition${noShadow ? "" : " shadow-[0_8px_24px_-8px_rgba(0,135,255,0.55)]"}`}
      style={{ backgroundColor: "#0087ff" }}
    >
      {children}
    </Link>
  );
}

// ==================== Sections ====================

function Hero() {
  const { t } = useI18n();
  return (
    <section className="max-w-[1120px] mx-auto px-5 md:px-8 pt-8 md:pt-12 pb-8 md:pb-12">
      <div className="grid md:grid-cols-2 md:gap-12 md:items-center">
        <div className="text-left">
          <h1 className="font-extrabold leading-[1.05] tracking-tight text-[#111]" style={{ fontSize: "30px" }}>
            {t("hero.title.l1")}<br />{t("hero.title.l2")}
          </h1>
          <p className="mt-4 text-base md:text-lg text-[#555] leading-relaxed max-w-xl">
            {t("hero.sub")}
          </p>
        </div>
        <div className="mt-6 md:mt-0">
          <img
            src={vendaHero}
            alt={t("hero.imgAlt")}
            className="w-full h-auto"
            style={{ aspectRatio: "1/1", objectFit: "contain" }}
          />
        </div>
      </div>
    </section>
  );
}

function RotinaSection() {
  const { t } = useI18n();
  return (
    <section className="max-w-[1120px] mx-auto px-5 md:px-8">
      <div className="text-left max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-extrabold text-[#111] tracking-tight">
          {t("rotina.title")}
        </h2>
        <p className="mt-3 text-base md:text-lg text-[#555] leading-relaxed">
          {t("rotina.sub")}
        </p>
      </div>
      <div className="mt-6 md:mt-8">
        <img src={vendaRotina} alt={t("rotina.imgAlt")} className="w-full h-auto" loading="lazy" />
      </div>
    </section>
  );
}

function SiteShowcaseSection() {
  const { t } = useI18n();
  return (
    <section className="max-w-[1120px] mx-auto px-5 md:px-8 py-10 md:py-14">
      <div className="text-left max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-extrabold text-[#111] tracking-tight">
          {t("sites.title")}
        </h2>
        <p className="mt-3 text-base md:text-lg text-[#555] leading-relaxed">
          {t("sites.sub")}
        </p>
      </div>
      <div className="mt-8 md:mt-10 flex justify-center">
        <img
          src={sitesShowcase}
          alt={t("sites.imgAlt")}
          className="w-full h-auto object-contain max-w-4xl"
          loading="lazy"
        />
      </div>
    </section>
  );
}

function ServicosSection() {
  const { t } = useI18n();
  return (
    <section className="max-w-[1120px] mx-auto px-5 md:px-8 pb-10 md:pb-14">
      <div className="text-left max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-extrabold text-[#111] tracking-tight">
          {t("servicos.title")}
        </h2>
        <p className="mt-3 text-base md:text-lg text-[#555] leading-relaxed">
          {t("servicos.sub")}
        </p>
      </div>
      <div className="mt-6 md:mt-8 max-w-4xl">
        <img src={dashboardPreview} alt={t("servicos.imgAlt")} className="w-full h-auto" loading="lazy" />
      </div>
    </section>
  );
}

function DepoimentosSection() {
  const { t } = useI18n();
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);

  const depos = [
    { texto: t("depo.1.texto"), nome: t("depo.1.nome"), profissao: t("depo.1.prof"), foto: depoRafaela },
    { texto: t("depo.2.texto"), nome: t("depo.2.nome"), profissao: t("depo.2.prof"), foto: depoLucas },
    { texto: t("depo.3.texto"), nome: t("depo.3.nome"), profissao: t("depo.3.prof"), foto: depoCamila },
  ];

  useEffect(() => {
    if (!api) return;
    setSelected(api.selectedScrollSnap());
    const handler = () => setSelected(api.selectedScrollSnap());
    api.on("select", handler);
    return () => {
      api.off("select", handler);
    };
  }, [api]);

  return (
    <section className="bg-white">
      <div className="max-w-[1120px] mx-auto px-5 md:px-8">
        <div className="text-left max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#111] tracking-tight">
            {t("depo.title")}
          </h2>
          <p className="mt-3 text-base md:text-lg text-[#555] leading-relaxed">
            {t("depo.sub")}
          </p>
        </div>

        <div className="mt-8 md:mt-10">
          <Carousel setApi={setApi} opts={{ loop: true, align: "start" }}>
            <CarouselContent>
              {depos.map((d, i) => (
                <CarouselItem key={i} className="md:basis-1/2 lg:basis-1/3">
                  <article className="h-full bg-[#7BA7F7] rounded-2xl p-6 md:p-7 shadow-[0_4px_20px_-12px_rgba(86,144,245,0.35)]">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} size={18} fill="#FACC15" color="#FACC15" />
                      ))}
                    </div>
                    <p className="text-white text-[15px] leading-relaxed">"{d.texto}"</p>
                    <div className="mt-5 pt-5 border-t border-white/20 flex items-center gap-3">
                      <img
                        src={d.foto}
                        alt={d.nome}
                        width={48}
                        height={48}
                        loading="lazy"
                        className="w-12 h-12 rounded-full object-cover ring-1 ring-white/30 flex-shrink-0"
                      />
                      <div>
                        <p className="font-bold text-white leading-tight">{d.nome}</p>
                        <p className="text-sm text-white/85">{d.profissao}</p>
                      </div>
                    </div>
                  </article>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          <div className="mt-6 flex items-center justify-center gap-2">
            {depos.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`slide ${i + 1}`}
                onClick={() => api?.scrollTo(i)}
                className="h-2.5 rounded-full transition-all"
                style={{
                  width: selected === i ? 24 : 10,
                  backgroundColor: selected === i ? ORANGE : "#e5e5e5",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const { t } = useI18n();
  const items = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
    { q: t("faq.q5"), a: t("faq.a5") },
  ];
  return (
    <section className="max-w-[800px] mx-auto px-5 md:px-8 py-12 md:py-16">
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-[#111] tracking-tight">
          {t("faq.title")}
        </h2>
        <p className="mt-4 text-base md:text-lg text-[#555] leading-relaxed">
          {t("faq.sub")}
        </p>
      </div>

      <Accordion type="single" collapsible className="mt-8 md:mt-10 space-y-3">
        {items.map((item, i) => (
          <AccordionItem
            key={i}
            value={`item-${i}`}
            className="bg-white border border-[#eeeeee] rounded-2xl px-5 md:px-6"
          >
            <AccordionTrigger className="text-left text-[15px] md:text-base font-semibold text-[#111] hover:no-underline py-5">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-[#555] text-[15px] leading-relaxed pb-5">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function CtaFinal() {
  const { t } = useI18n();
  return (
    <section className="max-w-[800px] mx-auto px-5 md:px-8 py-10 md:py-14 text-center">
      <h2 className="text-3xl md:text-4xl font-extrabold text-[#111] tracking-tight">
        {t("cta.title")}
      </h2>
      <p className="mt-3 text-base md:text-lg text-[#555] leading-relaxed max-w-xl mx-auto">
        {t("cta.sub")}
      </p>
      <div className="mt-6 flex justify-center">
        <PrimaryButton noShadow>{t("cta.btn")}</PrimaryButton>
      </div>
    </section>
  );
}

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.55a8.16 8.16 0 0 0 4.77 1.52V6.69h-1.84Z" />
    </svg>
  );
}

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.7c0-.92.26-1.55 1.58-1.55H17V4.27A22 22 0 0 0 14.55 4.14c-2.43 0-4.1 1.48-4.1 4.21V10.8H7.75V14h2.7v8h3.05Z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { icon: <Instagram size={18} />, label: "Instagram", href: "https://www.instagram.com/meubisme" },
  { icon: <FacebookIcon size={18} />, label: "Facebook", href: "https://www.facebook.com/meubisme" },
  { icon: <Youtube size={18} />, label: "YouTube", href: "https://www.youtube.com/@meubisme" },
  { icon: <TikTokIcon size={18} />, label: "TikTok", href: "https://www.tiktok.com/@meubisme?is_from_webapp=1&sender_device=pc" },
];

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="bg-white border-t-[3px]" style={{ borderTopColor: ORANGE }}>
      <div className="max-w-[1120px] mx-auto px-5 md:px-8 pt-4 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10">
          <div className="col-span-2">
            <img src={bismeHeaderLogo} alt="Bisme" className="h-10 w-auto mb-3" />
            <p className="text-[#555] text-sm leading-relaxed max-w-xs mb-5">
              {t("footer.desc")}
            </p>
            <h4 className="font-bold text-xs uppercase tracking-wider mb-3" style={{ color: ORANGE }}>
              {t("footer.redes")}
            </h4>
            <div className="flex gap-2.5">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-10 h-10 rounded-full bg-[#111] text-white flex items-center justify-center hover:bg-[color:var(--bisme-orange)] transition"
                  style={{ ["--bisme-orange" as string]: ORANGE }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider mb-3" style={{ color: ORANGE }}>
              {t("footer.institucional")}
            </h4>
            <ul className="space-y-2 text-sm text-[#555]">
              <li><Link to="/quem-somos" className="hover:text-[color:var(--bisme-orange)]" style={{ ["--bisme-orange" as string]: ORANGE }}>{t("menu.quemsomos")}</Link></li>
              <li><Link to="/termos-de-servico" className="hover:text-[color:var(--bisme-orange)]" style={{ ["--bisme-orange" as string]: ORANGE }}>{t("menu.termos")}</Link></li>
              <li><Link to="/politica-privacidade" className="hover:text-[color:var(--bisme-orange)]" style={{ ["--bisme-orange" as string]: ORANGE }}>{t("menu.privacidade")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider mb-3" style={{ color: ORANGE }}>
              {t("footer.comercial")}
            </h4>
            <ul className="space-y-2 text-sm text-[#555]">
              <li><Link to="/planos" className="hover:text-[color:var(--bisme-orange)]" style={{ ["--bisme-orange" as string]: ORANGE }}>{t("menu.planos")}</Link></li>
              <li><Link to="/empresario/cadastro" className="hover:text-[color:var(--bisme-orange)]" style={{ ["--bisme-orange" as string]: ORANGE }}>{t("menu.testegratis")}</Link></li>
              <li><Link to="/empresario/login" className="hover:text-[color:var(--bisme-orange)]" style={{ ["--bisme-orange" as string]: ORANGE }}>{t("menu.entrar")}</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="text-center text-xs md:text-sm font-medium text-white py-4 px-5" style={{ backgroundColor: ORANGE }}>
        {t("footer.copy")}
      </div>
    </footer>
  );
}

// ==================== Page ====================

function VendaPage() {
  void ArrowLeft; void ArrowRight;
  const [lang, setLangState] = useState<Lang>("pt-BR");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
      if (stored && translations[stored]) setLangState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const ctx = useMemo<I18nCtx>(() => ({
    lang,
    setLang: (l) => {
      setLangState(l);
      try { localStorage.setItem(LANG_STORAGE_KEY, l); } catch { /* ignore */ }
    },
    t: (k) => translations[lang][k] ?? translations["pt-BR"][k] ?? k,
  }), [lang]);

  return (
    <I18nContext.Provider value={ctx}>
      <div
        className="min-h-screen bg-white text-[#111] antialiased"
        style={{ fontFamily: '"Open Sans", "Segoe UI", Helvetica, Arial, sans-serif' }}
      >
        <Header />
        <main>
          <Hero />
          <RotinaSection />
          <SiteShowcaseSection />
          <ServicosSection />
          <DepoimentosSection />
          <FaqSection />
        </main>
        <Footer />
      </div>
    </I18nContext.Provider>
  );
}

// keep exported for potential reuse
void CtaFinal;
