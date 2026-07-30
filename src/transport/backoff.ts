export function calculateBackoff(attempt: number): number {
  const baseDelayMs = 1000;
  const maxDelayMs = 60000;
  const clampedAttempt = Math.min(attempt, 6);
  const delayMs = Math.min(baseDelayMs * Math.pow(2, clampedAttempt), maxDelayMs);
  return Math.random() * delayMs;
}
