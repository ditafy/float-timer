import { formatDuration, formatSessionTime } from '../services/time';
import type { FocusSession } from '../types/session';

type SessionHistoryProps = {
  sessions: FocusSession[];
  onClear: () => void;
};

export function SessionHistory({ sessions, onClear }: SessionHistoryProps) {
  return (
    <section className="panel history-panel" aria-label="Focus history">
      <div className="section-heading">
        <div>
          <h2>History</h2>
          <p>{sessions.length === 0 ? 'Completed focus sessions will appear here.' : `${sessions.length} saved sessions`}</p>
        </div>
        {sessions.length > 0 ? (
          <button className="quiet-action small" onClick={onClear} type="button">
            Clear
          </button>
        ) : null}
      </div>

      <div className="history-list">
        {sessions.map((session) => (
          <article className="history-item" key={session.id}>
            <div>
              <h3>{session.taskName}</h3>
              <p>
                {session.categoryLabel} · {formatSessionTime(session.endedAt)}
              </p>
            </div>
            <div className="history-stats">
              <strong>{formatDuration(session.actualDurationSeconds)}</strong>
              <span>{session.breakStarted ? 'Break started' : session.breakSeconds > 0 ? 'Break skipped' : 'No break'}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
