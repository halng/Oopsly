import { CardState, Grade } from '../types';

const W: number[] = [
  0.40255, 1.18385, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0589, 0.3195, 0.0, 1.3373,
  0.2946, 0.5012, 0.0025, 0.1398, 1.1695, 2.4
];

const MIN_STABILITY = 0.1;

export interface ScheduleResult {
  stability: number;
  difficulty: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string;
}

export function clampDifficulty(d: number): number {
  return Math.max(1.0, Math.min(10.0, d));
}

export function initDifficulty(grade: Grade): number {
  const d = W[4] - Math.exp(W[5] * (grade - 1)) + 1;
  return clampDifficulty(d);
}

export function nextDifficulty(d: number, grade: Grade): number {
  const d0 = initDifficulty(4);
  const dPrime = d + W[6] * (3 - grade);
  const meanReverted = W[7] * d0 + (1.0 - W[7]) * dPrime;
  return clampDifficulty(meanReverted);
}

export function retrievability(elapsedDays: number, stability: number): number {
  return Math.pow(1.0 + elapsedDays / (9.0 * stability), -1.0);
}

export function recallStability(d: number, s: number, r: number, grade: Grade): number {
  const hardPenalty = grade === 2 ? W[15] : 1.0;
  const easyBonus = grade === 4 ? W[16] : 1.0;
  const stabilityBase = Math.max(s, 0.1);
  const sNew =
    s *
    (Math.exp(W[8]) *
      (11.0 - d) *
      Math.pow(stabilityBase, -W[9]) *
      (Math.exp(W[10] * (1.0 - r)) - 1.0) +
      1.0) *
    hardPenalty *
    easyBonus;
  return Math.max(sNew, MIN_STABILITY);
}

export function forgetStability(d: number, s: number, r: number): number {
  return (
    W[11] *
    Math.pow(d, -W[12]) *
    (Math.pow(s + 1.0, W[13]) - 1.0) *
    Math.exp(W[14] * (1.0 - r))
  );
}

export function scheduleCard(card: CardState, grade: Grade): ScheduleResult {
  let stability: number;
  let difficulty: number;
  let intervalDays: number;
  let repetitions: number;

  if (card.repetitions === 0) {
    stability = Math.max(W[grade - 1], MIN_STABILITY);
    difficulty = initDifficulty(grade);
    intervalDays = grade === 1 ? 0 : Math.max(1, Math.round(stability));
    repetitions = grade === 1 ? 0 : 1;
  } else if (grade === 1) {
    // Again: reset interval
    const s = forgetStability(card.difficulty, card.stability, 0.9);
    stability = Math.max(s, MIN_STABILITY);
    difficulty = nextDifficulty(card.difficulty, grade);
    intervalDays = 0;
    repetitions = 0;
  } else {
    const elapsedDays = Math.max(card.intervalDays, 1);
    const r = retrievability(elapsedDays, card.stability);
    const s = recallStability(card.difficulty, card.stability, r, grade);
    stability = Math.max(s, MIN_STABILITY);
    difficulty = nextDifficulty(card.difficulty, grade);
    intervalDays = Math.max(1, Math.round(stability));
    repetitions = card.repetitions + 1;
  }

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + intervalDays);
  if (intervalDays === 0) {
    // Due in 10 minutes if "Again"
    targetDate.setMinutes(targetDate.getMinutes() + 10);
  }

  return {
    stability: Number(stability.toFixed(3)),
    difficulty: Number(difficulty.toFixed(2)),
    intervalDays,
    repetitions,
    dueDate: targetDate.toISOString(),
  };
}

export function formatInterval(days: number): string {
  if (days === 0) return '< 10m';
  if (days === 1) return '1d';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}
