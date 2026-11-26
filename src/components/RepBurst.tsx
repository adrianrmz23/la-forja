import "./RepBurst.css";

interface RepBurstProps {
  /** Cambia con cada repetición válida; reinicia la animación. */
  trigger: number;
  combo: number;
  repetitions: number;
  active: boolean;
}

const SPARKS = Array.from({ length: 10 }, (_, index) => index);

function getComboTitle(combo: number): string {
  if (combo >= 20) return "¡IMPARABLE!";
  if (combo >= 15) return "¡EN LLAMAS!";
  if (combo >= 10) return "¡RACHA FORJADA!";
  return "¡BUEN RITMO!";
}

/**
 * Capa decorativa: no captura clics y respeta prefers-reduced-motion.
 */
export function RepBurst({
  trigger,
  combo,
  repetitions,
  active,
}: RepBurstProps) {
  if (!active || trigger === 0 || repetitions === 0) {
    return null;
  }

  const isMilestone = combo > 0 && combo % 5 === 0;

  return (
    <div className="rep-burst" aria-hidden="true">
      <span key={`ring-${trigger}`} className="rep-burst__ring" />

      <span key={`pop-${trigger}`} className="rep-burst__pop">
        +1
      </span>

      {isMilestone && (
        <div key={`combo-${trigger}`} className="rep-burst__combo">
          <strong>x{combo}</strong>
          <span>{getComboTitle(combo)}</span>

          {SPARKS.map((spark) => (
            <i
              key={spark}
              className="rep-burst__spark"
              style={{ "--angle": `${spark * 36}deg` } as React.CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
}
