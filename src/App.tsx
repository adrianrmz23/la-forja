import {
  Route,
  Routes,
} from "react-router";
import BattlePage from "./pages/BattlePage";
import HomePage from "./pages/HomePage";
import MapPage from "./pages/MapPage";
import MissionPage from "./pages/MissionPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<HomePage />}
      />

      <Route
        path="/profile"
        element={<ProfilePage />}
      />

      <Route
        path="/map"
        element={<MapPage />}
      />

      <Route
        path="/mission/:levelId"
        element={<MissionPage />}
      />

      <Route
        path="/battle/:levelId"
        element={<BattlePage />}
      />
    </Routes>
  );
}

export default App;