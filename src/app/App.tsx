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
import { applyDesktopWindowMode } from '../services/desktopWindow';
import { localSessionStore } from '../services/sessionStorage';
import { formatDuration, formatSessionTime, minutesToSeconds } from '../services/time';
import type { FocusSession, FinishReason } from '../types/session';
import type { TimerConfig, TimerSnapshot } from '../types/timer';

type DeleteConfirmation =
  | { kind: 'clear-all' }
  | { kind: 'single'; sessionId: string }
  | null;

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

function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStartOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getStartOfWeek(date: Date): Date {
  const start = getStartOfDay(date);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

function formatStatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  return `${minutes}m`;
}

export function App() {
  const [config, setConfig] = useLocalStorage<TimerConfig>('float-timer.config.v1', DEFAULT_CONFIG);
  const [sessions, setSessions] = useState<FocusSession[]>(() => localSessionStore.listSessions());
  const [pendingBreakSession, setPendingBreakSession] = useState<FocusSession | null>(null);
  const [view, setView] = useState<'timer' | 'history'>('timer');
  const [displayMode, setDisplayMode] = useState<'full' | 'mini'>('full');
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>(null);
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

  const updateDisplayMode = useCallback((nextMode: 'full' | 'mini') => {
    setDisplayMode(nextMode);
    void applyDesktopWindowMode(nextMode);
  }, []);

  const saveFocusSession = useCallback(
    (snapshot: TimerSnapshot, finishReason: FinishReason, shouldPromptBreak: boolean) => {
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

      if (shouldPromptBreak && session.breakSeconds > 0) {
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
        saveFocusSession(snapshot, 'completed', true);
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
  const stats = useMemo(() => {
    const todayKey = getDateKey(new Date());
    const startOfWeek = getStartOfWeek(new Date());
    const sessionDays = new Set(sessions.map((session) => getDateKey(new Date(session.endedAt))));
    const todayFocusSeconds = sessions
      .filter((session) => getDateKey(new Date(session.endedAt)) === todayKey)
      .reduce((total, session) => total + session.actualDurationSeconds, 0);
    const weekFocusSeconds = sessions
      .filter((session) => new Date(session.endedAt) >= startOfWeek)
      .reduce((total, session) => total + session.actualDurationSeconds, 0);
    let streakDays = 0;
    const streakDate = getStartOfDay(new Date());

    while (sessionDays.has(getDateKey(streakDate))) {
      streakDays += 1;
      streakDate.setDate(streakDate.getDate() - 1);
    }

    return {
      todayFocusTime: formatStatDuration(todayFocusSeconds),
      completed: sessions.length,
      streakDays,
      weekFocusTime: formatStatDuration(weekFocusSeconds),
    };
  }, [sessions]);

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
      saveFocusSession(snapshot, 'manual', false);
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

  const resetTimer = () => {
    setPendingBreakSession(null);
    timer.reset();
  };

  const clearHistory = () => {
    localSessionStore.clearSessions();
    refreshSessions();
  };

  const deleteSession = (sessionId: string) => {
    localSessionStore.deleteSession(sessionId);
    refreshSessions();
  };

  const confirmDeletion = () => {
    if (deleteConfirmation?.kind === 'clear-all') {
      clearHistory();
    } else if (deleteConfirmation?.kind === 'single') {
      deleteSession(deleteConfirmation.sessionId);
    }

    setDeleteConfirmation(null);
  };

  if (displayMode === 'mini') {
    const isIdle = timer.snapshot.status === 'idle';
    const miniDisplaySeconds =
      isIdle && normalizedConfig.mode === 'countdown'
        ? normalizedConfig.focusDurationSeconds ?? 0
        : timer.snapshot.displaySeconds;
    const miniTaskName = normalizedConfig.taskName.trim() || 'Ready when you are';

    return (
      <main className="app-shell mini-app-shell">
        <section className="mini-window" aria-label="Mini Pomodoro timer">
          <div className="mini-timer-content">
            {pendingBreakSession ? (
              <>
                <h1>Focus complete</h1>
                <div className="mini-break-title">Start break?</div>
              </>
            ) : (
              <>
                <h1>{miniTaskName}</h1>
                <div className="mini-time-readout" aria-live="polite">
                  {formatDuration(miniDisplaySeconds)}
                </div>
              </>
            )}
          </div>
          <div className="mini-controls" aria-label="Mini timer controls">
            {pendingBreakSession ? (
              <>
                <button className="primary-action" onClick={startBreak} type="button">
                  Start break
                </button>
                <button className="quiet-action" onClick={skipBreak} type="button">
                  Skip
                </button>
              </>
            ) : null}
            {!pendingBreakSession && timer.snapshot.status === 'idle' ? (
              <button className="primary-action" disabled={!canStart} onClick={startFocus} type="button">
                Start
              </button>
            ) : null}
            {!pendingBreakSession && timer.snapshot.status === 'running' ? (
              <button onClick={timer.pause} type="button">
                Pause
              </button>
            ) : null}
            {!pendingBreakSession && timer.snapshot.status === 'paused' ? (
              <button className="primary-action" onClick={timer.resume} type="button">
                Resume
              </button>
            ) : null}
            {!pendingBreakSession && (timer.snapshot.status === 'running' || timer.snapshot.status === 'paused') ? (
              <button onClick={finishFocus} type="button">
                Finish
              </button>
            ) : null}
            {!pendingBreakSession && timer.snapshot.status === 'finished' ? (
              <button className="quiet-action" onClick={resetTimer} type="button">
                Reset
              </button>
            ) : null}
            <button className="quiet-action mini-expand-button" onClick={() => updateDisplayMode('full')} type="button">
              Expand
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (view === 'history') {
    return (
      <main className="app-shell">
        <section className="history-view" aria-label="History and stats">
          <div className="history-view-header">
            <div>
              <h1>History</h1>
              <p>{sessions.length === 0 ? 'Completed focus sessions will appear here.' : `${sessions.length} saved sessions`}</p>
            </div>
            <button className="quiet-action small" onClick={() => setView('timer')} type="button">
              Back
            </button>
          </div>

          <section className="stats-strip" aria-label="Focus stats">
            <div className="stats-item">
              <span className="stat-label">
                Today
              </span>
              <strong>{stats.todayFocusTime}</strong>
              <small>Focus time</small>
            </div>
            <div className="stats-item">
              <span className="stat-label">
                Sessions
              </span>
              <strong>{stats.completed}</strong>
              <small>Completed</small>
            </div>
            <div className="stats-item">
              <span className="stat-label">
                Streak
              </span>
              <strong>{stats.streakDays}</strong>
              <small>Days</small>
            </div>
            <div className="stats-item">
              <span className="stat-label">
                This week
              </span>
              <strong>{stats.weekFocusTime}</strong>
              <small>Focus time</small>
            </div>
          </section>

          <section className="panel history-panel full-history-panel" aria-label="Full focus history">
            <div className="section-heading">
              <div>
                <h2>Sessions</h2>
                <p>{sessions.length === 0 ? 'No sessions saved yet.' : 'Full session history'}</p>
              </div>
              {sessions.length > 0 ? (
                <button className="quiet-action small" onClick={() => setDeleteConfirmation({ kind: 'clear-all' })} type="button">
                  Clear all history
                </button>
              ) : null}
            </div>

            <div className="history-list">
              {sessions.map((session) => (
                <article className="history-item" key={session.id}>
                  <div className="history-item-main">
                    <h3>{session.taskName}</h3>
                    <p>
                      {session.categoryLabel} · {formatSessionTime(session.endedAt)}
                    </p>
                  </div>
                  <div className="history-item-actions">
                    <div className="history-stats">
                      <strong>{formatDuration(session.actualDurationSeconds)}</strong>
                      <span>{session.breakStarted ? 'Break started' : session.breakSeconds > 0 ? 'Break skipped' : 'No break'}</span>
                    </div>
                    <button
                      aria-label={`Delete ${session.taskName} history record`}
                      className="delete-history-button"
                      onClick={() => setDeleteConfirmation({ kind: 'single', sessionId: session.id })}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
          {deleteConfirmation ? (
            <div className="confirm-backdrop" role="presentation">
              <section className="confirm-dialog" aria-modal="true" role="dialog">
                <h2>
                  {deleteConfirmation.kind === 'clear-all'
                    ? 'Are you sure you want to delete all history?'
                    : 'Are you sure you want to delete this history record?'}
                </h2>
                <div className="confirm-actions">
                  <button className="quiet-action small" onClick={() => setDeleteConfirmation(null)} type="button">
                    Cancel
                  </button>
                  <button className="primary-action small" onClick={confirmDeletion} type="button">
                    Confirm
                  </button>
                </div>
              </section>
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="primary-column">
          <TimerDisplay config={normalizedConfig} snapshot={timer.snapshot} />
          {!pendingBreakSession ? (
            <TimerControls
              canStart={canStart}
              onFinish={finishFocus}
              onPause={timer.pause}
              onReset={resetTimer}
              onResume={timer.resume}
              onStart={startFocus}
              snapshot={timer.snapshot}
            />
          ) : null}
          {pendingBreakSession ? (
            <BreakPrompt onSkipBreak={skipBreak} onStartBreak={startBreak} session={pendingBreakSession} />
          ) : null}
        </div>

        <aside className="secondary-column">
          <button className="quiet-action small mode-toggle-button" onClick={() => updateDisplayMode('mini')} type="button">
            Mini
          </button>
          <TaskForm config={normalizedConfig} disabled={formDisabled} onChange={setConfig} />
          <SessionHistory sessions={sessions} onView={() => setView('history')} />
        </aside>
      </section>
    </main>
  );
}
