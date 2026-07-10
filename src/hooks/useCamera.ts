import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export type CameraFacingMode = "user" | "environment";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "active"
  | "error";

function getCameraErrorMessage(error: unknown): string {
  if (!(error instanceof DOMException)) {
    return "No fue posible iniciar la cámara.";
  }

  switch (error.name) {
    case "NotAllowedError":
      return "El permiso de cámara fue rechazado. Actívalo desde la configuración del navegador.";

    case "NotFoundError":
      return "No se encontró ninguna cámara disponible en este dispositivo.";

    case "NotReadableError":
      return "La cámara está siendo utilizada por otra aplicación o no puede iniciarse.";

    case "OverconstrainedError":
      return "La cámara no es compatible con la configuración solicitada.";

    case "SecurityError":
      return "El navegador bloqueó el acceso a la cámara por motivos de seguridad.";

    case "AbortError":
      return "La activación de la cámara fue interrumpida.";

    default:
      return "Ocurrió un error al intentar acceder a la cámara.";
  }
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);

  const [status, setStatus] =
    useState<CameraStatus>("idle");

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [facingMode, setFacingMode] =
    useState<CameraFacingMode>("user");

  const [hasMultipleCameras, setHasMultipleCameras] =
    useState(false);

  const releaseCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(
    async (
      requestedFacingMode: CameraFacingMode = "user",
    ) => {
      const currentRequestId =
        requestIdRef.current + 1;

      requestIdRef.current = currentRequestId;

      releaseCurrentStream();
      setStatus("requesting");
      setErrorMessage(null);

      if (
        !window.isSecureContext ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setStatus("error");
        setErrorMessage(
          "La cámara necesita ejecutarse desde localhost o mediante una conexión HTTPS.",
        );

        return;
      }

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: {
                ideal: requestedFacingMode,
              },
              width: {
                ideal: 1280,
              },
              height: {
                ideal: 720,
              },
            },
          });

        /*
         * Evita conservar una cámara abierta si el usuario
         * cambió de pantalla mientras aparecía el permiso.
         */
        if (
          currentRequestId !== requestIdRef.current
        ) {
          stream
            .getTracks()
            .forEach((track) => track.stop());

          return;
        }

        if (!videoRef.current) {
          stream
            .getTracks()
            .forEach((track) => track.stop());

          throw new Error(
            "No se encontró el reproductor de video.",
          );
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;

        await videoRef.current.play();

        setFacingMode(requestedFacingMode);
        setStatus("active");

        const devices =
          await navigator.mediaDevices.enumerateDevices();

        const availableCameras = devices.filter(
          (device) => device.kind === "videoinput",
        );

        setHasMultipleCameras(
          availableCameras.length > 1,
        );
      } catch (error) {
        if (
          currentRequestId !== requestIdRef.current
        ) {
          return;
        }

        releaseCurrentStream();
        setStatus("error");
        setErrorMessage(
          getCameraErrorMessage(error),
        );
      }
    },
    [releaseCurrentStream],
  );

  const stopCamera = useCallback(() => {
    requestIdRef.current += 1;

    releaseCurrentStream();
    setStatus("idle");
    setErrorMessage(null);
  }, [releaseCurrentStream]);

  const switchCamera = useCallback(() => {
    const nextFacingMode =
      facingMode === "user"
        ? "environment"
        : "user";

    void startCamera(nextFacingMode);
  }, [facingMode, startCamera]);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      releaseCurrentStream();
    };
  }, [releaseCurrentStream]);

  return {
    videoRef,
    status,
    errorMessage,
    facingMode,
    hasMultipleCameras,
    startCamera,
    stopCamera,
    switchCamera,
  };
}