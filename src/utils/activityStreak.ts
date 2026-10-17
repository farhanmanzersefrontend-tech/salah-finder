export type ActivityJournal = Record<string, readonly string[]>;
export function activityDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function activityCount(journal: ActivityJournal, date: Date): number {
  return new Set(journal[activityDay(date)] || []).size;
}
export function activityStreak(journal: ActivityJournal, goal: number, now: Date): number {
  const date = new Date(now);
  if (activityCount(journal, date) < goal) date.setDate(date.getDate() - 1);
  let count = 0;
  while (activityCount(journal, date) >= goal) {
    count++;
    date.setDate(date.getDate() - 1);
  }
  return count;
}
export function longestActivityStreak(journal: ActivityJournal, goal: number, now: Date): number {
  const days = Object.keys(journal).filter(day => day <= activityDay(now) && new Set(journal[day]).size >= goal).sort();
  let best = 0, run = 0, previous = '';
  for (const day of days) {
    const date = new Date(`${day}T12:00:00`);
    date.setDate(date.getDate() - 1);
    run = activityDay(date) === previous ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}
