import { useEffect } from "react";
import { MODEL_PATH, WASM_PATH } from "./usePoseLandmarker.ts";

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

/**
 * Descarga en segundo plano lo que necesita el combate (la pantalla y el
 * detector de cámara, ~20 MB) mientras el usuario todavía está en el mapa o en
 * la preparación de misión. El service worker lo guarda, así que al pulsar
 * "Comenzar combate" ya no hay espera aunque el internet sea lento.
 * Se omite con "ahorro de datos" o conexiones 2G.
 */
export function usePrefetchBattle() {
  useEffect(() => {
    const connection = (
      navigator as Navigator & { connection?: NetworkInformationLike }
    ).connection;

    if (
      connection?.saveData ||
      connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g"
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void import("../pages/BattlePage").catch(() => undefined);

      [
        `${WASM_PATH}/vision_wasm_internal.js`,
        `${WASM_PATH}/vision_wasm_internal.wasm`,
        MODEL_PATH,
      ].forEach((url) => {
        void fetch(url).catch(() => undefined);
      });
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, []);
}
