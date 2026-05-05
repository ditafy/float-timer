import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StartTimerOptions, TimerMode, TimerSnapshot, TimerRuntime } from '../types/timer';

const idleRuntime: TimerRuntime = {
  kind: 'focus',
  status: 'idle',
  startedAt: null,
  pausedAt: null,
  accumulatedPausedMs: 0,
  elapsedSeconds: 0,
};

type ActiveTimer = {
  mode: TimerMode;
  durationSeconds: number | null;
};

type UseTimerOptions = {
  onComplete?: (snapshot: TimerSnapshot) => void;
};

function computeElapsedSeconds(runtime: TimerRuntime, now: number): number {
  if (!runtime.startedAt) {
    return runtime.elapsedSeconds;
  }

  const pausedMs =
    runtime.status === 'paused' && runtime.pausedAt
      ? runtime.accumulatedPausedMs + (now - runtime.pausedAt)
      : runtime.accumulatedPausedMs;

  return Math.max(0, Math.floor((now - runtime.startedAt - pausedMs) / 1000));
}

function createSnapshot(runtime: TimerRuntime, activeTimer: ActiveTimer): TimerSnapshot {
  const remainingSeconds =
    activeTimer.mode === 'countdown' && activeTimer.durationSeconds !== null
      ? Math.max(activeTimer.durationSeconds - runtime.elapsedSeconds, 0)
      : null;

  return {
    ...runtime,
    mode: activeTimer.mode,
    durationSeconds: activeTimer.durationSeconds,
    remainingSeconds,
    displaySeconds: remainingSeconds ?? runtime.elapsedSeconds,
    startedAtIso: runtime.startedAt ? new Date(runtime.startedAt).toISOString() : null,
  };
}

export function useTimer({ onComplete }: UseTimerOptions = {}) {
  const [runtime, setRuntime] = useState<TimerRuntime>(idleRuntime);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer>({
    mode: 'countdown',
    durationSeconds: null,
  });
  const completedRef = useRef(false);

  const snapshot = useMemo(() => createSnapshot(runtime, activeTimer), [activeTimer, runtime]);

  const start = useCallback((options: StartTimerOptions) => {
    completedRef.current = false;
    setActiveTimer({
      mode: options.mode,
      durationSeconds: options.durationSeconds,
    });
    setRuntime({
      kind: options.kind,
      status: 'running',
      startedAt: Date.now(),
      pausedAt: null,
      accumulatedPausedMs: 0,
      elapsedSeconds: 0,
    });
  }, []);

  const pause = useCallback(() => {
    setRuntime((current) => {
      if (current.status !== 'running') {
        return current;
      }

      return {
        ...current,
        status: 'paused',
        pausedAt: Date.now(),
      };
    });
  }, []);

  const resume = useCallback(() => {
    setRuntime((current) => {
      if (current.status !== 'paused' || !current.pausedAt) {
        return current;
      }

      return {
        ...current,
        status: 'running',
        accumulatedPausedMs: current.accumulatedPausedMs + Date.now() - current.pausedAt,
        pausedAt: null,
      };
    });
  }, []);

  const reset = useCallback(() => {
    completedRef.current = false;
    setRuntime(idleRuntime);
  }, []);

  const finish = useCallback(() => {
    if (runtime.status !== 'running' && runtime.status !== 'paused') {
      return null;
    }

    const elapsedSeconds = computeElapsedSeconds(runtime, Date.now());
    const finishedRuntime: TimerRuntime = {
      ...runtime,
      status: 'finished',
      pausedAt: null,
      elapsedSeconds,
    };
    const finishedSnapshot = createSnapshot(finishedRuntime, activeTimer);

    setRuntime(finishedRuntime);
    return finishedSnapshot;
  }, [activeTimer, runtime]);

  useEffect(() => {
    if (runtime.status !== 'running') {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRuntime((current) => {
        if (current.status !== 'running') {
          return current;
        }

        const elapsedSeconds = computeElapsedSeconds(current, Date.now());
        return {
          ...current,
          elapsedSeconds,
        };
      });
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [runtime.status]);

  useEffect(() => {
    if (
      runtime.status !== 'running' ||
      activeTimer.mode !== 'countdown' ||
      activeTimer.durationSeconds === null ||
      runtime.elapsedSeconds < activeTimer.durationSeconds ||
      completedRef.current
    ) {
      return;
    }

    completedRef.current = true;
    const finishedRuntime: TimerRuntime = {
      ...runtime,
      status: 'finished',
      pausedAt: null,
      elapsedSeconds: activeTimer.durationSeconds,
    };

    setRuntime(finishedRuntime);
    onComplete?.(createSnapshot(finishedRuntime, activeTimer));
  }, [activeTimer, onComplete, runtime]);

  return {
    snapshot,
    start,
    pause,
    resume,
    reset,
    finish,
  };
}
