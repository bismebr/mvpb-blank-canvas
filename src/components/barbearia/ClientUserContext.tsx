import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabasePublic as supabase } from "@/integrations/supabase/client-public";
import type { Usuario } from "./data";

function userToUsuario(user: User | null, fotoUrlOverride?: string): Usuario | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const nome =
    typeof meta.nome === "string" && meta.nome
      ? meta.nome
      : typeof meta.full_name === "string" && meta.full_name
        ? (meta.full_name as string)
        : (user.email ?? "");
  const telefone = typeof meta.telefone === "string" ? meta.telefone : "";
  // fotoUrl legado (base64/URL direta) ainda pode estar em meta.fotoUrl.
  // A fonte moderna é meta.avatarPath (path no Storage) -> Signed URL.
  const fotoLegado = typeof meta.fotoUrl === "string" ? meta.fotoUrl : undefined;
  return {
    nome,
    email: user.email ?? "",
    senha: "",
    criadoEm: user.created_at ?? new Date().toISOString(),
    telefone,
    fotoUrl: fotoUrlOverride ?? fotoLegado,
  };
}

async function resolveAvatarUrl(user: User | null): Promise<string | undefined> {
  if (!user) return undefined;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const path = typeof meta.avatarPath === "string" ? meta.avatarPath : "";
  if (!path) return undefined;
  try {
    const { data } = await supabase.storage
      .from("profile-avatars")
      .createSignedUrl(path, 60 * 60);
    return data?.signedUrl;
  } catch (e) {
    console.warn("[ClientUser] createSignedUrl falhou", e);
    return undefined;
  }
}

interface Ctx {
  usuario: Usuario | null;
  setUsuario: (u: Usuario | null) => void;
  updateUsuario: (patch: Partial<Usuario>) => void;
}

const ClientUserCtx = createContext<Ctx | null>(null);

export function ClientUserProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuarioState] = useState<Usuario | null>(null);
  const currentUserRef = useRef<User | null>(null);

  const hydrate = useCallback(async (user: User | null) => {
    currentUserRef.current = user;
    // Publica primeiro o usuário sem foto para não bloquear a UI.
    setUsuarioState(userToUsuario(user));
    const url = await resolveAvatarUrl(user);
    if (currentUserRef.current !== user) return; // sessão trocou nesse meio
    if (url) setUsuarioState(userToUsuario(user, url));
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        void hydrate(data.session?.user ?? null);
      })
      .catch(() => {
        if (active) setUsuarioState(null);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrate(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrate]);

  const setUsuario = useCallback((u: Usuario | null) => {
    if (u === null) {
      void supabase.auth.signOut();
      setUsuarioState(null);
    } else {
      setUsuarioState(u);
    }
  }, []);

  const updateUsuario = useCallback((patch: Partial<Usuario>) => {
    setUsuarioState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      const data: Record<string, unknown> = {};
      if (patch.nome !== undefined) data.nome = next.nome;
      if (patch.telefone !== undefined) data.telefone = next.telefone;
      // fotoUrl aqui é apenas atualização visual (Signed URL/preview).
      // A persistência da foto é feita via avatarPath no ProfileModal.
      if (patch.nome !== undefined || patch.telefone !== undefined) {
        void supabase.auth.updateUser({ data }).catch((e) => {
          console.warn("[ClientUser] updateUser falhou", e);
        });
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ usuario, setUsuario, updateUsuario }),
    [usuario, setUsuario, updateUsuario],
  );

  return <ClientUserCtx.Provider value={value}>{children}</ClientUserCtx.Provider>;
}

export function useClientUser() {
  const c = useContext(ClientUserCtx);
  if (!c) throw new Error("useClientUser must be used within ClientUserProvider");
  return c;
}
