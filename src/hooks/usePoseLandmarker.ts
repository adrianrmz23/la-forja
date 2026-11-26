import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  DrawingUtils,
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

type PoseModelStatus =
  | "loading"
  | "ready"
  | "error";

interface UsePoseLandmarkerOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  isCameraActive: boolean;

  /**
   * "upper" exige solo cabeza, hombros y brazos (ejercicios de suelo como la
   * plancha, donde los pies no caben en cuadro). Por defecto, cuerpo completo.
   */
  bodyMode?: "full" | "upper";

  onLandmarks?: (
    landmarks:
      | NormalizedLandmark[]
      | null,
  ) => void;
}

const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

const MIN_VISIBILITY = 0.3;
const FRAME_MARGIN = 0;

/* Tolerancia antes de marcar el cuerpo como fuera de cuadro. */
const BODY_VISIBLE_GRACE_MS = 900;

function isReliableLandmark(
  landmark: NormalizedLandmark | undefined,
): boolean {
  if (!landmark) {
    return false;
  }

  const visibility = landmark.visibility ?? 1;

  const isVisible =
    visibility >= MIN_VISIBILITY;

  const isInsideFrame =
    landmark.x >= FRAME_MARGIN &&
    landmark.x <= 1 - FRAME_MARGIN &&
    landmark.y >= FRAME_MARGIN &&
    landmark.y <= 1 - FRAME_MARGIN;

  return isVisible && isInsideFrame;
}

function isUpperBodyVisible(
  landmarks: NormalizedLandmark[],
): boolean {
  return (
    isReliableLandmark(landmarks[0]) &&
    isReliableLandmark(landmarks[11]) &&
    isReliableLandmark(landmarks[12]) &&
    (isReliableLandmark(landmarks[13]) ||
      isReliableLandmark(landmarks[14]) ||
      isReliableLandmark(landmarks[15]) ||
      isReliableLandmark(landmarks[16]))
  );
}

export type PoseFraming = "unknown" | "too_far" | "ok";

/*
 * Qué tanto ocupa el cuerpo del alto del cuadro (de la nariz a los tobillos).
 * Si ocupa muy poco, el modelo pierde precisión: conviene acercarse.
 */
const MIN_BODY_FRAME_FRACTION = 0.45;

function getFraming(landmarks: NormalizedLandmark[]): PoseFraming {
  const nose = landmarks[0];
  const ankles = [landmarks[27], landmarks[28]].filter(
    (point): point is NormalizedLandmark =>
      Boolean(point) && (point.visibility ?? 1) >= 0.3,
  );

  if (!nose || ankles.length === 0) {
    return "unknown";
  }

  const bottom = Math.max(...ankles.map((point) => point.y));

  return bottom - nose.y < MIN_BODY_FRAME_FRACTION ? "too_far" : "ok";
}

function isFullBodyVisible(
  landmarks: NormalizedLandmark[],
): boolean {
  const noseVisible =
    isReliableLandmark(landmarks[0]);

  const shoulderVisible =
    isReliableLandmark(landmarks[11]) ||
    isReliableLandmark(landmarks[12]);

  const hipVisible =
    isReliableLandmark(landmarks[23]) ||
    isReliableLandmark(landmarks[24]);

  const kneeVisible =
    isReliableLandmark(landmarks[25]) ||
    isReliableLandmark(landmarks[26]);

  const ankleVisible =
    isReliableLandmark(landmarks[27]) ||
    isReliableLandmark(landmarks[28]);

  return (
    noseVisible &&
    shoulderVisible &&
    hipVisible &&
    kneeVisible &&
    ankleVisible
  );
}

export function usePoseLandmarker({
  videoRef,
  isCameraActive,
  bodyMode = "full",
  onLandmarks,
}: UsePoseLandmarkerOptions) {
  const bodyModeRef = useRef(bodyMode);

  useEffect(() => {
    bodyModeRef.current = bodyMode;
  }, [bodyMode]);

  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  const poseLandmarkerRef =
    useRef<PoseLandmarker | null>(null);

  const animationFrameRef =
    useRef<number | null>(null);

  const lastVideoTimeRef = useRef(-1);
  const lastBodyVisibleAtRef = useRef(0);
  const lastDetectionTimeRef = useRef(0);

  const onLandmarksRef =
  useRef(onLandmarks);

useEffect(() => {
  onLandmarksRef.current =
    onLandmarks;
}, [onLandmarks]);

  const [modelStatus, setModelStatus] =
    useState<PoseModelStatus>("loading");

  const [modelError, setModelError] =
    useState<string | null>(null);

  /*
   * Estos son estados internos de la última detección.
   * Los valores que regresaremos se calcularán también
   * con el estado actual de la cámara.
   */
  const [
    rawPoseDetected,
    setRawPoseDetected,
  ] = useState(false);

  const [
    rawBodyVisible,
    setRawBodyVisible,
  ] = useState(false);

  const [framing, setFraming] =
    useState<PoseFraming>("unknown");

  /*
   * Cargar el modelo de MediaPipe una sola vez.
   */
  useEffect(() => {
    let cancelled = false;

    async function initializePoseLandmarker() {
      setModelStatus("loading");
      setModelError(null);

      try {
        const vision =
          await FilesetResolver.forVisionTasks(
            WASM_PATH,
          );

        const poseLandmarker =
          await PoseLandmarker.createFromOptions(
            vision,
            {
              baseOptions: {
                modelAssetPath: MODEL_PATH,
              },

              runningMode: "VIDEO",
              numPoses: 1,

              minPoseDetectionConfidence: 0.35,
              minPosePresenceConfidence: 0.35,
              minTrackingConfidence: 0.35,

              outputSegmentationMasks: false,
            },
          );

        if (cancelled) {
          poseLandmarker.close();
          return;
        }

        poseLandmarkerRef.current =
          poseLandmarker;

        setModelStatus("ready");
      } catch (error) {
        console.error(
          "Error al cargar MediaPipe:",
          error,
        );

        if (!cancelled) {
          setModelStatus("error");

          setModelError(
            "No fue posible cargar el detector corporal.",
          );
        }
      }
    }

    void initializePoseLandmarker();

    return () => {
      cancelled = true;

      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
        poseLandmarkerRef.current = null;
      }
    };
  }, []);

  /*
   * Procesar los cuadros de la cámara.
   */
  useEffect(() => {
    function clearCanvas() {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const context =
        canvas.getContext("2d");

      context?.clearRect(
        0,
        0,
        canvas.width,
        canvas.height,
      );
    }

    /*
     * Ya no ejecutamos setState directamente aquí.
     * Los valores finales se calculan más abajo.
     */
    if (
      !isCameraActive ||
      modelStatus !== "ready"
    ) {
      clearCanvas();
      return;
    }

    let cancelled = false;

    function detectPose() {
      if (cancelled) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      const poseLandmarker =
        poseLandmarkerRef.current;

      if (
        !video ||
        !canvas ||
        !poseLandmarker ||
        video.readyState < 2
      ) {
        animationFrameRef.current =
          requestAnimationFrame(detectPose);

        return;
      }

      const now = performance.now();

      const elapsed =
        now - lastDetectionTimeRef.current;

      /*
       * Procesar aproximadamente 30 cuadros
       * por segundo.
       */
      if (
        video.currentTime !==
          lastVideoTimeRef.current &&
        elapsed >= 33
      ) {
        lastVideoTimeRef.current =
          video.currentTime;

        lastDetectionTimeRef.current = now;

        if (
          canvas.width !== video.videoWidth ||
          canvas.height !== video.videoHeight
        ) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const context =
          canvas.getContext("2d");

        context?.clearRect(
          0,
          0,
          canvas.width,
          canvas.height,
        );

        poseLandmarker.detectForVideo(
          video,
          now,
          (result) => {
            if (!context || cancelled) {
              return;
            }

            const landmarks =
              result.landmarks[0];

            onLandmarksRef.current?.(
              landmarks ?? null,
            );

            const hasPose =
              Boolean(landmarks?.length);

            setRawPoseDetected(hasPose);

            if (!landmarks) {
              setRawBodyVisible(false);
              return;
            }

            const drawingUtils =
              new DrawingUtils(context);

            drawingUtils.drawConnectors(
              landmarks,
              PoseLandmarker.POSE_CONNECTIONS,
              {
                color: "#fb923c",
                lineWidth: 4,
              },
            );

            drawingUtils.drawLandmarks(
              landmarks,
              {
                color: "#fff7ed",
                fillColor: "#f97316",
                lineWidth: 2,
                radius: 4,
              },
            );

            setFraming(
              bodyModeRef.current === "upper"
                ? "ok"
                : getFraming(landmarks),
            );

            const fullBody =
              bodyModeRef.current === "upper"
                ? isUpperBodyVisible(landmarks)
                : isFullBodyVisible(landmarks);

            if (fullBody) {
              lastBodyVisibleAtRef.current = now;
            }

            /*
             * Histéresis: perder el cuerpo uno o dos
             * cuadros no debe pausar la rutina.
             */
            setRawBodyVisible(
              fullBody ||
                now -
                  lastBodyVisibleAtRef.current <
                  BODY_VISIBLE_GRACE_MS,
            );
          },
        );
      }

      animationFrameRef.current =
        requestAnimationFrame(detectPose);
    }

    animationFrameRef.current =
      requestAnimationFrame(detectPose);

    return () => {
      cancelled = true;

      if (
        animationFrameRef.current !== null
      ) {
        cancelAnimationFrame(
          animationFrameRef.current,
        );
      }

      animationFrameRef.current = null;
      lastVideoTimeRef.current = -1;

      /*
       * Tampoco llamamos setState directamente
       * dentro de la limpieza del efecto.
       */
      clearCanvas();
    };
  }, [
    isCameraActive,
    modelStatus,
    videoRef,
  ]);

  /*
   * Aunque la última detección haya sido positiva,
   * al apagar la cámara estos valores se vuelven
   * falsos automáticamente.
   */
  const poseDetected =
    isCameraActive &&
    modelStatus === "ready" &&
    rawPoseDetected;

  const bodyVisible =
    poseDetected && rawBodyVisible;

  return {
    canvasRef,
    modelStatus,
    modelError,
    poseDetected,
    bodyVisible,
    framing: poseDetected ? framing : ("unknown" as PoseFraming),
  };
}