// finance.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FinanceState } from '../state/finance.state';
import { EXPENSE_CATEGORIES, Expense } from '../../model/finance.model';

/* ── Selector Types ── */
export type SelectorExpense = Omit<Expense, 'id'> & { _id: string };

export const selectFinanceState = createFeatureSelector<FinanceState>('finance');

/* ── Month ── */
export const selectSelectedMonth = createSelector(
  selectFinanceState,
  (s) => new Date(s.selectedMonth)
);

export const selectMonthLabel = createSelector(
  selectSelectedMonth,
  (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
);

export const selectCurrentMonthKey = createSelector(
  selectSelectedMonth,
  (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
);

/* ── Tab ── */
export const selectActiveTab = createSelector(
  selectFinanceState,
  (s) => s.activeTab
);

/* ── Expenses ── */
export const selectCurrentMonthExpenses = createSelector(
  selectFinanceState,
  selectActiveTab,
  (s) => s.currentMonthExpenses.map((e) => ({ ...e, _id: e.id }))
);

export const selectLoadingExpenses = createSelector(
  selectFinanceState,
  (s) => s.loadingExpenses
);

export const selectRecentExpenses = createSelector(
  selectCurrentMonthExpenses,
  (expenses) => expenses.slice(0, 5)
);

/* ── Budget ── */
export const selectCurrentBudget = createSelector(
  selectFinanceState,
  (s) => s.currentBudget
);

export const selectMonthlyBudget = createSelector(
  selectCurrentBudget,
  (budget) => budget?.monthlyBudget ?? 0
);

/* ── Month Summary (derived) ── */
export const selectTotalSpent = createSelector(
  selectCurrentMonthExpenses,
  (expenses) => expenses.reduce((sum, e) => sum + e.amount, 0)
);

export const selectPercentUsed = createSelector(
  selectTotalSpent,
  selectMonthlyBudget,
  (spent, budget) => (budget > 0 ? Math.round((spent / budget) * 100) : 0)
);

export const selectRemaining = createSelector(
  selectTotalSpent,
  selectMonthlyBudget,
  (spent, budget) => budget - spent
);

export const selectIsOverBudget = createSelector(
  selectTotalSpent,
  selectMonthlyBudget,
  (spent, budget) => budget > 0 && spent > budget
);

export const selectIsNearAlert = createSelector(
  selectFinanceState,
  selectTotalSpent,
  selectMonthlyBudget,
  selectPercentUsed,
  (state, spent, budget, pct) =>
    budget > 0 &&
    pct >= (state.currentBudget?.alertThreshold ?? 80) &&
    spent <= budget
);

export const selectProgressColor = createSelector(
  selectPercentUsed,
  (pct) => {
    if (pct >= 100) return 'bg-red-500';
    if (pct >= 80) return 'bg-amber-500';
    return 'bg-accent';
  }
);

/* ── Category Breakdown ── */
export const selectCategoryBreakdown = createSelector(
  selectCurrentMonthExpenses,
  (expenses) =>
    EXPENSE_CATEGORIES.map((cat) => ({
      config: cat,
      total: expenses
        .filter((e) => e.category === cat.key)
        .reduce((sum, e) => sum + e.amount, 0),
    }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total) // ← highest spend first
);

export const selectCategoryTotal = (key: string) =>
  createSelector(selectCurrentMonthExpenses, (expenses) =>
    expenses
      .filter((e) => e.category === key)
      .reduce((sum, e) => sum + e.amount, 0)
  );

/* ── UI State ── */
export const selectShowAddForm = createSelector(
  selectFinanceState,
  (s) => s.showAddForm
);

export const selectShowEditForm = createSelector(
  selectFinanceState,
  (s) => s.showEditForm
);

export const selectEditingExpense = createSelector(
  selectFinanceState,
  (s) => s.editingExpense
);

export const selectShowBudgetSettings = createSelector(
  selectFinanceState,
  (s) => s.showBudgetSettings
);

export const selectDeleteConfirmId = createSelector(
  selectFinanceState,
  (s) => s.deleteConfirmId
);

export const selectSavingExpense = createSelector(
  selectFinanceState,
  (s) => s.savingExpense
);

export const selectSavingBudget = createSelector(
  selectFinanceState,
  (s) => s.savingBudget
);

/* ── SMS ── */
export const selectSmsRawText = createSelector(
  selectFinanceState,
  (s) => s.smsRawText
);

export const selectParsedTransactions = createSelector(
  selectFinanceState,
  (s) => s.parsedTransactions
);

export const selectSelectedSmsCount = createSelector(
  selectParsedTransactions,
  (txns) => txns.filter((t) => t.selected).length
);

export const selectSelectedSmsTotal = createSelector(
  selectParsedTransactions,
  (txns) =>
    txns.filter((t) => t.selected).reduce((sum, t) => sum + t.amount, 0)
);

export const selectSmsImporting = createSelector(
  selectFinanceState,
  (s) => s.smsImporting
);
/* ── Debts ── */
export const selectAllDebts = createSelector(selectFinanceState, (s) => s.debts);
export const selectDebtLoading = createSelector(selectFinanceState, (s) => s.loadingDebts);
export const selectDebtSaving = createSelector(selectFinanceState, (s) => s.savingDebt);
export const selectDebtFilter = createSelector(selectFinanceState, (s) => s.debtFilter);
export const selectShowAddDebt = createSelector(selectFinanceState, (s) => s.showAddDebtForm);
export const selectShowEditDebt = createSelector(selectFinanceState, (s) => s.showEditDebtForm);
export const selectEditingDebt = createSelector(selectFinanceState, (s) => s.editingDebt);

export const selectFilteredDebts = createSelector(
  selectAllDebts,
  selectDebtFilter,
  (debts, filter) => {
    switch (filter) {
      case 'owed_to_me': return debts.filter((d) => d.debtType === 'owed_to_me' && d.status !== 'settled');
      case 'i_owe': return debts.filter((d) => d.debtType === 'i_owe' && d.status !== 'settled');
      case 'settled': return debts.filter((d) => d.status === 'settled');
      default: return debts.filter((d) => d.status !== 'settled');
    }
  }
);

export const selectDebtSummary = createSelector(
  selectAllDebts,
  (debts) => {
    const active = debts.filter((d) => d.status !== 'settled');
    const totalOwedToMe = active
      .filter((d) => d.debtType === 'owed_to_me')
      .reduce((sum, d) => sum + (d.amount - (d.paidAmount ?? 0)), 0);
    const totalIOwe = active
      .filter((d) => d.debtType === 'i_owe')
      .reduce((sum, d) => sum + (d.amount - (d.paidAmount ?? 0)), 0);
    return { totalOwedToMe, totalIOwe, netBalance: totalOwedToMe - totalIOwe };
  }
);

/* ── Payload Type ── */
export const selectPayloadType = createSelector(
  selectFinanceState,
  (s) => s.payloadType
);