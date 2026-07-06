import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthScreen } from "@/components/empresario/AuthScreen";
import { useApp } from "@/components/admin/AppContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/empresario/cadastro")({
  head: () => ({
    meta: [
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "Criar conta — Bisme" },
      { name: "description", content: "Crie sua conta no Bisme e comece seu teste gratuito." },
    ],
  }),
  component: CadastroEmpresario,
});

function CadastroEmpresario() {
  const navigate = useNavigate();
  const { setAuthProvider, setHasPassword, setAdmin, setAdminEmail } = useApp();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit({ email, senha }: { email: string; senha: string }) {
    setErro(null);
    const valid = /[A-Za-z]/.test(senha) && /\d/.test(senha) && senha.length >= 8;
    if (!valid) {
      setErro("A senha deve conter pelo menos 8 caracteres, uma letra e um dígito.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { emailRedirectTo: `${window.location.origin}/empresario/login` },
      });
      if (error) {
        setErro(error.message);
        return;
      }
      // Se confirmação de e-mail estiver habilitada, não há sessão ainda.
      if (!data.session) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (signInErr) {
          setErro("Conta criada. Confirme seu e-mail para entrar.");
          return;
        }
      }
      setAdminEmail(email);
      setAuthProvider("password");
      setHasPassword(true);
      setAdmin(true);
      navigate({ to: "/empresario/onboarding" });
    } finally {
      setLoading(false);
    }
  }

  function handleGoogle() {
    setErro("Login com Google será disponibilizado em breve. Use e-mail e senha.");
  }

  return (
    <AuthScreen
      mode="signup"
      showPassword
      showPasswordRequirements
      submitting={loading}
      serverError={erro}
      onSubmit={handleSubmit}
      onGoogle={handleGoogle}
    />
  );
}
