import { useEffect } from "react";
import {
  ArrowLeft,
  Check,
  Flame,
  Footprints,
  Gauge,
  LockKeyhole,
  Shield,
  Sparkles,
  Swords,
} from "lucide-react";
import { Link } from "react-router";
import { useGeneratedLevelStore } from "../stores/generatedLevelStore.ts";
import { usePlayerStore } from "../stores/playerStore.ts";
import { useProfileStore } from "../stores/profileStore.ts";
import type {
  GeneratedLevel,
  LevelTheme,
} from "../types/generatedLevel.ts";
import { getLevelProgress } from "../utils/progression.ts";

const STATIC_LEVEL_ID = "awakening";

const themeIcons: Record<LevelTheme, typeof Flame> = {
  balanced: Flame,
  strength: Shield,
  cardio: Footprints,
  boxing: Swords,
};

function getGeneratedLevelStatus(
  level: GeneratedLevel,
  levels: GeneratedLevel[],
  staticLevelCompleted: boolean,
) {
  const previousLevelCompleted =
    level.sequence === 2
      ? staticLevelCompleted
      : Boolean(
          levels.find(
            (candidate) =>
              candidate.sequence === level.sequence - 1,
          )?.completedAt,
        );

  return {
    isCompleted: Boolean(level.completedAt),
    isLocked: !previousLevelCompleted,
  };
}

function MapPage() {
  const experience = usePlayerStore(
    (state) => state.experience,
  );

  const completedMissionIds = usePlayerStore(
    (state) => state.completedMissionIds,
  );

  const unlockedMissionIds = usePlayerStore(
    (state) => state.unlockedMissionIds,
  );

  const profile = useProfileStore(
    (state) => state.profile,
  );

  const generatedLevels = useGeneratedLevelStore(
    (state) => state.levels,
  );

  const setActiveLevel = useGeneratedLevelStore(
    (state) => state.setActiveLevel,
  );

  const ensureNextLevel = useGeneratedLevelStore(
    (state) => state.ensureNextLevel,
  );

  const levelProgress = getLevelProgress(experience);

  const staticLevelCompleted =
    completedMissionIds.includes(STATIC_LEVEL_ID);

  const staticLevelUnlocked =
    unlockedMissionIds.includes(STATIC_LEVEL_ID);

  const orderedGeneratedLevels = [...generatedLevels].sort(
    (first, second) => first.sequence - second.sequence,
  );

  /*
   * Respaldo de seguridad: si la misión inicial ya se completó,
   * el mapa garantiza que exista al menos el nivel procedural 02.
   */
  useEffect(() => {
    if (
      !staticLevelCompleted ||
      generatedLevels.some(
        (level) => level.sequence === 2,
      )
    ) {
      return;
    }

    void ensureNextLevel({
      afterSequence: 1,
      difficulty: profile.fitnessLevel,
      minimumCalories: profile.minimumCalorieGoal,
      preferAI: true,
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
      preferredImpact: profile.preferredImpact,
      boxingStance: profile.boxingStance,
    }).catch(() => {
      /* El store ya intenta el respaldo procedural. */
    });
  }, [
    ensureNextLevel,
    generatedLevels,
    profile.boxingStance,
    profile.fitnessLevel,
    profile.heightCm,
    profile.minimumCalorieGoal,
    profile.preferredImpact,
    profile.weightKg,
    staticLevelCompleted,
  ]);

  const completedGeneratedLevels =
    orderedGeneratedLevels.filter(
      (level) => Boolean(level.completedAt),
    ).length;

  const discoveredLevels =
    1 + orderedGeneratedLevels.length;

  const completedLevels =
    (staticLevelCompleted ? 1 : 0) +
    completedGeneratedLevels;

  const territoryProgress = Math.min(
    (completedLevels / discoveredLevels) * 100,
    100,
  );

  return (
    <main className="map-page">
      <div className="map-page__glow" />

      <div className="map-container">
        <header className="map-header">
          <Link
            className="back-button"
            to="/"
            aria-label="Regresar al inicio"
          >
            <ArrowLeft size={21} />
          </Link>

          <div className="map-brand">
            <div className="map-brand__icon">
              <Flame size={24} />
            </div>

            <div>
              <span>LA FORJA</span>
              <strong>Mapa infinito</strong>
            </div>
          </div>

          <div className="map-level">
            <span>Nivel</span>
            <strong>{levelProgress.level}</strong>
          </div>
        </header>

        <section className="map-introduction">
          <span className="map-eyebrow">
            <Sparkles size={16} />
            Campaña procedural
          </span>

          <h1>El Camino Infinito</h1>

          <p>
            Cada guardián derrotado abre una nueva región de la Forja. Los
            niveles cambian sus bloques, objetivos, enemigos y recompensas para
            mantener la campaña en constante evolución.
          </p>

          <div className="territory-progress">
            <div className="territory-progress__labels">
              <span>Progreso de niveles descubiertos</span>

              <strong>
                {completedLevels} / {discoveredLevels} niveles
              </strong>
            </div>

            <div className="territory-progress__bar">
              <div
                className="territory-progress__value"
                style={{ width: `${territoryProgress}%` }}
              />
            </div>
          </div>
        </section>

        <section className="mission-list">
          <article
            className={`mission-card ${
              !staticLevelUnlocked ? "mission-card--locked" : ""
            } ${
              staticLevelCompleted ? "mission-card--completed" : ""
            }`}
          >
            <div className="mission-card__number">01</div>

            <div className="mission-card__icon">
              <Flame size={30} />
            </div>

            <div className="mission-card__content">
              <div className="mission-card__heading">
                <div>
                  <span>
                    {staticLevelCompleted
                      ? "Misión completada"
                      : staticLevelUnlocked
                        ? "Misión disponible"
                        : "Misión bloqueada"}
                  </span>

                  <h2>El despertar</h2>
                </div>

                {staticLevelCompleted ? (
                  <Check size={21} />
                ) : staticLevelUnlocked ? (
                  <Swords size={21} />
                ) : (
                  <LockKeyhole size={21} />
                )}
              </div>

              <p>
                Enciende nuevamente la Forja y completa la primera rutina para
                abrir el camino de los niveles procedurales.
              </p>

              <div className="mission-card__details">
                <span>
                  <Gauge size={16} />
                  Rutina completa · 180+ kcal
                </span>

                <span>
                  <Flame size={16} />
                  100 XP
                </span>
              </div>
            </div>

            {!staticLevelUnlocked ? (
              <button
                className="mission-button mission-button--locked"
                disabled
                type="button"
              >
                <LockKeyhole size={18} />
                Bloqueada
              </button>
            ) : (
              <Link
                className={`mission-button ${
                  staticLevelCompleted
                    ? "mission-button--completed"
                    : ""
                }`}
                onClick={() => setActiveLevel(null)}
                to="/mission/awakening"
              >
                {staticLevelCompleted
                  ? "Repetir misión"
                  : "Iniciar misión"}
                <Swords size={18} />
              </Link>
            )}
          </article>

          {orderedGeneratedLevels.map((level) => {
            const LevelIcon = themeIcons[level.theme];
            const { isCompleted, isLocked } =
              getGeneratedLevelStatus(
                level,
                orderedGeneratedLevels,
                staticLevelCompleted,
              );

            return (
              <article
                className={`mission-card ${
                  isLocked ? "mission-card--locked" : ""
                } ${isCompleted ? "mission-card--completed" : ""}`}
                key={level.id}
              >
                <div className="mission-card__number">
                  {level.sequence.toString().padStart(2, "0")}
                </div>

                <div className="mission-card__icon">
                  <LevelIcon size={30} />
                </div>

                <div className="mission-card__content">
                  <div className="mission-card__heading">
                    <div>
                      <span>
                        {isCompleted
                          ? "Nivel completado"
                          : isLocked
                            ? "Nivel bloqueado"
                            : level.source === "ai"
                              ? "Nivel generado con IA"
                              : "Nivel procedural disponible"}
                      </span>

                      <h2>{level.name}</h2>
                    </div>

                    {isCompleted ? (
                      <Check size={21} />
                    ) : isLocked ? (
                      <LockKeyhole size={21} />
                    ) : (
                      <Swords size={21} />
                    )}
                  </div>

                  <p>{level.description}</p>

                  <div className="mission-card__details">
                    <span>
                      <Gauge size={16} />
                      {level.routine.blocks.length} bloques ·{" "}
                      {level.routine.minimumCalories}+ kcal
                    </span>

                    <span>
                      <Flame size={16} />
                      {level.experienceReward} XP
                    </span>
                  </div>
                </div>

                {isLocked ? (
                  <button
                    className="mission-button mission-button--locked"
                    disabled
                    type="button"
                  >
                    <LockKeyhole size={18} />
                    Bloqueada
                  </button>
                ) : (
                  <Link
                    className={`mission-button ${
                      isCompleted
                        ? "mission-button--completed"
                        : ""
                    }`}
                    onClick={() => setActiveLevel(level.id)}
                    to={`/mission/${level.id}`}
                  >
                    {isCompleted
                      ? "Repetir nivel"
                      : "Preparar nivel"}
                    <Swords size={18} />
                  </Link>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

export default MapPage;