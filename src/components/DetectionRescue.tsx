import { useEffect, useState } from "react";
import { FastForward, Hand } from "lucide-react";
import "./DetectionRescue.css";

interface DetectionRescueProps {
  /** Solo corre mientras hay un ejercicio por repeticiones en curso. */
  active: boolean;
  /** Segundos sin detectar nada antes de ofrecer ayuda. */
  delaySeconds?: number;
  onManualRepetition: () => void;
  onSkip: () => void;
}

/**
 * Red de seguridad: si la cámara no cuenta nada durante un rato, ofrece
 * sumar la repetición a mano o saltar el ejercicio para no quedar atorado.
 * Se monta con una `key` que cambia con cada repetición, así el contador
 * de espera se reinicia solo.
 */
export function DetectionRescue({
  active,
  delaySeconds = 18,
  onManualRepetition,
  onSkip,
}: DetectionRescueProps) {
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (!active) {
      return;
    }

    const timeoutId = window.setTimeout(
      () => setStalled(true),
      delaySeconds * 1000,
    );

    return () => window.clearTimeout(timeoutId);
  }, [active, delaySeconds]);

  if (!active || !stalled) {
    return null;
  }

  return (
    <div className="detection-rescue" role="status">
      <p>
        ¿No te detecta? Prueba alejarte un poco, con más luz y de frente. Si
        sigue igual, no pierdes la rutina:
      </p>

      <div className="detection-rescue__actions">
        <button onClick={onManualRepetition} type="button">
          <Hand size={17} />
          Sumar repetición
        </button>

        <button onClick={onSkip} type="button">
          <FastForward size={17} />
          Saltar ejercicio
        </button>
      </div>
    </div>
  );
}
