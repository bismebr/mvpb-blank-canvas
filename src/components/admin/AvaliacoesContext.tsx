import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

// TODO: integrar com Supabase quando o banco estiver disponível.

export interface Avaliacao {
  id: string;
  nome: string;
  fotoUrl?: string;
  estrelas: number; // 1-5
  texto: string;
  imagemUrl?: string;
  data: string; // ISO
  /** true quando a avaliação foi adicionada por um cliente real (não é seed). */
  isReal?: boolean;
}

const SEED: Avaliacao[] = [
  { id: "av1", nome: "Rafael", estrelas: 5, texto: "Atendimento excelente, tudo foi feito com muito cuidado e profissionalismo. Gostei muito da experiência e recomendo.", data: "2026-05-18T08:24:00.000Z", isReal: false },
  { id: "av2", nome: "Camila", estrelas: 5, texto: "Fui muito bem atendida do início ao fim. O serviço superou minhas expectativas e com certeza voltarei mais vezes.", data: "2026-04-02T14:10:00.000Z", isReal: false },
  { id: "av3", nome: "Lucas", estrelas: 5, texto: "Trabalho de muita qualidade, ambiente agradável e atendimento muito atencioso. Recomendo para quem busca um bom serviço.", data: "2026-03-15T19:45:00.000Z", isReal: false },
  { id: "av4", nome: "Mariana", estrelas: 4, texto: "Gostei bastante do atendimento e do resultado. Foi uma experiência muito boa e pretendo voltar novamente.", data: "2026-02-20T16:30:00.000Z", isReal: false },
  { id: "av5", nome: "André", estrelas: 4, texto: "Serviço muito bem feito, equipe educada e atendimento organizado. Recomendo, foi uma ótima experiência.", data: "2026-01-28T11:05:00.000Z", isReal: false },
];

interface Ctx {
  avaliacoes: Avaliacao[];
  addAvaliacao: (a: Omit<Avaliacao, "id" | "data"> & { id?: string; data?: string }) => void;
  updateAvaliacao: (a: Avaliacao) => void;
  removeAvaliacao: (id: string) => void;
}

const AvCtx = createContext<Ctx | null>(null);

export function AvaliacoesProvider({ children }: { children: ReactNode }) {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>(SEED);

  const addAvaliacao = useCallback<Ctx["addAvaliacao"]>((a) => {
    const novo: Avaliacao = {
      id: a.id ?? `av-${Date.now()}`,
      nome: a.nome,
      fotoUrl: a.fotoUrl,
      estrelas: a.estrelas,
      texto: a.texto,
      imagemUrl: a.imagemUrl,
      data: a.data ?? new Date().toISOString(),
      isReal: a.isReal ?? true,
    };
    setAvaliacoes((l) => [novo, ...l]);
  }, []);

  const updateAvaliacao = useCallback((a: Avaliacao) => {
    setAvaliacoes((l) => l.map((x) => (x.id === a.id ? a : x)));
  }, []);

  const removeAvaliacao = useCallback((id: string) => {
    setAvaliacoes((l) => l.filter((x) => x.id !== id));
  }, []);

  const value = useMemo(() => ({ avaliacoes, addAvaliacao, updateAvaliacao, removeAvaliacao }), [avaliacoes, addAvaliacao, updateAvaliacao, removeAvaliacao]);

  return <AvCtx.Provider value={value}>{children}</AvCtx.Provider>;
}

export function useAvaliacoes() {
  const c = useContext(AvCtx);
  if (!c) throw new Error("useAvaliacoes must be used within AvaliacoesProvider");
  return c;
}
