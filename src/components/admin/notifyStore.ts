// Shared storage for admin notifications and message-sent tracking.
// Backed by localStorage; broadcasts a window event when changed so other
// mounted components can react in real time.

const READ_KEY = "bisme:notif:read";          // agendamento ids the owner has seen
const SENT_KEY = "bisme:msg:confirm-sent";    // agendamento ids whose confirmation WhatsApp was opened
const READ_EVT = "bisme:notif:changed";
const SENT_EVT = "bisme:msg:confirm-sent-changed";

function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((x) => typeof x === "string"));
  } catch { /* ignore */ }
  return new Set();
}
function writeSet(key: string, evt: string, s: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(s)));
    window.dispatchEvent(new CustomEvent(evt));
  } catch { /* ignore */ }
}

/* ---------------- Notifications (read state) ----------------- */

export const notifStore = {
  getRead(): Set<string> { return readSet(READ_KEY); },
  markRead(ids: string[] | string) {
    const s = readSet(READ_KEY);
    (Array.isArray(ids) ? ids : [ids]).forEach((i) => s.add(i));
    writeSet(READ_KEY, READ_EVT, s);
  },
  subscribe(cb: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    const handler = () => cb();
    window.addEventListener(READ_EVT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(READ_EVT, handler);
      window.removeEventListener("storage", handler);
    };
  },
};

/* ---------------- Confirmation sent (whatsapp) --------------- */

export const confirmSentStore = {
  get(): Set<string> { return readSet(SENT_KEY); },
  markSent(id: string) {
    const s = readSet(SENT_KEY);
    s.add(id);
    writeSet(SENT_KEY, SENT_EVT, s);
  },
  subscribe(cb: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    const handler = () => cb();
    window.addEventListener(SENT_EVT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(SENT_EVT, handler);
      window.removeEventListener("storage", handler);
    };
  },
};
