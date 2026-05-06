import { formatDuration } from '../services/time';
import type { TimerConfig, TimerSnapshot } from '../types/timer';

type TimerDisplayProps = {
  config: TimerConfig;
  snapshot: TimerSnapshot;
};

export function TimerDisplay({ config, snapshot }: TimerDisplayProps) {
  const taskName = config.taskName.trim() || 'Ready when you are';
  const isIdle = snapshot.status === 'idle';
  const displaySeconds =
    isIdle && config.mode === 'countdown' ? config.focusDurationSeconds ?? 0 : snapshot.displaySeconds;
  const displayTime = formatDuration(displaySeconds);
  const hasHours = displayTime.split(':').length === 3;
  const displayDurationSeconds =
    isIdle && config.mode === 'countdown' ? config.focusDurationSeconds : snapshot.durationSeconds;
  const displayRemainingSeconds =
    isIdle && config.mode === 'countdown' ? config.focusDurationSeconds : snapshot.remainingSeconds;
  const ringSize = 100;
  const ringRadius = 45;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const progressRatio =
    config.mode === 'countdown' && displayDurationSeconds
      ? Math.max(0, Math.min(1, (displayRemainingSeconds ?? 0) / displayDurationSeconds))
      : 0;
  const progressOffset = ringCircumference * (1 - progressRatio);
  const progressAngle = progressRatio * 2 * Math.PI;
  const progressDot = {
    x: 50 + ringRadius * Math.cos(progressAngle),
    y: 50 + ringRadius * Math.sin(progressAngle),
  };

  return (
    <section className={`timer-face ${snapshot.kind} ${config.mode === 'countdown' ? 'has-progress' : 'neutral-ring'}`}>
      <svg className="timer-ring" viewBox={`0 0 ${ringSize} ${ringSize}`} aria-hidden="true">
        <circle className="timer-ring-track" cx="50" cy="50" r={ringRadius} />
        <circle
          className="timer-ring-progress"
          cx="50"
          cy="50"
          r={ringRadius}
          style={
            {
              '--ring-circumference': ringCircumference,
              '--ring-offset': progressOffset,
            } as React.CSSProperties
          }
        />
        {snapshot.mode === 'countdown' ? (
          <circle className="timer-ring-dot" cx={progressDot.x} cy={progressDot.y} r="2.1" />
        ) : null}
      </svg>
      <div className="timer-content">
        <h1>{taskName}</h1>
        <div className={hasHours ? 'time-readout has-hours' : 'time-readout'} aria-live="polite">
          {displayTime}
        </div>
      </div>
    </section>
  );
}
