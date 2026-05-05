import { useCallback, useMemo, useState } from 'react';
import { BreakPrompt } from '../components/BreakPrompt';
import { SessionHistory } from '../components/SessionHistory';
import { TaskForm } from '../components/TaskForm';
import { TimerControls } from '../components/TimerControls';
import { TimerDisplay } from '../components/TimerDisplay';
import { CUSTOM_CATEGORY_ID, getCategoryLabel, normalizeCategoryId } from '../constants/categories';
import { DEFAULT_BREAK_MINUTES, DEFAULT_FOCUS_MINUTES } from '../constants/durations';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useTimer } from '../hooks/useTimer';
import { localSessionStore } from '../services/sessionStorage';
import { minutesToSeconds } from '../services/time';
import type { FocusSession, FinishReason } from '../types/session';
import type { TimerConfig, TimerSnapshot } from '../types/timer';

const DEFAULT_CONFIG: TimerConfig = {
  taskName: '',
  categoryId: 'study',
  customCategoryName: '',
  mode: 'countdown',
  focusDurationSeconds: minutesToSeconds(DEFAULT_FOCUS_MINUTES),
  breakSeconds: minutesToSeconds(DEFAULT_BREAK_MINUTES),
};

function createSessionId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function App() {
  const [config, setConfig] = useLocalStorage<TimerConfig>('float-timer.config.v1', DEFAULT_CONFIG);
  const [sessions, setSessions] = useState<FocusSession[]>(() => localSessionStore.listSessions());
  const [pendingBreakSession, setPendingBreakSession] = useState<FocusSession | null>(null);
  const normalizedConfig = useMemo<TimerConfig>(
    () => ({
      ...config,
      categoryId: normalizeCategoryId(config.categoryId),
    }),
    [config],
  );

  const refreshSessions = useCallback(() => {
    setSessions(localSessionStore.listSessions());
  }, []);

  const saveFocusSession = useCallback(
    (snapshot: TimerSnapshot, finishReason: FinishReason) => {
      if (snapshot.kind !== 'focus' || !snapshot.startedAtIso) {
        return null;
      }

      const plannedDurationSeconds =
        normalizedConfig.mode === 'countdown' ? normalizedConfig.focusDurationSeconds : null;
      const actualDurationSeconds =
        finishReason === 'completed' && plannedDurationSeconds !== null
          ? plannedDurationSeconds
          : Math.max(1, snapshot.elapsedSeconds);

      const session: FocusSession = {
        id: createSessionId(),
        taskName: normalizedConfig.taskName.trim(),
        categoryId: normalizedConfig.categoryId,
        categoryLabel: getCategoryLabel(normalizedConfig.categoryId, normalizedConfig.customCategoryName),
        mode: normalizedConfig.mode,
        plannedDurationSeconds,
        breakSeconds: normalizedConfig.breakSeconds,
        actualDurationSeconds,
        startedAt: snapshot.startedAtIso,
        endedAt: new Date().toISOString(),
        completed: true,
        finishReason,
        breakStarted: false,
      };

      localSessionStore.saveSession(session);
      refreshSessions();

      if (session.breakSeconds > 0) {
        setPendingBreakSession(session);
      } else {
        setPendingBreakSession(null);
      }

      return session;
    },
    [normalizedConfig, refreshSessions],
  );

  const handleTimerComplete = useCallback(
    (snapshot: TimerSnapshot) => {
      if (snapshot.kind === 'focus') {
        saveFocusSession(snapshot, 'completed');
        return;
      }

      setPendingBreakSession(null);
      timer.reset();
    },
    [saveFocusSession],
  );

  const timer = useTimer({ onComplete: handleTimerComplete });

  const canStart = useMemo(() => {
    const hasTaskName = normalizedConfig.taskName.trim().length > 0;
    const hasCategory =
      normalizedConfig.categoryId !== CUSTOM_CATEGORY_ID || (normalizedConfig.customCategoryName?.trim().length ?? 0) > 0;
    const hasCountdownDuration =
      normalizedConfig.mode === 'countup' || (normalizedConfig.focusDurationSeconds ?? 0) > 0;
    return hasTaskName && hasCategory && hasCountdownDuration && timer.snapshot.status === 'idle';
  }, [normalizedConfig, timer.snapshot.status]);

  const formDisabled = timer.snapshot.status === 'running' || timer.snapshot.status === 'paused';

  const startFocus = () => {
    setPendingBreakSession(null);
    timer.start({
      kind: 'focus',
      mode: normalizedConfig.mode,
      durationSeconds: normalizedConfig.mode === 'countdown' ? normalizedConfig.focusDurationSeconds : null,
    });
  };

  const finishFocus = () => {
    const snapshot = timer.finish();
    if (snapshot?.kind === 'focus') {
      saveFocusSession(snapshot, 'manual');
    }
  };

  const startBreak = () => {
    if (!pendingBreakSession || pendingBreakSession.breakSeconds <= 0) {
      return;
    }

    const updatedSession = {
      ...pendingBreakSession,
      breakStarted: true,
    };

    localSessionStore.updateSession(updatedSession);
    refreshSessions();
    setPendingBreakSession(null);
    timer.start({
      kind: 'break',
      mode: 'countdown',
      durationSeconds: updatedSession.breakSeconds,
    });
  };

  const skipBreak = () => {
    setPendingBreakSession(null);
    timer.reset();
  };

  const clearHistory = () => {
    localSessionStore.clearSessions();
    refreshSessions();
  };

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="primary-column">
          <TimerDisplay config={normalizedConfig} snapshot={timer.snapshot} />
          <TimerControls
            canStart={canStart}
            onFinish={finishFocus}
            onPause={timer.pause}
            onReset={() => {
              setPendingBreakSession(null);
              timer.reset();
            }}
            onResume={timer.resume}
            onStart={startFocus}
            snapshot={timer.snapshot}
          />
          {pendingBreakSession ? (
            <BreakPrompt onSkipBreak={skipBreak} onStartBreak={startBreak} session={pendingBreakSession} />
          ) : null}
        </div>

        <aside className="secondary-column">
          <TaskForm config={normalizedConfig} disabled={formDisabled} onChange={setConfig} />
          <SessionHistory sessions={sessions} onClear={clearHistory} />
        </aside>
      </section>
    </main>
  );
}
