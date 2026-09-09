import { useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import "./MovementDemo.css";
import {
  getMovementDemo,
  type MovementDemoExerciseLike,
  type MovementDemoPoseId,
} from "../utils/movementDemo.ts";

type JointName =
  | "head"
  | "neck"
  | "shoulderL"
  | "shoulderR"
  | "elbowL"
  | "elbowR"
  | "wristL"
  | "wristR"
  | "hipL"
  | "hipR"
  | "kneeL"
  | "kneeR"
  | "ankleL"
  | "ankleR";

type Point = { x: number; y: number };
type SkeletonPose = Record<JointName, Point>;

const BASE: SkeletonPose = {
  head: { x: 110, y: 30 },
  neck: { x: 110, y: 54 },
  shoulderL: { x: 86, y: 68 },
  shoulderR: { x: 134, y: 68 },
  elbowL: { x: 80, y: 108 },
  elbowR: { x: 140, y: 108 },
  wristL: { x: 80, y: 148 },
  wristR: { x: 140, y: 148 },
  hipL: { x: 96, y: 150 },
  hipR: { x: 124, y: 150 },
  kneeL: { x: 96, y: 210 },
  kneeR: { x: 124, y: 210 },
  ankleL: { x: 96, y: 266 },
  ankleR: { x: 124, y: 266 },
};

function pose(overrides: Partial<Record<JointName, Point>>): SkeletonPose {
  return { ...BASE, ...overrides };
}

const POSES: Record<MovementDemoPoseId, SkeletonPose> = {
  standing: BASE,
  arms_down: BASE,
  squat_down: pose({
    head: { x: 110, y: 54 }, neck: { x: 110, y: 76 },
    shoulderL: { x: 88, y: 88 }, shoulderR: { x: 132, y: 88 },
    elbowL: { x: 76, y: 126 }, elbowR: { x: 144, y: 126 },
    wristL: { x: 72, y: 164 }, wristR: { x: 148, y: 164 },
    hipL: { x: 92, y: 166 }, hipR: { x: 128, y: 166 },
    kneeL: { x: 72, y: 214 }, kneeR: { x: 148, y: 214 },
    ankleL: { x: 76, y: 266 }, ankleR: { x: 144, y: 266 },
  }),
  lunge_left: pose({
    hipL: { x: 92, y: 160 }, hipR: { x: 124, y: 154 },
    kneeL: { x: 76, y: 208 }, ankleL: { x: 58, y: 264 },
    kneeR: { x: 132, y: 212 }, ankleR: { x: 144, y: 264 },
  }),
  lunge_right: pose({
    hipL: { x: 96, y: 154 }, hipR: { x: 128, y: 160 },
    kneeL: { x: 88, y: 212 }, ankleL: { x: 76, y: 264 },
    kneeR: { x: 144, y: 208 }, ankleR: { x: 162, y: 264 },
  }),
  knee_left: pose({
    kneeL: { x: 76, y: 174 }, ankleL: { x: 100, y: 190 },
  }),
  knee_right: pose({
    kneeR: { x: 144, y: 174 }, ankleR: { x: 120, y: 190 },
  }),
  step_left: pose({
    ankleL: { x: 58, y: 266 }, kneeL: { x: 72, y: 210 },
    elbowL: { x: 68, y: 88 }, wristL: { x: 50, y: 52 },
    elbowR: { x: 152, y: 88 }, wristR: { x: 170, y: 52 },
  }),
  step_right: pose({
    ankleR: { x: 162, y: 266 }, kneeR: { x: 148, y: 210 },
    elbowL: { x: 68, y: 88 }, wristL: { x: 50, y: 52 },
    elbowR: { x: 152, y: 88 }, wristR: { x: 170, y: 52 },
  }),
  wide_stance: pose({
    kneeL: { x: 78, y: 210 }, kneeR: { x: 142, y: 210 },
    ankleL: { x: 58, y: 266 }, ankleR: { x: 162, y: 266 },
  }),
  jumping_open: pose({
    elbowL: { x: 70, y: 48 }, elbowR: { x: 150, y: 48 },
    wristL: { x: 88, y: 12 }, wristR: { x: 132, y: 12 },
    kneeL: { x: 78, y: 210 }, kneeR: { x: 142, y: 210 },
    ankleL: { x: 56, y: 266 }, ankleR: { x: 164, y: 266 },
  }),
  curl: pose({
    elbowL: { x: 78, y: 112 }, elbowR: { x: 142, y: 112 },
    wristL: { x: 92, y: 78 }, wristR: { x: 128, y: 78 },
  }),
  arms_overhead: pose({
    elbowL: { x: 92, y: 40 }, elbowR: { x: 128, y: 40 },
    wristL: { x: 98, y: 8 }, wristR: { x: 122, y: 8 },
  }),
  arms_lateral: pose({
    elbowL: { x: 52, y: 76 }, elbowR: { x: 168, y: 76 },
    wristL: { x: 20, y: 76 }, wristR: { x: 200, y: 76 },
  }),
  arms_front: pose({
    elbowL: { x: 84, y: 84 }, elbowR: { x: 136, y: 84 },
    wristL: { x: 100, y: 82 }, wristR: { x: 120, y: 82 },
  }),
  calf_raise: pose({
    head: { x: 110, y: 24 }, neck: { x: 110, y: 48 },
    shoulderL: { x: 86, y: 62 }, shoulderR: { x: 134, y: 62 },
    elbowL: { x: 80, y: 102 }, elbowR: { x: 140, y: 102 },
    wristL: { x: 80, y: 142 }, wristR: { x: 140, y: 142 },
    hipL: { x: 96, y: 144 }, hipR: { x: 124, y: 144 },
    kneeL: { x: 96, y: 204 }, kneeR: { x: 124, y: 204 },
    ankleL: { x: 96, y: 256 }, ankleR: { x: 124, y: 256 },
  }),
  knee_elbow_left: pose({
    kneeL: { x: 82, y: 174 }, ankleL: { x: 104, y: 190 },
    elbowR: { x: 128, y: 108 }, wristR: { x: 104, y: 142 },
  }),
  knee_elbow_right: pose({
    kneeR: { x: 138, y: 174 }, ankleR: { x: 116, y: 190 },
    elbowL: { x: 92, y: 108 }, wristL: { x: 116, y: 142 },
  }),
  knee_press_left: pose({
    kneeL: { x: 76, y: 174 }, ankleL: { x: 100, y: 190 },
    elbowL: { x: 92, y: 40 }, elbowR: { x: 128, y: 40 },
    wristL: { x: 98, y: 8 }, wristR: { x: 122, y: 8 },
  }),
  knee_press_right: pose({
    kneeR: { x: 144, y: 174 }, ankleR: { x: 120, y: 190 },
    elbowL: { x: 92, y: 40 }, elbowR: { x: 128, y: 40 },
    wristL: { x: 98, y: 8 }, wristR: { x: 122, y: 8 },
  }),
  march_lateral_left: pose({
    kneeL: { x: 76, y: 174 }, ankleL: { x: 100, y: 190 },
    elbowL: { x: 52, y: 76 }, elbowR: { x: 168, y: 76 },
    wristL: { x: 20, y: 76 }, wristR: { x: 200, y: 76 },
  }),
  march_lateral_right: pose({
    kneeR: { x: 144, y: 174 }, ankleR: { x: 120, y: 190 },
    elbowL: { x: 52, y: 76 }, elbowR: { x: 168, y: 76 },
    wristL: { x: 20, y: 76 }, wristR: { x: 200, y: 76 },
  }),
  side_curl_left: pose({
    ankleL: { x: 58, y: 266 }, kneeL: { x: 72, y: 210 },
    elbowL: { x: 78, y: 112 }, elbowR: { x: 142, y: 112 },
    wristL: { x: 92, y: 78 }, wristR: { x: 128, y: 78 },
  }),
  side_curl_right: pose({
    ankleR: { x: 162, y: 266 }, kneeR: { x: 148, y: 210 },
    elbowL: { x: 78, y: 112 }, elbowR: { x: 142, y: 112 },
    wristL: { x: 92, y: 78 }, wristR: { x: 128, y: 78 },
  }),
  lateral_squat_left: pose({
    head: { x: 104, y: 54 }, neck: { x: 104, y: 76 },
    shoulderL: { x: 82, y: 88 }, shoulderR: { x: 126, y: 88 },
    hipL: { x: 78, y: 166 }, hipR: { x: 116, y: 166 },
    kneeL: { x: 58, y: 214 }, kneeR: { x: 128, y: 214 },
    ankleL: { x: 44, y: 266 }, ankleR: { x: 144, y: 266 },
  }),
  lateral_squat_right: pose({
    head: { x: 116, y: 54 }, neck: { x: 116, y: 76 },
    shoulderL: { x: 94, y: 88 }, shoulderR: { x: 138, y: 88 },
    hipL: { x: 104, y: 166 }, hipR: { x: 142, y: 166 },
    kneeL: { x: 92, y: 214 }, kneeR: { x: 162, y: 214 },
    ankleL: { x: 76, y: 266 }, ankleR: { x: 176, y: 266 },
  }),
};

const SEGMENTS: Array<[JointName, JointName]> = [
  ["neck", "shoulderL"], ["neck", "shoulderR"],
  ["shoulderL", "elbowL"], ["elbowL", "wristL"],
  ["shoulderR", "elbowR"], ["elbowR", "wristR"],
  ["neck", "hipL"], ["neck", "hipR"], ["hipL", "hipR"],
  ["hipL", "kneeL"], ["kneeL", "ankleL"],
  ["hipR", "kneeR"], ["kneeR", "ankleR"],
];

function valuesFor(poses: SkeletonPose[], joint: JointName, axis: "x" | "y") {
  return poses.map((item) => item[joint][axis]).join(";");
}

function AnimatedPoint({ joint, poses, duration }: { joint: JointName; poses: SkeletonPose[]; duration: number }) {
  return (
    <circle r={joint === "head" ? 13 : 4} className={joint === "head" ? "movement-demo-head" : "movement-demo-joint"}>
      <animate attributeName="cx" values={valuesFor(poses, joint, "x")} dur={`${duration}s`} repeatCount="indefinite" />
      <animate attributeName="cy" values={valuesFor(poses, joint, "y")} dur={`${duration}s`} repeatCount="indefinite" />
    </circle>
  );
}

function AnimatedSegment({ from, to, poses, duration }: { from: JointName; to: JointName; poses: SkeletonPose[]; duration: number }) {
  return (
    <line className="movement-demo-bone">
      <animate attributeName="x1" values={valuesFor(poses, from, "x")} dur={`${duration}s`} repeatCount="indefinite" />
      <animate attributeName="y1" values={valuesFor(poses, from, "y")} dur={`${duration}s`} repeatCount="indefinite" />
      <animate attributeName="x2" values={valuesFor(poses, to, "x")} dur={`${duration}s`} repeatCount="indefinite" />
      <animate attributeName="y2" values={valuesFor(poses, to, "y")} dur={`${duration}s`} repeatCount="indefinite" />
    </line>
  );
}

export interface MovementDemoProps {
  exercise: MovementDemoExerciseLike;
  compact?: boolean;
  showControls?: boolean;
}

export function MovementDemo({ exercise, compact = false, showControls = true }: MovementDemoProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<0.5 | 1>(1);
  const demo = useMemo(() => getMovementDemo(exercise), [exercise]);
  const poses = useMemo(() => {
    const sequence = demo.steps.map((step) => POSES[step.pose] ?? BASE);
    const loop = sequence.length > 1 ? [...sequence, sequence[0]] : [BASE, BASE];
    return loop;
  }, [demo.steps]);
  const duration = Math.max(2.4, demo.steps.length * 0.9) / speed;

  function togglePlayback() {
    const svg = svgRef.current;
    if (!svg) return;
    if (playing) svg.pauseAnimations();
    else svg.unpauseAnimations();
    setPlaying((current) => !current);
  }

  function restart() {
    const svg = svgRef.current;
    if (!svg) return;
    svg.setCurrentTime(0);
    svg.unpauseAnimations();
    setPlaying(true);
  }

  return (
    <div className={compact ? "movement-demo movement-demo--compact" : "movement-demo"}>
      <div className="movement-demo-stage">
        <svg
          key={`${demo.id}-${speed}`}
          ref={svgRef}
          viewBox="0 0 220 282"
          role="img"
          aria-label={`Demostración animada de ${demo.title}`}
        >
          <ellipse className="movement-demo-floor" cx="110" cy="272" rx="74" ry="6" />
          {SEGMENTS.map(([from, to]) => (
            <AnimatedSegment key={`${from}-${to}`} from={from} to={to} poses={poses} duration={duration} />
          ))}
          {(Object.keys(BASE) as JointName[]).map((joint) => (
            <AnimatedPoint key={joint} joint={joint} poses={poses} duration={duration} />
          ))}
        </svg>
        <span className="movement-demo-badge">DEMO</span>
      </div>

      {!compact && (
        <div className="movement-demo-copy">
          <strong>{demo.title}</strong>
          <p>{demo.cue}</p>
          <ol>
            {demo.steps.map((step, index) => (
              <li key={`${step.pose}-${index}`}>
                <span>{index + 1}</span>
                <div>
                  <b>{step.label}</b>
                  <small>{step.instruction}</small>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {showControls && (
        <div className="movement-demo-controls">
          <button onClick={togglePlayback} type="button" aria-label={playing ? "Pausar demostración" : "Reproducir demostración"}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
            {playing ? "Pausar" : "Reproducir"}
          </button>
          <button onClick={restart} type="button">
            <RotateCcw size={16} /> Repetir
          </button>
          <button
            className="movement-demo-speed"
            onClick={() => setSpeed((current) => (current === 1 ? 0.5 : 1))}
            type="button"
          >
            {speed}x
          </button>
        </div>
      )}
    </div>
  );
}

export function MovementDemoDialog({ exercise, onClose }: { exercise: MovementDemoExerciseLike | null; onClose: () => void }) {
  if (!exercise) return null;

  return (
    <div className="movement-demo-dialog" role="dialog" aria-modal="true" aria-label={`Cómo hacer ${exercise.name}`}>
      <button className="movement-demo-dialog__backdrop" onClick={onClose} aria-label="Cerrar demostración" type="button" />
      <div className="movement-demo-dialog__panel">
        <header>
          <div>
            <span>CÓMO HACERLO</span>
            <h2>{exercise.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar" type="button"><X size={20} /></button>
        </header>
        <MovementDemo exercise={exercise} />
        <p className="movement-demo-dialog__note">
          La animación enseña la forma recomendada. El detector de La Forja sigue siendo tolerante: busca el movimiento general, no una postura perfecta.
        </p>
      </div>
    </div>
  );
}
