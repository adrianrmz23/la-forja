import { useEffect } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  Coins,
  Flame,
  Footprints,
  Gauge,
  Shield,
  Sparkles,
  Swords,
  Target,
} from "lucide-react";
import { Link, useParams } from "react-router";
import { useGeneratedLevelStore } from "../stores/generatedLevelStore.ts";
import { resolveRoutineByLevelId } from "../utils/routineResolver.ts";

const preparationSteps = [
  {
    id: 1,
    title: "Coloca el dispositivo",
    description:
      "Apóyalo verticalmente y mantén la cámara completamente estable.",
    icon: Camera,
  },
  {
    id: 2,
    title: "Muestra tu cuerpo completo",
    description:
      "Asegúrate de que se vean cabeza, hombros, cadera, rodillas y pies.",
    icon: Footprints,
  },
  {
    id: 3,
    title: "Libera el espacio",
    description:
      "Deja suficiente espacio frontal y lateral para fuerza, cardio y boxeo.",
    icon: Target,
  },
];

function MissionPage() {
  const { levelId } = useParams<{
    levelId: string;
  }>();

  const generatedLevels = useGeneratedLevelStore(
    (state) => state.levels,
  );

  const setActiveLevel = useGeneratedLevelStore(
    (state) => state.setActiveLevel,
  );

  const resolved = resolveRoutineByLevelId(
    levelId,
    generatedLevels,
  );

  const { routine, generatedLevel } = resolved;

  useEffect(() => {
    setActiveLevel(
      generatedLevel?.id ?? null,
    );
  }, [
    generatedLevel?.id,
    setActiveLevel,
  ]);

  const missionNumber =
    generatedLevel?.sequence ?? 1;

  const missionName =
    generatedLevel?.name ??
    "El despertar";

  const missionDescription =
    generatedLevel?.description ??
    "Las llamas de la Forja están a punto de extinguirse. Derrota al Centinela de Ceniza y demuestra que eres digno de comenzar esta aventura.";

  const locationName =
    generatedLevel?.locationName ??
    "Valle de las Cenizas";

  const enemyName =
    generatedLevel?.enemyName ??
    "Centinela de Ceniza";

  const enemyTitle =
    generatedLevel?.enemyTitle ??
    "Primer guardián";

  const experienceReward =
    generatedLevel?.experienceReward ??
    100;

  const coinReward =
    generatedLevel?.coinReward ?? 25;

  const totalExerciseStages =
    routine.blocks.reduce(
      (total, block) =>
        total +
        block.exercises.length *
          block.rounds,
      0,
    );

  const sourceLabel = generatedLevel
    ? generatedLevel.source === "ai"
      ? "Nivel generado con IA"
      : "Nivel procedural"
    : "Primera prueba";

  return (
    <main className="mission-page">
      <div className="mission-page__light mission-page__light--top" />
      <div className="mission-page__light mission-page__light--bottom" />

      <div className="mission-shell">
        <header className="mission-header">
          <Link
            className="mission-back"
            to="/map"
            aria-label="Regresar al mapa"
          >
            <ArrowLeft size={21} />
          </Link>

          <div className="mission-logo">
            <div className="mission-logo__icon">
              <Flame size={23} />
            </div>

            <div>
              <span>{locationName.toUpperCase()}</span>
              <strong>Preparación de misión</strong>
            </div>
          </div>

          <div className="mission-header__level">
            <span>NIVEL</span>
            <strong>
              {missionNumber
                .toString()
                .padStart(2, "0")}
            </strong>
          </div>
        </header>

        <section className="mission-layout">
          <div className="mission-information">
            <span className="mission-badge">
              {generatedLevel ? (
                <Sparkles size={16} />
              ) : (
                <Shield size={16} />
              )}
              {sourceLabel}
            </span>

            <p className="mission-kicker">
              NIVEL{" "}
              {missionNumber
                .toString()
                .padStart(2, "0")}
            </p>

            <h1>{missionName}</h1>

            <p className="mission-description">
              {missionDescription}
            </p>

            <div className="enemy-preview">
              <div className="enemy-preview__icon">
                <Swords size={34} />
              </div>

              <div className="enemy-preview__information">
                <span>{enemyTitle.toUpperCase()}</span>
                <h2>{enemyName}</h2>

                <div className="enemy-health">
                  <div className="enemy-health__labels">
                    <span>Salud</span>
                    <strong>100 HP</strong>
                  </div>

                  <div className="enemy-health__bar">
                    <div className="enemy-health__value" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mission-objective">
              <div className="mission-objective__icon">
                <Target size={25} />
              </div>

              <div>
                <span>OBJETIVO PRINCIPAL</span>
                <h3>
                  Completa {totalExerciseStages} etapas y supera{" "}
                  {routine.minimumCalories} kcal
                </h3>
                <p>
                  Cada etapa avanza únicamente mediante movimientos válidos.
                  La sobrecarga se activa si la meta calórica queda pendiente.
                </p>
              </div>
            </div>

            <div className="mission-rewards">
              <div>
                <Sparkles size={20} />
                <span>Experiencia</span>
                <strong>
                  +{experienceReward} XP
                </strong>
              </div>

              <div>
                <Coins size={20} />
                <span>Monedas</span>
                <strong>+{coinReward}</strong>
              </div>

              <div>
                <Gauge size={20} />
                <span>Duración estimada</span>
                <strong>
                  {routine.estimatedMinutes} min
                </strong>
              </div>
            </div>
          </div>

          <aside className="preparation-panel">
            <div className="preparation-panel__header">
              <div>
                <span>ANTES DE COMENZAR</span>
                <h2>Prepara tu espacio</h2>
              </div>

              <Camera size={27} />
            </div>

            <p className="preparation-panel__description">
              Necesitarás suficiente espacio para moverte y mantener todo tu
              cuerpo dentro de la cámara durante cada ejercicio.
            </p>

            <div className="preparation-steps">
              {preparationSteps.map((step) => {
                const StepIcon = step.icon;

                return (
                  <article
                    className="preparation-step"
                    key={step.id}
                  >
                    <div className="preparation-step__number">
                      {step.id
                        .toString()
                        .padStart(2, "0")}
                    </div>

                    <div className="preparation-step__icon">
                      <StepIcon size={21} />
                    </div>

                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.description}</p>
                    </div>

                    <CheckCircle2
                      className="preparation-step__check"
                      size={19}
                    />
                  </article>
                );
              })}
            </div>

            <div className="camera-summary">
              <div>
                <span>ORIENTACIÓN</span>
                <strong>Vertical</strong>
              </div>

              <div>
                <span>DISTANCIA</span>
                <strong>2 a 3 metros</strong>
              </div>

              <div>
                <span>POSICIÓN</span>
                <strong>Frontal</strong>
              </div>
            </div>

            <div className="preparation-warning">
              <Shield size={19} />

              <p>
                Detén el entrenamiento si sientes dolor, mareo o algún malestar
                inesperado.
              </p>
            </div>

            <Link
              className="mission-start-button"
              onClick={() =>
                setActiveLevel(
                  generatedLevel?.id ?? null,
                )
              }
              to={`/battle/${resolved.levelId}`}
            >
              Comenzar combate
              <ChevronRight size={21} />
            </Link>

            <p className="mission-start-note">
              Al comenzar podrás activar la cámara y autorizar su uso.
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}

export default MissionPage;