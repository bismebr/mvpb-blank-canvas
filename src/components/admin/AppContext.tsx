import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type ServicoFuncMode = "todos" | "exceto" | "apenas";

export interface ServicoAdmin {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
  imagemUrl?: string;
  descricao?: string;
  categoriaId?: string;
  funcionariosMode?: ServicoFuncMode;
  funcionariosIds?: string[];
}

export interface HorarioAdmin {
  diaSemana: number; // 0=Dom..6=Sab
  aberto: boolean;
  abre: string; // HH:MM
  fecha: string;
}

export interface CategoriaAdmin {
  id: string;
  nome: string;
}

export type StatusAg = "confirmado" | "concluido" | "cancelado" | "pendente" | "naoCompareceu";

export interface AgendamentoAdmin {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  servicoId: string;
  funcionarioId?: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:MM
  observacao?: string;
  status: StatusAg;
  /** Preenchido apenas quando o agendamento é cancelado pelo cliente. */
  motivoCancelamento?: string;
  /** Carimbos do banco (appointments.created_at / updated_at) para Atividade. */
  createdAt?: string;
  updatedAt?: string;
  /** Snapshot do preço do serviço no momento do agendamento (centavos). */
  precoCentsSnapshot?: number;
}

export interface BloqueioAdmin {
  id: string;
  data: string;
  inicio?: string;
  fim?: string;
  diaInteiro: boolean;
  /** undefined = bloqueio para o negócio todo (todos os funcionários e proprietário). */
  funcionarioId?: string;
}

export interface PausaAdmin {
  id: string;
  /** null = todos os dias de funcionamento */
  diaSemana: number | null;
  inicio: string; // HH:MM
  fim: string;    // HH:MM
  /** undefined = aplica para todo o negócio */
  funcionarioId?: string;
}

export type StatusFunc = "ativo" | "ausente" | "atendimento";

export type FuncServMode = "todos" | "apenas";

export interface FuncionarioAdmin {
  id: string;
  nome: string;
  fotoUrl?: string;
  idade?: number;
  cargo: string;
  telefone?: string;
  status: StatusFunc;
  comissaoPct: number; // 0-100
  entrada: string; // HH:MM
  saida: string; // HH:MM
  diasFolga: number[]; // 0-6
  feriasInicio?: string; // YYYY-MM-DD
  feriasFim?: string;
  servicosMode?: FuncServMode;
  servicosIds?: string[];
}

const CATEGORIAS_INICIAIS: CategoriaAdmin[] = [];

const SERVICOS_INICIAIS: ServicoAdmin[] = [];


const HORARIOS_INICIAIS: HorarioAdmin[] = [
  { diaSemana: 1, aberto: true, abre: "08:00", fecha: "18:00" },
  { diaSemana: 2, aberto: true, abre: "08:00", fecha: "18:00" },
  { diaSemana: 3, aberto: true, abre: "08:00", fecha: "18:00" },
  { diaSemana: 4, aberto: true, abre: "08:00", fecha: "18:00" },
  { diaSemana: 5, aberto: true, abre: "08:00", fecha: "18:00" },
  { diaSemana: 6, aberto: true, abre: "08:00", fecha: "16:00" },
  { diaSemana: 0, aberto: false, abre: "08:00", fecha: "12:00" },
];

const FUNCIONARIOS_INICIAIS: FuncionarioAdmin[] = [];

export type AdminAuthProvider = "password" | "google";

interface Ctx {
  isAdmin: boolean;
  setAdmin: (v: boolean) => void;
  adminEmail: string;
  setAdminEmail: (v: string) => void;
  adminName: string;
  setAdminName: (v: string) => void;
  adminAvatar: string;
  setAdminAvatar: (v: string) => void;
  authProvider: AdminAuthProvider;
  setAuthProvider: (v: AdminAuthProvider) => void;
  hasPassword: boolean;
  setHasPassword: (v: boolean) => void;
  signOut: () => void;
  servicos: ServicoAdmin[];
  setServicos: (s: ServicoAdmin[]) => void;
  saveServico: (s: ServicoAdmin) => void;
  deleteServico: (id: string) => void;
  categorias: CategoriaAdmin[];
  setCategorias: (c: CategoriaAdmin[]) => void;
  saveCategoria: (c: CategoriaAdmin) => void;
  deleteCategoria: (id: string) => void;
  horarios: HorarioAdmin[];
  setHorarios: (h: HorarioAdmin[]) => void;
  agendamentos: AgendamentoAdmin[];
  setAgendamentos: (a: AgendamentoAdmin[]) => void;
  addAgendamento: (a: AgendamentoAdmin) => void;
  updateStatusAg: (id: string, status: StatusAg, motivo?: string) => void;
  bloqueios: BloqueioAdmin[];
  setBloqueios: (b: BloqueioAdmin[]) => void;
  addBloqueio: (b: BloqueioAdmin) => void;
  removeBloqueio: (id: string) => void;
  pausas: PausaAdmin[];
  setPausas: (p: PausaAdmin[]) => void;
  savePausa: (p: PausaAdmin) => void;
  removePausa: (id: string) => void;
  funcionarios: FuncionarioAdmin[];
  setFuncionarios: (f: FuncionarioAdmin[]) => void;
  saveFuncionario: (f: FuncionarioAdmin) => void;
  deleteFuncionario: (id: string) => void;
}

const AppCtx = createContext<Ctx | null>(null);

export interface AppProviderInitial {
  servicos?: ServicoAdmin[];
  categorias?: CategoriaAdmin[];
  funcionarios?: FuncionarioAdmin[];
  horarios?: HorarioAdmin[];
}

export function AppProvider({ children, initial }: { children: ReactNode; initial?: AppProviderInitial }) {
  const [isAdmin, setAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("eliaquimsantos@gmail.com");
  const [adminName, setAdminName] = useState("");
  const [adminAvatar, setAdminAvatar] = useState("");
  const [authProvider, setAuthProvider] = useState<AdminAuthProvider>("password");
  const [hasPassword, setHasPassword] = useState<boolean>(true);
  const [servicos, setServicos] = useState<ServicoAdmin[]>(initial?.servicos ?? SERVICOS_INICIAIS);
  const [categorias, setCategorias] = useState<CategoriaAdmin[]>(initial?.categorias ?? CATEGORIAS_INICIAIS);
  const [horarios, setHorarios] = useState<HorarioAdmin[]>(initial?.horarios ?? HORARIOS_INICIAIS);
  const [agendamentos, setAgendamentos] = useState<AgendamentoAdmin[]>([]);
  const [bloqueios, setBloqueios] = useState<BloqueioAdmin[]>([]);
  const [pausas, setPausas] = useState<PausaAdmin[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioAdmin[]>(initial?.funcionarios ?? FUNCIONARIOS_INICIAIS);

  const saveServico = useCallback((s: ServicoAdmin) => {
    setServicos((list) => {
      const i = list.findIndex((x) => x.id === s.id);
      if (i === -1) return [...list, s];
      const copy = [...list]; copy[i] = s; return copy;
    });
  }, []);
  const deleteServico = useCallback((id: string) => {
    setServicos((list) => list.filter((s) => s.id !== id));
  }, []);
  const saveCategoria = useCallback((c: CategoriaAdmin) => {
    setCategorias((list) => {
      const i = list.findIndex((x) => x.id === c.id);
      if (i === -1) return [...list, c];
      const copy = [...list]; copy[i] = c; return copy;
    });
  }, []);
  const deleteCategoria = useCallback((id: string) => {
    setCategorias((list) => list.filter((c) => c.id !== id));
    setServicos((list) => list.map((s) => (s.categoriaId === id ? { ...s, categoriaId: undefined } : s)));
  }, []);
  const addAgendamento = useCallback((a: AgendamentoAdmin) => {
    setAgendamentos((l) => [...l, a]);
  }, []);
  const updateStatusAg = useCallback((id: string, status: StatusAg, motivo?: string) => {
    setAgendamentos((l) => l.map((a) => {
      if (a.id !== id) return a;
      const next: AgendamentoAdmin = { ...a, status };
      if (status === "cancelado" && motivo !== undefined) next.motivoCancelamento = motivo;
      return next;
    }));
  }, []);
  const addBloqueio = useCallback((b: BloqueioAdmin) => {
    setBloqueios((l) => [...l, b]);
  }, []);
  const removeBloqueio = useCallback((id: string) => {
    setBloqueios((l) => l.filter((b) => b.id !== id));
  }, []);
  const savePausa = useCallback((p: PausaAdmin) => {
    setPausas((l) => {
      const i = l.findIndex((x) => x.id === p.id);
      if (i === -1) return [...l, p];
      const c = [...l]; c[i] = p; return c;
    });
  }, []);
  const removePausa = useCallback((id: string) => {
    setPausas((l) => l.filter((p) => p.id !== id));
  }, []);
  const saveFuncionario = useCallback((f: FuncionarioAdmin) => {
    setFuncionarios((l) => {
      const i = l.findIndex((x) => x.id === f.id);
      if (i === -1) return [...l, f];
      const c = [...l]; c[i] = f; return c;
    });
  }, []);
  const deleteFuncionario = useCallback((id: string) => {
    setFuncionarios((l) => l.filter((f) => f.id !== id));
  }, []);
  const signOut = useCallback(() => {
    setAdmin(false);
    setAdminEmail("");
    setAdminName("");
    setAdminAvatar("");
  }, []);

  const value = useMemo<Ctx>(() => ({
    isAdmin, setAdmin,
    adminEmail, setAdminEmail,
    adminName, setAdminName,
    adminAvatar, setAdminAvatar,
    authProvider, setAuthProvider,
    hasPassword, setHasPassword,
    signOut,
    servicos, setServicos, saveServico, deleteServico,
    categorias, setCategorias, saveCategoria, deleteCategoria,
    horarios, setHorarios,
    agendamentos, setAgendamentos, addAgendamento, updateStatusAg,
    bloqueios, setBloqueios, addBloqueio, removeBloqueio,
    pausas, setPausas, savePausa, removePausa,
    funcionarios, setFuncionarios, saveFuncionario, deleteFuncionario,
  }), [isAdmin, adminEmail, adminName, adminAvatar, authProvider, hasPassword, signOut, servicos, categorias, horarios, agendamentos, bloqueios, pausas, funcionarios, saveServico, deleteServico, saveCategoria, deleteCategoria, addAgendamento, updateStatusAg, addBloqueio, removeBloqueio, savePausa, removePausa, saveFuncionario, deleteFuncionario]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}
