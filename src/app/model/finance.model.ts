export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // ISO date string
  notes?: string;
  source?: 'manual' | 'sms'; // track origin
  createdAt: string; // ISO timestamp
  cardType?: string; // e.g. 'axis', 'hdfc' - optional field to track card used for transaction
}
export type FinancePayloadType = 'expense' | 'construction';

export type ExpenseCategory =
  | 'food'
  | 'groceries'
  | 'transport'
  | 'entertainment'
  | 'shopping'
  | 'bills'
  | 'health'
  | 'education'
  | 'rent'
  | 'subscriptions'
  | 'other';

export interface CategoryConfig {
  key: ExpenseCategory;
  label: string;
  icon: string;
  color: string; // Tailwind bg class
  textColor: string; // Tailwind text class
}

export interface BudgetSettings {
  monthlyBudget: number;
  alertThreshold: number; // percentage (e.g. 80 means alert at 80% spent)
}

/** Budget map keyed by month string e.g. '2026-02' */
export type MonthlyBudgetMap = Record<string, BudgetSettings>;

export interface MonthSummary {
  month: string; // e.g. '2026-02'
  totalSpent: number;
  budget: number;
  remaining: number;
  percentUsed: number;
  categoryBreakdown: { category: ExpenseCategory; total: number }[];
}

/** Parsed SMS transaction before user review */
export interface ParsedSmsTransaction {
  id: string;
  rawText: string;
  amount: number;
  merchant: string;
  date: string;
  type: 'debit' | 'credit' | 'unknown';
  category: ExpenseCategory;
  selected: boolean; // user toggle for bulk import
}

export const EXPENSE_CATEGORIES: CategoryConfig[] = [
  {
    key: 'food',
    label: 'Food & Dining',
    icon: 'restaurant',
    color: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-600 dark:text-orange-400',
  },
  {
    key: 'groceries',
    label: 'Groceries',
    icon: 'local_grocery_store',
    color: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-600 dark:text-yellow-400',
  },
  {
    key: 'transport',
    label: 'Transport',
    icon: 'directions_car',
    color: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    key: 'entertainment',
    label: 'Entertainment',
    icon: 'movie',
    color: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    key: 'shopping',
    label: 'Shopping',
    icon: 'shopping_bag',
    color: 'bg-pink-100 dark:bg-pink-900/30',
    textColor: 'text-pink-600 dark:text-pink-400',
  },
  {
    key: 'bills',
    label: 'Bills & Utilities',
    icon: 'receipt_long',
    color: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-600 dark:text-red-400',
  },
  {
    key: 'health',
    label: 'Health',
    icon: 'health_and_safety',
    color: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400',
  },
  {
    key: 'education',
    label: 'Education',
    icon: 'school',
    color: 'bg-indigo-100 dark:bg-indigo-900/30',
    textColor: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    key: 'rent',
    label: 'Rent',
    icon: 'home',
    color: 'bg-teal-100 dark:bg-teal-900/30',
    textColor: 'text-teal-600 dark:text-teal-400',
  },
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    icon: 'subscriptions',
    color: 'bg-cyan-100 dark:bg-cyan-900/30',
    textColor: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    key: 'other',
    label: 'Other',
    icon: 'more_horiz',
    color: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-600 dark:text-gray-400',
  },
];
