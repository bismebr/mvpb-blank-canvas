import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type ChangeEvent } from "react";
import { ArrowLeft, Check, Plus, Trash2, Pencil, X, ImagePlus } from "lucide-react";
import { LANDING_ASSETS } from "@/config/assets";
const megaphoneNewUrl = LANDING_ASSETS.megaphone;
const benefitAgenda = LANDING_ASSETS.benefitAgenda;
const benefitGestao = LANDING_ASSETS.benefitGestao;
const benefitLink = LANDING_ASSETS.benefitLink;
const benefitWhatsapp = LANDING_ASSETS.benefitWhatsapp;
import { useApp } from "@/components/admin/AppContext";
import { useSiteConfig, buildGoogleMapsLink, SiteConfigProvider, EMPTY_OWNER_CONFIG } from "@/components/admin/SiteConfigContext";
import { ImageCropper } from "@/components/admin/ImageCropper";
import { LoadingOverlay } from "@/components/barbearia/LoadingOverlay";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/empresario/onboarding")({
  head: () => ({
    meta: [
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "Configuração inicial — Bisme" },
      { name: "description", content: "Configure os dados básicos da sua empresa no Bisme." },
    ],
  }),
  component: OnboardingEmpresarioWithOwnerConfig,
});

/**
 * Onboarding começa SEMPRE do zero: nada do site modelo/demo deve aparecer.
 * Wrapper aninha um SiteConfigProvider próprio com EMPTY_OWNER_CONFIG, então
 * os campos abrem vazios com placeholders — o proprietário só vê o que ele
 * mesmo cadastrar.
 */
function OnboardingEmpresarioWithOwnerConfig() {
  return (
    <SiteConfigProvider initialConfig={EMPTY_OWNER_CONFIG}>
      <OnboardingEmpresario />
    </SiteConfigProvider>
  );
}

/* ---------- Design tokens ---------- */
const FONT =
  'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const C = {
  bg: "#FFFFFF",
  border: "#E4E4E4",
  borderSoft: "#F0F0F0",
  text: "#111111",
  textMuted: "#6F6F6F",
  textPlaceholder: "#9A9A9A",
  black: "#111111",
  primaryBtn: "#5690f5",
  progress: "#5690f5",
  selected: "#5690f5",
  progressTrack: "#EFEFEF",
  fieldBg: "#FFFFFF",
};

const TOTAL_STEPS = 10;

import { type SiteTemplateId } from "@/lib/siteTemplates";


type CategoryId = string;

type LocationType = "establishment" | "client_home" | null;
type TeamSize = "solo" | "2-4" | "5-9" | "10+" | null;

interface Employee { id: string; nome: string; role: string; prestaServico: boolean }
interface DayHours { open: boolean; start: string; end: string }
interface Service { id: string; nome: string; durationMin: number; price: number; imagemUrl?: string }
interface AddressData {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  number: string;
  noNumber: boolean;
  complement: string;
}

const DEFAULT_HOURS: Record<string, DayHours> = {
  seg: { open: true, start: "10:00", end: "19:00" },
  ter: { open: true, start: "10:00", end: "19:00" },
  qua: { open: true, start: "10:00", end: "19:00" },
  qui: { open: true, start: "10:00", end: "19:00" },
  sex: { open: true, start: "10:00", end: "19:00" },
  sab: { open: false, start: "10:00", end: "19:00" },
  dom: { open: false, start: "10:00", end: "19:00" },
};
const DAY_LABELS: [string, string][] = [
  ["seg", "Segunda-feira"], ["ter", "Terça-feira"], ["qua", "Quarta-feira"],
  ["qui", "Quinta-feira"], ["sex", "Sexta-feira"], ["sab", "Sábado"], ["dom", "Domingo"],
];

function formatDuration(min: number) {
  if (min <= 0) return "0 minutos";
  if (min < 60) return `${min} ${min === 1 ? "minuto" : "minutos"}`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  const hStr = `${h} ${h === 1 ? "hora" : "horas"}`;
  if (r === 0) return hStr;
  const rStr = `${r} ${r === 1 ? "minuto" : "minutos"}`;
  return `${hStr} e ${rStr}`;
}
function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function firstName(full: string) {
  return full.trim().split(/\s+/)[0] || "";
}
function maskCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length > 5) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return d;
}
function maskPhoneBR(v: string) {
  let d = v.replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function isPhoneBrValid(v: string) {
  const d = v.replace(/\D/g, "");
  const n = (d.length === 12 || d.length === 13) && d.startsWith("55") ? d.slice(2) : d;
  return n.length === 11 && n.charAt(2) === "9";
}


function OnboardingEmpresario() {
  const navigate = useNavigate();
  const { setAdmin, setAdminName, setAdminEmail } = useApp();
  const { updateConfig } = useSiteConfig();

  // Guard: exige sessão Supabase; se já tem empresa, redireciona para /admin.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!userData.user) {
        navigate({ to: "/empresario/login", replace: true });
        return;
      }
      if (userData.user.email) setAdminEmail(userData.user.email);
      setAdmin(true);
      const { data: member } = await supabase
        .from("company_members")
        .select("company_id")
        .limit(1)
        .maybeSingle();
      if (!cancelled && member?.company_id) {
        navigate({ to: "/admin", search: { tab: "agendamentos" }, replace: true });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onboardingRootRef = useRef<HTMLDivElement | null>(null);
  const onboardingMainRef = useRef<HTMLElement | null>(null);
  const continueBtnRef = useRef<HTMLButtonElement | null>(null);
  const [step, setStep] = useState(1);

  // dados coletados
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [referral, setReferral] = useState("");
  const [showReferral, setShowReferral] = useState(false);

  const [locationType, setLocationType] = useState<LocationType>(null);
  // Quando "Na casa do cliente" é selecionado, o cliente pode optar por
  // adicionar (ou não) o endereço ao perfil público da Bisme.
  // Campo preparado para futura persistência no Supabase.
  const [addAddressToProfile, setAddAddressToProfile] = useState(true);

  const [addr, setAddr] = useState<AddressData>({
    cep: "", street: "", neighborhood: "", city: "", state: "",
    number: "", noNumber: false, complement: "",
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [addrTouched, setAddrTouched] = useState(false);

  const [teamSize, setTeamSize] = useState<TeamSize>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpRole, setNewEmpRole] = useState("");
  const [newEmpPrestaServico, setNewEmpPrestaServico] = useState<boolean | null>(null);

  const [hours, setHours] = useState(DEFAULT_HOURS);

  const [services, setServices] = useState<Service[]>([]);
  const [serviceModal, setServiceModal] = useState<{ editingId: string | null } | null>(null);
  const [svcForm, setSvcForm] = useState<{ nome: string; hours: string; minutes: string; price: string; imagemUrl?: string }>({
    nome: "", hours: "", minutes: "", price: "", imagemUrl: undefined,
  });
  const [svcCropSrc, setSvcCropSrc] = useState<string | null>(null);
  const svcImageInputRef = useRef<HTMLInputElement | null>(null);

  // Slug do link público
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  // Modelo do site escolhido na etapa 11
  const [selectedTemplate, setSelectedTemplate] = useState<SiteTemplateId | null>(null);

  const [loading, setLoading] = useState(false);

  // Pula a etapa de endereço quando o cliente atende em casa
  // e optou por não publicar o endereço no perfil.
  const skipAddressStep = locationType === "client_home" && !addAddressToProfile;

  function forceOnboardingTop() {
    if (typeof window === "undefined") return;

    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlBehavior = html.style.scrollBehavior;
    const previousBodyBehavior = body.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    body.style.scrollBehavior = "auto";

    const target = onboardingRootRef.current;
    const alignWindow = () => {
      const top = target ? Math.max(0, window.pageYOffset + target.getBoundingClientRect().top) : 0;
      window.scrollTo({ top, left: 0, behavior: "auto" });
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop = top;
        document.scrollingElement.scrollLeft = 0;
      }
      html.scrollTop = top;
      body.scrollTop = top;
    };

    alignWindow();
    onboardingRootRef.current && (onboardingRootRef.current.scrollTop = 0);
    onboardingMainRef.current && (onboardingMainRef.current.scrollTop = 0);

    window.requestAnimationFrame(() => {
      html.style.scrollBehavior = previousHtmlBehavior;
      body.style.scrollBehavior = previousBodyBehavior;
    });
  }

  // Sempre rolar para o início real do onboarding ao trocar de etapa,
  // usando o header como única referência de alinhamento.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    const resetScroll = () => forceOnboardingTop();


    resetScroll();
    const frame1 = window.requestAnimationFrame(resetScroll);
    const frame2 = window.requestAnimationFrame(() => window.requestAnimationFrame(resetScroll));
    const t1 = window.setTimeout(resetScroll, 50);
    const t2 = window.setTimeout(resetScroll, 150);

    return () => {
      window.cancelAnimationFrame(frame1);
      window.cancelAnimationFrame(frame2);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [step]);

  function back() {
    if (step === 1) {
      navigate({ to: "/empresario/cadastro" });
      return;
    }
    setStep((s) => {
      let n = s - 1;
      if (n === 4 && skipAddressStep) n = 3;
      if (n === 6 && teamSize === "solo") n = 5;
      return Math.max(1, n);
    });
  }
  function next() {
    setStep((s) => {
      let n = s + 1;
      if (n === 4 && skipAddressStep) n = 5;
      if (n === 6 && teamSize === "solo") n = 7;
      return Math.min(TOTAL_STEPS, n);
    });
  }

  async function finish() {
    setLoading(true);
    // Normaliza telefone para E.164 (Brasil).
    const digits = phone.replace(/\D/g, "");
    const phoneE164 = digits
      ? `+55${digits.startsWith("55") ? digits.slice(2) : digits}`
      : "";
    const nameToSave = businessName.trim() || "Minha Empresa";
    const slugToSave = (slug.trim() || "minhaempresa").toLowerCase();

    // Idempotência: se já existe empresa para o usuário, reaproveita.
    let companyId: string | null = null;
    const { data: existingMember } = await supabase
      .from("company_members")
      .select("company_id")
      .limit(1)
      .maybeSingle();
    if (existingMember?.company_id) {
      companyId = existingMember.company_id;
      // Atualiza nome/slug se o usuário modificou.
      await supabase
        .from("companies")
        .update({ name: nameToSave, slug: slugToSave })
        .eq("id", companyId);
    } else {
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        "create_company_for_current_user",
        { _name: nameToSave, _slug: slugToSave },
      );
      if (rpcErr || !rpcData) {
        setLoading(false);
        alert(`Não foi possível criar a empresa: ${rpcErr?.message ?? "erro desconhecido"}`);
        return;
      }
      companyId = rpcData as unknown as string;
    }

    const numberPart = addr.noNumber ? "s/n" : addr.number;
    const fullAddress = [
      [addr.street, numberPart].filter(Boolean).join(", "),
      addr.complement,
      addr.neighborhood,
      [addr.city, addr.state].filter(Boolean).join(" - "),
    ].filter(Boolean).join(" - ");
    const shouldPersistAddress =
      locationType !== "client_home" || addAddressToProfile;

    try {
      // profiles.phone (E.164)
      if (phoneE164) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          await supabase
            .from("profiles")
            .update({ phone: phoneE164 })
            .eq("id", userData.user.id);
        }
      }

      // site_settings (RPC já criou a linha; aqui só atualizamos)
      const siteUpdate: {
        display_name?: string;
        template_key?: string;
        address?: string;
        whatsapp?: string;
      } = { display_name: nameToSave };
      if (selectedTemplate) siteUpdate.template_key = selectedTemplate;
      if (shouldPersistAddress && fullAddress) siteUpdate.address = fullAddress;
      if (phoneE164) siteUpdate.whatsapp = phoneE164;
      await supabase
        .from("site_settings")
        .update(siteUpdate)
        .eq("company_id", companyId);

      // business_hours: RPC já criou 7 linhas; atualiza por weekday.
      // weekday: 0=Dom..6=Sáb (consistente com extract(dow))
      const DAY_TO_WEEKDAY: Record<string, number> = {
        dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6,
      };
      const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
      for (const [key, h] of Object.entries(hours)) {
        const weekday = DAY_TO_WEEKDAY[key];
        if (weekday === undefined) continue;
        const opens = TIME_RE.test(h.start) ? h.start : "08:00";
        let closes = TIME_RE.test(h.end) ? h.end : "18:00";
        // constraint: closes_at > opens_at
        if (closes <= opens) closes = opens === "23:00" ? "23:59" : "18:00";
        await supabase
          .from("business_hours")
          .update({ is_open: !!h.open, opens_at: opens, closes_at: closes })
          .eq("company_id", companyId)
          .eq("weekday", weekday);
      }

      // services (insertar apenas se houver; evita duplicar usando nome)
      if (services.length > 0) {
        const { data: existingSvcs } = await supabase
          .from("services")
          .select("name")
          .eq("company_id", companyId);
        const existingNames = new Set(
          (existingSvcs ?? []).map((s) => s.name.toLowerCase()),
        );
        const newSvcs = services
          .filter((s) => !existingNames.has(s.nome.trim().toLowerCase()))
          .map((s) => ({
            company_id: companyId!,
            name: s.nome.trim(),
            price_cents: Math.max(0, Math.round((s.price || 0) * 100)),
            duration_minutes: Math.max(1, Math.round(s.durationMin || 30)),
            image_url: s.imagemUrl ?? null,
            is_active: true,
          }));
        if (newSvcs.length > 0) {
          await supabase.from("services").insert(newSvcs);
        }
      }

      // professionals (cadastrados pelo usuário → is_visible=true)
      if (employees.length > 0) {
        const { data: existingPros } = await supabase
          .from("professionals")
          .select("name, is_default_owner")
          .eq("company_id", companyId);
        const existingProNames = new Set(
          (existingPros ?? [])
            .filter((p) => !p.is_default_owner)
            .map((p) => p.name.toLowerCase()),
        );
        const newPros = employees
          .filter((e) => e.nome.trim() && !existingProNames.has(e.nome.trim().toLowerCase()))
          .map((e) => ({
            company_id: companyId!,
            name: e.nome.trim(),
            role_title: e.role.trim() || null,
            is_visible: true,
            is_active: true,
            is_default_owner: false,
          }));
        if (newPros.length > 0) {
          await supabase.from("professionals").insert(newPros);
        }
      }

      // service_professionals é sincronizado por triggers existentes
      // (trg_services_autolink / trg_pros_autolink). Sem lógica paralela.
    } catch (err) {
      // Não bloqueia a navegação por falhas pontuais — apenas loga.
      console.error("[onboarding] persistência parcial falhou:", err);
    }

    updateConfig({
      businessName: nameToSave,
      address: fullAddress,
      googleMapsLink: buildGoogleMapsLink(`${addr.street} ${addr.city}`),
      username: slugToSave,
      siteCompleted: false,
      showAddress: shouldPersistAddress,
      ...(selectedTemplate ? { template: selectedTemplate } : {}),
    });
    if (fullName.trim()) setAdminName(fullName.trim());
    setAdmin(true);
    navigate({ to: "/admin", search: { tab: "configuracoes" } });
    // Mantém o overlay até a navegação efetivar (componente desmonta).
  }

  // ViaCEP lookup
  async function lookupCep(rawCep: string) {
    const cep = rawCep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    setCepError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError("CEP não encontrado. Preencha manualmente.");
        setAddrTouched(true);
        return;
      }
      setAddr((a) => ({
        ...a,
        street: data.logradouro || a.street,
        neighborhood: data.bairro || a.neighborhood,
        city: data.localidade || a.city,
        state: data.uf || a.state,
      }));
      setAddrTouched(true);
    } catch {
      setCepError("Não foi possível buscar o CEP. Preencha manualmente.");
      setAddrTouched(true);
    } finally {
      setCepLoading(false);
    }
  }

  // validação por etapa
  const canContinue = useMemo(() => {
    switch (step) {
      case 1: return !!category;
      case 2: return businessName.trim().length > 1 && fullName.trim().length > 1 && isPhoneBrValid(phone);
      case 3: return !!locationType;
      case 4: {
        const cepOk = addr.cep.replace(/\D/g, "").length === 8;
        const numberOk = addr.noNumber || addr.number.trim().length > 0;
        return cepOk && addr.street.trim() !== "" && addr.city.trim() !== "" && addr.state.trim() !== "" && numberOk;
      }
      case 5: return !!teamSize;
      case 6: return true;
      case 7: return Object.values(hours).some((h) => h.open);
      case 8: return services.length >= 2;
      case 9: return slugStatus === "available";
      case 10: return !!selectedTemplate;
      default: return false;
    }
  }, [step, category, businessName, fullName, phone, locationType, addr, teamSize, hours, services, slugStatus, selectedTemplate]);

  function handlePrimary() {
    if (!canContinue) return;
    const scrollTop = () => forceOnboardingTop();

    scrollTop();
    if (step === TOTAL_STEPS) finish();
    else {
      next();
      requestAnimationFrame(scrollTop);
      setTimeout(scrollTop, 50);
      setTimeout(scrollTop, 150);
    }
  }

  function scrollToContinue() {
    requestAnimationFrame(() => {
      continueBtnRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  // service modal helpers
  function openNewService() {
    setSvcForm({ nome: "", hours: "", minutes: "", price: "", imagemUrl: undefined });
    setServiceModal({ editingId: null });
  }
  function openEditService(s: Service) {
    const h = Math.floor(s.durationMin / 60);
    const m = s.durationMin % 60;
    setSvcForm({
      nome: s.nome,
      hours: h ? String(h) : "",
      minutes: m ? String(m) : "",
      price: s.price.toFixed(2).replace(".", ","),
      imagemUrl: s.imagemUrl,
    });
    setServiceModal({ editingId: s.id });
  }
  const svcMinutesTotal = (parseInt(svcForm.hours || "0", 10) || 0) * 60 + (parseInt(svcForm.minutes || "0", 10) || 0);
  function saveService() {
    const nome = svcForm.nome.trim();
    const minutes = svcMinutesTotal;
    const price = parseFloat(svcForm.price.replace(/\./g, "").replace(",", ".")) || 0;
    if (!nome || minutes <= 0 || !price) return;
    if (serviceModal?.editingId) {
      setServices((arr) => arr.map((x) => x.id === serviceModal.editingId ? { ...x, nome, durationMin: minutes, price, imagemUrl: svcForm.imagemUrl } : x));
    } else {
      setServices((arr) => [...arr, { id: Math.random().toString(36).slice(2), nome, durationMin: minutes, price, imagemUrl: svcForm.imagemUrl }]);
    }
    setServiceModal(null);
  }

  function onSvcImageFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSvcCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  function addEmployee() {
    const nome = newEmpName.trim();
    const role = newEmpRole.trim();
    if (!nome || newEmpPrestaServico === null) return;
    setEmployees((a) => [...a, { id: Math.random().toString(36).slice(2), nome, role, prestaServico: newEmpPrestaServico }]);
    setNewEmpName("");
    setNewEmpRole("");
    setNewEmpPrestaServico(null);
    setShowAddEmployee(false);
  }

  return (
    <div ref={onboardingRootRef} data-onboarding-scroll-container style={{ background: C.bg, minHeight: "100vh", fontFamily: FONT, color: C.text, overflowAnchor: "none" }}>
      {/* Top bar com voltar e progresso */}
      <div style={topBar}>
        <button type="button" onClick={back} aria-label="Voltar" style={backBtn}>
          <ArrowLeft size={22} />
        </button>
        <div style={progressWrap}>
          <div style={progressTrack}>
            <div style={{ ...progressFill, width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>
      </div>

      <main ref={onboardingMainRef} style={pageWrap}>
        {step === 1 && (
          <StepCategory value={category} onChange={setCategory} onAutoAdvance={scrollToContinue} />
        )}

        {step === 2 && (
          <StepSobre
            businessName={businessName} setBusinessName={setBusinessName}
            fullName={fullName} setFullName={setFullName}
            phone={phone} setPhone={setPhone}
            referral={referral} setReferral={setReferral}
            showReferral={showReferral} setShowReferral={setShowReferral}
          />
        )}

        {step === 3 && (
          <StepLocationType
            name={firstName(fullName)}
            value={locationType}
            onChange={setLocationType}
            addAddressToProfile={addAddressToProfile}
            setAddAddressToProfile={setAddAddressToProfile}
          />
        )}

        {step === 4 && (
          <StepAddress
            addr={addr} setAddr={setAddr}
            onCepLookup={lookupCep}
            cepLoading={cepLoading}
            cepError={cepError}
            showFields={addrTouched || addr.street.length > 0}
          />
        )}

        {step === 5 && (
          <StepTeamSize value={teamSize} onChange={setTeamSize} />
        )}

        {step === 6 && (
          <StepEmployees
            ownerName={fullName || "Você"}
            employees={employees}
            onRemove={(id) => setEmployees((a) => a.filter((e) => e.id !== id))}
            onOpenAdd={() => setShowAddEmployee(true)}
          />
        )}

        {step === 7 && (
          <StepHours hours={hours} setHours={setHours} />
        )}

        {step === 8 && (
          <StepServices
            services={services}
            onAdd={openNewService}
            onEdit={openEditService}
            onRemove={(id) => setServices((a) => a.filter((s) => s.id !== id))}
          />
        )}

        {step === 9 && (
          <StepSlug value={slug} onChange={setSlug} status={slugStatus} setStatus={setSlugStatus} businessName={businessName} />
        )}

        {step === 10 && (
          <StepTemplate
            selected={selectedTemplate}
            onSelect={(id) => { setSelectedTemplate(id); }}
          />
        )}

        <div style={{ height: 28 }} />

        <button
          ref={continueBtnRef}
          type="button"
          onClick={handlePrimary}
          disabled={!canContinue || loading}
          style={{
            ...primaryButton,
            opacity: canContinue && !loading ? 1 : 0.45,
            cursor: canContinue && !loading ? "pointer" : "not-allowed",
          }}
        >
          {step === 10
            ? (loading ? "Iniciando..." : "CONTINUAR")
            : (loading ? "Finalizando..." : "CONTINUAR")}

        </button>
      </main>

      {loading && step === 10 && (
        <LoadingOverlay message="Preparando seu painel..." />
      )}


      {/* Modal: adicionar funcionário */}
      <BottomModal
        open={showAddEmployee}
        title="Adicionar funcionário"
        onClose={() => setShowAddEmployee(false)}
      >
        <Field label="Nome do funcionário">
          <input
            value={newEmpName}
            onChange={(e) => setNewEmpName(e.target.value)}
            placeholder="Nome e sobrenome"
            style={textInput}
          />
        </Field>
        <div style={{ height: 14 }} />
        <Field label="Cargo">
          <input
            value={newEmpRole}
            onChange={(e) => setNewEmpRole(e.target.value)}
            placeholder="Digite o cargo"
            style={textInput}
          />
        </Field>
        <div style={{ height: 18 }} />
        <Field label="Este funcionário vai prestar serviços e poderá ser selecionado pelos clientes no agendamento?">
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            {[
              { id: true, label: "Sim" },
              { id: false, label: "Não" },
            ].map((opt) => {
              const active = newEmpPrestaServico === opt.id;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setNewEmpPrestaServico(opt.id)}
                  style={{
                    flex: 1, height: 44, borderRadius: 8,
                    background: active ? C.selected : "#FFFFFF",
                    color: active ? "#FFFFFF" : C.text,
                    border: `1.5px solid ${active ? C.selected : C.border}`,
                    fontFamily: FONT, fontSize: 14, fontWeight: active ? 700 : 600,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Field>
        <div style={{ height: 16 }} />
        <button
          type="button"
          onClick={addEmployee}
          disabled={!newEmpName.trim() || newEmpPrestaServico === null}
          style={{ ...primaryButton, opacity: newEmpName.trim() && newEmpPrestaServico !== null ? 1 : 0.45 }}
        >
          ADICIONAR
        </button>
      </BottomModal>

      {/* Modal: serviço */}
      <BottomModal
        open={!!serviceModal}
        title={serviceModal?.editingId ? "Editar serviço" : "Novo serviço"}
        onClose={() => setServiceModal(null)}
      >
        <Field label="Nome do serviço">
          <input
            value={svcForm.nome}
            onChange={(e) => setSvcForm((s) => ({ ...s, nome: e.target.value }))}
            placeholder="Digite o nome do serviço"
            style={textInput}
          />
        </Field>

        <div style={{ height: 14 }} />

        <Field label="Duração">
          <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <select
                value={svcForm.hours || "0"}
                onChange={(e) => setSvcForm((s) => ({ ...s, hours: e.target.value }))}
                style={{ ...textInput, appearance: "none", WebkitAppearance: "none", MozAppearance: "none", paddingRight: 36, cursor: "pointer", background: "#fff" }}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={String(i)}>{i}h</option>
                ))}
              </select>
              <span aria-hidden style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.textMuted }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </span>
            </div>
            <div style={{ flex: 1, position: "relative" }}>
              <select
                value={svcForm.minutes || "0"}
                onChange={(e) => setSvcForm((s) => ({ ...s, minutes: e.target.value }))}
                style={{ ...textInput, appearance: "none", WebkitAppearance: "none", MozAppearance: "none", paddingRight: 36, cursor: "pointer", background: "#fff" }}
              >
                {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                  <option key={m} value={String(m)}>{m}min</option>
                ))}
              </select>
              <span aria-hidden style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.textMuted }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </span>
            </div>
          </div>
          {svcMinutesTotal > 0 && (
            <div style={{ marginTop: 6, fontSize: 12, color: C.textMuted }}>
              Total: {formatDuration(svcMinutesTotal)}
            </div>
          )}
        </Field>

        <div style={{ height: 14 }} />

        <Field label="Preço (R$)">
          <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
            <span style={{ padding: "0 12px", color: C.textMuted, fontSize: 15, borderRight: `1px solid ${C.border}`, height: 48, display: "flex", alignItems: "center" }}>R$</span>
            <input
              value={svcForm.price}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d,.]/g, "");
                setSvcForm((s) => ({ ...s, price: v }));
              }}
              placeholder="0,00"
              inputMode="decimal"
              style={{ ...textInput, border: "none", borderRadius: 0 }}
            />
          </div>
        </Field>

        <div style={{ height: 18 }} />

        <button
          type="button"
          onClick={saveService}
          disabled={!svcForm.nome.trim() || svcMinutesTotal <= 0 || !svcForm.price.trim()}
          style={{
            ...primaryButton,
            opacity: svcForm.nome.trim() && svcMinutesTotal > 0 && svcForm.price.trim() ? 1 : 0.45,
          }}
        >
          {serviceModal?.editingId ? "SALVAR" : "ADICIONAR"}
        </button>
      </BottomModal>

    </div>
  );
}

/* =================================================================
   Sub-componentes de cada etapa
   ================================================================= */

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header style={{ marginBottom: 22, textAlign: "center" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.25, color: C.text }}>{title}</h1>
      {subtitle && (
        <p style={{ margin: "10px auto 0", fontSize: 14, lineHeight: 1.5, color: C.textMuted, maxWidth: 420 }}>
          {subtitle}
        </p>
      )}
    </header>
  );
}

function StepCategory({
  value, onChange, onAutoAdvance,
}: { value: CategoryId | null; onChange: (c: CategoryId) => void; onAutoAdvance?: () => void }) {
  type Group = { title: string; standalone?: boolean; standaloneId?: string; items: { id: string; label: string }[] };
  const groups: Group[] = [
    {
      title: "Beleza e estética",
      items: [
        { id: "barbearia", label: "Barbearia" },
        { id: "manicure-pedicure", label: "Manicure e Pedicure" },
        { id: "salao-beleza", label: "Salão de beleza" },
        { id: "sobrancelhas", label: "Sobrancelhas e cílios" },
        { id: "massagem", label: "Massagem" },
        { id: "procedimentos-esteticos", label: "Procedimentos estéticos" },
      ],
    },
    {
      title: "Saúde e atendimento",
      items: [
        { id: "consulta-medica", label: "Consulta médica" },
        { id: "consulta-odontologica", label: "Consulta odontológica" },
        { id: "fisioterapia", label: "Fisioterapia" },
        { id: "psicologo", label: "Psicólogo" },
        { id: "nutricionista", label: "Nutricionista" },
        { id: "pilates-saude", label: "Pilates" },
        { id: "personal-trainer-saude", label: "Personal trainer" },
      ],
    },
    {
      title: "Pets",
      items: [
        { id: "banho-tosa", label: "Banho e tosa" },
        { id: "consulta-veterinaria", label: "Consulta veterinária" },
        { id: "adestramento", label: "Adestramento" },
        { id: "hotelzinho-pets", label: "Hotelzinho para pets" },
      ],
    },
    {
      title: "Serviços profissionais",
      items: [
        { id: "consultoria", label: "Consultoria" },
        { id: "atendimento-juridico", label: "Atendimento jurídico" },
        { id: "contabilidade", label: "Contabilidade" },
        { id: "sessao-fotos", label: "Sessão de fotos" },
        { id: "aulas-particulares", label: "Aulas particulares" },
      ],
    },
    {
      title: "Automotivo",
      items: [
        { id: "lavagem-detalhada", label: "Lavagem detalhada" },
        { id: "revisao-carro", label: "Revisão de carro" },
        { id: "troca-oleo", label: "Troca de óleo" },
        { id: "instalacao-acessorios", label: "Instalação de acessórios" },
        { id: "polimento", label: "Polimento" },
      ],
    },
    {
      title: "Casa e manutenção",
      items: [
        { id: "limpeza-residencial", label: "Limpeza residencial" },
        { id: "dedetizacao", label: "Dedetização" },
        { id: "instalacao-ar", label: "Instalação de ar-condicionado" },
        { id: "manutencao-eletrica", label: "Manutenção elétrica" },
        { id: "encanador", label: "Encanador" },
        { id: "montagem-moveis", label: "Montagem de móveis" },
      ],
    },
    {
      title: "Esportes com quadra ou espaço reservado",
      items: [
        { id: "futebol-society", label: "Futebol society" },
        { id: "futsal", label: "Futsal" },
        { id: "tenis", label: "Tênis" },
        { id: "beach-tennis", label: "Beach tennis" },
        { id: "volei-praia", label: "Vôlei de praia" },
        { id: "basquete", label: "Basquete" },
        { id: "squash", label: "Squash" },
        { id: "padel", label: "Padel" },
      ],
    },
    {
      title: "Aulas esportivas",
      items: [
        { id: "natacao", label: "Natação" },
        { id: "muay-thai", label: "Muay Thai" },
        { id: "jiu-jitsu", label: "Jiu-jitsu" },
        { id: "boxe", label: "Boxe" },
        { id: "crossfit", label: "Crossfit" },
        { id: "pilates", label: "Pilates" },
        { id: "yoga", label: "Yoga" },
        { id: "funcional", label: "Funcional" },
        { id: "personal-trainer", label: "Personal trainer" },
      ],
    },
    {
      title: "Esportes com estrutura específica",
      items: [
        { id: "kart", label: "Kart" },
        { id: "paintball", label: "Paintball" },
        { id: "airsoft", label: "Airsoft" },
        { id: "escalada-indoor", label: "Escalada indoor" },
        { id: "tiro-arco", label: "Tiro com arco" },
        { id: "equitacao", label: "Equitação" },
        { id: "aulas-surf", label: "Aulas de surf" },
        { id: "aulas-danca", label: "Aulas de dança" },
      ],
    },
    {
      title: "Outros",
      standalone: true,
      standaloneId: "outros",
      items: [],
    },
  ];

  // Inicializa aberta a categoria que contém a subcategoria já escolhida (se houver)
  const initialOpen = useMemo(() => {
    if (!value) return null;
    const g = groups.find((g) => g.items.some((i) => i.id === value) || g.standaloneId === value);
    return g ? g.title : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [openGroup, setOpenGroup] = useState<string | null>(initialOpen);

  function selectStandalone(g: Group) {
    setOpenGroup(g.title);
    if (g.standaloneId) {
      onChange(g.standaloneId);
      onAutoAdvance?.();
    }
  }

  function selectSubcategory(id: string) {
    onChange(id);
    onAutoAdvance?.();
  }

  function toggleGroup(g: Group) {
    if (g.standalone) {
      selectStandalone(g);
      return;
    }
    setOpenGroup((curr) => (curr === g.title ? null : g.title));
  }

  return (
    <>
      <StepHeader
        title="Qual é o ramo de atividade da sua empresa?"
        subtitle="Selecione a categoria que melhor representa a atividade da sua empresa."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {groups.map((g) => {
          const isOpen = openGroup === g.title;
          const groupActive = g.standalone
            ? value === g.standaloneId
            : g.items.some((i) => i.id === value);
          return (
            <div
              key={g.title}
              style={{
                border: `1.5px solid ${groupActive && g.standalone ? "#5690f5" : C.borderSoft}`,
                borderRadius: 12,
                background: groupActive && g.standalone ? "#5690f5" : "#FFFFFF",
                overflow: "hidden",
                transition: "border-color 150ms, background 150ms",
              }}
            >
              <button
                type="button"
                onClick={() => toggleGroup(g)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "transparent", border: "none", padding: "16px 16px",
                  cursor: "pointer", fontFamily: FONT, textAlign: "left",
                }}
              >
                <span style={{
                  fontSize: 15,
                  fontWeight: groupActive ? 800 : 700,
                  color: groupActive && g.standalone ? "#FFFFFF" : C.text,
                }}>
                  {g.title}
                </span>
                {g.standalone ? (
                  <span style={{
                    width: 22, height: 22, borderRadius: "50%",
                    border: `2px solid ${groupActive ? "#FFFFFF" : C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {groupActive && <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFFFFF" }} />}
                  </span>
                ) : (
                  <span style={{
                    fontSize: 13, color: C.textMuted, transition: "transform 200ms",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block",
                  }}>▾</span>
                )}
              </button>

              {!g.standalone && isOpen && (
                <div style={{
                  padding: "4px 14px 16px",
                  display: "flex", flexWrap: "wrap", gap: 8,
                }}>
                  {g.items.map((c) => {
                    const active = value === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectSubcategory(c.id)}
                        style={{
                          background: active ? "#5690f5" : "#FFFFFF",
                          color: active ? "#FFFFFF" : C.text,
                          border: `1px solid ${active ? "#5690f5" : C.borderSoft}`,
                          borderRadius: 999,
                          padding: "10px 16px",
                          fontFamily: FONT,
                          fontSize: 14,
                          fontWeight: active ? 700 : 500,
                          cursor: "pointer",
                          transition: "background 150ms, color 150ms, border-color 150ms",
                          lineHeight: 1.2,
                        }}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------- Step 9: Escolha o seu link ---------- */
function sanitizeSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
}

// TODO: substituir por consulta real ao Supabase (tabela de slugs/empresas).
const RESERVED_SLUGS = new Set(["admin", "bisme", "teste", "barbearia", "salao"]);
async function checkSlugAvailability(slug: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 400));
  return !RESERVED_SLUGS.has(slug);
}

function StepSlug({
  value, onChange, status, setStatus, businessName,
}: {
  value: string;
  onChange: (v: string) => void;
  status: "idle" | "checking" | "available" | "taken" | "invalid";
  setStatus: (s: "idle" | "checking" | "available" | "taken" | "invalid") => void;
  businessName: string;
}) {
  // Prefill com nome da empresa (sem espaços) ao montar, se vazio.
  // Se o nome já estiver em uso/bloqueado, busca automaticamente uma
  // variação disponível (base1, base2, ...) antes de exibir a tela.
  useEffect(() => {
    if (value || !businessName) return;
    const base = sanitizeSlug(businessName.replace(/\s+/g, ""));
    if (!base) return;
    let cancelled = false;
    (async () => {
      const candidates = [base, ...Array.from({ length: 20 }, (_, i) => `${base}${i + 1}`)];
      for (const cand of candidates) {
        if (cancelled) return;
        const ok = await checkSlugAvailability(cand);
        if (cancelled) return;
        if (ok) { onChange(cand); return; }
      }
      onChange(base);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!value) { setStatus("idle"); return; }
    if (value.length < 3) { setStatus("invalid"); return; }
    setStatus("checking");
    const handle = window.setTimeout(async () => {
      const ok = await checkSlugAvailability(value);
      setStatus(ok ? "available" : "taken");
    }, 500);
    return () => window.clearTimeout(handle);
  }, [value, setStatus]);

  const suggestions = (() => {
    if (status !== "taken" || !value) return [] as string[];
    const base = value.replace(/[-_]+$/g, "") || value;
    const list = [`${base}1`, `${base}br`, `${base}_oficial`];
    return Array.from(new Set(list.map(sanitizeSlug))).filter(Boolean).slice(0, 3);
  })();

  return (
    <>
      <StepHeader
        title="Escolha o seu nome de usuário"
        subtitle="Este será o endereço público do seu negócio na Bisme. Seus clientes acessarão por aqui."
      />
      <div style={{
        display: "flex", alignItems: "stretch",
        border: `1.5px solid ${C.border}`, borderRadius: 8, overflow: "hidden",
        background: "#FFFFFF",
      }}>
        <span style={{
          display: "flex", alignItems: "center",
          padding: "0 12px", background: "#F5F5F5",
          color: C.textMuted, fontSize: 15, fontFamily: FONT,
          borderRight: `1px solid ${C.border}`, whiteSpace: "nowrap",
        }}>
          bisme.com.br/
        </span>
        <input
          value={value}
          onChange={(e) => onChange(sanitizeSlug(e.target.value))}
          placeholder="barbeariadojoao"
          maxLength={40}
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          style={{
            flex: 1, minWidth: 0, height: 48, border: "none", outline: "none",
            padding: "0 14px", fontSize: 16, color: C.text, fontFamily: FONT, background: "transparent",
          }}
        />
      </div>

      {status === "checking" && (
        <div style={{ marginTop: 8, fontSize: 13, color: C.textMuted, lineHeight: 1.4 }}>
          Verificando disponibilidade...
        </div>
      )}
      {status === "invalid" && (
        <div style={{ marginTop: 8, fontSize: 13, color: "#c0392b", lineHeight: 1.4 }}>
          Use no mínimo 3 caracteres.
        </div>
      )}
      {status === "available" && (
        <div style={{ marginTop: 8, fontSize: 13, color: "#0a8a4a", lineHeight: 1.4 }}>
          Esse nome de usuário está disponível.
        </div>
      )}
      {status === "taken" && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 13, color: "#c0392b", lineHeight: 1.4 }}>
            O nome de usuário {value} não está disponível.
          </div>
          {suggestions.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Sugestões disponíveis:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onChange(s)}
                    style={{
                      border: `1px solid ${C.border}`, background: "#F5F5F5",
                      padding: "6px 12px", borderRadius: 999, fontSize: 13,
                      color: C.text, cursor: "pointer", fontFamily: FONT,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {value && status === "available" && (
        <>
          <div style={{ marginTop: 14, fontSize: 13, color: C.textMuted }}>
            Seu link ficará: <strong style={{ color: C.text }}>bisme.com.br/{value}</strong>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: C.textMuted }}>
            Você poderá alterar isso depois.
          </div>
        </>
      )}
    </>
  );
}

function StepSobre(props: {
  businessName: string; setBusinessName: (v: string) => void;
  fullName: string; setFullName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  referral: string; setReferral: (v: string) => void;
  showReferral: boolean; setShowReferral: (v: boolean) => void;
}) {
  const phoneDigits = props.phone.replace(/\D/g, "");
  const phoneShowError = phoneDigits.length === 11 && phoneDigits[2] !== "9";

  return (
    <>
      <StepHeader title="Sobre você" subtitle="Conte-nos mais sobre você e sua empresa." />
      <FloatingInput label="Nome da empresa" value={props.businessName} onChange={props.setBusinessName} />
      <div style={{ height: 12 }} />
      <FloatingInput label="Nome e sobrenome" value={props.fullName} onChange={props.setFullName} />
      <div style={{ height: 12 }} />

      <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
        <div style={{ width: 110, flexShrink: 0 }}>
          <FloatingInput label="País" value="🇧🇷 +55" onChange={() => {}} readOnly />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <FloatingInput
            label="Número de telefone"
            value={props.phone}
            onChange={(v) => props.setPhone(maskPhoneBR(v))}
            inputMode="tel"
            maxLength={15}
          />
        </div>
      </div>
      {phoneShowError && (
        <div style={{ marginTop: 6, fontSize: 12, color: "#dc2626", fontWeight: 600, fontFamily: FONT }}>
          Adicione um número de telefone válido
        </div>
      )}



      <div style={{ height: 14 }} />
      {!props.showReferral ? (
        <button
          type="button"
          onClick={() => props.setShowReferral(true)}
          style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, padding: "4px 0", cursor: "pointer", fontFamily: FONT }}
        >
          Possui código de indicação? <span style={{ color: C.text, fontWeight: 600 }}>(opcional)</span>
        </button>
      ) : (
        <FloatingInput label="Código de indicação (opcional)" value={props.referral} onChange={props.setReferral} />
      )}
    </>
  );
}

function StepLocationType({
  name, value, onChange, addAddressToProfile, setAddAddressToProfile,
}: {
  name: string;
  value: LocationType;
  onChange: (v: LocationType) => void;
  addAddressToProfile: boolean;
  setAddAddressToProfile: (v: boolean) => void;
}) {
  const opts: { id: NonNullable<LocationType>; title: string; desc: string }[] = [
    { id: "establishment", title: "No meu estabelecimento", desc: "Os clientes vão até o estabelecimento, que pode ser o seu próprio local, um salão ou uma sala onde outros profissionais trabalham." },
    { id: "client_home", title: "Na casa do cliente", desc: "Os serviços são feitos diretamente na casa do cliente." },
  ];
  return (
    <>
      <StepHeader title={`Onde você trabalha${name ? `, ${name}` : ""}?`} />
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {opts.map((o, i) => {
          const active = value === o.id;
          return (
            <li key={o.id} style={{ borderTop: i === 0 ? "none" : `1px solid ${C.borderSoft}` }}>
              <button
                type="button"
                onClick={() => onChange(o.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "flex-start", gap: 14,
                  background: "transparent", border: "none", padding: "16px 4px",
                  textAlign: "left", cursor: "pointer", fontFamily: FONT,
                }}
              >
                <span style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 2,
                  border: `1.5px solid ${active ? C.selected : C.border}`,
                  background: active ? C.selected : "#FFFFFF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {active && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
                </span>
                <span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{o.title}</div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4, lineHeight: 1.5 }}>{o.desc}</div>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {value === "client_home" && (
        <div style={{
          marginTop: 18, padding: "14px 14px",
          border: `1.5px solid ${C.border}`, borderRadius: 10,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.35 }}>
              Deseja adicionar o seu endereço ao perfil da Bisme?
            </div>
            <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 4, lineHeight: 1.45 }}>
              Se desativado, pularemos a etapa de endereço.
            </div>
          </div>
          <Switch on={addAddressToProfile} onChange={setAddAddressToProfile} />
        </div>
      )}
    </>
  );
}

function StepAddress({
  addr, setAddr, onCepLookup, cepLoading, cepError, showFields,
}: {
  addr: AddressData;
  setAddr: (a: AddressData | ((p: AddressData) => AddressData)) => void;
  onCepLookup: (cep: string) => void;
  cepLoading: boolean;
  cepError: string | null;
  showFields: boolean;
}) {
  function update<K extends keyof AddressData>(key: K, value: AddressData[K]) {
    setAddr((p) => ({ ...p, [key]: value }));
  }
  return (
    <>
      <StepHeader
        title="Onde está localizada a sua empresa?"
        subtitle="Informe o CEP da sua empresa para preenchermos o endereço automaticamente."
      />
      <FloatingInput
        label="CEP"
        value={addr.cep}
        onChange={(v) => {
          const masked = maskCep(v);
          update("cep", masked);
          if (masked.replace(/\D/g, "").length === 8) onCepLookup(masked);
        }}
        inputMode="numeric"
      />
      {cepLoading && (
        <div style={{ marginTop: 8, fontSize: 13, color: C.textMuted }}>Buscando endereço…</div>
      )}
      {cepError && (
        <div style={{ marginTop: 8, fontSize: 13, color: "#B91C1C" }}>{cepError}</div>
      )}

      {showFields && (
        <>
          <div style={{ height: 12 }} />
          <FloatingInput label="Rua" value={addr.street} onChange={(v) => update("street", v)} />
          <div style={{ height: 12 }} />
          <FloatingInput label="Bairro" value={addr.neighborhood} onChange={(v) => update("neighborhood", v)} />
          <div style={{ height: 12 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <FloatingInput label="Cidade" value={addr.city} onChange={(v) => update("city", v)} />
            </div>
            <div style={{ width: 100 }}>
              <FloatingInput label="UF" value={addr.state} onChange={(v) => update("state", v.toUpperCase().slice(0, 2))} />
            </div>
          </div>
          <div style={{ height: 12 }} />
          <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
            <div style={{ flex: 1 }}>
              <FloatingInput
                label="Número"
                value={addr.noNumber ? "" : addr.number}
                onChange={(v) => update("number", v.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                disabled={addr.noNumber}
              />
            </div>
            <label style={{
              display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
              border: `1.5px solid ${C.border}`, borderRadius: 8, cursor: "pointer",
              fontFamily: FONT, fontSize: 14, color: C.text, userSelect: "none",
            }}>
              <input
                type="checkbox"
                checked={addr.noNumber}
                onChange={(e) => {
                  const v = e.target.checked;
                  update("noNumber", v);
                  if (v) update("number", "");
                }}
                style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
              />
              <span
                aria-hidden="true"
                style={{
                  width: 18, height: 18, borderRadius: 4,
                  background: addr.noNumber ? C.selected : "#FFFFFF",
                  border: `1.5px solid ${addr.noNumber ? C.selected : C.border}`,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "background 150ms, border-color 150ms",
                }}
              >
                {addr.noNumber && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
              </span>
              Sem número
            </label>
          </div>
          <div style={{ height: 12 }} />
          <FloatingInput
            label="Complemento (opcional)"
            value={addr.complement}
            onChange={(v) => update("complement", v)}
          />
        </>
      )}
    </>
  );
}

function StepTeamSize({ value, onChange }: { value: TeamSize; onChange: (v: TeamSize) => void }) {
  const opts: { id: NonNullable<TeamSize>; label: string }[] = [
    { id: "solo", label: "Sou só eu" },
    { id: "2-4", label: "2 a 4 funcionários" },
    { id: "5-9", label: "5 a 9 funcionários" },
    { id: "10+", label: "Mais de 10 funcionários" },
  ];
  return (
    <>
      <StepHeader title="Qual é o tamanho da sua equipe?" />
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {opts.map((o) => {
          const active = value === o.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => onChange(o.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 14,
                  background: "transparent", border: "none", padding: "16px 4px",
                  cursor: "pointer", fontFamily: FONT,
                }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  border: `2px solid ${active ? C.selected : C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {active && <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.selected }} />}
                </span>
                <span style={{ fontSize: 15, color: C.text, fontWeight: active ? 700 : 500 }}>{o.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function StepEmployees({
  ownerName, employees, onRemove, onOpenAdd,
}: {
  ownerName: string; employees: Employee[];
  onRemove: (id: string) => void; onOpenAdd: () => void;
}) {
  return (
    <>
      <StepHeader
        title="Você gostaria de adicionar mais funcionários?"
        subtitle="Adicione informações básicas sobre sua equipe. Você pode voltar mais tarde para completar perfis, atribuir serviços e definir cronogramas de trabalho."
      />
      <div style={{ padding: "12px 4px 14px" }}>
        <div style={{ fontSize: 15, color: C.text, fontWeight: 700 }}>Eu ({ownerName})</div>
        <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>Proprietário</div>
      </div>
      {employees.map((e) => (
        <div key={e.id} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 4px", borderTop: `1px solid ${C.borderSoft}`,
        }}>
          <div>
            <div style={{ fontSize: 15, color: C.text, fontWeight: 600 }}>{e.nome}</div>
            <div style={{ fontSize: 13, color: C.textMuted }}>{e.role}</div>
          </div>
          <button type="button" onClick={() => onRemove(e.id)} aria-label="Remover" style={iconBtn}>
            <Trash2 size={18} color={C.textMuted} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onOpenAdd}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          background: "transparent", border: "none", borderTop: `1px solid ${C.borderSoft}`,
          padding: "16px 4px", cursor: "pointer", fontFamily: FONT, fontSize: 15, fontWeight: 600, color: C.text,
        }}
      >
        <Plus size={20} /> Adicionar funcionário
      </button>
    </>
  );
}

function StepHours({
  hours, setHours,
}: { hours: Record<string, DayHours>; setHours: (h: Record<string, DayHours>) => void }) {
  function update(id: string, patch: Partial<DayHours>) {
    setHours({ ...hours, [id]: { ...hours[id], ...patch } });
  }
  return (
    <>
      <StepHeader title="Horário de funcionamento" subtitle="Quando os clientes podem reservar com você?" />
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {DAY_LABELS.map(([id, label], idx) => {
          const h = hours[id];
          return (
            <li key={id} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 4px",
              borderTop: idx === 0 ? "none" : `1px solid ${C.borderSoft}`,
            }}>
              <Switch on={h.open} onChange={(v) => update(id, { open: v })} />
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, minWidth: 110 }}>{label}</div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                {h.open ? (
                  <>
                    <input
                      type="time" value={h.start}
                      onChange={(e) => update(id, { start: e.target.value })}
                      style={timeInput}
                    />
                    <span style={{ color: C.textMuted }}>-</span>
                    <input
                      type="time" value={h.end}
                      onChange={(e) => update(id, { end: e.target.value })}
                      style={timeInput}
                    />
                  </>
                ) : (
                  <span style={{ fontSize: 14, color: C.textMuted }}>Fechado</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function StepServices({
  services, onAdd, onEdit, onRemove,
}: {
  services: Service[];
  onAdd: () => void;
  onEdit: (s: Service) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <>
      <StepHeader
        title="Comece a adicionar serviços"
        subtitle="Adicione pelo menos dois serviços agora. Depois, você poderá adicionar mais, editar detalhes e organizar seus serviços em categorias."
      />

      {services.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {services.map((s, i) => (
            <li key={s.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "14px 4px",
              borderTop: i === 0 ? "none" : `1px solid ${C.borderSoft}`,
            }}>
              <button type="button" onClick={() => onRemove(s.id)} aria-label="Excluir" style={iconBtn}>
                <Trash2 size={18} color={C.textMuted} />
              </button>
              {s.imagemUrl && (
                <img
                  src={s.imagemUrl}
                  alt=""
                  style={{ width: 60, height: 60, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: `1px solid ${C.borderSoft}` }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{s.nome}</div>
                <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{formatDuration(s.durationMin)}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{formatBRL(s.price)}</div>
              <button type="button" onClick={() => onEdit(s)} aria-label="Editar" style={iconBtn}>
                <Pencil size={16} color={C.textMuted} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onAdd}
        style={{
          width: "100%", height: 52, marginTop: services.length > 0 ? 20 : 4,
          background: "#F2F2F2", border: `1px solid ${C.borderSoft}`,
          borderRadius: 12,
          fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.text, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        <Plus size={18} /> Adicionar novo serviço
      </button>
    </>
  );
}

/* =================================================================
   Primitivos
   ================================================================= */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12.5, color: C.textMuted, fontWeight: 600, marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function FloatingInput({
  label, value, onChange, readOnly, disabled, inputMode, maxLength, placeholder,
  onBlur, onFocus, type,
}: {
  label: string; value: string; onChange: (v: string) => void;
  readOnly?: boolean; disabled?: boolean;
  inputMode?: "text" | "tel" | "numeric" | "decimal" | "email";
  maxLength?: number; placeholder?: string;
  onBlur?: () => void; onFocus?: () => void; type?: string;
}) {
  const hasValue = value.length > 0;
  return (
    <label style={{
      position: "relative", display: "block",
      border: `1.5px solid ${C.border}`, borderRadius: 8,
      background: disabled ? "#F7F7F7" : C.fieldBg,
      padding: hasValue ? "20px 14px 8px" : "14px 14px",
      opacity: disabled ? 0.7 : 1,
    }}>
      <span style={{
        position: "absolute", left: 14, top: hasValue ? 6 : 14,
        fontSize: hasValue ? 11 : 14, color: C.textMuted, transition: "all 150ms",
        pointerEvents: "none", fontWeight: hasValue ? 600 : 400,
      }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onFocus={onFocus}
        readOnly={readOnly}
        disabled={disabled}
        inputMode={inputMode}
        maxLength={maxLength}
        type={type}
        placeholder={hasValue ? undefined : placeholder}
        style={{
          width: "100%", border: "none", outline: "none", background: "transparent",
          fontSize: 16, color: C.text, fontFamily: FONT, padding: 0,
        }}
      />
    </label>
  );
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      style={{
        width: 46, height: 26, borderRadius: 999,
        background: on ? "#00be70" : "#D4D4D4",
        border: "none", padding: 0, position: "relative", cursor: "pointer",
        transition: "background 200ms", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: on ? 23 : 3,
        width: 20, height: 20, borderRadius: "50%", background: "#FFF",
        boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 200ms",
      }} />
    </button>
  );
}

function BottomModal({
  open, title, onClose, children,
}: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, fontFamily: FONT }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        background: "#FFFFFF", borderRadius: "16px 16px 0 0",
        padding: "16px 18px 24px", maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 -8px 28px rgba(0,0,0,0.15)",
      }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 12px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" style={iconBtn}>
            <X size={20} color={C.textMuted} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Step 9: Value Proposition ---------- */
function StepValueProposition({ name }: { name: string }) {
  const benefits = [
    { img: benefitAgenda, text: "Os clientes podem agendar por conta própria pelo seu perfil da Bisme", imgW: 77, imgH: 77, textW: 260, textH: 40 },
    { img: benefitWhatsapp, text: "O não comparecimento é coisa do passado graças aos lembretes automáticos e às taxas personalizadas", imgW: 70, imgH: 77, textW: 259, textH: 60 },
    { img: benefitLink, text: "Agendamentos fáceis via redes sociais com ferramentas para transformar seguidores em clientes", imgW: 63, imgH: 77, textW: 259, textH: 60 },
    { img: megaphoneNewUrl, text: "Novas conexões com clientes usando ferramentas de marketing para divulgação", imgW: 65.22, imgH: 76.8, textW: 259, textH: 60 },
  ];
  const title = name
    ? `Você iniciou um novo capítulo, ${name}!`
    : "Você iniciou um novo capítulo!";
  return (
    <div>
      <StepHeader
        title={title}
        subtitle="Aqui estão algumas maneiras pelas quais a Bisme ajuda sua empresa a crescer:"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        {benefits.map((b, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "#f1e8fb", border: "none", outline: "none",
              borderRadius: 10, padding: "0 8px",
              width: "100%", maxWidth: 368, height: 93, boxSizing: "border-box",
              flexShrink: 0,
            }}
          >
            <div style={{
              width: b.imgW, height: b.imgH,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <img
                src={b.img}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              />
            </div>
            <div style={{
              width: b.textW, height: b.textH, maxWidth: "100%",
              display: "flex", alignItems: "center", overflow: "hidden",
            }}>
              <p style={{
                margin: 0, fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.3,
                overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
              }}>
                {b.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


import { ThemeChooserGrid } from "@/components/site/ThemeChooserGrid";

function StepTemplate({
  selected,
  onSelect,
}: {
  selected: SiteTemplateId | null;
  onSelect: (id: SiteTemplateId) => void;
}) {
  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, lineHeight: 1.25, letterSpacing: -0.4, textAlign: "center" }}>
        Escolha o visual do seu site
      </h1>
      <p style={{ margin: "8px auto 20px", fontSize: 13.5, color: C.textMuted, lineHeight: 1.5, textAlign: "center", maxWidth: 360 }}>
        Selecione um modelo inicial. Depois você poderá trocar fotos, cores, serviços e informações.
      </p>

      <ThemeChooserGrid selectedId={selected} onSelect={onSelect} />
    </div>
  );
}








const topBar: CSSProperties = {
  position: "relative",
  display: "flex", alignItems: "center", justifyContent: "center",
  width: "100%", padding: "30px 16px 30px",
  boxSizing: "border-box",
};
const backBtn: CSSProperties = {
  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
  width: 32, height: 32, borderRadius: 8, background: "transparent",
  border: "none", display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", color: C.text, padding: 0,
};
const progressWrap: CSSProperties = {
  width: "60%", maxWidth: 280, display: "flex", justifyContent: "center",
};
const progressTrack: CSSProperties = {
  width: "100%", height: 14, background: C.progressTrack, borderRadius: 999, overflow: "hidden",
};
const progressFill: CSSProperties = {
  height: "100%", background: C.progress, borderRadius: 999, transition: "width 250ms ease",
};

const pageWrap: CSSProperties = {
  maxWidth: 560, margin: "0 auto", padding: "8px 18px 56px",
};

const primaryButton: CSSProperties = {
  width: "100%", height: 52, borderRadius: 10,
  background: C.primaryBtn, color: "#FFFFFF", border: "none",
  fontSize: 14, fontWeight: 800, letterSpacing: 1.2,
  fontFamily: FONT, cursor: "pointer",
};

const textInput: CSSProperties = {
  width: "100%", height: 48, border: `1.5px solid ${C.border}`,
  borderRadius: 8, padding: "0 14px", fontSize: 16, color: C.text,
  fontFamily: FONT, outline: "none", boxSizing: "border-box", background: "#FFFFFF",
};

const timeInput: CSSProperties = {
  border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 8px",
  fontSize: 16, color: C.text, fontFamily: FONT, background: "#FFFFFF",
};

const iconBtn: CSSProperties = {
  width: 36, height: 36, borderRadius: 8, background: "transparent",
  border: "none", display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", padding: 0,
};
