import { FOCUS_DURATION_PRESETS } from '../constants/durations';
import { minutesToSeconds, secondsToMinutes } from '../services/time';

type DurationPickerProps = {
  disabled: boolean;
  mode: 'countdown' | 'countup';
  value: number | null;
  onChange: (seconds: number | null) => void;
};

export function DurationPicker({ disabled, mode, value, onChange }: DurationPickerProps) {
  const currentMinutes = value === null ? '' : secondsToMinutes(value);

  return (
    <div className="field-group">
      <div className="field-label">Focus duration</div>
      <div className="preset-row" aria-label="Preset focus durations">
        {FOCUS_DURATION_PRESETS.map((preset) => {
          const presetSeconds = minutesToSeconds(preset.minutes);
          return (
            <button
              className={value === presetSeconds ? 'chip selected' : 'chip'}
              disabled={disabled || mode === 'countup'}
              key={preset.minutes}
              onClick={() => onChange(presetSeconds)}
              type="button"
            >
              {preset.label} min
            </button>
          );
        })}
      </div>
      <label className="inline-input duration-inline">
        <span className="inline-prefix">Custom</span>
        <input
          disabled={disabled || mode === 'countup'}
          min="1"
          onChange={(event) => {
            const minutes = Number(event.target.value);
            onChange(Number.isFinite(minutes) && minutes > 0 ? minutesToSeconds(minutes) : null);
          }}
          placeholder={mode === 'countup' ? 'Not used' : '25'}
          type="number"
          value={mode === 'countup' ? '' : currentMinutes}
        />
        <span className="unit-label">min</span>
      </label>
    </div>
  );
}
