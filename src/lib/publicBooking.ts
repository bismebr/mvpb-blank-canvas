import { supabasePublic as supabase } from "@/integrations/supabase/client-public";

/** Converte número mascarado/digits BR em E.164 (+55 + 11 dígitos). */
export function toE164BR(input: string): string {
  const digits = (input || "").replace(/\D+/g, "");
  const clean = digits.startsWith("55") ? digits.slice(2) : digits;
  if (!clean) return "";
  return `+55${clean}`;
}

/** Constrói timestamp ISO em UTC a partir de data (YYYY-MM-DD) e hora (HH:MM)
 *  interpretadas no fuso do navegador. Para Brasil-only o resultado fica
 *  correto; para outros fusos pode haver leve desvio. */
export function buildStartsAtIso(dateIso: string, time: string): string {
  return new Date(`${dateIso}T${time}:00`).toISOString();
}

function isoToHHmmBR(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).formatToParts(d);
    const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
    const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
    return `${hh.padStart(2, "0")}:${mm}`;
  } catch {
    return null;
  }
}

function normalizeTime(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  // ISO / timestamptz com 'T' ou espaço + 'Z'/offset → converter via TZ BR
  if (/T|Z|[+-]\d{2}:?\d{2}$/.test(v) || v.includes(" ")) {
    const iso = v.includes("T") ? v : v.replace(" ", "T");
    const hhmm = isoToHHmmBR(iso);
    if (hhmm) return hhmm;
  }
  // HH:MM[:SS]
  const m = v.match(/^(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  return null;
}

export interface AvailableSlot {
  time: string; // HH:mm em America/Sao_Paulo
  iso: string | null; // ISO/timestamptz original retornado pela RPC, quando houver
}

function isIsoLike(v: string): boolean {
  return /T|Z|[+-]\d{2}:?\d{2}$/.test(v) || /\s\d{2}:\d{2}/.test(v);
}

function parseSlotsPayloadDetailed(data: unknown): AvailableSlot[] {
  const collect = (v: unknown): AvailableSlot | null => {
    if (typeof v === "string") {
      const time = normalizeTime(v);
      if (!time) return null;
      const iso = isIsoLike(v) ? (v.includes("T") ? v : v.replace(" ", "T")) : null;
      return { time, iso };
    }
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const cand =
        o.start_time ?? o.time ?? o.slot ?? o.starts_at ?? o.hora ?? o.horario;
      if (typeof cand === "string") {
        const time = normalizeTime(cand);
        if (!time) return null;
        const iso = isIsoLike(cand) ? (cand.includes("T") ? cand : cand.replace(" ", "T")) : null;
        return { time, iso };
      }
    }
    return null;
  };
  if (Array.isArray(data)) {
    return data.map(collect).filter((x): x is AvailableSlot => !!x);
  }
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const arr = (o.slots ?? o.available ?? o.times) as unknown;
    if (Array.isArray(arr)) {
      return arr.map(collect).filter((x): x is AvailableSlot => !!x);
    }
  }
  return [];
}

export async function fetchAvailableSlotsDetailed(params: {
  slug: string;
  serviceId: string;
  professionalId: string | null;
  dateIso: string;
}): Promise<AvailableSlot[]> {
  const args = {
    _slug: params.slug,
    _service_id: params.serviceId,
    _professional_id: params.professionalId as string,
    _date: params.dateIso,
  };
  console.log("[Agendamento] get_available_slots args:", args);
  const { data, error } = await supabase.rpc("get_available_slots", args);
  if (error) {
    console.error("[Agendamento] get_available_slots erro:", error);
    throw error;
  }
  console.log("[Agendamento] get_available_slots retorno bruto:", data);
  const slots = parseSlotsPayloadDetailed(data);
  console.log("[Agendamento] get_available_slots normalizado:", slots);
  return slots;
}

export async function fetchAvailableSlots(params: {
  slug: string;
  serviceId: string;
  professionalId: string | null;
  dateIso: string;
}): Promise<string[]> {
  const slots = await fetchAvailableSlotsDetailed(params);
  return slots.map((s) => s.time);
}

export interface CreatePublicAppointmentResult {
  id: string;
  endsAt: string | null;
  cancelToken: string | null;
  reviewToken: string | null;
  raw: unknown;
}

export async function createPublicAppointment(params: {
  slug: string;
  serviceId: string;
  professionalId: string | null;
  startsAtIso: string;
  customerName: string;
  customerPhoneE164: string;
  customerEmail: string | null;
  notes: string | null;
}): Promise<CreatePublicAppointmentResult> {
  const { data, error } = await supabase.rpc("create_public_appointment", {
    _slug: params.slug,
    _service_id: params.serviceId,
    _professional_id: params.professionalId as string,
    _starts_at: params.startsAtIso,
    _customer_name: params.customerName,
    _customer_phone: params.customerPhoneE164,
    _customer_email: params.customerEmail as string,
    _notes: params.notes as string,
  });
  if (error) throw error;
  console.log("[Agendamento] create_public_appointment retorno:", data);
  const o = (data && typeof data === "object" ? (data as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  const pick = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = o[k];
      if (typeof v === "string" && v) return v;
    }
    return null;
  };
  return {
    id: pick("id", "appointment_id", "_id") ?? "",
    endsAt: pick("ends_at", "endsAt"),
    cancelToken: pick("cancel_token", "cancelToken"),
    reviewToken: pick("review_token", "reviewToken"),
    raw: data,
  };
}


