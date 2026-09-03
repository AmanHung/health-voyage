export type TaskStatus = 'done' | 'missing' | 'unavailable' | 'future';
export type CalendarInput = {
  today: string;
  exerciseDates: string[];
  mealDates: string[];
  exerciseReady: boolean;
  mealReady: boolean;
  medicineDone: boolean;
  medicineDates?: string[];
  medicineReady?: boolean;
  live?: boolean;
};
export function monthDates(today: string) {
  const [year, month] = today.split('-').map(Number);
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const dates = Array.from({length: count}, (_, i) => `${year}-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`);
  return { year, month, offset, dates };
}
export function dayTasks(date: string, input: CalendarInput) {
  const saved = (dates: string[], ready: boolean): TaskStatus => date > input.today ? 'future' : !ready ? 'unavailable' : dates.includes(date) ? 'done' : 'missing';
  const statuses: TaskStatus[] = [saved(input.exerciseDates, input.exerciseReady), saved(input.mealDates, input.mealReady),
    input.medicineDates ? saved(input.medicineDates, input.medicineReady !== false) : date > input.today ? 'future' : date !== input.today ? 'unavailable' : input.medicineDone ? 'done' : 'missing'];
  return { statuses, count: statuses.filter(s => s === 'done').length, complete: statuses.every(s => s === 'done') };
}
