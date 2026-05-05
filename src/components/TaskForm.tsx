import type { TimerConfig, TimerMode } from '../types/timer';
import { CUSTOM_CATEGORY_ID } from '../constants/categories';
import { BreakPicker } from './BreakPicker';
import { CategorySelect } from './CategorySelect';
import { DurationPicker } from './DurationPicker';

type TaskFormProps = {
  config: TimerConfig;
  disabled: boolean;
  onChange: (config: TimerConfig) => void;
};

export function TaskForm({ config, disabled, onChange }: TaskFormProps) {
  const update = <K extends keyof TimerConfig>(key: K, value: TimerConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const setMode = (mode: TimerMode) => {
    onChange({
      ...config,
      mode,
      focusDurationSeconds: mode === 'countup' ? null : config.focusDurationSeconds,
    });
  };

  const setCategory = (categoryId: string) => {
    onChange({
      ...config,
      categoryId,
      customCategoryName: categoryId === CUSTOM_CATEGORY_ID ? config.customCategoryName ?? '' : undefined,
    });
  };

  return (
    <section className="panel setup-panel" aria-label="Timer setup">
      <label className="field task-field">
        <span>Task</span>
        <input
          disabled={disabled}
          onChange={(event) => update('taskName', event.target.value)}
          placeholder="What are you focusing on?"
          type="text"
          value={config.taskName}
        />
      </label>

      <div className="form-grid">
        <CategorySelect value={config.categoryId} onChange={setCategory} />

        {config.categoryId === CUSTOM_CATEGORY_ID ? (
          <label className="field">
            <span>Custom category</span>
            <input
              disabled={disabled}
              onChange={(event) => update('customCategoryName', event.target.value)}
              placeholder="Category name"
              type="text"
              value={config.customCategoryName ?? ''}
            />
          </label>
        ) : null}

        <div className="field-group">
          <div className="field-label">Mode</div>
          <div className="segmented" role="group" aria-label="Timer mode">
            <button
              className={config.mode === 'countdown' ? 'segment active' : 'segment'}
              disabled={disabled}
              onClick={() => setMode('countdown')}
              type="button"
            >
              Countdown
            </button>
            <button
              className={config.mode === 'countup' ? 'segment active' : 'segment'}
              disabled={disabled}
              onClick={() => setMode('countup')}
              type="button"
            >
              Count up
            </button>
          </div>
        </div>

        <DurationPicker
          disabled={disabled}
          mode={config.mode}
          onChange={(seconds) => update('focusDurationSeconds', seconds)}
          value={config.focusDurationSeconds}
        />

        <BreakPicker disabled={disabled} onChange={(seconds) => update('breakSeconds', seconds)} value={config.breakSeconds} />
      </div>
    </section>
  );
}
