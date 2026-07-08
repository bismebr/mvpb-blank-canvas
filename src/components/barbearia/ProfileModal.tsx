import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { useClientUser } from "./ClientUserContext";
import { supabasePublic as supabase } from "@/integrations/supabase/client-public";

const FONT = "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { usuario, updateUsuario, setUsuario } = useClientUser();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragY, setDragY] = useState(0);
  const dragRef = useRef<{ startY: number; atTop: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  useEffect(() => {
    if (open && usuario) {
      setNome(usuario.nome);
      setTelefone(usuario.telefone ?? "");
      setEmail(usuario.email);
      setFotoUrl(usuario.fotoUrl);
      setDragY(0);
    }
  }, [open, usuario]);

  // Bloqueia rolagem do fundo enquanto aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open || !usuario) return null;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setUploadErr("Envie um arquivo JPG, PNG ou WEBP.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setUploadErr("A imagem deve ter no máximo 5MB.");
      return;
    }
    setUploadErr(null);
    setUploading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) throw new Error("Sessão expirada.");

      // Redimensiona/normaliza para 512x512 webp, mesmo padrão do admin.
      const dataUrl: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(new Error("Falha ao ler imagem."));
        r.readAsDataURL(f);
      });
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("Falha ao carregar imagem."));
      });
      const canvas = document.createElement("canvas");
      canvas.width = 512; canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Falha ao processar imagem.");
      // cover crop centralizado
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2;
      const sy = (img.height - s) / 2;
      ctx.drawImage(img, sx, sy, s, s, 0, 0, 512, 512);
      const blob: Blob = await new Promise((res, rej) => {
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao gerar imagem."))), "image/webp", 0.9);
      });

      const path = `${uid}/client-avatar-${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage
        .from("profile-avatars")
        .upload(path, blob, { contentType: "image/webp", upsert: false });
      if (upErr) throw upErr;

      // Registra o path no user_metadata (global por conta, entre navegadores/dispositivos).
      const { error: metaErr } = await supabase.auth.updateUser({
        data: { avatarPath: path },
      });
      if (metaErr) throw metaErr;

      // Remove arquivos antigos do próprio usuário para não acumular.
      try {
        const { data: list } = await supabase.storage
          .from("profile-avatars")
          .list(uid, { limit: 100 });
        const stale = (list ?? [])
          .filter((f) => f.name.startsWith("client-avatar-") && `${uid}/${f.name}` !== path)
          .map((f) => `${uid}/${f.name}`);
        if (stale.length) await supabase.storage.from("profile-avatars").remove(stale);
      } catch { /* limpeza best-effort */ }

      // Signed URL para exibir agora (não é salva no banco).
      const { data: signed } = await supabase.storage
        .from("profile-avatars")
        .createSignedUrl(path, 60 * 60);
      if (signed?.signedUrl) setFotoUrl(signed.signedUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao enviar foto.";
      setUploadErr(msg);
    } finally {
      setUploading(false);
    }
  }

  function salvar() {
    updateUsuario({ nome: nome.trim() || usuario!.nome, telefone: telefone.trim(), fotoUrl });
    onClose();
  }

  function sair() {
    setUsuario(null);
    onClose();
  }

  function onHandlePointerDown(e: RPointerEvent<HTMLDivElement>) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, atTop: true };
  }
  function onHandlePointerMove(e: RPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dy = e.clientY - dragRef.current.startY;
    setDragY(Math.max(0, dy));
  }
  function onHandlePointerUp() {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (dragY > 120) onClose();
    else setDragY(0);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
        fontFamily: FONT,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        overscrollBehavior: "contain",
      }}
    >
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", touchAction: "none" }} />
      <div
        style={{
          position: "relative", width: "100%", maxWidth: 520, background: "#FFFFFF",
          borderRadius: "20px 20px 0 0",
          marginBottom: "env(safe-area-inset-bottom, 0px)",
          display: "flex", flexDirection: "column",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.18)",
          transform: `translateY(${dragY}px)`,
          transition: dragRef.current ? "none" : "transform 200ms ease-out",
        }}
      >
        {/* Drag handle area (swipe down to close) */}
        <div
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          style={{ padding: "8px 18px 4px", cursor: "grab", touchAction: "none", flexShrink: 0 }}
        >
          <div style={{ width: 40, height: 4, background: "#EEEEEE", borderRadius: 2, margin: "0 auto" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 18px 8px", flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1A1A1A" }}>Meu perfil</h2>
          <button onClick={onClose} aria-label="Fechar" style={{ background: "transparent", border: "none", fontSize: 22, lineHeight: 1, cursor: "pointer", color: "#888" }}>×</button>
        </div>

        <div style={{ padding: "0 18px 18px" }}>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 12 }}>
          {fotoUrl ? (
            <img src={fotoUrl} alt={nome} style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <span style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--site-primary, #5690f5)", color: "#FFFFFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700 }}>
              {(nome || "C").charAt(0).toUpperCase()}
            </span>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ background: "transparent", border: "none", color: "var(--site-primary, #5690f5)", fontWeight: 600, fontSize: 13, cursor: uploading ? "not-allowed" : "pointer", fontFamily: FONT, opacity: uploading ? 0.6 : 1 }}
          >
            {uploading ? "Enviando..." : "Alterar foto de perfil"}
          </button>
          {uploadErr && (
            <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>{uploadErr}</div>
          )}
        </div>

        <Field label="Nome">
          <input value={nome} onChange={(e) => setNome(e.target.value)} style={inputStyle} placeholder="Seu nome" />
        </Field>
        <Field label="Número de telefone">
          <input value={telefone} onChange={(e) => setTelefone(e.target.value)} style={inputStyle} placeholder="(00) 00000-0000" inputMode="tel" />
        </Field>
        <Field label="E-mail">
          <input value={email} disabled style={{ ...inputStyle, background: "#F5F5F5", color: "#888" }} />
        </Field>

        <button
          onClick={salvar}
          style={{ marginTop: 14, width: "100%", height: 46, borderRadius: 14, border: "none", background: "var(--site-primary, #5690f5)", color: "#FFFFFF", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: FONT }}
        >
          Salvar
        </button>

        <button
          onClick={sair}
          style={{ marginTop: 8, width: "100%", height: 44, borderRadius: 14, border: "1.5px solid #EEEEEE", background: "#FFFFFF", color: "#1A1A1A", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: FONT }}
        >
          Sair da conta
        </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#888888", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "11px 14px", fontSize: 15,
  border: "1.5px solid #EEEEEE", borderRadius: 14, background: "#f2f1f6",
  fontFamily: FONT, color: "#1A1A1A", outline: "none",
};