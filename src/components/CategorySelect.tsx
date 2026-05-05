import { normalizeCategoryId, TASK_CATEGORIES } from '../constants/categories';

type CategorySelectProps = {
  value: string;
  onChange: (categoryId: string) => void;
};

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const safeValue = normalizeCategoryId(value);

  return (
    <div className="field-group">
      <div className="field-label">Category</div>
      <div className="category-row" role="group" aria-label="Category">
        {TASK_CATEGORIES.map((category) => (
          <button
            className={safeValue === category.id ? 'category-chip selected' : 'category-chip'}
            key={category.id}
            onClick={() => onChange(category.id)}
            type="button"
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  );
}
