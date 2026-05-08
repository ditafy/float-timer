import { formatDuration } from '../services/time';
import type { FocusSession } from '../types/session';

type BreakPromptProps = {
  session: FocusSession;
  onStartBreak: () => void;
  onSkipBreak: () => void;
};

export function BreakPrompt({ session, onStartBreak, onSkipBreak }: BreakPromptProps) {
  return (
    <section className="break-prompt" aria-live="polite">
      <div>
        <h2>Start break?</h2>
        <p>{formatDuration(session.breakSeconds)} planned before the next focus session.</p>
      </div>
      <div className="prompt-actions">
        <button className="primary-action" onClick={onStartBreak} type="button">
          Start
        </button>
        <button className="quiet-action" onClick={onSkipBreak} type="button">
          Skip
        </button>
      </div>
    </section>
  );
}
