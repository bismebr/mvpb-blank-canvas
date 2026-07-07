import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  resolveCurrentCompanyId,
  loadCompanySite,
  siteConfigPatchFromLoad,
  parseAddressString,
} from "@/lib/companySite";
import {
  useSiteConfig,
  formatAddressParts,
  buildGoogleMapsLink,
  type SiteConfig,
} from "./SiteConfigContext";
import { COLORS, FONT, cardStyle, inputStyle, saveBtn, Label, PageHeader } from "./ui";
import { ImageCropper } from "./ImageCropper";
import { ReviewsConfig } from "./ReviewsConfig";
import { Trash2, Upload, ImagePlus, Check, ChevronDown, Camera, X, ArrowUp, ArrowDown, Images, UserCircle2 } from "lucide-react";
import { COMODIDADES_OPTIONS } from "@/components/barbearia/Comodidades";
import { type SiteTemplateId } from "@/lib/siteTemplates";
import { ThemeChooserGrid } from "@/components/site/ThemeChooserGrid";
import { toast as toastFn } from "sonner";


type CropTarget = "logo" | "cover" | "about" | "work";

function formatWhatsappBR(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

interface PendingCrop {
  target: CropTarget;
  src: string;
  workIndex?: number;
}

const ASPECTS: Record<CropTarget, number> = {
  logo: 1,
  cover: 443.2 / 260,
  about: 343.5 / 375,
  work: 1,
};

const OUTPUT_SIZES: Record<CropTarget, { w: number; h: number }> = {
  logo: { w: 600, h: 600 },
  cover: { w: 1108, h: 650 },
  about: { w: 859, h: 938 },
  work: { w: 800, h: 800 },
};

const TITLES: Record<CropTarget, string> = {
  logo: "Ajustar logo",
  cover: "Ajustar imagem de capa",
  about: "Ajustar foto principal",
  work: "Ajustar imagem do trabalho",
};

type TagKind = "obrigatório" | "opcional";

function Tag({ kind }: { kind: TagKind }) {
  const required = kind === "obrigatório";
  // Etiquetas "Opcional" não devem aparecer na aba Configurações
  if (!required) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 12,
        fontWeight: 500,
        color: required ? COLORS.accent : COLORS.textMuted,
        fontFamily: FONT,
        lineHeight: 1.2,
        height: 16,
      }}
    >
      {required ? "(Obrigatório)" : "(Opcional)"}
    </span>
  );
}

function LabelWithTag({ children, tag }: { children: React.ReactNode; tag?: TagKind }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.textMuted, fontFamily: FONT, lineHeight: 1.2 }}>
        {children}
      </label>
      {tag && <Tag kind={tag} />}
    </div>
  );
}

function SubTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <h3
        style={{
          margin: 0,
          fontSize: 19,
          fontWeight: 700,
          color: COLORS.textPrimary,
          lineHeight: 1.2,
          letterSpacing: -0.2,
          fontFamily: FONT,
        }}
      >
        {children}
      </h3>
      {hint && (
        <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted, fontFamily: FONT, lineHeight: 1.4 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function AddImageButton({
  onClick,
  children = "Adicionar imagem",
}: {
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 34,
        padding: "0 12px",
        borderRadius: 8,
        background: COLORS.bgElevated,
        border: `1px solid ${COLORS.border}`,
        color: COLORS.textPrimary,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: FONT,
        cursor: "pointer",
      }}
    >
      <ImagePlus size={14} />
      {children}
    </button>
  );
}

const READY_MODAL_KEY_PREFIX = "bisme_meu_site_ready_modal_seen_";

export function ConfiguracoesTela({ onGoToLinks }: { onGoToLinks?: () => void } = {}) {
  const { config, updateConfig } = useSiteConfig();
  const draft = config;
  const [pending, setPending] = useState<PendingCrop | null>(null);
  const [worksModalOpen, setWorksModalOpen] = useState(false);
  const [congratsOpen, setCongratsOpen] = useState(false);

  // ----- Supabase: hydrate "Meu Site" + auto-save deltas -----
  const [siteHydrated, setSiteHydrated] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [modalSeen, setModalSeen] = useState(false);
  const companyIdRef = useRef<string | null>(null);
  const lastSavedRef = useRef<Record<string, string>>({});
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cid = await resolveCurrentCompanyId();
      if (cancelled || !cid) {
        setSiteHydrated(true);
        return;
      }
      companyIdRef.current = cid;
      setCompanyId(cid);
      try {
        const seen = localStorage.getItem(READY_MODAL_KEY_PREFIX + cid) === "1";
        if (seen) setModalSeen(true);
      } catch {
        // ignore
      }
      const loaded = await loadCompanySite(cid);
      if (cancelled || !loaded) {
        setSiteHydrated(true);
        return;
      }
      const patch = siteConfigPatchFromLoad(loaded);
      if (loaded.site?.address) {
        Object.assign(patch, parseAddressString(loaded.site.address));
      }
      updateConfig(patch);
      const s = loaded.site;
      lastSavedRef.current = {
        name: loaded.company.name ?? "",
        display_name: s?.display_name ?? "",
        address: s?.address ?? "",
        show_address: String(s?.show_address ?? false),
        whatsapp: s?.whatsapp ?? "",
        template_key: s?.template_key ?? "",
        about: s?.about ?? "",
        social_instagram: s?.social_instagram ?? "",
        social_facebook: s?.social_facebook ?? "",
        social_youtube: s?.social_youtube ?? "",
        social_tiktok: s?.social_tiktok ?? "",
        website_url: s?.website_url ?? "",
        amenities: JSON.stringify(s?.amenities ?? []),
        rating_average: String(s?.rating_average ?? 0),
        reviews_count: String(s?.reviews_count ?? 0),
        logo_url: s?.logo_url ?? "",
        cover_url: s?.cover_url ?? "",
        about_image_url: s?.about_image_url ?? "",
        work_image_urls: JSON.stringify(s?.work_image_urls ?? []),
      };
      setSiteHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!siteHydrated || !companyIdRef.current) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      const cid = companyIdRef.current!;
      console.log("[Meu Site] autosave disparou");
      console.log("[Meu Site] companyId resolvido:", cid);
      const digits = (draft.whatsapp || "").replace(/\D+/g, "");
      const whatsappE164 = digits
        ? `+55${digits.startsWith("55") ? digits.slice(2) : digits}`
        : "";

      const desired: Record<string, string> = {
        name: draft.businessName ?? "",
        display_name: draft.businessName ?? "",
        address: draft.address ?? "",
        show_address: String(!!draft.showAddress),
        whatsapp: whatsappE164,
        template_key: draft.template ?? "",
        about: draft.aboutText ?? "",
        social_instagram: draft.instagram ?? "",
        social_facebook: draft.facebook ?? "",
        social_youtube: draft.youtube ?? "",
        social_tiktok: draft.tiktok ?? "",
        website_url: draft.site ?? "",
        amenities: JSON.stringify(draft.comodidades ?? []),
        rating_average: String(Number(draft.ratingAverage) || 0),
        reviews_count: String(Number(draft.reviewsCount) || 0),
        logo_url: draft.logo ?? "",
        cover_url: draft.coverImage ?? "",
        about_image_url: draft.aboutImage ?? "",
        work_image_urls: JSON.stringify(draft.workGallery ?? []),
      };
      const last = lastSavedRef.current;

      const companyUpdate: { name?: string } = {};
      if (desired.name !== (last.name ?? "")) companyUpdate.name = desired.name;

      const lightKeys = [
        "display_name", "address", "show_address", "whatsapp", "template_key",
        "about", "social_instagram", "social_facebook", "social_youtube",
        "social_tiktok", "website_url", "amenities", "rating_average", "reviews_count",
      ] as const;
      const lightUpdate: Record<string, unknown> = {};
      for (const k of lightKeys) {
        if (desired[k] !== (last[k] ?? "")) {
          if (k === "show_address") lightUpdate[k] = desired[k] === "true";
          else if (k === "rating_average") lightUpdate[k] = Number(desired[k]) || 0;
          else if (k === "reviews_count") lightUpdate[k] = Number(desired[k]) || 0;
          else if (k === "amenities") lightUpdate[k] = JSON.parse(desired[k]);
          else lightUpdate[k] = desired[k];
        }
      }

      const heavyKeys = ["logo_url", "cover_url", "about_image_url", "work_image_urls"] as const;
      const heavyUpdate: Record<string, unknown> = {};
      for (const k of heavyKeys) {
        if (desired[k] !== (last[k] ?? "")) {
          heavyUpdate[k] = k === "work_image_urls" ? JSON.parse(desired[k]) : desired[k];
        }
      }

      const reportError = (label: string, err: unknown) => {
        const e = err as { message?: string; code?: string; details?: string; hint?: string };
        console.error(`[Meu Site] ${label} erro:`, {
          message: e?.message, code: e?.code, details: e?.details, hint: e?.hint, raw: err,
        });
        const parts = [e?.message, e?.code && `code: ${e.code}`, e?.details, e?.hint].filter(Boolean);
        toastFn.error(`Falha ao salvar (${label}): ${parts.join(" — ") || "erro desconhecido"}`);
      };

      let anySaved = false;

      if (Object.keys(companyUpdate).length > 0) {
        try {
          const { error } = await supabase.from("companies").update(companyUpdate).eq("id", cid);
          if (error) throw error;
          lastSavedRef.current.name = desired.name;
          anySaved = true;
        } catch (err) {
          reportError("nome da empresa", err);
        }
      }

      if (Object.keys(lightUpdate).length > 0) {
        console.log("[Meu Site] payload leve enviado:", lightUpdate);
        try {
          const { error } = await supabase
            .from("site_settings")
            .update(lightUpdate as never)
            .eq("company_id", cid);
          if (error) throw error;
          console.log("[Meu Site] update leve sucesso");
          for (const k of lightKeys) lastSavedRef.current[k] = desired[k];
          anySaved = true;
        } catch (err) {
          reportError("campos do site", err);
        }
      }

      if (Object.keys(heavyUpdate).length > 0) {
        console.log("[Meu Site] payload pesado enviado (keys):", Object.keys(heavyUpdate));
        try {
          const { error } = await supabase
            .from("site_settings")
            .update(heavyUpdate as never)
            .eq("company_id", cid);
          if (error) throw error;
          console.log("[Meu Site] update pesado sucesso");
          for (const k of heavyKeys) lastSavedRef.current[k] = desired[k];
          anySaved = true;
        } catch (err) {
          reportError("imagens", err);
        }
      }

      if (anySaved) toastFn.success("Alteração salva automaticamente");
    }, 800);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    siteHydrated,
    draft.businessName,
    draft.address,
    draft.showAddress,
    draft.whatsapp,
    draft.template,
    draft.aboutText,
    draft.instagram,
    draft.facebook,
    draft.youtube,
    draft.tiktok,
    draft.site,
    draft.comodidades,
    draft.ratingAverage,
    draft.reviewsCount,
    draft.logo,
    draft.coverImage,
    draft.aboutImage,
    draft.workGallery,
  ]);



  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const aboutInput = useRef<HTMLInputElement>(null);
  const workInput = useRef<HTMLInputElement>(null);
  const workReplaceInput = useRef<HTMLInputElement>(null);
  const replaceIndex = useRef<number | null>(null);

  function patchDraft(p: Partial<SiteConfig>) {
    updateConfig(p);
  }

  function readFile(e: ChangeEvent<HTMLInputElement>, target: CropTarget, workIndex?: number) {
    // IMPORTANTE: capturar os arquivos antes de limpar `value`, pois
    // alguns browsers esvaziam a FileList ao redefinir o input — o que
    // fazia a seleção de imagem parecer não fazer nada.
    const input = e.target;
    const fileList = input.files;
    const files: File[] = fileList ? Array.from(fileList) : [];
    input.value = "";
    if (files.length === 0) return;

    // Seleção múltipla apenas para a galeria "Seu trabalho" (sem substituição de item)
    if (target === "work" && workIndex == null && files.length > 1) {
      const remaining = Math.max(0, 10 - draft.workGallery.length);
      const toAdd = files.slice(0, remaining);
      if (toAdd.length === 0) return;
      Promise.all(
        toAdd.map(
          (file) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            }),
        ),
      ).then((urls) => {
        const gallery = [...draft.workGallery, ...urls].slice(0, 10);
        patchDraft({ workGallery: gallery });
      });
      return;
    }

    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      setPending({ target, src, workIndex });
    };
    reader.readAsDataURL(file);
  }

  function handleCropConfirm(dataUrl: string) {
    if (!pending) return;
    if (pending.target === "logo") patchDraft({ logo: dataUrl });
    else if (pending.target === "cover") patchDraft({ coverImage: dataUrl });
    else if (pending.target === "about") patchDraft({ aboutImage: dataUrl });
    else if (pending.target === "work") {
      const gallery = [...draft.workGallery];
      if (pending.workIndex != null) {
        gallery[pending.workIndex] = dataUrl;
      } else if (gallery.length < 10) {
        gallery.push(dataUrl);
      }
      patchDraft({ workGallery: gallery });
    }
    setPending(null);
  }

  function removeWork(i: number) {
    const gallery = draft.workGallery.filter((_, idx) => idx !== i);
    patchDraft({ workGallery: gallery });
  }

  function moveWork(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= draft.workGallery.length) return;
    const gallery = [...draft.workGallery];
    [gallery[i], gallery[j]] = [gallery[j], gallery[i]];
    patchDraft({ workGallery: gallery });
  }

  function requestReplaceWork(i: number) {
    replaceIndex.current = i;
    workReplaceInput.current?.click();
  }

  // Bloqueia rolagem do fundo enquanto o modal de fotos está aberto
  useEffect(() => {
    if (!worksModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [worksModalOpen]);

  // (auto-save: alterações são aplicadas em tempo real via patchDraft)

  // Checa se o site está completo (campos obrigatórios preenchidos).
  // Avaliações e redes sociais opcionais NÃO contam.
  const isSiteComplete =
    !!draft.logo &&
    !!draft.coverImage &&
    !!draft.businessName.trim() &&
    !!draft.whatsapp.replace(/\D+/g, "") &&
    !!draft.addressStreet.trim() &&
    !!draft.addressNumber.trim() &&
    !!draft.addressCity.trim() &&
    !!draft.addressState.trim() &&
    !!draft.aboutImage &&
    !!draft.aboutText.trim() &&
    draft.workGallery.length >= 1;

  // Quando ficar completo pela primeira vez, abre o modal e marca como concluído.
  useEffect(() => {
    if (isSiteComplete && !draft.siteCompleted) {
      setCongratsOpen(true);
      updateConfig({ siteCompleted: true });
    }
  }, [isSiteComplete, draft.siteCompleted, updateConfig]);

  // Bloqueia rolagem do fundo enquanto o modal de parabenização está aberto
  useEffect(() => {
    if (!congratsOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [congratsOpen]);

  return (
    <div style={{ padding: "30px 16px 8px", maxWidth: 880, margin: "0 auto", fontFamily: FONT }}>
      <style>{`
        @media (max-width: 540px) {
          .adm-bl-frame { margin-bottom: 20px !important; }
        }
      `}</style>
      {/* Inputs ocultos */}
      <input ref={logoInput} type="file" accept="image/*" hidden onChange={(e) => readFile(e, "logo")} />
      <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => readFile(e, "cover")} />
      <input ref={aboutInput} type="file" accept="image/*" hidden onChange={(e) => readFile(e, "about")} />
      <input ref={workInput} type="file" accept="image/*" multiple hidden onChange={(e) => readFile(e, "work")} />
      <input
        ref={workReplaceInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => readFile(e, "work", replaceIndex.current ?? undefined)}
      />

      <PageHeader
        title="Seu site de agendamentos próprio está quase pronto!"
        subtitle="Preencha as informações abaixo para deixar seu site completo e pronto para receber seus clientes."
      />


      <div style={{ marginTop: 4, marginBottom: 20 }}>
        <style>{`
          .adm-bl-frame { display: flex; justify-content: center; width: 100%; }
          .adm-cover-wrap { position: relative; width: 100%; max-width: 443.2px; border-radius: 14px; overflow: visible; }
          .adm-cover { position: relative; width: 100%; aspect-ratio: 443.2 / 260; border-radius: 14px; overflow: hidden; background: ${COLORS.bgElevated}; border: 1px solid ${COLORS.border}; display: flex; align-items: center; justify-content: center; color: ${COLORS.textMuted}; cursor: pointer; padding: 0; }
          .adm-cover.is-empty { border: 2px solid #d9d9d9; }
          .adm-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .adm-cam-btn { position: absolute; width: 32px; height: 32px; border-radius: 999px; background: rgba(17,17,17,0.78); color: #fff; border: 1px solid rgba(255,255,255,0.18); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; backdrop-filter: blur(6px); box-shadow: 0 2px 6px rgba(0,0,0,0.25); }
          .adm-cam-btn:hover { background: rgba(0,0,0,0.9); }
          .adm-cover-cam { right: 10px; bottom: 10px; }
          .adm-logo-wrap { position: absolute; left: 14px; bottom: -14px; width: clamp(62px, 17vw, 75.2px); height: clamp(62px, 17vw, 75.2px); }
          .adm-logo { width: 100%; height: 100%; border-radius: 50%; overflow: hidden; background: ${COLORS.bgSurface}; border: none; outline: none; box-shadow: 0 2px 8px rgba(0,0,0,0.12); display: flex; align-items: center; justify-content: center; color: #9CA3AF; cursor: pointer; padding: 0; }
          .adm-logo.is-empty,
          .adm-logo:hover,
          .adm-logo:focus,
          .adm-logo:focus-visible,
          .adm-logo:active { outline: none !important; border: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
          .adm-logo.is-empty { color: #9CA3AF; }
          .adm-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .adm-logo-cam { right: -2px; bottom: 0; width: 24px; height: 24px; }
        `}</style>
        <div className="adm-bl-frame">
          <div className="adm-cover-wrap">
            <button
              type="button"
              className={`adm-cover${draft.coverImage ? "" : " is-empty"}`}
              onClick={() => coverInput.current?.click()}
              aria-label={draft.coverImage ? "Trocar banner" : "Adicionar banner"}
            >
              {draft.coverImage ? (
                <img src={draft.coverImage} alt="Banner atual" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: COLORS.textMuted, fontFamily: FONT }}>
                  <ImagePlus size={32} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Adicionar sua imagem aqui</span>
                </div>
              )}
            </button>
            <button
              type="button"
              className="adm-cam-btn adm-cover-cam"
              onClick={(e) => { e.stopPropagation(); coverInput.current?.click(); }}
              aria-label={draft.coverImage ? "Trocar banner" : "Adicionar banner"}
              title={draft.coverImage ? "Trocar banner" : "Adicionar banner"}
            >
              <Camera size={16} />
            </button>
            <div className="adm-logo-wrap">
              <button
                type="button"
                className={`adm-logo${draft.logo ? "" : " is-empty"}`}
                onClick={() => logoInput.current?.click()}
                aria-label={draft.logo ? "Trocar logo" : "Adicionar logo"}
              >
                {draft.logo ? (
                  <img src={draft.logo} alt="Logo atual" />
                ) : (
                  <UserCircle2 size={42} strokeWidth={1.5} color="#9CA3AF" />
                )}
              </button>
              <button
                type="button"
                className="adm-cam-btn adm-logo-cam"
                onClick={(e) => { e.stopPropagation(); logoInput.current?.click(); }}
                aria-label={draft.logo ? "Trocar logo" : "Adicionar logo"}
                title={draft.logo ? "Trocar logo" : "Adicionar logo"}
              >
                <Camera size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>



      <Section title="Informações do negócio">
        <Label>Nome do negócio</Label>
        <input
          style={inputStyle}
          placeholder="Digite o nome do seu negócio"
          value={draft.businessName}
          onChange={(e) => patchDraft({ businessName: e.target.value })}
        />
        <div style={{ height: 12 }} />
        <Label>Endereço</Label>
        <AddressFields
          street={draft.addressStreet}
          number={draft.addressNumber}
          city={draft.addressCity}
          state={draft.addressState}
          onChange={(parts) => {
            const next = {
              addressStreet: parts.addressStreet ?? draft.addressStreet,
              addressNumber: parts.addressNumber ?? draft.addressNumber,
              addressCity: parts.addressCity ?? draft.addressCity,
              addressState: parts.addressState ?? draft.addressState,
            };
            const address = formatAddressParts(next);
            patchDraft({
              ...next,
              address,
              googleMapsLink: buildGoogleMapsLink(address),
            });
          }}
        />
        <div style={{ height: 12 }} />
        <ToggleRow
          label="Mostrar endereço para os clientes"
          hint="Quando desativado, o endereço fica oculto na tela inicial do seu site de agendamento e no botão de localização."
          checked={draft.showAddress !== false}
          onChange={(v) => patchDraft({ showAddress: v })}
        />
        <div style={{ height: 12 }} />
        <ReviewsConfig />
      </Section>

      <Section title="WhatsApp do negócio" desc="Esse número será usado como contato principal no seu site de agendamento.">
        <input
          style={inputStyle}
          inputMode="tel"
          placeholder="(99) 99999-9999"
          maxLength={15}
          value={formatWhatsappBR(draft.whatsapp)}
          onChange={(e) => patchDraft({ whatsapp: e.target.value.replace(/\D+/g, "").slice(0, 11) })}
        />
      </Section>

      <Section title="Redes sociais" desc="Adicione apenas as redes em que seu negócio está presente. Os campos vazios não aparecem na página inicial.">
        <LabelWithTag tag="opcional">Instagram</LabelWithTag>
        <div
          className="bisme-input-group"
          style={{
            display: "flex",
            alignItems: "center",
            background: "#FFFFFF",
            border: `1.5px solid #E4E4E4`,
            borderRadius: 8,
            fontSize: 16,
            fontFamily: FONT,
            color: "#111111",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <span
            className="bisme-input-prefix"
            style={{
              padding: "12px 6px 12px 14px",
              color: "#6F6F6F",
              fontWeight: 500,
              userSelect: "none",
              lineHeight: 1,
            }}
          >
            @
          </span>
          <input
            className="bisme-input-group-control"
            style={{
              border: "none",
              background: "transparent",
              flex: 1,
              outline: "none",
              fontSize: 16,
              fontFamily: FONT,
              color: "#111111",
              padding: "12px 14px 12px 0",
            }}
            inputMode="text"
            placeholder="Digite seu nome de usuário"
            value={draft.instagram}
            onChange={(e) => {
              let v = e.target.value;
              if (v.startsWith("@")) v = v.slice(1);
              patchDraft({ instagram: v });
            }}
          />
        </div>
        <div style={{ height: 12 }} />
        <LabelWithTag tag="opcional">TikTok</LabelWithTag>
        <div
          className="bisme-input-group"
          style={{
            display: "flex",
            alignItems: "center",
            background: "#FFFFFF",
            border: `1.5px solid #E4E4E4`,
            borderRadius: 8,
            fontSize: 16,
            fontFamily: FONT,
            color: "#111111",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <span
            className="bisme-input-prefix"
            style={{
              padding: "12px 6px 12px 14px",
              color: "#6F6F6F",
              fontWeight: 500,
              userSelect: "none",
              lineHeight: 1,
            }}
          >
            @
          </span>
          <input
            className="bisme-input-group-control"
            style={{
              border: "none",
              background: "transparent",
              flex: 1,
              outline: "none",
              fontSize: 16,
              fontFamily: FONT,
              color: "#111111",
              padding: "12px 14px 12px 0",
            }}
            inputMode="text"
            placeholder="Digite seu nome de usuário"
            value={draft.tiktok}
            onChange={(e) => {
              let v = e.target.value;
              if (v.startsWith("@")) v = v.slice(1);
              patchDraft({ tiktok: v });
            }}
          />
        </div>
        <div style={{ height: 12 }} />
        <LabelWithTag tag="opcional">Facebook</LabelWithTag>
        <input
          style={inputStyle}
          inputMode="url"
          placeholder="Cole o link do Facebook"
          value={draft.facebook}
          onChange={(e) => patchDraft({ facebook: e.target.value })}
        />
        <div style={{ height: 12 }} />
        <LabelWithTag tag="opcional">YouTube</LabelWithTag>
        <input
          style={inputStyle}
          inputMode="url"
          placeholder="Cole o link do YouTube"
          value={draft.youtube}
          onChange={(e) => patchDraft({ youtube: e.target.value })}
        />
        <div style={{ height: 12 }} />
        <LabelWithTag tag="opcional">Site</LabelWithTag>
        <input
          style={inputStyle}
          inputMode="url"
          placeholder="Cole o link do site"
          value={draft.site}
          onChange={(e) => patchDraft({ site: e.target.value })}
        />
      </Section>

      <Section titleSize="lg" title="Sobre nós" descSize={12} desc="Esta área edita a seção Sobre nós que aparece no seu site público. Use uma foto e um texto que apresentem bem o seu negócio.">
        <div className="adm-about-frame">
          <style>{`
            .adm-about-frame { display: flex; justify-content: center; width: 100%; margin-bottom: 4px; }
            .adm-about-wrap { position: relative; width: 100%; max-width: 343.5px; }
            .adm-about { position: relative; width: 100%; aspect-ratio: 343.5 / 375; border-radius: 14px; overflow: hidden; background: ${COLORS.bgElevated}; border: 1px solid ${COLORS.border}; display: flex; align-items: center; justify-content: center; color: ${COLORS.textMuted}; cursor: pointer; padding: 0; }
            [data-admin-theme]:not([data-admin-theme="dark"]) .adm-about { background: #f8f8f8; }
            .adm-about img { width: 100%; height: 100%; object-fit: cover; display: block; }
            .adm-about-cam { position: absolute; right: 10px; bottom: 10px; width: 32px; height: 32px; border-radius: 999px; background: rgba(17,17,17,0.78); color: #fff; border: 1px solid rgba(255,255,255,0.18); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; backdrop-filter: blur(6px); box-shadow: 0 2px 6px rgba(0,0,0,0.25); }
            .adm-about-cam:hover { background: rgba(0,0,0,0.9); }
          `}</style>
          <div className="adm-about-wrap">
            <button
              type="button"
              className="adm-about"
              onClick={() => aboutInput.current?.click()}
              aria-label={draft.aboutImage ? "Trocar foto principal" : "Adicionar foto principal"}
            >
              {draft.aboutImage ? (
                <img src={draft.aboutImage} alt="Foto principal" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: COLORS.textMuted, fontFamily: FONT }}>
                  <ImagePlus size={32} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Adicionar sua imagem aqui</span>
                </div>
              )}
            </button>
            <button
              type="button"
              className="adm-about-cam"
              onClick={(e) => { e.stopPropagation(); aboutInput.current?.click(); }}
              aria-label={draft.aboutImage ? "Trocar foto principal" : "Adicionar foto principal"}
              title={draft.aboutImage ? "Trocar foto principal" : "Adicionar foto principal"}
            >
              <Camera size={16} />
            </button>
          </div>
        </div>

        <div style={{ height: 16 }} />
        <SubTitle hint="Conte um pouco da sua história">Texto principal</SubTitle>
        <textarea
          className="bisme-textarea"
          style={{ minHeight: 160 }}
          value={draft.aboutText}
          onChange={(e) => patchDraft({ aboutText: e.target.value })}
        />


        <div style={{ height: 20 }} />

        <SubTitle>Seu trabalho</SubTitle>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
          Galeria com até 10 imagens que mostram o seu trabalho.
        </p>
        <WorksPreview
          gallery={draft.workGallery}
          onManage={() => setWorksModalOpen(true)}
          onAdd={() => workInput.current?.click()}
        />
        {worksModalOpen && (
          <WorksManagerModal
            gallery={draft.workGallery}
            onClose={() => setWorksModalOpen(false)}
            onAdd={() => workInput.current?.click()}
            onReplace={(i) => requestReplaceWork(i)}
            onRemove={(i) => removeWork(i)}
            onMove={(i, dir) => moveWork(i, dir)}
          />
        )}
      </Section>

      <section style={{ ...cardStyle, marginBottom: 14, padding: 18 }}>
        <SubTitle hint="Selecione o que seu estabelecimento oferece. Aparecerá na seção Sobre nós.">
          Comodidades do estabelecimento
        </SubTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {COMODIDADES_OPTIONS.map(({ id, label, Icon }) => {
            const active = (draft.comodidades ?? []).includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  const current = draft.comodidades ?? [];
                  const next = active ? current.filter((c) => c !== id) : [...current, id];
                  patchDraft({ comodidades: next });
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: `1.5px solid ${active ? COLORS.accentLight : COLORS.border}`,
                  background: active ? `${COLORS.accentLight}1A` : COLORS.bgElevated,
                  color: active ? COLORS.accentLight : COLORS.textPrimary,
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 180ms",
                }}
              >
                {active ? <Check size={14} /> : <Icon size={14} />}
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <ModelosExpandableSection />

      <ImageCropper
        open={!!pending}
        src={pending?.src ?? null}
        aspect={pending ? ASPECTS[pending.target] : 1}
        outputSize={pending ? OUTPUT_SIZES[pending.target] : undefined}
        title={pending ? TITLES[pending.target] : undefined}
        circular={pending?.target === "logo"}
        onCancel={() => setPending(null)}
        onConfirm={handleCropConfirm}
      />

      {congratsOpen && (
        <CongratsModal
          onClose={() => setCongratsOpen(false)}
          onGoToLink={() => {
            setCongratsOpen(false);
            onGoToLinks?.();
          }}
        />
      )}
    </div>
    
  );
}

function CongratsModal({ onClose, onGoToLink }: { onClose: () => void; onGoToLink: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 700,
        background: "rgba(15,15,20,0.7)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: FONT,
        animation: "bisme-congrats-fade 240ms ease",
      }}
    >
      <style>{`
        @keyframes bisme-congrats-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes bisme-congrats-pop {
          0% { opacity: 0; transform: scale(0.92) translateY(8px); }
          60% { opacity: 1; transform: scale(1.01) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes bisme-check-draw {
          0% { stroke-dashoffset: 36; opacity: 0; }
          40% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes bisme-ring-pulse {
          0% { transform: scale(0.6); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.bgSurface,
          color: COLORS.textPrimary,
          borderRadius: 20,
          width: "100%",
          maxWidth: 420,
          padding: 28,
          boxShadow: "0 24px 60px -16px rgba(0,0,0,0.45)",
          border: `1px solid ${COLORS.border}`,
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
          animation: "bisme-congrats-pop 360ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* brilho de fundo */}
        <div aria-hidden style={{
          position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)",
          width: 360, height: 240,
          background: `radial-gradient(ellipse at center, ${COLORS.accent}22 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        {/* check com anel pulsante */}
        <div style={{ position: "relative", width: 76, height: 76, margin: "0 auto 18px" }}>
          <span aria-hidden style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: `${COLORS.accent}22`, animation: "bisme-ring-pulse 1.6s ease-out infinite",
          }} />
          <div style={{
            position: "relative", width: 76, height: 76, borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.accent}, #ff8a4d)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 10px 24px -8px ${COLORS.accent}80`,
          }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
              <polyline
                points="20 6 9 17 4 12"
                style={{
                  strokeDasharray: 36,
                  strokeDashoffset: 36,
                  animation: "bisme-check-draw 700ms 200ms ease forwards",
                }}
              />
            </svg>
          </div>
        </div>

        <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: COLORS.textPrimary, letterSpacing: -0.3 }}>
          Seu site está pronto!
        </h3>
        <p style={{ margin: "10px 0 22px", fontSize: 14, lineHeight: 1.55, color: COLORS.textMuted }}>
          Agora você já pode divulgar seu link e começar a receber agendamentos dos seus clientes.
        </p>
        <button
          type="button"
          onClick={onGoToLink}
          style={{
            width: "100%",
            height: 50,
            borderRadius: 12,
            border: "none",
            background: COLORS.accent,
            color: "#fff",
            fontWeight: 800,
            fontSize: 15,
            cursor: "pointer",
            fontFamily: FONT,
            boxShadow: `0 8px 20px -8px ${COLORS.accent}90`,
          }}
        >
          Ir para Meu Link
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 10, background: "transparent", border: "none",
            color: COLORS.textMuted, fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: FONT, padding: "6px 10px",
          }}
        >
          Continuar editando
        </button>
      </div>
    </div>
  );
}




function Section({
  title,
  desc,
  tag,
  titleSize = "md",
  descSize,
  children,
}: {
  title: string;
  desc?: string;
  tag?: TagKind;
  titleSize?: "md" | "lg";
  descSize?: number;
  children: React.ReactNode;
}) {
  return (
    <section style={{ ...cardStyle, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <h2
          style={{
            margin: 0,
            fontSize: titleSize === "lg" ? 19 : 17,
            fontWeight: 700,
            color: COLORS.textPrimary,
            lineHeight: 1.25,
            letterSpacing: -0.2,
            fontFamily: FONT,
          }}
        >
          {title}
        </h2>
        {tag && <Tag kind={tag} />}
      </div>
      {desc && (
        <p style={{ margin: "6px 0 14px", fontSize: descSize ?? 13, color: COLORS.textMuted, lineHeight: 1.5, fontFamily: FONT }}>{desc}</p>
      )}
      {!desc && <div style={{ height: 12 }} />}
      {children}
    </section>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      style={{
        width: 24,
        height: 24,
        borderRadius: 8,
        border: "none",
        background: danger ? COLORS.danger : "rgba(0,0,0,0.65)",
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function StarInputWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      >
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"
          fill="#FFC107"
        />
      </svg>
      {children}
    </div>
  );
}

/* =========================================================
   Modelos do site de agendamento — seção expansível
   (lógica idêntica à antiga aba "Modelos")
   ========================================================= */
function ModelosExpandableSection() {
  const { config, updateConfig } = useSiteConfig();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SiteTemplateId>(config.template);
  const [saved, setSaved] = useState(false);

  const dirty = selected !== config.template;

  function handleSave() {
    updateConfig({ template: selected });
    setSaved(true);
    toastFn.success("Modelo aplicado");
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <section style={{ ...cardStyle, marginBottom: 14, padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: 18,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: FONT,
          textAlign: "left",
          color: COLORS.textPrimary,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: COLORS.textPrimary,
              lineHeight: 1.2,
            }}
          >
            Modelos do site de agendamento
          </h2>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: COLORS.textMuted,
              lineHeight: 1.5,
            }}
          >
            Escolha o visual da página que seus clientes acessam. Essa alteração não muda o painel administrativo.
          </p>
        </div>
        <ChevronDown
          size={20}
          color={COLORS.textMuted}
          style={{
            flexShrink: 0,
            transition: "transform 200ms",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open && (
        <div style={{ padding: "0 18px 18px" }}>
          <ThemeChooserGrid
            selectedId={selected}
            onSelect={setSelected}
          />

          {dirty && (
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={handleSave}
                style={{ ...saveBtn, width: "100%" }}
              >
                {saved ? "Modelo aplicado ✓" : "Salvar modelo"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}


/* =========================================================
   FloatingInput estilo onboarding (label flutuante)
   ========================================================= */
function FloatingInput({
  label,
  value,
  onChange,
  inputMode,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "text" | "tel" | "numeric" | "decimal";
  maxLength?: number;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const floated = hasValue || focused;
  return (
    <label
      className="bisme-floating-field"
      style={{
        position: "relative",
        display: "block",
        border: `1.5px solid #E4E4E4`,
        borderRadius: 8,
        background: "#FFFFFF",
        padding: floated ? "20px 14px 8px" : "14px 14px",
        fontFamily: FONT,
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 14,
          top: floated ? 6 : 14,
          fontSize: floated ? 11 : 14,
          color: "#6F6F6F",
          transition: "all 150ms",
          pointerEvents: "none",
          fontWeight: floated ? 600 : 400,
          fontFamily: FONT,
        }}
      >
        {label}
      </span>
      <input
        className="bisme-floating-field-control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={focused && !hasValue ? placeholder : undefined}
        style={{
          width: "100%",
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 16,
          color: "#111111",
          fontFamily: FONT,
          padding: 0,
        }}
      />
    </label>
  );
}

interface AddressPartsPatch {
  addressStreet?: string;
  addressNumber?: string;
  addressCity?: string;
  addressState?: string;
}

function AddressFields({
  street,
  number,
  city,
  state,
  onChange,
}: {
  street: string;
  number: string;
  city: string;
  state: string;
  onChange: (patch: AddressPartsPatch) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <FloatingInput
        label="Rua"
        value={street}
        onChange={(v) => onChange({ addressStreet: v })}
        placeholder="Ex: Rua das Flores"
      />
      <FloatingInput
        label="Número"
        value={number}
        onChange={(v) => onChange({ addressNumber: v.replace(/[^\d]/g, "") })}
        inputMode="numeric"
        placeholder="Ex: 123"
      />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <FloatingInput
            label="Cidade"
            value={city}
            onChange={(v) => onChange({ addressCity: v })}
            placeholder="Ex: São Paulo"
          />
        </div>
        <div style={{ width: 100, flexShrink: 0 }}>
          <FloatingInput
            label="Estado"
            value={state}
            onChange={(v) => onChange({ addressState: v.toUpperCase().slice(0, 2) })}
            maxLength={2}
            placeholder=""
          />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="adm-toggle-row"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 14px",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        fontFamily: FONT,
      }}
    >

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>{label}</div>
        {hint && (
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2, lineHeight: 1.4 }}>{hint}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 44,
          height: 26,
          borderRadius: 999,
          border: "none",
          background: checked ? COLORS.save : COLORS.border,
          position: "relative",
          cursor: "pointer",
          flexShrink: 0,
          transition: "background 150ms",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left 150ms",
          }}
        />
      </button>
    </div>
  );
}

function ReviewsGroup({
  reviewsStr,
  ratingStr,
  onReviewsChange,
  onRatingChange,
  onRatingBlur,
  reviewsError,
}: {
  reviewsStr: string;
  ratingStr: string;
  onReviewsChange: (raw: string) => void;
  onRatingChange: (raw: string) => void;
  onRatingBlur?: () => void;
  reviewsError?: string | null;
}) {
  const fieldLabel: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.textMuted,
    fontFamily: FONT,
    marginBottom: 6,
  };
  const fieldInput: React.CSSProperties = {
    width: "100%",
    height: 44,
    border: `1.5px solid #E4E4E4`,
    borderRadius: 8,
    background: "#FFFFFF",
    color: "#111111",
    fontSize: 15,
    fontFamily: FONT,
    padding: "0 12px",
    outline: "none",
    boxSizing: "border-box",
  };
  return (
    <div
      style={{
        border: `1.5px solid ${COLORS.border}`,
        borderRadius: 12,
        background: COLORS.bgSurface,
        padding: 14,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"
            fill="#FFC107"
          />
        </svg>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: COLORS.textPrimary,
            fontFamily: FONT,
          }}
        >
          Avaliações
        </span>
        <span
          style={{
            fontSize: 12,
            color: COLORS.textMuted,
            fontFamily: FONT,
          }}
        >
          (Opcional)
        </span>
      </div>
      <div
        className="adm-reviews-grid"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
      >
        <style>{`
          @media (max-width: 480px) {
            .adm-reviews-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
        <div>
          <label style={fieldLabel}>Quantidade de avaliações</label>
          <input
            style={{ ...fieldInput, borderColor: reviewsError ? COLORS.danger : fieldInput.borderColor }}
            inputMode="numeric"
            placeholder="Digite a quantidade de avaliações"
            value={reviewsStr}
            onChange={(e) => onReviewsChange(e.target.value)}
          />
          {reviewsError && (
            <div style={{ marginTop: 6, fontSize: 12, color: COLORS.danger, fontFamily: FONT }}>
              {reviewsError}
            </div>
          )}
        </div>
        <div>
          <label style={fieldLabel}>Média de avaliações</label>
          <input
            style={fieldInput}
            inputMode="decimal"
            placeholder="Digite a média das avaliações"
            value={ratingStr}
            onChange={(e) => onRatingChange(e.target.value)}
            onBlur={() => onRatingBlur?.()}
          />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Galeria "Seu trabalho" — prévia compacta + modal de gestão
   ========================================================= */
function WorksPreview({
  gallery,
  onManage,
  onAdd,
}: {
  gallery: string[];
  onManage: () => void;
  onAdd: () => void;
}) {
  const count = gallery.length;
  const cover = gallery[0];
  const canAdd = count < 10;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 12,
        border: `1.5px solid ${COLORS.border}`,
        background: COLORS.bgSurface,
        fontFamily: FONT,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 10,
          overflow: "hidden",
          background: COLORS.bgElevated,
          border: `1px solid ${COLORS.border}`,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: COLORS.textMuted,
        }}
      >
        {cover ? (
          <img src={cover} alt="Capa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Images size={22} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 140 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>
          {count === 0
            ? "Nenhuma foto adicionada"
            : `${count} de 10 fotos adicionadas`}
        </div>
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
          {canAdd ? "Você pode adicionar mais fotos." : "Limite máximo atingido."}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {canAdd && (
          <button
            type="button"
            onClick={onAdd}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 36,
              padding: "0 12px",
              borderRadius: 8,
              border: "none",
              background: COLORS.bgElevated,
              color: COLORS.textPrimary,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: FONT,
              cursor: "pointer",
            }}
          >
            <ImagePlus size={14} />
            Adicionar imagem
          </button>
        )}
        <button
          type="button"
          onClick={onManage}
          disabled={count === 0}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 36,
            padding: "0 14px",
            borderRadius: 8,
            border: `1.5px solid ${count === 0 ? COLORS.border : COLORS.accent}`,
            background: count === 0 ? COLORS.bgElevated : `${COLORS.accent}14`,
            color: count === 0 ? COLORS.textMuted : COLORS.accent,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONT,
            cursor: count === 0 ? "not-allowed" : "pointer",
          }}
        >
          <Images size={14} />
          Gerenciar fotos
        </button>
      </div>
    </div>
  );
}

function WorksManagerModal({
  gallery,
  onClose,
  onAdd,
  onReplace,
  onRemove,
  onMove,
}: {
  gallery: string[];
  onClose: () => void;
  onAdd: () => void;
  onReplace: (i: number) => void;
  onRemove: (i: number) => void;
  onMove: (i: number, dir: -1 | 1) => void;
}) {
  const count = gallery.length;
  const canAdd = count < 10;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gerenciar fotos do trabalho"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 1000,
        fontFamily: FONT,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 720,
          maxHeight: "90vh",
          background: COLORS.bgSurface,
          color: COLORS.textPrimary,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 14,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Gerenciar fotos</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
              {count} de 10 fotos adicionadas
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: COLORS.bgElevated,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.textPrimary,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 16, overflowY: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            {gallery.map((src, i) => (
              <div
                key={i}
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: COLORS.bgElevated,
                  border: `1.5px solid ${COLORS.border}`,
                }}
              >
                <img
                  src={src}
                  alt={`Trabalho ${i + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    left: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 6,
                    background: "rgba(0,0,0,0.55)",
                    color: "#fff",
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4 }}>
                  <IconBtn title="Mover para cima" onClick={() => onMove(i, -1)}>
                    <ArrowUp size={12} />
                  </IconBtn>
                  <IconBtn title="Mover para baixo" onClick={() => onMove(i, 1)}>
                    <ArrowDown size={12} />
                  </IconBtn>
                </div>
                <div style={{ position: "absolute", bottom: 6, right: 6, display: "flex", gap: 4 }}>
                  <IconBtn title="Substituir" onClick={() => onReplace(i)}>
                    <Upload size={12} />
                  </IconBtn>
                  <IconBtn title="Remover" danger onClick={() => onRemove(i)}>
                    <Trash2 size={12} />
                  </IconBtn>
                </div>
              </div>
            ))}
            {canAdd && (
              <button
                type="button"
                onClick={onAdd}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: 10,
                  border: `1px solid #d9d9d9`,
                  background: COLORS.bgElevated,
                  color: COLORS.textPrimary,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontFamily: FONT,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                <ImagePlus size={20} />
                Adicionar sua imagem aqui
              </button>
            )}
          </div>
          {!canAdd && (
            <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 12, textAlign: "center" }}>
              Limite de 10 fotos atingido. Remova uma foto para adicionar outra.
            </p>
          )}
        </div>

        <div
          style={{
            padding: "12px 16px",
            borderTop: `1px solid ${COLORS.border}`,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 38,
              padding: "0 16px",
              borderRadius: 8,
              border: "none",
              background: COLORS.accentLight,
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: FONT,
              cursor: "pointer",
            }}
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
