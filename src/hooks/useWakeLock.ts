import { useEffect } from "react";

/**
 * Mantiene la pantalla encendida mientras `active` sea verdadero.
 * Si el navegador no lo soporta o lo rechaza, no pasa nada.
 * El permiso se pierde al ocultar la pestaña, así que se vuelve a pedir
 * cuando la pestaña regresa a primer plano.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !navigator.wakeLock) {
      return;
    }

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request("screen");

        if (cancelled) {
          void lock.release();
          return;
        }

        sentinel = lock;
      } catch {
        /* Sin permiso o sin soporte: se ignora. */
      }
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState === "visible" &&
        (!sentinel || sentinel.released)
      ) {
        void acquire();
      }
    }

    void acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void sentinel?.release();
      sentinel = null;
    };
  }, [active]);
}
