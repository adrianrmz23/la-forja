import {
  Dumbbell,
  Flame,
  Play,
  Shield,
  Trophy,
  UserRound,
} from "lucide-react";

import { Link } from "react-router";
import { usePlayerStore } from "../stores/playerStore";
import { getLevelProgress } from "../utils/progression";
import { useProfileStore } from "../stores/profileStore";

function HomePage() {


  const experience = usePlayerStore(
  (state) => state.experience,
);

const currentStreak = usePlayerStore(
  (state) => state.currentStreak,
);

const totalMissions = usePlayerStore(
  (state) => state.totalMissions,
);

const totalRepetitions = usePlayerStore(
  (state) => state.totalRepetitions,
);

const levelProgress = getLevelProgress(experience);

const profile = useProfileStore(
  (state) => state.profile,
);

const isProfileComplete =
  useProfileStore(
    (state) =>
      state.isProfileComplete,
  );

  return (
    <main className="app-shell">
      <div className="background-glow background-glow--top" />
      <div className="background-glow background-glow--bottom" />

      <section className="home-screen">
        <header className="home-header">
          <div className="brand-mark">
            <Flame size={32} strokeWidth={2.4} />
          </div>

          <div>
            <p className="brand-subtitle">ENTRENA · COMBATE · EVOLUCIONA</p>
            <h1 className="brand-title">LA FORJA</h1>
          </div>
        </header>

        <section className="hero-section">
          <div className="hero-content">
            <span className="hero-tag">
              <Shield size={16} />
              Tu aventura comienza
            </span>

            <h2>
              Convierte cada repetición en una
              <span> victoria.</span>
            </h2>

            <p>
              Supera entrenamientos, derrota enemigos y recupera los
              territorios dominados por las fuerzas de la oscuridad.
            </p>
          </div>

          <div className="player-card">
            <div className="player-card__header">
              <div className="player-avatar">
                <Dumbbell size={30} />
              </div>

              <div>
                <span>GUERRERO</span>
                <h3>
  {isProfileComplete
    ? profile.displayName
    : "Aprendiz de hierro"}
</h3>
              </div>

              <strong>Nv. {levelProgress.level}</strong>
            </div>

            <div className="experience">
              <div className="experience__labels">
                <span>Experiencia</span>
                <span>
  {levelProgress.currentExperience} /{" "}
  {levelProgress.experienceRequired} XP
</span>
              </div>

              <div className="experience__bar">
                <div
  className="experience__progress"
  style={{
    width: `${levelProgress.progressPercentage}%`,
  }}
/>
              </div>
            </div>

            <div className="player-stats">
              <div>
                <Flame size={20} />
                <strong>{currentStreak}</strong>
                <span>Días de racha</span>
              </div>

              <div>
                <Trophy size={20} />
                <strong>{totalMissions}</strong>
                <span>Misiones</span>
              </div>

              <div>
                <Dumbbell size={20} />
                <strong>{totalRepetitions}</strong>
                <span>Repeticiones</span>
              </div>
            </div>
          </div>
        </section>

        <section className="home-actions">
  <Link
    className="button button--primary"
    to={
      isProfileComplete
        ? "/map"
        : "/profile"
    }
  >
    <Play
      size={20}
      fill="currentColor"
    />

    {isProfileComplete
      ? "Continuar aventura"
      : "Crear mi guerrero"}
  </Link>

  <Link
    className="button button--secondary"
    to="/profile"
  >
    <UserRound size={20} />

    {isProfileComplete
      ? "Editar perfil"
      : "Configurar perfil"}
  </Link>
</section>

        <footer className="home-footer">
          <span />
          <p>La Forja espera un nuevo guerrero</p>
          <span />
        </footer>
      </section>
    </main>
  );
}

export default HomePage;