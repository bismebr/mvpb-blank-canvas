export interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
  imagemUrl?: string;
}

export const SERVICOS_PADRAO: Servico[] = [];

export const HORARIOS_PADRAO: string[] = (() => {
  const out: string[] = [];
  for (let h = 8; h <= 18; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    if (h !== 18) out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
})();

export interface Agendamento {
  id: string;
  servicoId: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:MM
  nome: string;
  telefone: string;
  profissional?: string;
}

export interface Avaliacao {
  inicial: string;
  nome: string;
  estrelas: number;
  comentario: string;
}

export const AVALIACOES: Avaliacao[] = [];


// Dados padrão mantidos em memória (sem localStorage)
export const AGENDAMENTOS_PADRAO: Agendamento[] = [];
export const BLOQUEIOS_PADRAO: { data: string; horario: string }[] = [];

const _agendamentos: Agendamento[] = [...AGENDAMENTOS_PADRAO];
const _bloqueios: { data: string; horario: string }[] = [...BLOQUEIOS_PADRAO];

export function initLocalStorage() {
  // No-op: dados agora vivem em memória, definidos no código.
}

export function getAgendamentos(): Agendamento[] {
  return _agendamentos;
}

export function getBloqueios(): { data: string; horario: string }[] {
  return _bloqueios;
}

export function saveAgendamento(a: Agendamento) {
  _agendamentos.push(a);
}

// Estado de usuário/sessão mantido apenas em memória (sem localStorage)
let _user: { nome: string; telefone: string } | null = null;
let _usuarios: Usuario[] = [];
let _usuarioLogado: Usuario | null = null;

export function getUser(): { nome: string; telefone: string } | null {
  return _user;
}

export function setUser(u: { nome: string; telefone: string } | null) {
  _user = u;
}

export interface Usuario {
  nome: string;
  email: string;
  senha: string; // btoa-encoded
  criadoEm: string;
  telefone?: string;
  fotoUrl?: string;
}

export function getUsuarios(): Usuario[] {
  return _usuarios;
}

export function saveUsuarios(list: Usuario[]) {
  _usuarios = list;
}

export function getUsuarioLogado(): Usuario | null {
  return _usuarioLogado;
}

export function setUsuarioLogado(u: Usuario | null) {
  _usuarioLogado = u;
}
