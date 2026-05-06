import type { TimerSnapshot } from '../types/timer';

type TimerControlsProps = {
  canStart: boolean;
  snapshot: TimerSnapshot;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onFinish: () => void;
};

export function TimerControls({
  canStart,
  snapshot,
  onStart,
  onPause,
  onResume,
  onReset,
  onFinish,
}: TimerControlsProps) {
  return (
    <section className="controls" aria-label="Timer controls">
      {snapshot.status === 'idle' ? (
        <button className="primary-action" disabled={!canStart} onClick={onStart} type="button">
          Start
        </button>
      ) : null}

      {snapshot.status === 'running' ? (
        <button onClick={onPause} type="button">
          Pause
        </button>
      ) : null}

      {snapshot.status === 'paused' ? (
        <button className="primary-action" onClick={onResume} type="button">
          Resume
        </button>
      ) : null}

      {snapshot.status === 'running' || snapshot.status === 'paused' ? (
        <button onClick={onFinish} type="button">
          Finish
        </button>
      ) : null}

      {snapshot.status === 'finished' ? (
        <button className="quiet-action" onClick={onReset} type="button">
          Reset
        </button>
      ) : null}
    </section>
  );
}
