import { supabase } from "@/integrations/supabase/client";
import type { SiteConfig } from "@/components/admin/SiteConfigContext";
import type { SiteTemplateId } from "@/lib/siteTemplates";

/** Resolve current logged-in user's company_id via company_members. */
export async function resolveCurrentCompanyId(): Promise<string | null> {
  const { data, error } = await supabase
    .from("company_members")
    .select("company_id")
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[companySite] resolveCurrentCompanyId", error);
    return null;
  }
  return data?.company_id ?? null;
}

export interface LoadedSiteRow {
  display_name: string | null;
  about: string | null;
  address: string | null;
  whatsapp: string | null;
  template_key: string | null;
  theme_key: string | null;
  logo_url: string | null;
  cover_url: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_youtube: string | null;
  social_tiktok: string | null;
  website_url: string | null;
  show_address: boolean | null;
  amenities: string[] | null;
  about_image_url: string | null;
  work_image_urls: string[] | null;
  rating_average: number | null;
  reviews_count: number | null;
}

export interface LoadedCompanySite {
  companyId: string;
  company: { name: string; slug: string; timezone: string };
  site: LoadedSiteRow | null;
}

const SITE_COLUMNS =
  "display_name,about,address,whatsapp,template_key,theme_key,logo_url,cover_url,social_instagram,social_facebook,social_youtube,social_tiktok,website_url,show_address,amenities,about_image_url,work_image_urls,rating_average,reviews_count";

export async function loadCompanySite(companyId: string): Promise<LoadedCompanySite | null> {
  const [{ data: company, error: cErr }, { data: site, error: sErr }] = await Promise.all([
    supabase.from("companies").select("name,slug,timezone").eq("id", companyId).maybeSingle(),
    supabase.from("site_settings").select(SITE_COLUMNS).eq("company_id", companyId).maybeSingle(),
  ]);
  if (cErr) console.error("[companySite] companies", cErr);
  if (sErr) console.error("[companySite] site_settings", sErr);
  if (!company) return null;
  return { companyId, company, site: (site as LoadedSiteRow | null) ?? null };
}

/**
 * Parse an address formatted by `formatAddressParts`
 * ("street, number, city - state") back into parts. Best-effort.
 */
export function parseAddressString(value: string): {
  addressStreet: string;
  addressNumber: string;
  addressCity: string;
  addressState: string;
} {
  const result = { addressStreet: "", addressNumber: "", addressCity: "", addressState: "" };
  if (!value) return result;
  const [left, right] = value.split(" - ");
  if (right) result.addressState = right.trim();
  const parts = (left ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 1) result.addressStreet = parts[0];
  if (parts.length >= 2) result.addressNumber = parts[1];
  if (parts.length >= 3) result.addressCity = parts.slice(2).join(", ");
  return result;
}

/** Save deltas to companies + site_settings. Uses upsert on site_settings
 *  to guarantee a row exists for this company. Returns true on success. */
export async function saveCompanySite(
  companyId: string,
  companyPatch: { name?: string; slug?: string },
  sitePatch: Partial<{
    display_name: string | null;
    about: string | null;
    address: string | null;
    whatsapp: string | null;
    template_key: string | null;
    theme_key: string | null;
    logo_url: string | null;
    cover_url: string | null;
    social_instagram: string | null;
    social_facebook: string | null;
  }>,
): Promise<boolean> {
  let ok = true;
  if (Object.keys(companyPatch).length > 0) {
    const { error } = await supabase.from("companies").update(companyPatch).eq("id", companyId);
    if (error) {
      console.error("[companySite] update companies", error);
      ok = false;
    }
  }
  if (Object.keys(sitePatch).length > 0) {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ company_id: companyId, ...sitePatch }, { onConflict: "company_id" });
    if (error) {
      console.error("[companySite] upsert site_settings", error);
      ok = false;
    }
  }
  return ok;
}

/** Maps the loaded DB shape to SiteConfig fields that are backed by columns. */
export function siteConfigPatchFromLoad(loaded: LoadedCompanySite): Partial<SiteConfig> {
  const { company, site } = loaded;
  const patch: Partial<SiteConfig> = {
    tenantId: loaded.companyId,
    businessName: site?.display_name || company.name || "",
    username: company.slug || "",
  };
  if (site) {
    if (site.address) patch.address = site.address;
    if (site.whatsapp) {
      const digits = site.whatsapp.replace(/\D+/g, "");
      patch.whatsapp = digits.startsWith("55") ? digits.slice(2) : digits;
    }
    if (site.template_key) patch.template = site.template_key as SiteTemplateId;
    if (site.logo_url) patch.logo = site.logo_url;
    if (site.cover_url) patch.coverImage = site.cover_url;
    if (site.about) patch.aboutText = site.about;
    if (site.social_instagram) patch.instagram = site.social_instagram;
    if (site.social_facebook) patch.facebook = site.social_facebook;
    if (site.social_youtube) patch.youtube = site.social_youtube;
    if (site.social_tiktok) patch.tiktok = site.social_tiktok;
    if (site.website_url) patch.site = site.website_url;
    if (site.about_image_url) patch.aboutImage = site.about_image_url;
    if (Array.isArray(site.work_image_urls)) patch.workGallery = site.work_image_urls;
    if (Array.isArray(site.amenities)) patch.comodidades = site.amenities;
    if (typeof site.show_address === "boolean") patch.showAddress = site.show_address;
    if (site.rating_average != null) patch.ratingAverage = Number(site.rating_average) || 0;
    if (site.reviews_count != null) patch.reviewsCount = Number(site.reviews_count) || 0;
  }
  return patch;
}

// ---- Public site (RPC) ----

export interface PublicSiteData {
  company: { id: string; name: string; slug: string; timezone: string };
  site: {
    display_name: string | null;
    about: string | null;
    cover_url: string | null;
    logo_url: string | null;
    whatsapp: string | null;
    address: string | null;
    social_instagram: string | null;
    social_facebook: string | null;
    social_youtube: string | null;
    social_tiktok: string | null;
    website_url: string | null;
    template_key: string | null;
    theme_key: string | null;
    show_address: boolean | null;
    amenities: string[] | null;
    about_image_url: string | null;
    work_image_urls: string[] | null;
    rating_average: number | null;
    reviews_count: number | null;
  } | null;
  hours: Array<{ weekday: number; is_open: boolean; opens_at: string; closes_at: string }>;
  categories: Array<{ id: string; name: string; position: number }>;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    price_cents: number;
    duration_minutes: number;
    image_url: string | null;
    category_id: string | null;
  }>;
  professionals: Array<{
    id: string;
    name: string;
    role_title: string | null;
    photo_url: string | null;
    bio: string | null;
    position: number;
  }>;
  service_professionals: Array<{ service_id: string; professional_id: string }>;
  reviews: Array<{ customer_name: string; rating: number; comment: string | null; created_at: string }>;
}

export async function getPublicSiteBySlug(slug: string): Promise<PublicSiteData | null> {
  const { data, error } = await supabase.rpc("get_public_site_by_slug", { _slug: slug });
  if (error) {
    console.error("[companySite] get_public_site_by_slug", error);
    return null;
  }
  if (!data) return null;
  return data as unknown as PublicSiteData;
}
