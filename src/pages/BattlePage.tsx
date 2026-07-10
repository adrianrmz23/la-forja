import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock3,
  FastForward,
  Flame,
  Gauge,
  Heart,
  LoaderCircle,
  Pause,
  PersonStanding,
  Play,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Target,
  XCircle,
  Zap,
} from "lucide-react";
import { Link } from "react-router";
import { usePlayerStore } from "../stores/playerStore";
import { useProfileStore } from "../stores/profileStore";

import { useCamera } from "../hooks/useCamera";
import { usePoseLandmarker } from "../hooks/usePoseLandmarker";
import { useWorkoutMetrics } from "../hooks/useWorkoutMetrics";
import type { SquatInvalidReason } from "../hooks/useSquatDetector";
import {
  useMovementDetectors,
  type DetectedMovement,
} from "../hooks/useMovementDetectors";
import {
  useRoutineEngine,
  type ExerciseRoutineStep,
} from "../hooks/useRoutineEngine";

import { ashAssaultRoutine } from "../data/routines";
import { formatWorkoutTime } from "../utils/calories";

const MAX_ENEMY_HEALTH = 100;

const POSITIONING_SECONDS = 10;
const READY_HOLD_MS = 2000;
const BODY_LOST_PAUSE_MS = 1500;

type FeedbackTone = "neutral" | "good" | "excellent" | "error";

type PoseGuidanceTone = "loading" | "error" | "warning" | "ready";

type BattleSessionStatus =
  "preparing" | "positioning" | "countdown" | "active" | "paused" | "finished";

type PauseReason = "manual" | "body_lost" | "tab_hidden";

interface BattleFeedback {
  label: string;
  message: string;
  tone: FeedbackTone;
}

interface PoseGuidance {
  title: string;
  message: string;
  tone: PoseGuidanceTone;
}

const initialFeedback: BattleFeedback = {
  label: "Prepárate",
  message:
    "Activa la cámara. Después tendrás tiempo para alejarte y colocarte en posición.",
  tone: "neutral",
};

function BattlePage() {
  const validRepetitionsRef = useRef(0);

  const [repetitions, setRepetitions] = useState(0);

  const [invalidRepetitions, setInvalidRepetitions] = useState(0);

  const [, setCombo] = useState(0);

  const [bestCombo, setBestCombo] = useState(0);

  const [impactKey, setImpactKey] = useState(0);

  const [damageAmount, setDamageAmount] = useState(0);

  const [feedback, setFeedback] = useState<BattleFeedback>(initialFeedback);

  const [sessionStatus, setSessionStatus] =
    useState<BattleSessionStatus>("preparing");

  const [pauseReason, setPauseReason] = useState<PauseReason | null>(null);

  const [positioningSeconds, setPositioningSeconds] =
    useState(POSITIONING_SECONDS);

  const [countdown, setCountdown] = useState(3);

  const [earnedFirstCompletionRewards, setEarnedFirstCompletionRewards] =
    useState(false);

  const completeMission = usePlayerStore((state) => state.completeMission);

  const profile = useProfileStore((state) => state.profile);

  const {
    videoRef,
    status: cameraStatus,
    errorMessage: cameraError,
    facingMode,
    hasMultipleCameras,
    startCamera,
    stopCamera,
    switchCamera,
  } = useCamera();

  /*
   * Motor general de la rutina:
   * - Bloques
   * - Rondas
   * - Ejercicios
   * - Descansos
   * - Repeticiones
   * - Combinaciones
   */
  const {
    currentStep,
    currentExercise,
    nextExercise,

    currentBlockName,
    currentRound,
    totalRounds,

    currentValue,
    currentTarget,
    remainingSeconds,

    currentStepProgress,
    routineProgress,

    currentMet,

    isComplete: battleWon,

    registerRepetition: registerRoutineRepetition,

    registerCombination: registerRoutineCombination,

    skipCurrentStep,
    resetRoutine,
  } = useRoutineEngine({
    routine: ashAssaultRoutine,

    isRunning: sessionStatus === "active",

    onStepComplete: handleRoutineStepComplete,

    onComplete: handleRoutineComplete,
  });

  /*
   * Todos los detectores corporales se coordinan
   * desde un solo hook para mantener BattlePage limpio.
   */
  const {
    processLandmarks: processPoseLandmarks,
    reset: resetMovementDetectors,
    movementActive: detectorMovementActive,
    technique,
  } = useMovementDetectors({
    enabled:
      cameraStatus === "active" &&
      sessionStatus === "active" &&
      currentStep?.kind === "exercise" &&
      !battleWon,

    currentExercise,
    boxingStance: profile.boxingStance,

    onValidMovement: registerDetectedMovement,
    onInvalidMovement: registerInvalidRepetition,
  });

  /*
   * Análisis corporal con MediaPipe.
   */
  const { canvasRef, modelStatus, modelError, poseDetected, bodyVisible } =
    usePoseLandmarker({
      videoRef,
      isCameraActive: cameraStatus === "active",
      onLandmarks: processPoseLandmarks,
    });

  const movementActive =
    sessionStatus === "active" &&
    cameraStatus === "active" &&
    bodyVisible &&
    currentStep?.kind === "exercise" &&
    detectorMovementActive;

  /*
   * Tiempo activo y calorías.
   *
   * Solamente avanzan mientras exista
   * movimiento corporal real.
   */
  const { activeSeconds, estimatedCalories, resetMetrics } = useWorkoutMetrics({
    isActive: movementActive && currentStep?.kind === "exercise" && !battleWon,

    weightKg: profile.weightKg,

    met: currentMet,
  });

  const playerReady =
    cameraStatus === "active" && modelStatus === "ready" && bodyVisible;

  const calorieGoal = Math.max(
    profile.minimumCalorieGoal || 180,
    ashAssaultRoutine.minimumCalories,
  );

  const calorieProgress = Math.min(
    (estimatedCalories / calorieGoal) * 100,
    100,
  );

  const routineProgressRounded = Math.round(routineProgress);

  const enemyHealth = Math.max(
    Math.round(MAX_ENEMY_HEALTH * (1 - routineProgress / 100)),
    0,
  );

  const enemyHealthPercentage = (enemyHealth / MAX_ENEMY_HEALTH) * 100;

  const currentStepTitle =
    currentStep?.kind === "rest"
      ? "Descanso"
      : (currentExercise?.name ?? "Rutina completada");

  const currentStepProgressText = (() => {
    if (currentStep?.kind === "rest") {
      return `${currentValue} / ${currentTarget} segundos`;
    }

    if (currentExercise?.mode === "active_duration") {
      return `${currentValue} / ${currentTarget} segundos activos`;
    }

    const unitLabels = {
      repetition: "repeticiones",

      step: "pasos",

      punch: "golpes",

      combination: "combinaciones",
    } as const;

    const countUnit = currentExercise?.countUnit ?? "repetition";

    return `${currentValue} / ${currentTarget} ${unitLabels[countUnit]}`;
  })();

  /*
   * Temporizador inicial para permitir
   * que el jugador se aleje.
   */
  useEffect(() => {
    if (
      sessionStatus !== "positioning" ||
      cameraStatus !== "active" ||
      positioningSeconds <= 0
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPositioningSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [cameraStatus, positioningSeconds, sessionStatus]);

  /*
   * Espera dos segundos de postura
   * estable antes de comenzar.
   */
  useEffect(() => {
    if (
      sessionStatus !== "positioning" ||
      cameraStatus !== "active" ||
      positioningSeconds > 0 ||
      !playerReady ||
      battleWon
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      resetMovementDetectors();

      setCountdown(3);

      setSessionStatus("countdown");

      setFeedback({
        label: "Posición confirmada",

        message: "Mantente de pie. La rutina comenzará automáticamente.",

        tone: "good",
      });
    }, READY_HOLD_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    battleWon,
    cameraStatus,
    playerReady,
    positioningSeconds,
    resetMovementDetectors,
    sessionStatus,
  ]);

  /*
   * Cuenta regresiva para iniciar o
   * reanudar la rutina.
   */
  useEffect(() => {
    if (sessionStatus !== "countdown") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (countdown <= 1) {
        if (!playerReady) {
          setCountdown(3);

          setPositioningSeconds(0);

          setSessionStatus("positioning");

          setFeedback({
            label: "Posición perdida",

            message:
              "Vuelve a mostrar tu cuerpo completo. La rutina se iniciará automáticamente.",

            tone: "error",
          });

          return;
        }

        const isResuming = pauseReason !== null;

        resetMovementDetectors();

        setCountdown(0);

        setSessionStatus("active");

        setPauseReason(null);

        setFeedback({
          label: isResuming ? "Rutina reanudada" : "Rutina iniciada",

          message: currentExercise
            ? currentExercise.instructions
            : "Sigue las instrucciones del ejercicio actual.",

          tone: "good",
        });

        return;
      }

      setCountdown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    countdown,
    currentExercise,
    pauseReason,
    playerReady,
    resetMovementDetectors,
    sessionStatus,
  ]);

  /*
   * Pausa automática al perder el cuerpo.
   */
  useEffect(() => {
    if (
      sessionStatus !== "active" ||
      cameraStatus !== "active" ||
      bodyVisible ||
      document.hidden
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPauseReason("body_lost");

      setSessionStatus("paused");

      resetMovementDetectors();

      setFeedback({
        label: "Rutina pausada",

        message:
          "Saliste del encuadre. Regresa frente a la cámara para continuar.",

        tone: "error",
      });
    }, BODY_LOST_PAUSE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [bodyVisible, cameraStatus, resetMovementDetectors, sessionStatus]);

  /*
   * Pausa al cambiar de pestaña o
   * minimizar la aplicación.
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden || sessionStatus !== "active") {
        return;
      }

      setPauseReason("tab_hidden");

      setSessionStatus("paused");

      resetMovementDetectors();

      setFeedback({
        label: "Rutina pausada",

        message:
          "La aplicación pasó a segundo plano. Regresa y reanuda cuando estés preparado.",

        tone: "neutral",
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [resetMovementDetectors, sessionStatus]);

  /*
   * Reanudación automática cuando la pausa
   * se produjo por pérdida del cuerpo.
   */
  useEffect(() => {
    if (
      sessionStatus !== "paused" ||
      pauseReason !== "body_lost" ||
      !playerReady
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCountdown(3);

      setSessionStatus("countdown");

      setFeedback({
        label: "Posición recuperada",

        message: "Mantente en posición. La rutina continuará automáticamente.",

        tone: "good",
      });
    }, READY_HOLD_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pauseReason, playerReady, sessionStatus]);

  function getPoseGuidance(): PoseGuidance {
    if (modelStatus === "loading") {
      return {
        title: "Preparando detector",

        message: "Estamos cargando el análisis corporal.",

        tone: "loading",
      };
    }

    if (modelStatus === "error") {
      return {
        title: "Detector no disponible",

        message: modelError ?? "No fue posible iniciar el análisis corporal.",

        tone: "error",
      };
    }

    if (sessionStatus === "paused") {
      if (pauseReason === "body_lost") {
        return {
          title: "Rutina pausada",

          message: "Regresa completamente al encuadre para continuar.",

          tone: "warning",
        };
      }

      if (pauseReason === "tab_hidden") {
        return {
          title: "Aplicación reabierta",

          message: "Colócate nuevamente y presiona reanudar.",

          tone: "ready",
        };
      }

      return {
        title: "Descanso manual",

        message: "Tu progreso está guardado. Reanuda cuando estés preparado.",

        tone: "ready",
      };
    }

    if (!poseDetected) {
      return {
        title: "No encontramos tu cuerpo",

        message: "Colócate frente a la cámara para continuar.",

        tone: "warning",
      };
    }

    if (!bodyVisible) {
      return {
        title: "Muestra tu cuerpo completo",

        message:
          "Aléjate hasta que puedan verse tu cabeza, cadera, rodillas y pies.",

        tone: "warning",
      };
    }

    if (sessionStatus === "positioning") {
      return {
        title: "Posición detectada",

        message:
          positioningSeconds > 0
            ? "Mantente dentro del encuadre mientras termina el tiempo de preparación."
            : "Mantén esta posición para comenzar automáticamente.",

        tone: "ready",
      };
    }

    if (sessionStatus === "active") {
      if (currentStep?.kind === "rest") {
        return {
          title: "Recuperación",

          message: `Descansa y prepárate para ${nextExercise?.name ?? "el siguiente ejercicio"}.`,

          tone: "ready",
        };
      }

      return {
        title: currentExercise?.name ?? "Rutina activa",

        message:
          currentExercise?.instructions ??
          "Sigue las instrucciones del ejercicio actual.",

        tone: "ready",
      };
    }

    return {
      title: "Posición correcta",

      message: "Tu cuerpo completo fue detectado.",

      tone: "ready",
    };
  }

  const poseGuidance = getPoseGuidance();

  const cameraStatusLabel = {
    idle: "Cámara desactivada",

    requesting: "Solicitando permiso",

    active: facingMode === "user" ? "Cámara frontal" : "Cámara trasera",

    error: "Cámara no disponible",
  }[cameraStatus];

  async function handleActivateCamera() {
    resetMovementDetectors();

    setPauseReason(null);

    setSessionStatus("positioning");

    setPositioningSeconds(POSITIONING_SECONDS);

    setCountdown(3);

    setFeedback({
      label: "Ve a tu posición",

      message:
        "Tienes diez segundos para alejarte y mostrar tu cuerpo completo.",

      tone: "neutral",
    });

    await startCamera("user");
  }

  function handleManualPause() {
    if (sessionStatus !== "active" || battleWon) {
      return;
    }

    setPauseReason("manual");

    setSessionStatus("paused");

    resetMovementDetectors();

    setFeedback({
      label: "Rutina pausada",

      message: "Tómate un momento. Tu progreso se conservará.",

      tone: "neutral",
    });
  }

  function handleResumeRoutine() {
    if (sessionStatus !== "paused" || pauseReason === "body_lost") {
      return;
    }

    if (!playerReady) {
      setFeedback({
        label: "Vuelve a tu posición",

        message: "Necesitamos detectar tu cuerpo completo antes de continuar.",

        tone: "error",
      });

      return;
    }

    setCountdown(3);

    setSessionStatus("countdown");

    setFeedback({
      label: "Prepárate para continuar",

      message: "La rutina se reanudará en tres segundos.",

      tone: "good",
    });
  }

  function handleStopCamera() {
    stopCamera();

    resetMovementDetectors();

    setPauseReason(null);

    setSessionStatus("preparing");

    setPositioningSeconds(POSITIONING_SECONDS);

    setCountdown(3);

    setFeedback(initialFeedback);
  }

  function handleSwitchCamera() {
    resetMovementDetectors();

    setPauseReason(null);

    setSessionStatus("positioning");

    setPositioningSeconds(POSITIONING_SECONDS);

    setCountdown(3);

    setFeedback({
      label: "Cámara cambiada",

      message: "Vuelve a colocarte completamente dentro del encuadre.",

      tone: "neutral",
    });

    switchCamera();
  }

  /*
   * Se ejecuta al completar un ejercicio,
   * no al terminar toda la rutina.
   */
  function handleRoutineStepComplete(step: ExerciseRoutineStep) {
    if (step.exercise.detector !== "squat") {
      setDamageAmount(5);

      setImpactKey((current) => current + 1);
    }

    setFeedback({
      label: "Ejercicio completado",

      message: `${step.exercise.name} superado. Prepárate para el siguiente desafío.`,

      tone: "excellent",
    });
  }

  /*
   * Solo se ejecuta al terminar todos
   * los bloques y rondas.
   */
  function handleRoutineComplete() {
    setPauseReason(null);

    setSessionStatus("finished");

    stopCamera();

    resetMovementDetectors();

    const isFirstCompletion = completeMission({
      missionId: "awakening",

      validRepetitions: validRepetitionsRef.current,

      experienceReward: 100,

      coinReward: 25,

      unlockMissionId: "stone-path",
    });

    setEarnedFirstCompletionRewards(isFirstCompletion);
  }

  /*
   * Registra cualquier movimiento reconocido por cámara.
   * El motor decide si suma una repetición o una combinación.
   */
  function registerDetectedMovement(movement: DetectedMovement) {
    if (
      battleWon ||
      sessionStatus !== "active" ||
      !currentExercise ||
      currentStep?.kind !== "exercise"
    ) {
      return;
    }

    const wasRegistered =
      movement.kind === "combination"
        ? registerRoutineCombination()
        : registerRoutineRepetition();

    if (!wasRegistered) {
      return;
    }

    validRepetitionsRef.current += 1;
    setRepetitions(validRepetitionsRef.current);

    setCombo((currentCombo) => {
      const nextCombo = currentCombo + 1;
      setBestCombo((currentBest) => Math.max(currentBest, nextCombo));
      return nextCombo;
    });

    setFeedback({
      label: movement.label,
      message: movement.message,
      tone: movement.quality === "excellent" ? "excellent" : "good",
    });

    setDamageAmount(movement.damage);
    setImpactKey((current) => current + 1);
  }

  function simulateCurrentMovement() {
    if (!currentExercise) {
      return;
    }

    registerDetectedMovement({
      kind:
        currentExercise.mode === "combinations"
          ? "combination"
          : "repetition",
      detector: currentExercise.detector,
      label: "Movimiento simulado",
      message: `${currentExercise.name} registrado en modo de desarrollo.`,
      damage: currentExercise.mode === "combinations" ? 4 : 1,
    });
  }

  function registerInvalidRepetition(
    reason: SquatInvalidReason = "insufficient_depth",
  ) {
    if (
      battleWon ||
      sessionStatus !== "active" ||
      currentExercise?.detector !== "squat"
    ) {
      return;
    }

    const messages: Record<SquatInvalidReason, string> = {
      insufficient_depth:
        "Necesitas bajar un poco más para que la repetición cuente.",

      too_fast:
        "El movimiento fue demasiado rápido. Controla el descenso y el ascenso.",

      too_slow:
        "El movimiento se interrumpió demasiado tiempo. Regresa a la posición inicial.",
    };

    setInvalidRepetitions((current) => current + 1);

    setCombo(0);

    setFeedback({
      label: "Repetición no válida",

      message: messages[reason],

      tone: "error",
    });
  }

  function restartBattle() {
    validRepetitionsRef.current = 0;

    setRepetitions(0);

    setInvalidRepetitions(0);

    setCombo(0);

    setBestCombo(0);

    setImpactKey(0);

    setDamageAmount(0);

    setFeedback(initialFeedback);

    setEarnedFirstCompletionRewards(false);

    setPauseReason(null);

    setSessionStatus("preparing");

    setPositioningSeconds(POSITIONING_SECONDS);

    setCountdown(3);

    resetMovementDetectors();

    resetRoutine();

    resetMetrics();
  }

  return (
    <main className="battle-page">
      <div className="battle-page__glow battle-page__glow--left" />
      <div className="battle-page__glow battle-page__glow--right" />

      <div className="battle-shell">
        <header className="battle-header">
          <Link
            className="battle-back"
            to="/mission/awakening"
            aria-label="Abandonar rutina"
          >
            <ArrowLeft size={21} />
          </Link>

          <div className="battle-header__mission">
            <div className="battle-header__icon">
              <Flame size={22} />
            </div>

            <div>
              <span>RUTINA 01</span>

              <strong>{ashAssaultRoutine.name}</strong>
            </div>
          </div>

          <div className="battle-header__objective">
            <span>PROGRESO</span>

            <strong>{routineProgressRounded}%</strong>
          </div>
        </header>

        <section className="enemy-hud">
          <div className="enemy-hud__identity">
            <div className="enemy-hud__icon">
              <Skull size={25} />
            </div>

            <div>
              <span>GUARDIÁN</span>

              <h1>Centinela de Ceniza</h1>
            </div>
          </div>

          <div className="enemy-hud__health">
            <div className="enemy-hud__labels">
              <span>
                <Heart size={14} />
                Salud del enemigo
              </span>

              <strong>
                {enemyHealth}/{MAX_ENEMY_HEALTH} HP
              </strong>
            </div>

            <div className="enemy-hud__bar">
              <div
                className="enemy-hud__value"
                style={{
                  width: `${enemyHealthPercentage}%`,
                }}
              />
            </div>
          </div>
        </section>

        <section className="battle-layout">
          <article className="battle-camera">
            <header className="battle-panel-header">
              <div>
                <span>ANÁLISIS DE MOVIMIENTO</span>

                <h2>Cámara del jugador</h2>
              </div>

              <Camera size={24} />
            </header>

            <div
              className={`camera-preview ${
                cameraStatus === "active" ? "camera-preview--active" : ""
              }`}
            >
              <video
                ref={videoRef}
                className={`camera-video ${
                  facingMode === "user" ? "camera-video--mirrored" : ""
                }`}
                autoPlay
                muted
                playsInline
              />

              <canvas
                ref={canvasRef}
                className={`pose-canvas ${
                  facingMode === "user" ? "pose-canvas--mirrored" : ""
                }`}
              />

              {sessionStatus === "paused" && (
                <div className="battle-pause-overlay">
                  <div className="battle-pause-overlay__icon">
                    <Pause size={34} />
                  </div>

                  <span>RUTINA PAUSADA</span>

                  <strong>
                    {pauseReason === "body_lost"
                      ? "Vuelve al encuadre"
                      : pauseReason === "tab_hidden"
                        ? "Regresa a la aplicación"
                        : "Descanso manual"}
                  </strong>

                  <p>
                    {pauseReason === "body_lost"
                      ? "La rutina continuará automáticamente cuando detectemos tu cuerpo completo."
                      : "Las repeticiones, el tiempo y las calorías están detenidos."}
                  </p>

                  {pauseReason !== "body_lost" && (
                    <button
                      className="battle-pause-overlay__button"
                      onClick={handleResumeRoutine}
                      disabled={!playerReady}
                      type="button"
                    >
                      <Play size={18} fill="currentColor" />

                      {playerReady ? "Reanudar rutina" : "Colócate en posición"}
                    </button>
                  )}
                </div>
              )}

              {sessionStatus === "countdown" && (
                <div className="battle-countdown">
                  <span>PREPÁRATE</span>

                  <strong key={countdown}>{countdown}</strong>

                  <p>Mantente completamente de pie</p>
                </div>
              )}

              <span className="camera-corner camera-corner--top-left" />
              <span className="camera-corner camera-corner--top-right" />
              <span className="camera-corner camera-corner--bottom-left" />
              <span className="camera-corner camera-corner--bottom-right" />

              <div className={`camera-status camera-status--${cameraStatus}`}>
                <span className="camera-status__dot" />

                {cameraStatusLabel}
              </div>

              {cameraStatus === "active" && (
                <div className="camera-live-controls">
                  {hasMultipleCameras && (
                    <button
                      className="camera-live-button"
                      onClick={handleSwitchCamera}
                      type="button"
                    >
                      <RefreshCw size={16} />
                      Cambiar
                    </button>
                  )}

                  <button
                    className="camera-live-button camera-live-button--stop"
                    onClick={handleStopCamera}
                    type="button"
                  >
                    <CameraOff size={16} />
                    Apagar
                  </button>
                </div>
              )}

              {cameraStatus !== "active" && (
                <div className="camera-empty-state">
                  <div className="camera-empty-state__icon">
                    {cameraStatus === "requesting" ? (
                      <LoaderCircle className="camera-loading-icon" size={33} />
                    ) : cameraStatus === "error" ? (
                      <CameraOff size={33} />
                    ) : (
                      <Camera size={33} />
                    )}
                  </div>

                  <strong>
                    {cameraStatus === "requesting"
                      ? "Esperando autorización"
                      : cameraStatus === "error"
                        ? "No pudimos iniciar la cámara"
                        : "Activa tu cámara"}
                  </strong>

                  <p>
                    {cameraStatus === "requesting"
                      ? "Acepta el permiso solicitado por tu navegador."
                      : (cameraError ??
                        "El video se procesará localmente en tu dispositivo.")}
                  </p>

                  <button
                    className="camera-activation-button"
                    disabled={cameraStatus === "requesting"}
                    onClick={() => void handleActivateCamera()}
                    type="button"
                  >
                    {cameraStatus === "requesting" ? (
                      <>
                        <LoaderCircle
                          className="camera-loading-icon"
                          size={18}
                        />
                        Activando
                      </>
                    ) : cameraStatus === "error" ? (
                      <>
                        <RefreshCw size={18} />
                        Reintentar
                      </>
                    ) : (
                      <>
                        <Camera size={18} />
                        Activar cámara
                      </>
                    )}
                  </button>
                </div>
              )}

              {cameraStatus === "active" && (
                <div
                  className={`camera-preview__message camera-preview__message--${poseGuidance.tone}`}
                >
                  {poseGuidance.tone === "loading" ? (
                    <LoaderCircle className="camera-loading-icon" size={25} />
                  ) : poseGuidance.tone === "error" ? (
                    <AlertTriangle size={25} />
                  ) : poseGuidance.tone === "ready" ? (
                    <PersonStanding size={25} />
                  ) : (
                    <ScanLine size={25} />
                  )}

                  <div>
                    <strong>{poseGuidance.title}</strong>

                    <span>{poseGuidance.message}</span>
                  </div>
                </div>
              )}

              {cameraStatus === "active" && (
                <div
                  className={`pose-ready-indicator ${
                    playerReady ? "pose-ready-indicator--ready" : ""
                  }`}
                >
                  <span />

                  {playerReady ? "Jugador listo" : "Ajustando posición"}
                </div>
              )}
            </div>

            <div
              className={`battle-feedback battle-feedback--${feedback.tone}`}
              aria-live="polite"
            >
              <div className="battle-feedback__icon">
                {feedback.tone === "error" ? (
                  <XCircle size={23} />
                ) : feedback.tone === "excellent" ? (
                  <Sparkles size={23} />
                ) : feedback.tone === "neutral" ? (
                  <Target size={23} />
                ) : (
                  <CheckCircle2 size={23} />
                )}
              </div>

              <div>
                <span>TÉCNICA</span>

                <h3>{feedback.label}</h3>

                <p>{feedback.message}</p>

                {cameraStatus === "active" && currentStep?.kind === "rest" && (
                  <div className="squat-live-data">
                    <div>
                      <span>ESTADO</span>

                      <strong>Descanso</strong>
                    </div>

                    <div>
                      <span>RESTANTE</span>

                      <strong>{remainingSeconds ?? 0}s</strong>
                    </div>

                    <div>
                      <span>SIGUIENTE</span>

                      <strong>{nextExercise?.name ?? "--"}</strong>
                    </div>

                    <p>Recupera el aliento y prepárate para continuar.</p>
                  </div>
                )}

                {cameraStatus === "active" &&
                  currentStep?.kind === "exercise" && (
                    <div
                      className={`squat-live-data movement-live-data movement-live-data--${technique.phase}`}
                    >
                      <div>
                        <span>FASE ACTUAL</span>
                        <strong>{technique.phaseLabel}</strong>
                      </div>

                      <div>
                        <span>{technique.primaryLabel.toUpperCase()}</span>
                        <strong>{technique.primaryValue}</strong>
                      </div>

                      <div>
                        <span>{technique.secondaryLabel.toUpperCase()}</span>
                        <strong>{technique.secondaryValue}</strong>
                      </div>

                      <p>{technique.instruction}</p>
                    </div>
                  )}
              </div>
            </div>
          </article>

          <article className="battle-arena">
            <div className="battle-arena__embers">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>

            <header className="battle-panel-header">
              <div>
                <span>ZONA DE COMBATE</span>

                <h2>Ruinas de la Forja</h2>
              </div>

              <Swords size={24} />
            </header>

            <div className="enemy-stage">
              {impactKey > 0 && damageAmount > 0 && (
                <span className="damage-number" key={`damage-${impactKey}`}>
                  -{damageAmount}
                </span>
              )}

              <div
                className={
                  impactKey > 0
                    ? "enemy-character enemy-character--hit"
                    : "enemy-character"
                }
                key={`enemy-${impactKey}`}
              >
                <div className="enemy-character__aura" />

                <div className="enemy-character__shield">
                  <Shield size={58} strokeWidth={1.4} />
                </div>

                <div className="enemy-character__face">
                  <Skull size={44} strokeWidth={1.7} />
                </div>
              </div>

              <div className="enemy-stage__name">
                <span>GUARDIÁN DE LA RUTINA</span>

                <strong>Centinela de Ceniza</strong>
              </div>
            </div>

            <div className="combat-stats">
              <div>
                <span>PROGRESO</span>

                <strong>
                  {routineProgressRounded}
                  <small>%</small>
                </strong>
              </div>

              <div>
                <span>RONDA ACTUAL</span>

                <strong>
                  {currentRound}
                  <small>/{totalRounds}</small>
                </strong>
              </div>

              <div>
                <span>MEJOR COMBO</span>

                <strong>x{bestCombo}</strong>
              </div>
            </div>
          </article>
        </section>

        <section className="battle-controls">
          <div className="battle-progress">
            <div className="battle-progress__labels">
              <span>{currentStepTitle}</span>

              <strong>{currentStepProgressText}</strong>
            </div>

            <div className="battle-progress__bar">
              <div
                className="battle-progress__value"
                style={{
                  width: `${currentStepProgress}%`,
                }}
              />
            </div>
          </div>

          <div className="routine-current-status">
            <div>
              <span>BLOQUE ACTUAL</span>

              <strong>{currentBlockName || "Rutina completada"}</strong>
            </div>

            <div>
              <span>RONDA</span>

              <strong>
                {currentRound} / {totalRounds}
              </strong>
            </div>

            <div>
              <span>EJERCICIO ACTUAL</span>

              <strong>
                {currentStep?.kind === "rest"
                  ? "Descanso"
                  : (currentExercise?.name ?? "--")}
              </strong>
            </div>

            <div>
              <span>SIGUIENTE</span>

              <strong>{nextExercise?.name ?? "Fin de la misión"}</strong>
            </div>
          </div>

          <div className="workout-live-metrics">
            <div>
              <Clock3 size={20} />

              <span>Tiempo activo</span>

              <strong>{formatWorkoutTime(activeSeconds)}</strong>
            </div>

            <div>
              <Flame size={20} />

              <span>Calorías estimadas</span>

              <strong>{estimatedCalories.toFixed(1)} kcal</strong>
            </div>

            <div>
              <Gauge size={20} />

              <span>Intensidad actual</span>

              <strong>{currentMet} MET</strong>
            </div>

            <div>
              <PersonStanding size={20} />

              <span>Peso utilizado</span>

              <strong>{profile.weightKg} kg</strong>
            </div>
          </div>

          <div className="calorie-goal-progress">
            <div className="calorie-goal-progress__labels">
              <span>Meta mínima de rutina</span>

              <strong>
                {estimatedCalories.toFixed(1)} / {calorieGoal} kcal
              </strong>
            </div>

            <div className="calorie-goal-progress__bar">
              <div
                className="calorie-goal-progress__value"
                style={{
                  width: `${calorieProgress}%`,
                }}
              />
            </div>
          </div>

          {sessionStatus === "preparing" && (
            <div className="battle-session-message">
              <Camera size={20} />
              Activa la cámara para preparar la rutina
            </div>
          )}

          {sessionStatus === "positioning" && (
            <div
              className={`battle-session-message ${
                positioningSeconds === 0 && playerReady
                  ? "battle-session-message--ready"
                  : ""
              }`}
            >
              {positioningSeconds > 0 ? (
                <>
                  <PersonStanding size={20} />
                  Aléjate y colócate en posición · {positioningSeconds}s
                </>
              ) : playerReady ? (
                <>
                  <CheckCircle2 size={20} />
                  Mantén la posición. Inicio automático…
                </>
              ) : (
                <>
                  <ScanLine size={20} />
                  Esperando tu cuerpo completo
                </>
              )}
            </div>
          )}

          {sessionStatus === "countdown" && (
            <div className="battle-session-message">
              <LoaderCircle className="camera-loading-icon" size={20} />
              La rutina está por comenzar
            </div>
          )}

          {sessionStatus === "active" && (
            <div className="battle-session-message battle-session-message--active">
              <div className="battle-session-message__content">
                <span className="battle-session-message__dot" />

                <span>
                  {currentStep?.kind === "rest"
                    ? `Descanso: ${remainingSeconds ?? 0} segundos`
                    : movementActive
                      ? `Movimiento activo: ${currentExercise?.name ?? "--"}`
                      : `Esperando movimiento válido: ${currentExercise?.name ?? "--"}`}
                </span>
              </div>

              <button
                className="battle-session-pause-button"
                onClick={handleManualPause}
                type="button"
              >
                <Pause size={17} />
                Pausar
              </button>
            </div>
          )}

          {sessionStatus === "paused" && (
            <div className="battle-session-message battle-session-message--paused">
              <Pause size={20} />

              <span>
                {pauseReason === "body_lost"
                  ? "Rutina detenida: vuelve al encuadre"
                  : pauseReason === "tab_hidden"
                    ? "Rutina detenida al cambiar de aplicación"
                    : "Rutina detenida manualmente"}
              </span>

              {pauseReason !== "body_lost" && (
                <button
                  className="battle-session-pause-button"
                  onClick={handleResumeRoutine}
                  disabled={!playerReady}
                  type="button"
                >
                  <Play size={17} fill="currentColor" />
                  Reanudar
                </button>
              )}
            </div>
          )}

          {import.meta.env.DEV && sessionStatus === "active" && (
            <div className="battle-actions battle-actions--development">
              {currentStep?.kind === "exercise" && currentExercise && (
                <button
                  className="battle-action battle-action--attack"
                  disabled={battleWon}
                  onClick={simulateCurrentMovement}
                  type="button"
                >
                  {currentExercise.mode === "combinations" ? (
                    <Swords size={20} />
                  ) : (
                    <Zap size={21} fill="currentColor" />
                  )}

                  {currentExercise.mode === "combinations"
                    ? "Simular combinación"
                    : "Simular repetición"}
                </button>
              )}

              {currentExercise?.detector === "squat" && (
                <button
                  className="battle-action battle-action--invalid"
                  disabled={battleWon}
                  onClick={() =>
                    registerInvalidRepetition("insufficient_depth")
                  }
                  type="button"
                >
                  <XCircle size={20} />
                  Simular mala técnica
                </button>
              )}

              <button
                className="battle-action battle-action--invalid"
                disabled={battleWon}
                onClick={skipCurrentStep}
                type="button"
              >
                <FastForward size={20} />
                Saltar etapa
              </button>
            </div>
          )}

          <p className="battle-controls__note">
            Las calorías y el tiempo activo solamente avanzan cuando se detecta
            movimiento real en los ejercicios compatibles.
          </p>
        </section>
      </div>

      {battleWon && (
        <section
          className="victory-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="victory-title"
        >
          <div className="victory-card">
            <div className="victory-card__rays" />

            <div className="victory-card__icon">
              <Flame size={43} fill="currentColor" />
            </div>

            <span className="victory-card__eyebrow">RUTINA COMPLETADA</span>

            <h2 id="victory-title">Asalto superado</h2>

            <p>
              Has completado todos los bloques de Asalto de las Cenizas y
              derrotado al guardián.
            </p>

            <div className="victory-results">
              <div>
                <span>Movimientos válidos</span>

                <strong>{repetitions}</strong>
              </div>

              <div>
                <span>Inválidas</span>

                <strong>{invalidRepetitions}</strong>
              </div>

              <div>
                <span>Mejor combo</span>

                <strong>x{bestCombo}</strong>
              </div>
            </div>

            <div className="victory-workout-summary">
              <div>
                <Clock3 size={18} />

                <span>Tiempo activo</span>

                <strong>{formatWorkoutTime(activeSeconds)}</strong>
              </div>

              <div>
                <Flame size={18} />

                <span>Calorías estimadas</span>

                <strong>{estimatedCalories.toFixed(1)} kcal</strong>
              </div>
            </div>

            <div className="victory-rewards">
              {earnedFirstCompletionRewards ? (
                <>
                  <span>
                    <Sparkles size={17} />
                    +100 XP
                  </span>

                  <span>
                    <Flame size={17} />
                    +25 monedas
                  </span>
                </>
              ) : (
                <>
                  <span>
                    <CheckCircle2 size={17} />
                    Entrenamiento registrado
                  </span>

                  <span>
                    <Shield size={17} />
                    Recompensa ya obtenida
                  </span>
                </>
              )}
            </div>

            <div className="victory-actions">
              <button
                className="victory-button victory-button--secondary"
                onClick={restartBattle}
                type="button"
              >
                <RotateCcw size={18} />
                Repetir
              </button>

              <Link
                className="victory-button victory-button--primary"
                to="/map"
              >
                Volver al mapa
                <Swords size={18} />
              </Link>
            </div>

            <p className="victory-card__note">
              El gasto calórico es una estimación basada en peso, tiempo activo
              e intensidad.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}

export default BattlePage;
