import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import QuickTrainingButton from "./components/QuickTrainingButton";
import ErrorBoundary from "./components/ErrorBoundary";
import HomePage from "./pages/HomePage";

/* Cada página se descarga solo cuando se visita. */
const BattlePage = lazy(() => import("./pages/BattlePage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const MissionPage = lazy(() => import("./pages/MissionPage"));
const MovementLabPage = lazy(() => import("./pages/MovementLabPage"));
const OperationForjaPage = lazy(() => import("./pages/OperationForjaPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const TrainingPage = lazy(() => import("./pages/TrainingPage"));

function PageLoading() {
  return (
    <div
      aria-live="polite"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        color: "#9ca3af",
        background: "#0b0c0f",
      }}
    >
      Cargando…
    </div>
  );
}

function App() {
  return (
    <>
      <ErrorBoundary>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/training" element={<TrainingPage />} />
            <Route path="/movement-lab" element={<MovementLabPage />} />
            <Route path="/operation-forja" element={<OperationForjaPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/mission/:levelId" element={<MissionPage />} />
            <Route path="/battle/:levelId" element={<BattlePage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>

      <QuickTrainingButton />
    </>
  );
}

export default App;
