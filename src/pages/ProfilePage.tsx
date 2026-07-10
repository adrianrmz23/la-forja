import {
  Activity,
  ArrowLeft,
  Flame,
  Gauge,
  Ruler,
  Save,
  Scale,
  Shield,
  Swords,
  UserRound,
} from "lucide-react";
import {
  useState,
  type FormEvent,
} from "react";
import {
  Link,
  useNavigate,
} from "react-router";
import {
  useProfileStore,
  type BoxingStance,
  type FitnessLevel,
  type PlayerProfile,
  type PreferredImpact,
} from "../stores/profileStore";

interface FormErrors {
  displayName?: string;
  weightKg?: string;
  heightCm?: string;
}

function ProfilePage() {
  const navigate = useNavigate();

  const storedProfile = useProfileStore(
    (state) => state.profile,
  );

  const isProfileComplete = useProfileStore(
    (state) => state.isProfileComplete,
  );

  const saveProfile = useProfileStore(
    (state) => state.saveProfile,
  );

  const [form, setForm] =
    useState<PlayerProfile>({
      ...storedProfile,
    });

  const [errors, setErrors] =
    useState<FormErrors>({});

  const updateField = <
    Key extends keyof PlayerProfile,
  >(
    field: Key,
    value: PlayerProfile[Key],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};

    const trimmedName =
      form.displayName.trim();

    if (trimmedName.length < 2) {
      nextErrors.displayName =
        "Escribe un nombre de al menos 2 caracteres.";
    }

    if (trimmedName.length > 24) {
      nextErrors.displayName =
        "Utiliza un máximo de 24 caracteres.";
    }

    if (
      !Number.isFinite(form.weightKg) ||
      form.weightKg < 35 ||
      form.weightKg > 250
    ) {
      nextErrors.weightKg =
        "Ingresa un peso entre 35 y 250 kg.";
    }

    if (
      !Number.isFinite(form.heightCm) ||
      form.heightCm < 120 ||
      form.heightCm > 230
    ) {
      nextErrors.heightCm =
        "Ingresa una estatura entre 120 y 230 cm.";
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    saveProfile({
      ...form,
      displayName:
        form.displayName.trim(),
    });

    navigate("/map");
  };

  return (
    <main className="profile-page">
      <div className="profile-page__glow profile-page__glow--top" />
      <div className="profile-page__glow profile-page__glow--bottom" />

      <div className="profile-shell">
        <header className="profile-header">
          <Link
            className="profile-back"
            to="/"
            aria-label="Regresar al inicio"
          >
            <ArrowLeft size={21} />
          </Link>

          <div className="profile-brand">
            <div className="profile-brand__icon">
              <Flame size={23} />
            </div>

            <div>
              <span>LA FORJA</span>

              <strong>
                Perfil del guerrero
              </strong>
            </div>
          </div>

          <div className="profile-status">
            <span>ESTADO</span>

            <strong>
              {isProfileComplete
                ? "Registrado"
                : "Nuevo"}
            </strong>
          </div>
        </header>

        <section className="profile-introduction">
          <span className="profile-eyebrow">
            <UserRound size={16} />
            Configuración inicial
          </span>

          <h1>
            Prepara a tu
            <span> guerrero</span>
          </h1>

          <p>
            Estos datos permitirán adaptar
            las rutinas y estimar el gasto
            calórico de cada entrenamiento.
          </p>
        </section>

        <form
          className="profile-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <section className="profile-form__main">
            <article className="profile-panel">
              <header className="profile-panel__header">
                <div>
                  <span>INFORMACIÓN PERSONAL</span>
                  <h2>Datos principales</h2>
                </div>

                <UserRound size={25} />
              </header>

              <div className="profile-fields">
                <label className="profile-field profile-field--full">
                  <span>
                    Nombre o apodo
                  </span>

                  <div className="profile-input">
                    <UserRound size={19} />

                    <input
                      type="text"
                      value={form.displayName}
                      maxLength={24}
                      placeholder="Ej. Adrián"
                      autoComplete="nickname"
                      onChange={(event) =>
                        updateField(
                          "displayName",
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  {errors.displayName && (
                    <small className="profile-field__error">
                      {errors.displayName}
                    </small>
                  )}
                </label>

                <label className="profile-field">
                  <span>Peso actual</span>

                  <div className="profile-input">
                    <Scale size={19} />

                    <input
                      type="number"
                      value={form.weightKg}
                      min={35}
                      max={250}
                      step={0.1}
                      inputMode="decimal"
                      onChange={(event) =>
                        updateField(
                          "weightKg",
                          Number(
                            event.target.value,
                          ),
                        )
                      }
                    />

                    <strong>kg</strong>
                  </div>

                  {errors.weightKg && (
                    <small className="profile-field__error">
                      {errors.weightKg}
                    </small>
                  )}
                </label>

                <label className="profile-field">
                  <span>Estatura</span>

                  <div className="profile-input">
                    <Ruler size={19} />

                    <input
                      type="number"
                      value={form.heightCm}
                      min={120}
                      max={230}
                      step={1}
                      inputMode="numeric"
                      onChange={(event) =>
                        updateField(
                          "heightCm",
                          Number(
                            event.target.value,
                          ),
                        )
                      }
                    />

                    <strong>cm</strong>
                  </div>

                  {errors.heightCm && (
                    <small className="profile-field__error">
                      {errors.heightCm}
                    </small>
                  )}
                </label>
              </div>
            </article>

            <article className="profile-panel">
              <header className="profile-panel__header">
                <div>
                  <span>CONDICIÓN ACTUAL</span>
                  <h2>Nivel de entrenamiento</h2>
                </div>

                <Activity size={25} />
              </header>

              <div className="profile-options">
                <ProfileOption
                  name="fitnessLevel"
                  title="Principiante"
                  description="Estoy comenzando o retomando el ejercicio."
                  value="beginner"
                  selected={
                    form.fitnessLevel ===
                    "beginner"
                  }
                  onSelect={(value) =>
                    updateField(
                      "fitnessLevel",
                      value,
                    )
                  }
                />

                <ProfileOption
                  name="fitnessLevel"
                  title="Intermedio"
                  description="Entreno algunas veces por semana."
                  value="intermediate"
                  selected={
                    form.fitnessLevel ===
                    "intermediate"
                  }
                  onSelect={(value) =>
                    updateField(
                      "fitnessLevel",
                      value,
                    )
                  }
                />

                <ProfileOption
                  name="fitnessLevel"
                  title="Avanzado"
                  description="Tengo experiencia con rutinas intensas."
                  value="advanced"
                  selected={
                    form.fitnessLevel ===
                    "advanced"
                  }
                  onSelect={(value) =>
                    updateField(
                      "fitnessLevel",
                      value,
                    )
                  }
                />
              </div>
            </article>

            <article className="profile-panel">
              <header className="profile-panel__header">
                <div>
                  <span>INTENSIDAD</span>
                  <h2>Nivel de impacto</h2>
                </div>

                <Gauge size={25} />
              </header>

              <div className="profile-options">
                <ImpactOption
                  title="Bajo impacto"
                  description="Sin saltos y con movimientos controlados."
                  value="low"
                  selected={
                    form.preferredImpact ===
                    "low"
                  }
                  onSelect={(value) =>
                    updateField(
                      "preferredImpact",
                      value,
                    )
                  }
                />

                <ImpactOption
                  title="Impacto estándar"
                  description="Combina fuerza, cardio y movimientos dinámicos."
                  value="standard"
                  selected={
                    form.preferredImpact ===
                    "standard"
                  }
                  onSelect={(value) =>
                    updateField(
                      "preferredImpact",
                      value,
                    )
                  }
                />

                <ImpactOption
                  title="Alto impacto"
                  description="Incluye saltos y bloques más exigentes."
                  value="high"
                  selected={
                    form.preferredImpact ===
                    "high"
                  }
                  onSelect={(value) =>
                    updateField(
                      "preferredImpact",
                      value,
                    )
                  }
                />
              </div>
            </article>

            <article className="profile-panel">
              <header className="profile-panel__header">
                <div>
                  <span>SHADOWBOXING</span>
                  <h2>Postura de combate</h2>
                </div>

                <Swords size={25} />
              </header>

              <div className="boxing-options">
                <BoxingOption
                  title="Ortodoxa"
                  description="Pierna izquierda al frente y mano derecha dominante."
                  value="orthodox"
                  selected={
                    form.boxingStance ===
                    "orthodox"
                  }
                  onSelect={(value) =>
                    updateField(
                      "boxingStance",
                      value,
                    )
                  }
                />

                <BoxingOption
                  title="Zurda"
                  description="Pierna derecha al frente y mano izquierda dominante."
                  value="southpaw"
                  selected={
                    form.boxingStance ===
                    "southpaw"
                  }
                  onSelect={(value) =>
                    updateField(
                      "boxingStance",
                      value,
                    )
                  }
                />
              </div>
            </article>
          </section>

          <aside className="profile-summary">
            <header className="profile-summary__header">
              <div className="profile-summary__avatar">
                <Shield size={31} />
              </div>

              <div>
                <span>GUERRERO</span>

                <h2>
                  {form.displayName.trim() ||
                    "Sin nombre"}
                </h2>
              </div>
            </header>

            <div className="profile-summary__body">
              <div className="profile-summary__stat">
                <Scale size={19} />

                <div>
                  <span>Peso</span>
                  <strong>
                    {form.weightKg || 0} kg
                  </strong>
                </div>
              </div>

              <div className="profile-summary__stat">
                <Ruler size={19} />

                <div>
                  <span>Estatura</span>
                  <strong>
                    {form.heightCm || 0} cm
                  </strong>
                </div>
              </div>

              <div className="profile-summary__stat">
                <Activity size={19} />

                <div>
                  <span>Nivel</span>

                  <strong>
                    {getFitnessLabel(
                      form.fitnessLevel,
                    )}
                  </strong>
                </div>
              </div>

              <div className="profile-summary__stat">
                <Gauge size={19} />

                <div>
                  <span>Impacto</span>

                  <strong>
                    {getImpactLabel(
                      form.preferredImpact,
                    )}
                  </strong>
                </div>
              </div>

              <div className="profile-summary__stat">
                <Swords size={19} />

                <div>
                  <span>Guardia</span>

                  <strong>
                    {form.boxingStance ===
                    "orthodox"
                      ? "Ortodoxa"
                      : "Zurda"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="profile-calorie-goal">
              <Flame size={25} />

              <div>
                <span>
                  OBJETIVO POR RUTINA
                </span>

                <strong>
                  Más de{" "}
                  {
                    form.minimumCalorieGoal
                  }{" "}
                  kcal
                </strong>

                <p>
                  Las rutinas se planificarán
                  alrededor de{" "}
                  {
                    form.plannedCalorieGoal
                  }{" "}
                  kcal para mantener un margen.
                </p>
              </div>
            </div>

            <button
              className="profile-save-button"
              type="submit"
            >
              <Save size={19} />

              {isProfileComplete
                ? "Guardar cambios"
                : "Crear perfil"}
            </button>

            <p className="profile-summary__note">
              Podrás editar estos datos más
              adelante.
            </p>
          </aside>
        </form>
      </div>
    </main>
  );
}

interface ProfileOptionProps {
  name: string;
  title: string;
  description: string;
  value: FitnessLevel;
  selected: boolean;
  onSelect: (
    value: FitnessLevel,
  ) => void;
}

function ProfileOption({
  name,
  title,
  description,
  value,
  selected,
  onSelect,
}: ProfileOptionProps) {
  return (
    <label
      className={`profile-option ${
        selected
          ? "profile-option--selected"
          : ""
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
      />

      <span className="profile-option__indicator" />

      <strong>{title}</strong>
      <p>{description}</p>
    </label>
  );
}

interface ImpactOptionProps {
  title: string;
  description: string;
  value: PreferredImpact;
  selected: boolean;
  onSelect: (
    value: PreferredImpact,
  ) => void;
}

function ImpactOption({
  title,
  description,
  value,
  selected,
  onSelect,
}: ImpactOptionProps) {
  return (
    <label
      className={`profile-option ${
        selected
          ? "profile-option--selected"
          : ""
      }`}
    >
      <input
        type="radio"
        name="preferredImpact"
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
      />

      <span className="profile-option__indicator" />

      <strong>{title}</strong>
      <p>{description}</p>
    </label>
  );
}

interface BoxingOptionProps {
  title: string;
  description: string;
  value: BoxingStance;
  selected: boolean;
  onSelect: (
    value: BoxingStance,
  ) => void;
}

function BoxingOption({
  title,
  description,
  value,
  selected,
  onSelect,
}: BoxingOptionProps) {
  return (
    <label
      className={`boxing-option ${
        selected
          ? "boxing-option--selected"
          : ""
      }`}
    >
      <input
        type="radio"
        name="boxingStance"
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
      />

      <div className="boxing-option__icon">
        <Swords size={23} />
      </div>

      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </label>
  );
}

function getFitnessLabel(
  fitnessLevel: FitnessLevel,
): string {
  const labels: Record<
    FitnessLevel,
    string
  > = {
    beginner: "Principiante",
    intermediate: "Intermedio",
    advanced: "Avanzado",
  };

  return labels[fitnessLevel];
}

function getImpactLabel(
  impact: PreferredImpact,
): string {
  const labels: Record<
    PreferredImpact,
    string
  > = {
    low: "Bajo",
    standard: "Estándar",
    high: "Alto",
  };

  return labels[impact];
}

export default ProfilePage;