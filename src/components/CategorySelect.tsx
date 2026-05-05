import { TASK_CATEGORIES } from '../constants/categories';

type CategorySelectProps = {
  value: string;
  onChange: (categoryId: string) => void;
};

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  return (
    <label className="field">
      <span>Category</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {TASK_CATEGORIES.map((category) => (
          <option key={category.id} value={category.id}>
            {category.label}
          </option>
        ))}
      </select>
    </label>
  );
}
