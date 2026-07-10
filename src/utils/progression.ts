export interface LevelProgress {
  level: number;
  currentExperience: number;
  experienceRequired: number;
  progressPercentage: number;
}

export function getLevelProgress(
  totalExperience: number,
): LevelProgress {
  let level = 1;
  let remainingExperience = Math.max(0, totalExperience);
  let experienceRequired = 100;

  while (remainingExperience >= experienceRequired) {
    remainingExperience -= experienceRequired;
    level += 1;

    experienceRequired = 100 + (level - 1) * 50;
  }

  const progressPercentage =
    experienceRequired === 0
      ? 0
      : (remainingExperience / experienceRequired) * 100;

  return {
    level,
    currentExperience: remainingExperience,
    experienceRequired,
    progressPercentage,
  };
}