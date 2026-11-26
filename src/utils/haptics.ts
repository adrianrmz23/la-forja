export type HapticKind = "success" | "complete" | "error";

const PATTERNS: Record<HapticKind, number | number[]> = {
  success: 25,
  complete: [40, 60, 40],
  error: 120,
};

/** Vibración corta si el dispositivo la permite (Android; iOS la ignora). */
export function vibrate(kind: HapticKind) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(PATTERNS[kind]);
    }
  } catch {
    /* Algunos navegadores bloquean la vibración sin interacción previa. */
  }
}
