import { ArrowLeft, CheckCircle2, Cloud, CloudOff, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { useCloudSync } from "../hooks/useCloudSync.ts";
import "./CloudPages.css";

function formatSyncTime(value: string | null): string {
  if (!value) return "Todavía no se ha completado una sincronización";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AccountPage() {
  const { configured, session, status, lastSyncedAt, error, syncNow, signOut } = useCloudSync();
  const isBusy = status === "syncing";

  return (
    <main className="cloud-account-page">
      <div className="cloud-account-shell">
        <header className="cloud-page-header">
          <Link to="/" aria-label="Volver"><ArrowLeft size={20} /></Link>
          <div><span>LA FORJA</span><strong>Cuenta y sincronización</strong></div>
        </header>

        <section className="cloud-account-hero">
          <span className="cloud-kicker"><Cloud size={16} /> SUPABASE</span>
          <h1>Tu progreso está <em>respaldado.</em></h1>
          <p>La app mantiene una copia local para responder rápido y sincroniza cada módulo con tu cuenta.</p>
        </section>

        <section className="cloud-account-grid">
          <article className="cloud-account-card cloud-account-card--primary">
            <div className="cloud-account-card__icon"><ShieldCheck size={24} /></div>
            <span>CUENTA</span>
            <h2>{session?.user.email ?? "Sin sesión"}</h2>
            <p>{configured ? "Autenticación por correo y código OTP." : "Supabase todavía no está configurado en este entorno."}</p>
          </article>

          <article className="cloud-account-card">
            <div className="cloud-account-card__icon">
              {status === "offline" || status === "error" ? <CloudOff size={24} /> : <CheckCircle2 size={24} />}
            </div>
            <span>ESTADO</span>
            <h2>{status === "syncing" ? "Sincronizando" : status === "synced" ? "Sincronizado" : status === "offline" ? "Modo offline" : status === "local-only" ? "Solo local" : "Revisar conexión"}</h2>
            <p>{formatSyncTime(lastSyncedAt)}</p>
          </article>
        </section>

        <section className="cloud-data-card">
          <div>
            <span>DATOS INCLUIDOS</span>
            <h2>La Forja guarda todo el progreso funcional</h2>
            <p>Perfil y peso histórico, campaña, XP, monedas, racha, sesiones, rutinas generadas, Operación Forja, cardio, pasos, hábitos, comidas, entrenamientos libres, laboratorio y estadísticas de detección.</p>
          </div>
          <div className="cloud-data-tags">
            <span>Perfil</span><span>Peso</span><span>Campaña</span><span>Cardio</span><span>Fuerza</span><span>Comidas</span><span>Pasos</span><span>Rutinas</span><span>Movement Lab</span>
          </div>
        </section>

        {error && <p className="cloud-account-error">{error}</p>}

        <div className="cloud-account-actions">
          <button disabled={!session || isBusy} onClick={() => void syncNow()} type="button">
            <RefreshCw className={isBusy ? "cloud-spin" : ""} size={18} />
            {isBusy ? "Sincronizando..." : "Sincronizar ahora"}
          </button>
          <button className="cloud-danger-button" disabled={!session} onClick={() => void signOut()} type="button">
            <LogOut size={18} /> Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  );
}
