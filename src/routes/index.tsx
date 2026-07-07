import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ServicesTab } from "@/components/barbearia/ServicesTab";
import { SucessoModal, type SucessoInfo } from "@/components/barbearia/Modals";
import { BarbeariaLayout } from "@/components/barbearia/BarbeariaLayout";
import { LoadingOverlay } from "@/components/barbearia/LoadingOverlay";
import type { Usuario } from "@/components/barbearia/data";
import { useApp } from "@/components/admin/AppContext";
import { useClientUser } from "@/components/barbearia/ClientUserContext";
import { EspecialistasSection } from "@/components/barbearia/EspecialistasSection";
import { BookingScreen, type BookingResult } from "@/components/barbearia/BookingScreen";
import { isPhoneValid } from "@/components/barbearia/phoneMask";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Barbearia Sr. Eli — Timon, MA" },
      { name: "description", content: "Barbearia Sr. Eli em Timon, MA. Cortes, barba e combos com Eliaquim Santos. Agende seu horário online." },
      { property: "og:title", content: "Barbearia Sr. Eli — Timon, MA" },
      { property: "og:description", content: "Cortes, barba e combos com qualidade. Agende seu horário online." },
    ],
  }),
  component: IndexRouteComponent,
});

function IndexRouteComponent() {
  return <Index />;
}

function Index() {
  const navigate = useNavigate();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingServicoId, setBookingServicoId] = useState<string | null>(null);
  const [pending, setPending] = useState<BookingResult | null>(null);
  const [sucessoOpen, setSucessoOpen] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [sucessoInfo, setSucessoInfo] = useState<SucessoInfo | null>(null);

  const { addAgendamento, funcionarios, servicos } = useApp();
  const { updateUsuario } = useClientUser();
  const [especialistaId, setEspecialistaId] = useState<string | null>(null);
  const exigirEspecialista = funcionarios.length >= 2;
  const bloqueado = exigirEspecialista && !especialistaId;

  return (
    <BarbeariaLayout>
      {({ usuario, abrirLogin }) => {
        const finalize = (r: BookingResult, u: Usuario) => {
          setConfirmando(true);
          // Garante o WhatsApp no perfil em memória — preferência para o
          // número informado no fluxo de agendamento (já validado).
          // TODO(Supabase): persistir telefone no perfil do cliente.
          const telefoneFinal = r.whatsapp || u.telefone || "";
          if (telefoneFinal && telefoneFinal !== u.telefone) {
            updateUsuario({ telefone: telefoneFinal });
          }
          setTimeout(() => {
            r.items.forEach((it, i) => {
              addAgendamento({
                id: `${Date.now()}-${i}`,
                nome: u.nome,
                telefone: telefoneFinal,
                email: u.email,
                servicoId: it.servicoId,
                funcionarioId: it.funcionarioId ?? especialistaId ?? undefined,
                data: r.data,
                horario: r.horario,
                observacao: r.observacao,
                status: "confirmado",
              });
            });
            const first = r.items[0];
            const svc = servicos.find((s) => s.id === first?.servicoId);
            const funcId = first?.funcionarioId ?? especialistaId ?? undefined;
            const func = funcionarios.find((f) => f.id === funcId);
            setSucessoInfo({
              servico: svc?.nome ?? "Serviço",
              data: r.data,
              horario: r.horario,
              profissional: func?.nome,
            });
            setConfirmando(false);
            setBookingOpen(false);
            setPending(null);
            setSucessoOpen(true);
          }, 900);
        };

        // Se o usuário acabou de fazer login/cadastro e há um booking pendente:
        //  - tem WhatsApp salvo (ou veio preenchido no fluxo) → finaliza direto.
        //  - não tem WhatsApp → mantém o BookingScreen aberto para coleta no resumo.
        if (usuario && pending && !confirmando && !sucessoOpen) {
          const phone = usuario.telefone || pending.whatsapp;
          if (isPhoneValid(phone ?? "")) {
            finalize(pending, usuario);
          } else {
            // Reabre o resumo (caso tenha sido fechado) e limpa o pending —
            // o cliente vai preencher o WhatsApp e clicar em Confirmar novamente.
            if (!bookingOpen) setBookingOpen(true);
            setPending(null);
          }
        }

        return (
          <>
            <EspecialistasSection
              funcionarios={funcionarios}
              selectedId={especialistaId}
              onSelect={setEspecialistaId}
            />

            <div
              style={{
                opacity: bloqueado ? 0.45 : 1,
                pointerEvents: bloqueado ? "none" : "auto",
                transition: "opacity 200ms",
                position: "relative",
              }}
              aria-disabled={bloqueado}
            >
              {bloqueado && (
                <div style={{ textAlign: "center", padding: "12px 16px 0", fontSize: 13, color: "var(--site-on-bg-muted, #888)", fontWeight: 600 }}>
                  Selecione um profissional para continuar
                </div>
              )}
              <ServicesTab
                onReservar={(id) => {
                  setBookingServicoId(id);
                  setBookingOpen(true);
                }}
              />
            </div>

            <BookingScreen
              open={bookingOpen}
              initialServicoId={bookingServicoId ?? ""}
              initialFuncionarioId={especialistaId}
              initialWhatsapp={usuario?.telefone ?? ""}
              requireWhatsapp={!!usuario && !isPhoneValid(usuario.telefone ?? "")}
              onClose={() => setBookingOpen(false)}
              onConfirm={(r) => {
                if (!usuario) {
                  // Sem login: guarda o agendamento e abre login/cadastro por cima.
                  // O BookingScreen continua aberto para preservar a seleção
                  // (data, horário, serviços) caso o WhatsApp ainda precise ser coletado.
                  setPending(r);
                  abrirLogin("cadastro");
                  return;
                }
                finalize(r, usuario);
              }}
            />


            <SucessoModal
              open={sucessoOpen}
              info={sucessoInfo}
              onClose={() => setSucessoOpen(false)}
              onVerAgendamentos={() => {
                navigate({ to: "/meus-agendamentos" });
                setTimeout(() => setSucessoOpen(false), 50);
              }}
            />
            {(confirmando || (!!pending && !!usuario && !sucessoOpen)) && (
              <LoadingOverlay message="Confirmando seu agendamento..." />
            )}
          </>
        );
      }}
    </BarbeariaLayout>
  );
}
