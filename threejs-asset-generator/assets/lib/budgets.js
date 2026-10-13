// budgets.js — triangle budgets per category. No imports on purpose (usable by CLI tools without three).
// Override per asset with `meta.triangleBudget`.
export const BUDGETS = {
  characters: 4000,
  environment: 1500,
  props: 1500,
  buildings: 3000,
  terrain: 8000,
  vehicles: 3000,
  vfx: 1000,
  ui: 500,
};

export const CATEGORIES = Object.keys(BUDGETS);
export const DEFAULT_BUDGET = 2000;
