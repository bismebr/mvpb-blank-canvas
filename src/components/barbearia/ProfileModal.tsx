import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { useClientUser } from "./ClientUserContext";

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

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setFotoUrl(String(r.result));
    r.readAsDataURL(f);
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
            style={{ background: "transparent", border: "none", color: "var(--site-primary, #5690f5)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FONT }}
          >
            Alterar foto de perfil
          </button>
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