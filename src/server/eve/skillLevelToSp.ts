const SQRT_32 = Math.sqrt(32);

export function skillLevelToSp(skillRank: number, skillLevel: number) {
  return Math.round(skillRank * 250 * Math.pow(SQRT_32, skillLevel - 1));
}
