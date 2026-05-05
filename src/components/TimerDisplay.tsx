import { TASK_CATEGORIES } from '../constants/categories';
import { formatDuration } from '../services/time';
import type { TimerConfig, TimerSnapshot } from '../types/timer';

type TimerDisplayProps = {
  config: TimerConfig;
  snapshot: TimerSnapshot;
};

export function TimerDisplay({ config, snapshot }: TimerDisplayProps) {
  const category = TASK_CATEGORIES.find((item) => item.id === config.categoryId);
  const taskName = config.taskName.trim() || 'Ready when you are';
  const statusLabel =
    snapshot.status === 'idle'
      ? 'Idle'
      : `${snapshot.kind === 'break' ? 'Break' : 'Focus'} ${snapshot.status}`;

  return (
    <section className={`timer-face ${snapshot.kind}`}>
      <div className="timer-meta">
        <span className="status-pill">{statusLabel}</span>
        {category ? (
          <span className="category-pill" style={{ '--category-color': category.color } as React.CSSProperties}>
            {category.label}
          </span>
        ) : null}
      </div>
      <h1>{taskName}</h1>
      <div className="time-readout" aria-live="polite">
        {formatDuration(snapshot.displaySeconds)}
      </div>
      <p>
        {snapshot.kind === 'break'
          ? 'Break timer'
          : config.mode === 'countup'
            ? 'Count-up focus session'
            : 'Countdown focus session'}
      </p>
    </section>
  );
}
