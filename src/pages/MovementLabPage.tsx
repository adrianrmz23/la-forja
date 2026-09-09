import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Beaker,
  Bot,
  Camera,
  CheckCircle2,
  Flame,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Link } from "react-router";
import "./MovementLabPage.css";
import { movementRecipes } from "../data/movementRecipes.ts";
import { REPDB_ATTRIBUTION } from "../data/repdbFallback.ts";
import { loadRepDbCandidates } from "../services/repdbService.ts";
import { proposeMovementWithAI } from "../services/aiMovementService.ts";
import { useCamera } from "../hooks/useCamera.ts";
import { usePoseLandmarker } from "../hooks/usePoseLandmarker.ts";
import { useMovementDetectors } from "../hooks/useMovementDetectors.ts";
import { useProfileStore } from "../stores/profileStore.ts";
import { useExerciseIntelligenceStore } from "../stores/exerciseIntelligenceStore.ts";
import type { IntelligentExerciseCandidate } from "../types/exerciseIntelligence.ts";
import type { MovementRecipe } from "../types/movementEngine.ts";
import type { RoutineExercise } from "../types/routine.ts";

const TARGET = 5;

function MovementLabPage() {
  const profile = useProfileStore((state) => state.profile);
  const stats = useExerciseIntelligenceStore((state) => state.stats);
  const customRecipes = useExerciseIntelligenceStore((state) => state.customRecipes);
  const addCustomRecipe = useExerciseIntelligenceStore((state) => state.addCustomRecipe);
  const saveLabResult = useExerciseIntelligenceStore((state) => state.saveLabResult);
  const approveExercise = useExerciseIntelligenceStore((state) => state.approveExercise);
  const rejectExercise = useExerciseIntelligenceStore((state) => state.rejectExercise);

  const [repDbCandidates, setRepDbCandidates] = useState<IntelligentExerciseCandidate[]>([]);
  const [catalogSource, setCatalogSource] = useState<"remote" | "fallback">("fallback");
  const [selectedRecipeId, setSelectedRecipeId] = useState("reverse-lunge-curl");
  const [detected, setDetected] = useState(0);
  const [message, setMessage] = useState("Selecciona un movimiento y activa la cámara.");
  const [isProposing, setIsProposing] = useState(false);

  useEffect(() => {
    void loadRepDbCandidates().then((result) => {
      setRepDbCandidates(result.candidates.filter((candidate) => candidate.source === "repdb"));
      setCatalogSource(result.source);
    });
  }, []);

  const allRecipes = useMemo<MovementRecipe[]>(
    () => [...movementRecipes, ...customRecipes],
    [customRecipes],
  );

  const recipe = useMemo(
    () => allRecipes.find((item) => item.id === selectedRecipeId) ?? allRecipes[0] ?? movementRecipes[0],
    [allRecipes, selectedRecipeId],
  );

  const currentExercise = useMemo<RoutineExercise>(() => ({
    id: `lab-${recipe.id}`,
    exerciseId: recipe.source === "ai" ? `ai:${recipe.id}` : `recipe:${recipe.id}`,
    name: recipe.name,
    instructions: recipe.description,
    mode: "repetitions",
    target: TARGET,
    countUnit: "repetition",
    restSeconds: 0,
    met: recipe.met,
    detector: "movement-recipe",
    estimatedSecondsPerRep: recipe.estimatedSecondsPerRep,
    equipment: recipe.equipment,
    recipeId: recipe.id,
    movementRecipe: recipe,
    sourceKey: `recipe:${recipe.id}`,
    source: recipe.source === "ai" ? "ai" : "recipe",
  }), [recipe]);

  const { videoRef, status: cameraStatus, errorMessage, startCamera, stopCamera } = useCamera();

  const movementDetectors = useMovementDetectors({
    enabled: cameraStatus === "active" && detected < TARGET,
    currentExercise,
    boxingStance: profile.boxingStance,
    onValidMovement: () => {
      setDetected((current) => {
        const next = Math.min(TARGET, current + 1);
        setMessage(
          next >= TARGET
            ? "Prueba completada. Aprueba el movimiento si el conteo coincidió con tus cinco repeticiones reales."
            : `Repetición ${next}/${TARGET} detectada.`,
        );
        return next;
      });
    },
    onInvalidMovement: () => undefined,
  });

  const { canvasRef, modelStatus, bodyVisible } = usePoseLandmarker({
    videoRef,
    isCameraActive: cameraStatus === "active",
    onLandmarks: movementDetectors.processLandmarks,
  });

  useEffect(() => () => stopCamera(), [stopCamera]);

  const reliability = Math.round((detected / TARGET) * 100);
  const approved = Boolean(stats[`recipe:${recipe.id}`]?.approved);

  function selectRecipe(recipeId: string) {
    setSelectedRecipeId(recipeId);
    setDetected(0);
    movementDetectors.reset();
    setMessage("Movimiento seleccionado. Haz cinco repeticiones naturales, sin buscar una postura perfecta.");
  }

  function resetTest() {
    setDetected(0);
    movementDetectors.reset();
    setMessage("Prueba reiniciada. Haz cinco repeticiones con calma.");
  }

  function finish(status: "approved" | "rejected") {
    const key = `recipe:${recipe.id}`;
    saveLabResult({
      exerciseKey: key,
      targetRepetitions: TARGET,
      detectedRepetitions: detected,
      duplicateCorrections: 0,
      status,
    });
    if (status === "approved") approveExercise(key);
    else rejectExercise(key);
    setMessage(
      status === "approved"
        ? "Movimiento aprobado. AI Coach ya puede priorizarlo en futuras rutinas."
        : "Movimiento descartado por ahora. No se usará en rutinas inteligentes.",
    );
  }

  async function proposeNewMovement() {
    setIsProposing(true);
    setMessage("AI Coach está diseñando una combinación usando solo primitivas detectables…");
    try {
      const proposed = await proposeMovementWithAI({
        hasDumbbells: true,
        preferredImpact: profile.preferredImpact,
        avoidNames: allRecipes.map((item) => item.name),
      });
      addCustomRecipe(proposed);
      setSelectedRecipeId(proposed.id);
      setDetected(0);
      setMessage("Movimiento propuesto. Ahora debes validarlo con cinco repeticiones antes de que pueda entrar en rutinas.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible generar un movimiento nuevo.");
    } finally {
      setIsProposing(false);
    }
  }

  const discoveryCandidates = repDbCandidates
    .filter((candidate) => candidate.compatibility.status !== "blocked")
    .sort((first, second) => second.compatibility.score - first.compatibility.score)
    .slice(0, 16);

  return (
    <main className="movement-lab-page">
      <div className="movement-lab-shell">
        <header className="movement-lab-header">
          <Link to="/training" className="movement-lab-back"><ArrowLeft size={20} /></Link>
          <div><span>LA FORJA</span><strong>Laboratorio de movimientos</strong></div>
          <Beaker size={24} />
        </header>

        <section className="movement-lab-hero">
          <span><Flame size={16} /> REPDB + MOVEMENT ENGINE</span>
          <h1>Descubre, genera y prueba movimientos nuevos</h1>
          <p>RepDB aporta conocimiento de ejercicios, el Compatibility Engine filtra candidatos y el motor de primitivas decide qué puede validar realmente la cámara.</p>
          <button className="movement-ai-propose" disabled={isProposing} onClick={() => void proposeNewMovement()} type="button">
            {isProposing ? <RefreshCw className="movement-spin" size={18} /> : <Bot size={18} />}
            {isProposing ? "Diseñando movimiento…" : "Proponer movimiento con IA"}
          </button>
        </section>

        <section className="movement-lab-grid">
          <aside className="movement-catalog-card">
            <div className="movement-card-title"><span>RECETAS DETECTABLES</span><strong>{allRecipes.length}</strong></div>
            <div className="movement-candidate-list">
              {allRecipes.map((item) => {
                const itemApproved = stats[`recipe:${item.id}`]?.approved;
                return (
                  <button key={item.id} className={selectedRecipeId === item.id ? "movement-candidate movement-candidate--active" : "movement-candidate"} onClick={() => selectRecipe(item.id)} type="button">
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.source === "ai" ? "Creado por AI Coach" : "Receta inicial"} · {item.sequence.length} fases</small>
                    </div>
                    {itemApproved ? <CheckCircle2 size={18} /> : <span>Probar</span>}
                  </button>
                );
              })}
            </div>

            <div className="movement-discovery-heading">
              <span>DESCUBIERTOS EN REPDB</span>
              <strong>{catalogSource === "remote" ? `${repDbCandidates.length} cargados` : "muestra local"}</strong>
            </div>
            <div className="movement-discovery-list">
              {discoveryCandidates.map((candidate) => (
                <article key={candidate.key}>
                  <div><strong>{candidate.name}</strong><small>{candidate.bodyPart} · {candidate.equipment}</small></div>
                  <span>{candidate.compatibility.score}</span>
                </article>
              ))}
            </div>
            <small className="movement-attribution">{REPDB_ATTRIBUTION}</small>
          </aside>

          <section className="movement-test-card">
            <div className="movement-test-heading">
              <div>
                <span>{recipe.source === "ai" ? "PROPUESTA IA" : "PRUEBA ACTUAL"}</span>
                <h2>{recipe.name}</h2>
                <p>{recipe.description}</p>
              </div>
              <div className="movement-score"><strong>{detected}/{TARGET}</strong><span>reps</span></div>
            </div>

            <div className="movement-recipe-flow">
              {recipe.sequence.map((primitive, index) => (
                <span key={`${primitive}-${index}`}>{primitive.replaceAll("_", " ")}</span>
              ))}
            </div>

            <div className="movement-camera-wrap">
              <video ref={videoRef} autoPlay muted playsInline className="movement-camera" />
              <canvas ref={canvasRef} className="movement-canvas" />
              {cameraStatus !== "active" && <div className="movement-camera-placeholder"><Camera size={38} /><span>{errorMessage ?? "Activa la cámara para comenzar"}</span></div>}
            </div>

            <div className="movement-live-status">
              <span>{modelStatus === "ready" ? (bodyVisible ? "Cuerpo visible" : "Ajusta tu posición") : "Preparando detector"}</span>
              <strong>{movementDetectors.technique.phaseLabel}</strong>
              <p>{movementDetectors.technique.instruction}</p>
            </div>

            <div className="movement-progress"><div style={{ width: `${reliability}%` }} /></div>
            <p className="movement-message">{message}</p>

            {approved && <div className="movement-approved"><Sparkles size={17} /> Aprobado para AI Coach</div>}

            <div className="movement-lab-actions">
              {cameraStatus !== "active" ? (
                <button className="movement-primary" onClick={() => void startCamera("user")} type="button"><Camera size={18} /> Activar cámara</button>
              ) : (
                <button onClick={resetTest} type="button"><RefreshCw size={18} /> Reiniciar</button>
              )}
              <button disabled={detected < TARGET} onClick={() => finish("approved")} type="button"><ShieldCheck size={18} /> Aprobar</button>
              <button onClick={() => finish("rejected")} type="button"><XCircle size={18} /> Descartar</button>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

export default MovementLabPage;
