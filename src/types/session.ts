import type { TimerMode } from './timer';

export type FinishReason = 'completed' | 'manual';

export type FocusSession = {
  id: string;
  taskName: string;
  categoryId: string;
  categoryLabel: string;
  mode: TimerMode;
  plannedDurationSeconds: number | null;
  breakSeconds: number;
  actualDurationSeconds: number;
  startedAt: string;
  endedAt: string;
  completed: boolean;
  finishReason: FinishReason;
  breakStarted: boolean;
};

export interface SessionStore {
  listSessions(): FocusSession[];
  saveSession(session: FocusSession): void;
  updateSession(session: FocusSession): void;
  clearSessions(): void;
}
