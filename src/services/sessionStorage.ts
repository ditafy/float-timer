import { getCategoryLabel } from '../constants/categories';
import type { FocusSession, SessionStore } from '../types/session';

export const SESSION_STORAGE_KEY = 'float-timer.sessions.v1';

function toFocusSession(value: unknown): FocusSession | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const session = value as Partial<FocusSession>;
  const hasSessionShape =
    typeof session.id === 'string' &&
    typeof session.taskName === 'string' &&
    typeof session.categoryId === 'string' &&
    (session.mode === 'countdown' || session.mode === 'countup') &&
    (typeof session.plannedDurationSeconds === 'number' || session.plannedDurationSeconds === null) &&
    typeof session.breakSeconds === 'number' &&
    typeof session.actualDurationSeconds === 'number' &&
    typeof session.startedAt === 'string' &&
    typeof session.endedAt === 'string' &&
    typeof session.completed === 'boolean' &&
    (session.finishReason === 'completed' || session.finishReason === 'manual') &&
    typeof session.breakStarted === 'boolean';

  if (!hasSessionShape) {
    return null;
  }

  const validSession = session as FocusSession;

  return {
    id: validSession.id,
    taskName: validSession.taskName,
    categoryId: validSession.categoryId,
    categoryLabel:
      typeof session.categoryLabel === 'string' ? session.categoryLabel : getCategoryLabel(validSession.categoryId),
    mode: validSession.mode,
    plannedDurationSeconds: validSession.plannedDurationSeconds,
    breakSeconds: validSession.breakSeconds,
    actualDurationSeconds: validSession.actualDurationSeconds,
    startedAt: validSession.startedAt,
    endedAt: validSession.endedAt,
    completed: validSession.completed,
    finishReason: validSession.finishReason,
    breakStarted: validSession.breakStarted,
  };
}

function readSessions(): FocusSession[] {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item) => {
      const session = toFocusSession(item);
      return session ? [session] : [];
    });
  } catch {
    return [];
  }
}

function writeSessions(sessions: FocusSession[]): void {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
}

export const localSessionStore: SessionStore = {
  listSessions() {
    return readSessions().sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt));
  },

  saveSession(session) {
    const sessions = readSessions();
    writeSessions([session, ...sessions]);
  },

  updateSession(session) {
    const sessions = readSessions();
    writeSessions(sessions.map((stored) => (stored.id === session.id ? session : stored)));
  },

  deleteSession(id) {
    const sessions = readSessions();
    writeSessions(sessions.filter((session) => session.id !== id));
  },

  clearSessions() {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  },
};
