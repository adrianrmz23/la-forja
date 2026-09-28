import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.css";
import App from "./App";
import { CloudAuthGate } from "./components/CloudAuthGate";
import { CloudSyncProvider } from "./providers/CloudSyncProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CloudSyncProvider>
      <CloudAuthGate>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </CloudAuthGate>
    </CloudSyncProvider>
  </StrictMode>,
);