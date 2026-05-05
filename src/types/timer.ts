export type TimerMode = 'countdown' | 'countup';
export type SessionKind = 'focus' | 'break';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export type TimerConfig = {
  taskName: string;
  categoryId: string;
  mode: TimerMode;
  focusDurationSeconds: number | null;
  breakSeconds: number;
};

export type TimerRuntime = {
  kind: SessionKind;
  status: TimerStatus;
  startedAt: number | null;
  pausedAt: number | null;
  accumulatedPausedMs: number;
  elapsedSeconds: number;
};

export type StartTimerOptions = {
  kind: SessionKind;
  mode: TimerMode;
  durationSeconds: number | null;
};

export type TimerSnapshot = TimerRuntime & {
  mode: TimerMode;
  durationSeconds: number | null;
  remainingSeconds: number | null;
  displaySeconds: number;
  startedAtIso: string | null;
};
