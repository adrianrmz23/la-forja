let context: AudioContext | null = null;

/** Debe llamarse desde un toque del usuario para que el navegador permita sonido. */
export function unlockBeep() {
  try {
    context ??= new AudioContext();
    void context.resume();
  } catch {
    /* Sin soporte de audio: la rutina funciona igual. */
  }
}

export function beep(frequency = 880, durationMs = 160) {
  try {
    if (!context) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + durationMs / 1000 + 0.02);
  } catch {
    /* Ignorado. */
  }
}
