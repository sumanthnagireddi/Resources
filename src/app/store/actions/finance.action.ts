import { createAction, props } from '@ngrx/store';
import { BudgetSettings, Expense, ExpenseCategory, FinancePayloadType, ParsedSmsTransaction } from '../../model/finance.model';


/* =========================================================
   MONTH NAVIGATION
   ========================================================= */
export const setSelectedMonth = createAction(
  '[Finance] Set Selected Month',
  props<{ date: string }>() // ISO string
);

export const navigatePrevMonth = createAction('[Finance] Navigate Prev Month');
export const navigateNextMonth = createAction('[Finance] Navigate Next Month');

/* =========================================================
   EXPENSES — LOAD
   ========================================================= */
export const loadExpenses = createAction('[Finance] Load Expenses');

export const loadExpensesSuccess = createAction(
  '[Finance] Load Expenses Success',
  props<{ expenses: Expense[] }>()
);

export const loadExpensesFailure = createAction(
  '[Finance] Load Expenses Failure',
  props<{ error: string }>()
);

/* =========================================================
   EXPENSES — LOAD FOR MONTH
   ========================================================= */
export const loadMonthExpenses = createAction(
  '[Finance] Load Month Expenses',
  props<{ year: number; month: number }>()
);

export const loadMonthExpensesSuccess = createAction(
  '[Finance] Load Month Expenses Success',
  props<{ expenses: Expense[] }>()
);

export const loadMonthExpensesFailure = createAction(
  '[Finance] Load Month Expenses Failure',
  props<{ error: string }>()
);

/* =========================================================
   EXPENSES — ADD
   ========================================================= */
export const openAddExpenseForm = createAction('[Finance] Open Add Expense Form');
export const closeAddExpenseForm = createAction('[Finance] Close Add Expense Form');

export const addExpense = createAction(
  '[Finance] Add Expense',
  props<{
    expense: Omit<Expense, 'id'> & { source: 'manual' | 'sms' };
  }>()
);

export const addExpenseSuccess = createAction(
  '[Finance] Add Expense Success',
  props<{ expense: Expense }>()
);

export const addExpenseFailure = createAction(
  '[Finance] Add Expense Failure',
  props<{ error: string }>()
);

/* =========================================================
   EXPENSES — ADD BULK (SMS import)
   ========================================================= */
export const addExpensesBulk = createAction(
  '[Finance] Add Expenses Bulk',
  props<{ expenses: Array<Omit<Expense, 'id'> & { source: 'sms' }> }>()
);

export const addExpensesBulkSuccess = createAction(
  '[Finance] Add Expenses Bulk Success'
);

export const addExpensesBulkFailure = createAction(
  '[Finance] Add Expenses Bulk Failure',
  props<{ error: string }>()
);

/* =========================================================
   EXPENSES — EDIT
   ========================================================= */
export const openEditExpenseForm = createAction(
  '[Finance] Open Edit Expense Form',
  props<{ expense: Expense }>()
);

export const closeEditExpenseForm = createAction(
  '[Finance] Close Edit Expense Form'
);

export const updateExpense = createAction(
  '[Finance] Update Expense',
  props<{ id: string; changes: Partial<Omit<Expense, 'id'>> }>()
);

export const updateExpenseSuccess = createAction(
  '[Finance] Update Expense Success',
  props<{ expense: Expense }>()
);

export const updateExpenseFailure = createAction(
  '[Finance] Update Expense Failure',
  props<{ error: string }>()
);

/* =========================================================
   EXPENSES — DELETE
   ========================================================= */
export const confirmDeleteExpense = createAction(
  '[Finance] Confirm Delete Expense',
  props<{ id: string }>()
);

export const cancelDeleteExpense = createAction(
  '[Finance] Cancel Delete Expense'
);

export const deleteExpense = createAction(
  '[Finance] Delete Expense',
  props<{ id: string }>()
);

export const deleteExpenseSuccess = createAction(
  '[Finance] Delete Expense Success',
  props<{ id: string }>()
);

export const deleteExpenseFailure = createAction(
  '[Finance] Delete Expense Failure',
  props<{ error: string }>()
);

/* =========================================================
   BUDGET SETTINGS
   ========================================================= */
export const openBudgetSettings = createAction(
  '[Finance] Open Budget Settings'
);

export const closeBudgetSettings = createAction(
  '[Finance] Close Budget Settings'
);

export const loadBudgetForMonth = createAction(
  '[Finance] Load Budget For Month',
  props<{ monthKey: string }>()
);

export const loadBudgetForMonthSuccess = createAction(
  '[Finance] Load Budget For Month Success',
  props<{ budget: BudgetSettings }>()
);

export const loadBudgetForMonthFailure = createAction(
  '[Finance] Load Budget For Month Failure',
  props<{ error: string }>()
);

export const saveBudgetForMonth = createAction(
  '[Finance] Save Budget For Month',
  props<{ monthKey: string; budget: Pick<BudgetSettings, 'monthlyBudget' | 'alertThreshold'> }>()
);

export const saveBudgetForMonthSuccess = createAction(
  '[Finance] Save Budget For Month Success',
  props<{ monthKey: string; budget: BudgetSettings }>()
);

export const saveBudgetForMonthFailure = createAction(
  '[Finance] Save Budget For Month Failure',
  props<{ error: string }>()
);

export const copyBudgetFromPrevMonth = createAction(
  '[Finance] Copy Budget From Prev Month',
  props<{ currentMonthKey: string; prevMonthKey: string }>()
);

/* =========================================================
   TAB NAVIGATION
   ========================================================= */
export const setActiveTab = createAction(
  '[Finance] Set Active Tab',
  props<{ tab: 'overview' | 'transactions' | 'categories' | 'cards' | 'debts' | 'home' }>()
);

/* =========================================================
   SMS ANALYZER
   ========================================================= */
export const setSmsRawText = createAction(
  '[Finance] Set SMS Raw Text',
  props<{ text: string }>()
);

export const analyzeSms = createAction('[Finance] Analyze SMS');

export const analyzeSmsSuccess = createAction(
  '[Finance] Analyze SMS Success',
  props<{ transactions: ParsedSmsTransaction[] }>()
);

export const clearSmsResults = createAction('[Finance] Clear SMS Results');

export const toggleSmsSelection = createAction(
  '[Finance] Toggle SMS Selection',
  props<{ id: string }>()
);

export const toggleAllSmsSelection = createAction(
  '[Finance] Toggle All SMS Selection',
  props<{ selected: boolean }>()
);

export const updateSmsCategory = createAction(
  '[Finance] Update SMS Category',
  props<{ id: string; category: ExpenseCategory }>()
);

export const importSelectedSms = createAction(
  '[Finance] Import Selected SMS'
);

/* =========================================================
   DEBTS
   ========================================================= */
export const loadDebts = createAction('[Finance] Load Debts');
export const loadDebtsSuccess = createAction('[Finance] Load Debts Success', props<{ debts: any[] }>());
export const loadDebtsFailure = createAction('[Finance] Load Debts Failure', props<{ error: string }>());

export const addDebt = createAction('[Finance] Add Debt', props<{ debt: any }>());
export const addDebtSuccess = createAction('[Finance] Add Debt Success', props<{ debt: any }>());
export const addDebtFailure = createAction('[Finance] Add Debt Failure', props<{ error: string }>());

export const updateDebt = createAction('[Finance] Update Debt', props<{ id: string; changes: any }>());
export const updateDebtSuccess = createAction('[Finance] Update Debt Success', props<{ debt: any }>());
export const updateDebtFailure = createAction('[Finance] Update Debt Failure', props<{ error: string }>());

export const deleteDebt = createAction('[Finance] Delete Debt', props<{ id: string }>());
export const deleteDebtSuccess = createAction('[Finance] Delete Debt Success', props<{ id: string }>());
export const deleteDebtFailure = createAction('[Finance] Delete Debt Failure', props<{ error: string }>());

export const markDebtSettled = createAction('[Finance] Mark Debt Settled', props<{ id: string }>());
export const markDebtSettledSuccess = createAction('[Finance] Mark Debt Settled Success', props<{ debt: any }>());
export const markDebtSettledFailure = createAction('[Finance] Mark Debt Settled Failure', props<{ error: string }>());

export const recordPartialPayment = createAction('[Finance] Record Partial Payment', props<{ id: string; amount: number }>());
export const recordPartialPaymentSuccess = createAction('[Finance] Record Partial Payment Success', props<{ debt: any }>());
export const recordPartialPaymentFailure = createAction('[Finance] Record Partial Payment Failure', props<{ error: string }>());

export const openAddDebtForm  = createAction('[Finance] Open Add Debt Form');
export const closeAddDebtForm = createAction('[Finance] Close Add Debt Form');
export const openEditDebtForm = createAction('[Finance] Open Edit Debt Form', props<{ debt: any }>());
export const closeEditDebtForm= createAction('[Finance] Close Edit Debt Form');

export const setDebtFilter = createAction('[Finance] Set Debt Filter', props<{ filter: 'all' | 'owed_to_me' | 'i_owe' | 'settled' }>());

export const setFinancePayloadType = createAction('[Finance] Set Type', props<{ payloadType: FinancePayloadType }>());