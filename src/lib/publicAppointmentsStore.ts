import type { StatusAg } from "@/components/admin/AppContext";

const KEY = "bisme.publicAppointments.v1";

export interface PublicAppointmentRecord {
  id: string;
  slug: string;
  serviceId: string;
  serviceName: string;
  professionalId?: string | null;
  professionalName?: string | null;
  data: string; // YYYY-MM-DD
  horario: string; // HH:MM
  endsAt?: string | null;
  cancelToken?: string | null;
  reviewToken?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhoneE164: string;
  customerPhoneDigits: string;
  address?: string | null;
  status: StatusAg;
  observacao?: string | null;
  createdAt: string;
}

function readAll(): PublicAppointmentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PublicAppointmentRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: PublicAppointmentRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

export function addPublicAppointment(rec: PublicAppointmentRecord) {
  const list = readAll().filter((r) => r.id !== rec.id);
  list.push(rec);
  writeAll(list);
}

export function listPublicAppointments(opts: {
  email?: string | null;
  phoneDigits?: string | null;
  slug?: string | null;
}): PublicAppointmentRecord[] {
  const all = readAll();
  const email = (opts.email || "").toLowerCase();
  const phone = (opts.phoneDigits || "").replace(/\D+/g, "");
  const phoneTail = phone.slice(-11);
  return all.filter((r) => {
    if (opts.slug && r.slug !== opts.slug) return false;
    const matchEmail = !!email && !!r.customerEmail && r.customerEmail.toLowerCase() === email;
    const matchPhone =
      !!phoneTail && !!r.customerPhoneDigits && r.customerPhoneDigits.endsWith(phoneTail);
    return matchEmail || matchPhone;
  });
}

export function updatePublicAppointmentStatus(
  id: string,
  status: StatusAg,
  motivo?: string,
) {
  const list = readAll();
  const i = list.findIndex((r) => r.id === id);
  if (i === -1) return;
  const next: PublicAppointmentRecord = { ...list[i], status };
  if (motivo) next.observacao = motivo;
  list[i] = next;
  writeAll(list);
}

export function findPublicAppointment(id: string): PublicAppointmentRecord | null {
  return readAll().find((r) => r.id === id) ?? null;
}
