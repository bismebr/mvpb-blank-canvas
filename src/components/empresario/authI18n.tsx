import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ChevronDown, Check } from "lucide-react";

// Scoped shared storage — same key /venda uses, so the language selected on
// the sales page carries over into /empresario/login and /empresario/cadastro.
const LANG_STORAGE_KEY = "bisme.venda.lang";

export type Lang = "pt-BR" | "en" | "es" | "fr" | "it";

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: "pt-BR", label: "Português brasileiro" },
  { code: "en", label: "Inglês" },
  { code: "es", label: "Espanhol" },
  { code: "fr", label: "Francês" },
  { code: "it", label: "Italiano" },
];

const BISME_BLUE = "#5690f5";

// ==================== Round flag SVGs (shared with /venda visuals) ====================

export function FlagBR({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><clipPath id="fbrX"><circle cx="12" cy="12" r="12" /></clipPath></defs>
      <g clipPath="url(#fbrX)">
        <rect width="24" height="24" fill="#009c3b" />
        <polygon points="12,4 20,12 12,20 4,12" fill="#ffdf00" />
        <circle cx="12" cy="12" r="3.4" fill="#002776" />
        <path
          d="M9.2 12.4a5 5 0 0 1 5.6-0.9"
          stroke="#ffffff"
          strokeWidth="0.55"
          fill="none"
        />
      </g>
      <circle cx="12" cy="12" r="11.6" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.8" />
    </svg>
  );
}

export function FlagGB({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true">
      <defs><clipPath id="fgbX"><circle cx="30" cy="30" r="30" /></clipPath></defs>
      <g clipPath="url(#fgbX)">
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

export function FlagES({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><clipPath id="fesX"><circle cx="12" cy="12" r="12" /></clipPath></defs>
      <g clipPath="url(#fesX)">
        <rect width="24" height="24" fill="#c60b1e" />
        <rect y="6" width="24" height="12" fill="#ffc400" />
      </g>
      <circle cx="12" cy="12" r="11.6" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.8" />
    </svg>
  );
}

export function FlagFR({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><clipPath id="ffrX"><circle cx="12" cy="12" r="12" /></clipPath></defs>
      <g clipPath="url(#ffrX)">
        <rect width="8" height="24" fill="#0055A4" />
        <rect x="8" width="8" height="24" fill="#fff" />
        <rect x="16" width="8" height="24" fill="#EF4135" />
      </g>
      <circle cx="12" cy="12" r="11.6" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.8" />
    </svg>
  );
}

export function FlagIT({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><clipPath id="fitX"><circle cx="12" cy="12" r="12" /></clipPath></defs>
      <g clipPath="url(#fitX)">
        <rect width="8" height="24" fill="#008C45" />
        <rect x="8" width="8" height="24" fill="#F4F5F0" />
        <rect x="16" width="8" height="24" fill="#CD212A" />
      </g>
      <circle cx="12" cy="12" r="11.6" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.8" />
    </svg>
  );
}

export function FlagFor({ code, size = 22 }: { code: Lang; size?: number }) {
  switch (code) {
    case "pt-BR": return <FlagBR size={size} />;
    case "en": return <FlagGB size={size} />;
    case "es": return <FlagES size={size} />;
    case "fr": return <FlagFR size={size} />;
    case "it": return <FlagIT size={size} />;
  }
}

// ==================== Dictionaries (login + cadastro only) ====================

type Dict = Record<string, string>;

export const dict: Record<Lang, Dict> = {
  "pt-BR": {
    "login.title": "Entrar na conta",
    "login.button": "Entrar com e-mail",
    "signup.title": "Criar uma conta",
    "signup.button": "Continuar com e-mail",
    "form.email": "Endereço de e-mail",
    "form.password": "Senha",
    "form.show": "EXIBIR",
    "form.hide": "OCULTAR",
    "form.emailInvalid": "Informe um endereço de e-mail válido",
    "form.or": "OU",
    "form.google": "Continuar com o Google",
    "form.wait": "Aguarde...",
    "req.title": "A senha deve conter:",
    "req.letter": "ao menos uma letra",
    "req.digit": "ao menos um dígito",
    "req.length": "8 caracteres ou mais",
    "login.forgot": "Esqueci minha senha",
    "login.altQuestion": "Não tem uma conta?",
    "login.altLink": "Cadastre-se",
    "signup.altQuestion": "Já tem uma conta?",
    "signup.altLink": "Entrar",
    "agreement.login": "Ao continuar, você concorda com",
    "agreement.signup": "Ao inscrever-se, você concorda com",
    "agreement.terms": "Termos de Serviço",
    "agreement.privacy": "Política de Privacidade",
    "agreement.and": "e",
    "menu.language": "Idioma",
    "lang.pt-BR": "Português brasileiro",
    "lang.en": "Inglês",
    "lang.es": "Espanhol",
    "lang.fr": "Francês",
    "lang.it": "Italiano",
  },
  en: {
    "login.title": "Sign in to your account",
    "login.button": "Sign in with email",
    "signup.title": "Create an account",
    "signup.button": "Continue with email",
    "form.email": "Email address",
    "form.password": "Password",
    "form.show": "SHOW",
    "form.hide": "HIDE",
    "form.emailInvalid": "Please enter a valid email address",
    "form.or": "OR",
    "form.google": "Continue with Google",
    "form.wait": "Please wait...",
    "req.title": "Password must contain:",
    "req.letter": "at least one letter",
    "req.digit": "at least one digit",
    "req.length": "8 characters or more",
    "login.forgot": "Forgot my password",
    "login.altQuestion": "Don't have an account?",
    "login.altLink": "Sign up",
    "signup.altQuestion": "Already have an account?",
    "signup.altLink": "Sign in",
    "agreement.login": "By continuing, you agree to the",
    "agreement.signup": "By signing up, you agree to the",
    "agreement.terms": "Terms of Service",
    "agreement.privacy": "Privacy Policy",
    "agreement.and": "and",
    "menu.language": "Language",
    "lang.pt-BR": "Brazilian Portuguese",
    "lang.en": "English",
    "lang.es": "Spanish",
    "lang.fr": "French",
    "lang.it": "Italian",
  },
  es: {
    "login.title": "Iniciar sesión",
    "login.button": "Entrar con correo",
    "signup.title": "Crear una cuenta",
    "signup.button": "Continuar con correo",
    "form.email": "Correo electrónico",
    "form.password": "Contraseña",
    "form.show": "MOSTRAR",
    "form.hide": "OCULTAR",
    "form.emailInvalid": "Ingresa un correo electrónico válido",
    "form.or": "O",
    "form.google": "Continuar con Google",
    "form.wait": "Espera...",
    "req.title": "La contraseña debe contener:",
    "req.letter": "al menos una letra",
    "req.digit": "al menos un dígito",
    "req.length": "8 caracteres o más",
    "login.forgot": "Olvidé mi contraseña",
    "login.altQuestion": "¿No tienes una cuenta?",
    "login.altLink": "Regístrate",
    "signup.altQuestion": "¿Ya tienes una cuenta?",
    "signup.altLink": "Entrar",
    "agreement.login": "Al continuar, aceptas los",
    "agreement.signup": "Al registrarte, aceptas los",
    "agreement.terms": "Términos de Servicio",
    "agreement.privacy": "Política de Privacidad",
    "agreement.and": "y",
    "menu.language": "Idioma",
    "lang.pt-BR": "Portugués brasileño",
    "lang.en": "Inglés",
    "lang.es": "Español",
    "lang.fr": "Francés",
    "lang.it": "Italiano",
  },
  fr: {
    "login.title": "Se connecter",
    "login.button": "Se connecter avec un e-mail",
    "signup.title": "Créer un compte",
    "signup.button": "Continuer avec un e-mail",
    "form.email": "Adresse e-mail",
    "form.password": "Mot de passe",
    "form.show": "AFFICHER",
    "form.hide": "MASQUER",
    "form.emailInvalid": "Veuillez saisir une adresse e-mail valide",
    "form.or": "OU",
    "form.google": "Continuer avec Google",
    "form.wait": "Veuillez patienter...",
    "req.title": "Le mot de passe doit contenir :",
    "req.letter": "au moins une lettre",
    "req.digit": "au moins un chiffre",
    "req.length": "8 caractères ou plus",
    "login.forgot": "Mot de passe oublié",
    "login.altQuestion": "Vous n'avez pas de compte ?",
    "login.altLink": "S'inscrire",
    "signup.altQuestion": "Vous avez déjà un compte ?",
    "signup.altLink": "Se connecter",
    "agreement.login": "En continuant, vous acceptez les",
    "agreement.signup": "En vous inscrivant, vous acceptez les",
    "agreement.terms": "Conditions d'utilisation",
    "agreement.privacy": "Politique de confidentialité",
    "agreement.and": "et",
    "menu.language": "Langue",
    "lang.pt-BR": "Portugais brésilien",
    "lang.en": "Anglais",
    "lang.es": "Espagnol",
    "lang.fr": "Français",
    "lang.it": "Italien",
  },
  it: {
    "login.title": "Accedi al tuo account",
    "login.button": "Accedi con e-mail",
    "signup.title": "Crea un account",
    "signup.button": "Continua con e-mail",
    "form.email": "Indirizzo e-mail",
    "form.password": "Password",
    "form.show": "MOSTRA",
    "form.hide": "NASCONDI",
    "form.emailInvalid": "Inserisci un indirizzo e-mail valido",
    "form.or": "O",
    "form.google": "Continua con Google",
    "form.wait": "Attendere...",
    "req.title": "La password deve contenere:",
    "req.letter": "almeno una lettera",
    "req.digit": "almeno una cifra",
    "req.length": "8 caratteri o più",
    "login.forgot": "Ho dimenticato la password",
    "login.altQuestion": "Non hai un account?",
    "login.altLink": "Registrati",
    "signup.altQuestion": "Hai già un account?",
    "signup.altLink": "Accedi",
    "agreement.login": "Continuando, accetti i",
    "agreement.signup": "Registrandoti, accetti i",
    "agreement.terms": "Termini di Servizio",
    "agreement.privacy": "Informativa sulla Privacy",
    "agreement.and": "e",
    "menu.language": "Lingua",
    "lang.pt-BR": "Portoghese brasiliano",
    "lang.en": "Inglese",
    "lang.es": "Spagnolo",
    "lang.fr": "Francese",
    "lang.it": "Italiano",
  },
};

// ==================== Provider / hook ====================

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const AuthI18nContext = createContext<Ctx | null>(null);

function readInitialLang(): Lang {
  if (typeof window === "undefined") return "pt-BR";
  try {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("lang");
    if (q && (q in dict)) return q as Lang;
  } catch { /* ignore */ }
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && (stored in dict)) return stored as Lang;
  } catch { /* ignore */ }
  return "pt-BR";
}

export function AuthI18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pt-BR");

  useEffect(() => { setLangState(readInitialLang()); }, []);

  const ctx = useMemo<Ctx>(() => ({
    lang,
    setLang: (l) => {
      setLangState(l);
      try { window.localStorage.setItem(LANG_STORAGE_KEY, l); } catch { /* ignore */ }
    },
    t: (k) => dict[lang][k] ?? dict["pt-BR"][k] ?? k,
  }), [lang]);

  return <AuthI18nContext.Provider value={ctx}>{children}</AuthI18nContext.Provider>;
}

export function useAuthI18n(): Ctx {
  const c = useContext(AuthI18nContext);
  if (!c) throw new Error("useAuthI18n outside provider");
  return c;
}

// ==================== Language selector (header widget) ====================

export function LanguageSelector() {
  const { lang, setLang, t } = useAuthI18n();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={wrapStyle}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("menu.language")}
        aria-expanded={open}
        style={triggerStyle}
      >
        <FlagFor code={lang} size={24} />
        <ChevronDown
          size={16}
          strokeWidth={2.2}
          style={{
            marginLeft: 4,
            color: "#6F6F6F",
            transition: "transform 150ms",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {open && (
        <div style={dropdownStyle} role="menu">
          {LANGUAGES.map((l) => {
            const selected = l.code === lang;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => { setLang(l.code); setOpen(false); }}
                style={itemStyle}
                role="menuitem"
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <FlagFor code={l.code} size={20} />
                  <span style={{ fontSize: 14, color: "#464646", fontWeight: selected ? 600 : 500 }}>
                    {t(`lang.${l.code}`)}
                  </span>
                </span>
                {selected && <Check size={16} strokeWidth={3} style={{ color: BISME_BLUE }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const wrapStyle: CSSProperties = { position: "relative", display: "inline-flex" };

const triggerStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  padding: "4px 8px 4px 6px",
  background: "transparent",
  border: "1px solid transparent",
  borderRadius: 999,
  cursor: "pointer",
  lineHeight: 0,
};

const dropdownStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  minWidth: 220,
  background: "#FFFFFF",
  border: "1px solid #E4E4E4",
  borderRadius: 10,
  padding: 6,
  boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
  zIndex: 60,
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const itemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  width: "100%",
  padding: "8px 10px",
  background: "transparent",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  textAlign: "left",
};
