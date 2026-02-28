// finance.reducer.ts
import { createReducer, on } from '@ngrx/store';
import { initialFinanceState } from '../state/finance.state';
import * as FinanceActions from '../actions/finance.action';

export const financeReducer = createReducer(
  initialFinanceState,

  /* ── Month Navigation ── */
  on(FinanceActions.setSelectedMonth, (state, { date }) => ({
    ...state,
    selectedMonth: date,
  })),

  on(FinanceActions.navigatePrevMonth, (state) => {
    const d = new Date(state.selectedMonth);
    d.setMonth(d.getMonth() - 1);
    return { ...state, selectedMonth: d.toISOString() };
  }),

  on(FinanceActions.navigateNextMonth, (state) => {
    const d = new Date(state.selectedMonth);
    d.setMonth(d.getMonth() + 1);
    return { ...state, selectedMonth: d.toISOString() };
  }),

  /* ── Tab ── */
  on(FinanceActions.setActiveTab, (state, { tab }) => ({
    ...state,
    activeTab: tab,
  })),

  /* ── Load Month Expenses ── */
  on(FinanceActions.loadMonthExpenses, (state) => ({
    ...state,
    loadingExpenses: true,
    error: null,
  })),

  on(FinanceActions.loadMonthExpensesSuccess, (state, { expenses }) => ({
    ...state,
    currentMonthExpenses: expenses,
    loadingExpenses: false,
  })),

  on(FinanceActions.loadMonthExpensesFailure, (state, { error }) => ({
    ...state,
    loadingExpenses: false,
    error,
  })),

  /* ── Add Expense ── */
  on(FinanceActions.openAddExpenseForm, (state) => ({
    ...state,
    showAddForm: true,
  })),

  on(FinanceActions.closeAddExpenseForm, (state) => ({
    ...state,
    showAddForm: false,
  })),

  on(FinanceActions.addExpense, (state) => ({
    ...state,
    savingExpense: true,
    error: null,
  })),

  on(FinanceActions.addExpenseSuccess, (state, { expense }) => ({
    ...state,
    savingExpense: false,
    showAddForm: false,
    currentMonthExpenses: [expense, ...state.currentMonthExpenses],
  })),

  on(FinanceActions.addExpenseFailure, (state, { error }) => ({
    ...state,
    savingExpense: false,
    error,
  })),

  /* ── Edit Expense ── */
  on(FinanceActions.openEditExpenseForm, (state, { expense }) => ({
    ...state,
    showEditForm: true,
    editingExpense: expense,
  })),

  on(FinanceActions.closeEditExpenseForm, (state) => ({
    ...state,
    showEditForm: false,
    editingExpense: null,
  })),

  on(FinanceActions.updateExpense, (state) => ({
    ...state,
    savingExpense: true,
    error: null,
  })),

  on(FinanceActions.updateExpenseSuccess, (state, { expense }) => ({
    ...state,
    savingExpense: false,
    showEditForm: false,
    editingExpense: null,
    currentMonthExpenses: state.currentMonthExpenses.map((e) =>
      e.id === expense.id ? expense : e
    ),
  })),

  on(FinanceActions.updateExpenseFailure, (state, { error }) => ({
    ...state,
    savingExpense: false,
    error,
  })),

  /* ── Delete Expense ── */
  on(FinanceActions.confirmDeleteExpense, (state, { id }) => ({
    ...state,
    deleteConfirmId: id,
  })),

  on(FinanceActions.cancelDeleteExpense, (state) => ({
    ...state,
    deleteConfirmId: null,
  })),

  on(FinanceActions.deleteExpenseSuccess, (state, { id }) => ({
    ...state,
    deleteConfirmId: null,
    currentMonthExpenses: state.currentMonthExpenses.filter((e) => e.id !== id),
  })),

  on(FinanceActions.deleteExpenseFailure, (state, { error }) => ({
    ...state,
    error,
  })),

  /* ── Budget ── */
  on(FinanceActions.openBudgetSettings, (state) => ({
    ...state,
    showBudgetSettings: true,
  })),

  on(FinanceActions.closeBudgetSettings, (state) => ({
    ...state,
    showBudgetSettings: false,
  })),

  on(FinanceActions.loadBudgetForMonth, (state) => ({
    ...state,
    loadingBudget: true,
    error: null,
  })),

  on(FinanceActions.loadBudgetForMonthSuccess, (state, { budget }) => ({
    ...state,
    loadingBudget: false,
    currentBudget: budget,
  })),

  on(FinanceActions.loadBudgetForMonthFailure, (state, { error }) => ({
    ...state,
    loadingBudget: false,
    error,
  })),

  on(FinanceActions.saveBudgetForMonth, (state) => ({
    ...state,
    savingBudget: true,
    error: null,
  })),

  on(FinanceActions.saveBudgetForMonthSuccess, (state, { budget }) => ({
    ...state,
    savingBudget: false,
    showBudgetSettings: false,
    currentBudget: budget,
  })),

  on(FinanceActions.saveBudgetForMonthFailure, (state, { error }) => ({
    ...state,
    savingBudget: false,
    error,
  })),

  on(FinanceActions.copyBudgetFromPrevMonth, (state) => ({
    ...state, // handled purely in effects, no state change needed here
  })),

  /* ── SMS Analyzer ── */
  on(FinanceActions.setSmsRawText, (state, { text }) => ({
    ...state,
    smsRawText: text,
  })),

  on(FinanceActions.analyzeSmsSuccess, (state, { transactions }) => ({
    ...state,
    parsedTransactions: transactions,
  })),

  on(FinanceActions.clearSmsResults, (state) => ({
    ...state,
    smsRawText: '',
    parsedTransactions: [],
  })),

  on(FinanceActions.toggleSmsSelection, (state, { id }) => ({
    ...state,
    parsedTransactions: state.parsedTransactions.map((t) =>
      t.id === id ? { ...t, selected: !t.selected } : t
    ),
  })),

  on(FinanceActions.toggleAllSmsSelection, (state, { selected }) => ({
    ...state,
    parsedTransactions: state.parsedTransactions.map((t) => ({ ...t, selected })),
  })),

  on(FinanceActions.updateSmsCategory, (state, { id, category }) => ({
    ...state,
    parsedTransactions: state.parsedTransactions.map((t) =>
      t.id === id ? { ...t, category } : t
    ),
  })),

  on(FinanceActions.importSelectedSms, (state) => ({
    ...state,
    smsImporting: true,
  })),

  on(FinanceActions.addExpensesBulkSuccess, (state) => ({
    ...state,
    smsImporting: false,
    parsedTransactions: state.parsedTransactions.filter((t) => !t.selected),
  })),

  on(FinanceActions.addExpensesBulkFailure, (state, { error }) => ({
    ...state,
    smsImporting: false,
    error,
  })),
  /* ── Debts ── */
  on(FinanceActions.loadDebts, (state) => ({
    ...state, loadingDebts: true, error: null,
  })),
  on(FinanceActions.loadDebtsSuccess, (state, { debts }) => ({
    ...state, loadingDebts: false, debts,
  })),
  on(FinanceActions.loadDebtsFailure, (state, { error }) => ({
    ...state, loadingDebts: false, error,
  })),

  on(FinanceActions.addDebt, (state) => ({ ...state, savingDebt: true })),
  on(FinanceActions.addDebtSuccess, (state, { debt }) => ({
    ...state, savingDebt: false, showAddDebtForm: false,
    debts: [debt, ...state.debts],
  })),
  on(FinanceActions.addDebtFailure, (state, { error }) => ({
    ...state, savingDebt: false, error,
  })),

  on(FinanceActions.updateDebt, (state) => ({ ...state, savingDebt: true })),
  on(FinanceActions.updateDebtSuccess, (state, { debt }) => ({
    ...state, savingDebt: false, showEditDebtForm: false, editingDebt: null,
    debts: state.debts.map((d) => d._id === debt._id ? debt : d),
  })),
  on(FinanceActions.updateDebtFailure, (state, { error }) => ({
    ...state, savingDebt: false, error,
  })),

  on(FinanceActions.deleteDebtSuccess, (state, { id }) => ({
    ...state, debts: state.debts.filter((d) => d._id !== id),
  })),

  on(FinanceActions.markDebtSettledSuccess, (state, { debt }) => ({
    ...state, debts: state.debts.map((d) => d._id === debt._id ? debt : d),
  })),

  on(FinanceActions.recordPartialPaymentSuccess, (state, { debt }) => ({
    ...state, debts: state.debts.map((d) => d._id === debt._id ? debt : d),
  })),

  on(FinanceActions.openAddDebtForm, (state) => ({ ...state, showAddDebtForm: true })),
  on(FinanceActions.closeAddDebtForm, (state) => ({ ...state, showAddDebtForm: false })),
  on(FinanceActions.openEditDebtForm, (state, { debt }) => ({
    ...state, showEditDebtForm: true, editingDebt: debt,
  })),
  on(FinanceActions.closeEditDebtForm, (state) => ({
    ...state, showEditDebtForm: false, editingDebt: null,
  })),

  on(FinanceActions.setDebtFilter, (state, { filter }) => ({
    ...state, debtFilter: filter,
  })),

  /* ── Payload Type ── */
  on(FinanceActions.setFinancePayloadType, (state, { payloadType }) => ({
    ...state, payloadType,
  })),
);