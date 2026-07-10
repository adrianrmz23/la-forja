export function estimateCaloriesForSeconds(
  weightKg: number,
  met: number,
  seconds: number,
): number {
  if (
    !Number.isFinite(weightKg) ||
    !Number.isFinite(met) ||
    !Number.isFinite(seconds) ||
    weightKg <= 0 ||
    met <= 0 ||
    seconds <= 0
  ) {
    return 0;
  }

  const minutes = seconds / 60;

  return (
    ((met * 3.5 * weightKg) / 200) *
    minutes
  );
}

export function formatWorkoutTime(
  seconds: number,
): string {
  const totalSeconds = Math.max(
    0,
    Math.floor(seconds),
  );

  const minutes = Math.floor(
    totalSeconds / 60,
  );

  const remainingSeconds =
    totalSeconds % 60;

  return `${String(minutes).padStart(
    2,
    "0",
  )}:${String(remainingSeconds).padStart(
    2,
    "0",
  )}`;
}