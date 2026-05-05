import type { TaskCategory } from '../types/task';

export const CUSTOM_CATEGORY_ID = 'custom';

export const TASK_CATEGORIES: TaskCategory[] = [
  { id: 'study', label: 'Study', color: '#7c3aed' },
  { id: 'work', label: 'Work', color: '#2563eb' },
  { id: 'read', label: 'Read', color: '#0891b2' },
  { id: CUSTOM_CATEGORY_ID, label: 'Custom', color: '#475569' },
];

export function getCategoryLabel(categoryId: string, customCategoryName?: string): string {
  if (categoryId === CUSTOM_CATEGORY_ID) {
    return customCategoryName?.trim() || 'Custom';
  }

  return TASK_CATEGORIES.find((category) => category.id === categoryId)?.label ?? TASK_CATEGORIES[0].label;
}

export function getCategoryColor(categoryId: string): string {
  return TASK_CATEGORIES.find((category) => category.id === categoryId)?.color ?? TASK_CATEGORIES[0].color;
}

export function normalizeCategoryId(categoryId: string): string {
  return TASK_CATEGORIES.some((category) => category.id === categoryId) ? categoryId : TASK_CATEGORIES[0].id;
}
