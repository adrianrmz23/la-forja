import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Evita la pantalla en blanco: si algo falla al dibujar una página,
 * se ofrece recargar o volver al inicio sin perder el progreso guardado.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error en la interfaz:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main
        role="alert"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          color: "#f8fafc",
          background: "#0b0c0f",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: "1.6rem", marginBottom: 8 }}>
            Algo salió mal
          </h1>
          <p style={{ color: "#9ca3af", lineHeight: 1.6 }}>
            Tu progreso está guardado. Recarga la página para continuar.
          </p>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              marginTop: 18,
            }}
          >
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "12px 18px",
                border: 0,
                borderRadius: 12,
                color: "#fff",
                background: "#f97316",
                fontWeight: 800,
                cursor: "pointer",
              }}
              type="button"
            >
              Recargar
            </button>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              style={{
                padding: "12px 18px",
                border: "1px solid #374151",
                borderRadius: 12,
                color: "#fff",
                background: "transparent",
                fontWeight: 800,
                cursor: "pointer",
              }}
              type="button"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      </main>
    );
  }
}
