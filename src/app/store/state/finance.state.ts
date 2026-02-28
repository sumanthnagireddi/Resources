import { BudgetSettings, Expense, ExpenseCategory, FinancePayloadType, ParsedSmsTransaction } from '../../model/finance.model';

export interface FinanceState {
  // Data
  allExpenses: Expense[];
  currentMonthExpenses: Expense[];
  currentBudget: BudgetSettings | null;

  // Month navigation
  selectedMonth: string;

  // Tab
  activeTab: 'overview' | 'transactions' | 'categories' | 'cards' | 'debts' | 'home';

  // UI modal flags
  showAddForm: boolean;
  showEditForm: boolean;
  showBudgetSettings: boolean;
  editingExpense: Expense | null;
  deleteConfirmId: string | null;

  // SMS
  smsRawText: string;
  parsedTransactions: ParsedSmsTransaction[];
  smsImporting: boolean;

  // Loading / Error
  loadingExpenses: boolean;
  loadingBudget: boolean;
  savingBudget: boolean;
  savingExpense: boolean;
  error: string | null;

  // ── DEBTS (added) ──────────────────────────
  debts: any[];
  loadingDebts: boolean;
  savingDebt: boolean;
  showAddDebtForm: boolean;
  showEditDebtForm: boolean;
  editingDebt: any | null;
  debtFilter: 'all' | 'owed_to_me' | 'i_owe' | 'settled';

  // Payload type toggle
  payloadType: FinancePayloadType;
}

export const initialFinanceState: FinanceState = {
  allExpenses: [],
  currentMonthExpenses: [],
  currentBudget: null,

  selectedMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),

  activeTab: 'overview',

  showAddForm: false,
  showEditForm: false,
  showBudgetSettings: false,
  editingExpense: null,
  deleteConfirmId: null,

  smsRawText: '',
  parsedTransactions: [],
  smsImporting: false,

  loadingExpenses: false,
  loadingBudget: false,
  savingBudget: false,
  savingExpense: false,
  error: null,

  // ── DEBTS initial values ───────────────────
  debts: [],
  loadingDebts: false,
  savingDebt: false,
  showAddDebtForm: false,
  showEditDebtForm: false,
  editingDebt: null,
  debtFilter: 'all',

  // Payload type
  payloadType: 'expense',
};