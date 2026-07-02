import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Usuario } from "./data";

function userToUsuario(user: User | null): Usuario | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const nome =
    typeof meta.nome === "string" && meta.nome
      ? meta.nome
      : typeof meta.full_name === "string" && meta.full_name
        ? (meta.full_name as string)
        : (user.email ?? "");
  const telefone = typeof meta.telefone === "string" ? meta.telefone : "";
  const fotoUrl = typeof meta.fotoUrl === "string" ? meta.fotoUrl : undefined;
  return {
    nome,
    email: user.email ?? "",
    senha: "",
    criadoEm: user.created_at ?? new Date().toISOString(),
    telefone,
    fotoUrl,
  };
}

interface Ctx {
  usuario: Usuario | null;
  setUsuario: (u: Usuario | null) => void;
  updateUsuario: (patch: Partial<Usuario>) => void;
}

const ClientUserCtx = createContext<Ctx | null>(null);

export function ClientUserProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuarioState] = useState<Usuario | null>(null);

  useEffect(() => {
    let active = true;
    // Hidrata sessão existente após reload
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setUsuarioState(userToUsuario(data.session?.user ?? null));
      })
      .catch(() => {
        if (active) setUsuarioState(null);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuarioState(userToUsuario(session?.user ?? null));
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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
      if (patch.fotoUrl !== undefined) data.fotoUrl = next.fotoUrl;
      if (Object.keys(data).length > 0) {
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
