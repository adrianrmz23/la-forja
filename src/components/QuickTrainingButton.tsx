import { Dumbbell, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router";
import "./QuickTrainingButton.css";

function QuickTrainingButton() {
  const location = useLocation();
  const isVisible = location.pathname === "/" || location.pathname === "/map";

  if (!isVisible) {
    return null;
  }

  return (
    <Link className="quick-training-button" to="/training">
      <span className="quick-training-button__icon">
        <Dumbbell size={21} />
      </span>

      <span className="quick-training-button__copy">
        <small>
          <Sparkles size={12} />
          NUEVO
        </small>
        <strong>Crear entrenamiento</strong>
      </span>
    </Link>
  );
}

export default QuickTrainingButton;
