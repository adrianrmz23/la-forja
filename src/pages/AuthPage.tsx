import { useState, type FormEvent } from "react";
import { Cloud, Flame, KeyRound, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { requestEmailOtp, verifyEmailOtp } from "../lib/supabaseRest.ts";
import { useCloudSync } from "../hooks/useCloudSync.ts";
import "./CloudPages.css";

export default function AuthPage() {
  const { setSession } = useCloudSync();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) {
      setError("Escribe un correo válido.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await requestEmailOtp(normalized);
      setEmail(normalized);
      setStep("code");
      setMessage("Te enviamos un código. Escríbelo aquí para entrar y sincronizar tu progreso.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No pudimos enviar el código.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    const cleanToken = token.replace(/\s/g, "");
    if (cleanToken.length < 6) {
      setError("Escribe el código completo que recibiste por correo.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const nextSession = await verifyEmailOtp(email, cleanToken);
      setSession(nextSession);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "El código no es válido o expiró.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="cloud-auth-page">
      <div className="cloud-auth-glow" />
      <section className="cloud-auth-card">
        <div className="cloud-auth-brand">
          <span><Flame size={26} /></span>
          <div><small>LA FORJA</small><strong>Cuenta sincronizada</strong></div>
        </div>

        <div className="cloud-auth-copy">
          <span className="cloud-kicker"><Cloud size={16} /> PROGRESO EN LA NUBE</span>
          <h1>Tu Forja,<br /><em>en todos tus dispositivos.</em></h1>
          <p>Perfil, peso, Operación Forja, comidas, cardio, campaña, entrenamientos libres y estadísticas de movimiento se guardan en Supabase.</p>
        </div>

        <div className="cloud-auth-benefits">
          <div><ShieldCheck size={18} /><span>Datos separados por usuario con RLS</span></div>
          <div><Cloud size={18} /><span>Sincronización automática y respaldo local</span></div>
          <div><KeyRound size={18} /><span>Acceso sin contraseña mediante código</span></div>
        </div>

        {step === "email" ? (
          <form className="cloud-auth-form" onSubmit={sendCode}>
            <label>
              <span>Correo electrónico</span>
              <div><Mail size={18} /><input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" type="email" value={email} /></div>
            </label>
            <button disabled={busy} type="submit">
              {busy ? <LoaderCircle className="cloud-spin" size={18} /> : <Mail size={18} />}
              Enviar código
            </button>
          </form>
        ) : (
          <form className="cloud-auth-form" onSubmit={verifyCode}>
            <label>
              <span>Código de acceso</span>
              <div><KeyRound size={18} /><input autoComplete="one-time-code" inputMode="numeric" maxLength={8} onChange={(event) => setToken(event.target.value)} placeholder="123456" value={token} /></div>
            </label>
            <button disabled={busy} type="submit">
              {busy ? <LoaderCircle className="cloud-spin" size={18} /> : <ShieldCheck size={18} />}
              Entrar a La Forja
            </button>
            <button className="cloud-auth-link" disabled={busy} onClick={() => { setStep("email"); setToken(""); setMessage(null); setError(null); }} type="button">Usar otro correo</button>
          </form>
        )}

        {message && <p className="cloud-auth-message">{message}</p>}
        {error && <p className="cloud-auth-error">{error}</p>}

        <small className="cloud-auth-note">La primera vez que entres, La Forja migrará automáticamente el progreso que ya tengas guardado en este navegador.</small>
      </section>
    </main>
  );
}
