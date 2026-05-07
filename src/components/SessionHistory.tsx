import type { FocusSession } from '../types/session';

type SessionHistoryProps = {
  sessions: FocusSession[];
  onView: () => void;
};

export function SessionHistory({ sessions, onView }: SessionHistoryProps) {
  return (
    <section className="panel history-panel" aria-label="Focus history">
      <div className="section-heading">
        <div>
          <h2>History</h2>
          <p>{sessions.length === 0 ? 'Completed focus sessions will appear here.' : `${sessions.length} saved sessions`}</p>
        </div>
        <button className="quiet-action small" onClick={onView} type="button">
          View
        </button>
      </div>
    </section>
  );
}
