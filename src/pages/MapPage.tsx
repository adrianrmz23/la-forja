import {
  ArrowLeft,
  Check,
  Flame,
  Footprints,
  LockKeyhole,
  Shield,
  Skull,
  Swords,
} from "lucide-react";
import { Link } from "react-router";
import { usePlayerStore } from "../stores/playerStore";
import { getLevelProgress } from "../utils/progression";

const missions = [
  {
    id: "awakening",
    number: "01",
    name: "El despertar",
    description:
      "Enciende nuevamente la Forja y demuestra que todavía tienes fuerza para combatir.",
    objective: "10 sentadillas",
    reward: "100 XP",
    route: "/mission/awakening",
    implemented: true,
    icon: Flame,
  },
  {
    id: "stone-path",
    number: "02",
    name: "Camino de piedra",
    description:
      "Cruza las ruinas mientras las criaturas de ceniza intentan detener tu avance.",
    objective: "15 sentadillas",
    reward: "150 XP",
    route: "/mission/stone-path",
    implemented: false,
    icon: Footprints,
  },
  {
    id: "stone-guardian",
    number: "03",
    name: "El guardián de piedra",
    description:
      "Enfrenta a Gorak y recupera el primer territorio dominado por la oscuridad.",
    objective: "Batalla de jefe",
    reward: "300 XP",
    route: "/mission/stone-guardian",
    implemented: false,
    icon: Skull,
  },
];

function MapPage() {
  const experience = usePlayerStore((state) => state.experience);

  const completedMissionIds = usePlayerStore(
    (state) => state.completedMissionIds,
  );

  const unlockedMissionIds = usePlayerStore(
    (state) => state.unlockedMissionIds,
  );

  const levelProgress = getLevelProgress(experience);

  const completedTerritoryMissions = missions.filter((mission) =>
    completedMissionIds.includes(mission.id),
  ).length;

  const territoryProgress =
    (completedTerritoryMissions / missions.length) * 100;

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
              <strong>Mapa de campaña</strong>
            </div>
          </div>

          <div className="map-level">
            <span>Nivel</span>
            <strong>{levelProgress.level}</strong>
          </div>
        </header>

        <section className="map-introduction">
          <span className="map-eyebrow">
            <Shield size={16} />
            Primer territorio
          </span>

          <h1>Valle de las Cenizas</h1>

          <p>
            El fuego de esta región se está extinguiendo. Completa las pruebas,
            derrota al guardián y devuelve la energía a la Forja.
          </p>

          <div className="territory-progress">
            <div className="territory-progress__labels">
              <span>Progreso del territorio</span>

              <strong>
                {completedTerritoryMissions} / {missions.length} misiones
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
          {missions.map((mission) => {
            const MissionIcon = mission.icon;

            const isCompleted = completedMissionIds.includes(mission.id);

            const isLocked = !unlockedMissionIds.includes(mission.id);

            return (
              <article
                className={`mission-card ${
                  isLocked ? "mission-card--locked" : ""
                } ${isCompleted ? "mission-card--completed" : ""}`}
                key={mission.id}
              >
                <div className="mission-card__number">{mission.number}</div>

                <div className="mission-card__icon">
                  <MissionIcon size={30} />
                </div>

                <div className="mission-card__content">
                  <div className="mission-card__heading">
                    <div>
                      <span>
                        {isCompleted
                          ? "Misión completada"
                          : isLocked
                            ? "Misión bloqueada"
                            : "Misión disponible"}
                      </span>

                      <h2>{mission.name}</h2>
                    </div>

                    {isCompleted ? (
                      <Check size={21} />
                    ) : isLocked ? (
                      <LockKeyhole size={21} />
                    ) : (
                      <Swords size={21} />
                    )}
                  </div>

                  <p>{mission.description}</p>

                  <div className="mission-card__details">
                    <span>
                      <Swords size={16} />
                      {mission.objective}
                    </span>

                    <span>
                      <Flame size={16} />
                      {mission.reward}
                    </span>
                  </div>
                </div>

                {isCompleted ? (
                  <button
                    className="mission-button mission-button--completed"
                    disabled
                    type="button"
                  >
                    <Check size={18} />
                    Completada
                  </button>
                ) : isLocked ? (
                  <button
                    className="mission-button mission-button--locked"
                    disabled
                    type="button"
                  >
                    <LockKeyhole size={18} />
                    Bloqueada
                  </button>
                ) : mission.implemented ? (
                  <Link className="mission-button" to={mission.route}>
                    Iniciar misión
                    <Swords size={18} />
                  </Link>
                ) : (
                  <button
                    className="mission-button mission-button--coming"
                    disabled
                    type="button"
                  >
                    Próximamente
                    <Flame size={18} />
                  </button>
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