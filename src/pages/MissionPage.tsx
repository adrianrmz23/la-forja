import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  Coins,
  Flame,
  Footprints,
  Shield,
  Sparkles,
  Swords,
  Target,
} from "lucide-react";
import { Link } from "react-router";

const preparationSteps = [
  {
    id: 1,
    title: "Coloca el teléfono",
    description: "Apóyalo verticalmente y mantén la cámara estable.",
    icon: Camera,
  },
  {
    id: 2,
    title: "Muestra tu cuerpo completo",
    description: "Asegúrate de que se vean tu cabeza, cadera y pies.",
    icon: Footprints,
  },
  {
    id: 3,
    title: "Gira ligeramente de lado",
    description: "Así podremos evaluar mejor la profundidad de la sentadilla.",
    icon: Target,
  },
];

function MissionPage() {
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
              <span>VALLE DE LAS CENIZAS</span>
              <strong>Preparación de misión</strong>
            </div>
          </div>

          <div className="mission-header__level">
            <span>MISIÓN</span>
            <strong>01</strong>
          </div>
        </header>

        <section className="mission-layout">
          <div className="mission-information">
            <span className="mission-badge">
              <Shield size={16} />
              Primera prueba
            </span>

            <p className="mission-kicker">MISIÓN 01</p>

            <h1>El despertar</h1>

            <p className="mission-description">
              Las llamas de la Forja están a punto de extinguirse. Derrota al
              Centinela de Ceniza y demuestra que eres digno de comenzar esta
              aventura.
            </p>

            <div className="enemy-preview">
              <div className="enemy-preview__icon">
                <Swords size={34} />
              </div>

              <div className="enemy-preview__information">
                <span>ENEMIGO</span>
                <h2>Centinela de Ceniza</h2>

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
                <h3>Completa 10 sentadillas</h3>
                <p>Cada repetición válida causará 10 puntos de daño.</p>
              </div>
            </div>

            <div className="mission-rewards">
              <div>
                <Sparkles size={20} />
                <span>Experiencia</span>
                <strong>+100 XP</strong>
              </div>

              <div>
                <Coins size={20} />
                <span>Monedas</span>
                <strong>+25</strong>
              </div>

              <div>
                <Flame size={20} />
                <span>Territorio</span>
                <strong>1 fragmento</strong>
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
              cuerpo dentro de la cámara.
            </p>

            <div className="preparation-steps">
              {preparationSteps.map((step) => {
                const StepIcon = step.icon;

                return (
                  <article className="preparation-step" key={step.id}>
                    <div className="preparation-step__number">
                      {step.id.toString().padStart(2, "0")}
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
                <strong>Lateral</strong>
              </div>
            </div>

            <div className="preparation-warning">
              <Shield size={19} />

              <p>
                Detén el entrenamiento si sientes dolor o algún malestar
                inesperado.
              </p>
            </div>

            <Link
              className="mission-start-button"
              to="/battle/awakening"
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