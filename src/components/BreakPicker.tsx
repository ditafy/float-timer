import { minutesToSeconds, secondsToMinutes } from '../services/time';

type BreakPickerProps = {
  disabled: boolean;
  value: number;
  onChange: (seconds: number) => void;
};

export function BreakPicker({ disabled, value, onChange }: BreakPickerProps) {
  return (
    <div className="field-group">
      <div className="field-label">Break duration</div>
      <label className="inline-input break-inline">
        <span className="inline-prefix">Break</span>
        <input
          disabled={disabled}
          min="0"
          onChange={(event) => {
            const minutes = Number(event.target.value);
            onChange(Number.isFinite(minutes) && minutes >= 0 ? minutesToSeconds(minutes) : 0);
          }}
          type="number"
          value={secondsToMinutes(value)}
        />
        <span className="unit-label">min</span>
      </label>
    </div>
  );
}
