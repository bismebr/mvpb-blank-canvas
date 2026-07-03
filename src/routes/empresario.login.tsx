import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/components/admin/AppContext";
import { AuthScreen } from "@/components/empresario/AuthScreen";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/empresario/login")({
  head: () => ({
    meta: [
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "Entrar — Bisme" },
      { name: "description", content: "Acesse o painel do Bisme para gerenciar sua empresa." },
    ],
  }),
  component: LoginEmpresario,
});

function LoginEmpresario() {
  const navigate = useNavigate();
  const { setAdmin, setAdminEmail, setAuthProvider, setHasPassword } = useApp();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "1") {
      setErro("Senha alterada. Entre com sua nova senha.");
    }
  }, []);

  async function handleSubmit({ email, senha }: { email: string; senha: string }) {
    setErro(null);
    if (!senha) {
      setErro("Informe sua senha.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) {
        setErro(error.message);
        return;
      }
      setAdminEmail(email);
      setAuthProvider("password");
      setHasPassword(true);
      setAdmin(true);
      // Verifica se o usuário já tem empresa criada
      const { data: member } = await supabase
        .from("company_members")
        .select("company_id")
        .limit(1)
        .maybeSingle();
      if (member?.company_id) {
        navigate({ to: "/admin", search: { tab: "agendamentos" } });
      } else {
        // Conta autenticada mas sem vínculo empresarial:
        // não deve entrar no painel nem iniciar onboarding aqui
        // (onboarding é acessível apenas via /empresario/cadastro).
        await supabase.auth.signOut();
        setAdmin(false);
        setErro("Esta conta não possui acesso ao painel do empresário.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleGoogle() {
    setErro("Login com Google será disponibilizado em breve. Use e-mail e senha.");
  }

  return (
    <AuthScreen
      mode="login"
      title="Bem-vindo novamente"
      buttonText="Entrar com e-mail"
      showPassword
      submitting={loading}
      serverError={erro}
      onSubmit={handleSubmit}
      onGoogle={handleGoogle}
      agreementText="Ao continuar, você concorda com"
    />
  );
}
