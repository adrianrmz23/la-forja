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

  onLandmarks?: (
    landmarks:
      | NormalizedLandmark[]
      | null,
  ) => void;
}

const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const MIN_VISIBILITY = 0.5;
const FRAME_MARGIN = 0.03;

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
  onLandmarks,
}: UsePoseLandmarkerOptions) {
  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  const poseLandmarkerRef =
    useRef<PoseLandmarker | null>(null);

  const animationFrameRef =
    useRef<number | null>(null);

  const lastVideoTimeRef = useRef(-1);
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

              minPoseDetectionConfidence: 0.5,
              minPosePresenceConfidence: 0.5,
              minTrackingConfidence: 0.5,

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

            setRawBodyVisible(
              isFullBodyVisible(landmarks),
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
  };
}