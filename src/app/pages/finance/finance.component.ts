import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { distinctUntilChanged, skip } from 'rxjs';

import * as FinanceActions from '../../store/actions/finance.action';
import {
  CategoryConfig,
  ExpenseCategory,
  EXPENSE_CATEGORIES,
} from '../../model/finance.model';
import {
  selectActiveTab,
  selectCategoryBreakdown,
  selectCurrentBudget,
  selectCurrentMonthExpenses,
  selectIsNearAlert,
  selectIsOverBudget,
  selectMonthLabel,
  selectMonthlyBudget,
  selectPayloadType,
  selectPercentUsed,
  selectRemaining,
  selectSelectedMonth,
  selectTotalSpent,
} from '../../store/selectors/finance.selector';
import { AuthService } from '../../services/auth.service';

import { FinanceHeaderComponent } from './components/finance-header/finance-header.component';
import { FinanceMonthNavComponent } from './components/finance-month-nav/finance-month-nav.component';
import { FinanceTransactionsComponent } from './components/finance-transactions/finance-transactions.component';
import { FinanceCategoriesComponent } from './components/finance-categories/finance-categories.component';
import { FinanceExpenseModalsComponent } from './components/finance-expense-modals/finance-expense-modals.component';
import { FinanceDebtsComponent } from './components/finance-debts/finance-debts.component';

type FinanceTab =
  | 'overview'
  | 'transactions'
  | 'categories'
  | 'cards'
  | 'debts'
  | 'home';

type TransactionSourceFilter = 'all' | 'manual' | 'sms';

type FinanceExpenseRow = ReturnType<
  typeof selectCurrentMonthExpenses['projector']
>[number];

interface FinanceNavItem {
  id: string;
  label: string;
  tab?: FinanceTab;
  action?: 'budget';
}

interface RingSegment {
  label: string;
  amount: number;
  percentage: number;
  color: string;
  radius: number;
  dashArray: string;
  dashOffset: number;
}

@Component({
  selector: 'app-finance',
  standalone: true,
  host: {
    class: 'block',
  },
  imports: [
    CommonModule,
    TitleCasePipe,
    FinanceHeaderComponent,
    FinanceMonthNavComponent,
    FinanceTransactionsComponent,
    FinanceCategoriesComponent,
    FinanceExpenseModalsComponent,
    FinanceDebtsComponent,
  ],
  templateUrl: './finance.component.html',
})
export class FinanceComponent implements OnInit {
  private readonly store = inject(Store);
  readonly authService = inject(AuthService);

  readonly activeTab = toSignal(this.store.select(selectActiveTab), {
    initialValue: 'overview' as FinanceTab,
  });
  readonly selectedMonth = toSignal(this.store.select(selectSelectedMonth), {
    initialValue: new Date(),
  });
  readonly monthLabel = toSignal(this.store.select(selectMonthLabel), {
    initialValue: '',
  });
  readonly currentBudget = toSignal(this.store.select(selectCurrentBudget), {
    initialValue: null,
  });
  readonly monthlyBudget = toSignal(this.store.select(selectMonthlyBudget), {
    initialValue: 0,
  });
  readonly totalSpent = toSignal(this.store.select(selectTotalSpent), {
    initialValue: 0,
  });
  readonly remaining = toSignal(this.store.select(selectRemaining), {
    initialValue: 0,
  });
  readonly percentUsed = toSignal(this.store.select(selectPercentUsed), {
    initialValue: 0,
  });
  readonly categoryBreakdown = toSignal(
    this.store.select(selectCategoryBreakdown),
    { initialValue: [] },
  );
  readonly expenses = toSignal(this.store.select(selectCurrentMonthExpenses), {
    initialValue: [] as FinanceExpenseRow[],
  });
  readonly payloadType = toSignal(this.store.select(selectPayloadType), {
    initialValue: 'expense' as const,
  });
  readonly isOverBudget = toSignal(this.store.select(selectIsOverBudget), {
    initialValue: false,
  });
  readonly isNearAlert = toSignal(this.store.select(selectIsNearAlert), {
    initialValue: false,
  });

  readonly transactionSearch = signal('');
  readonly transactionSourceFilter = signal<TransactionSourceFilter>('all');
  readonly copiedBalance = signal(false);

  readonly overviewNavItems: FinanceNavItem[] = [
    { id: 'overview', label: 'Overview', tab: 'overview' },
    { id: 'analytics', label: 'Analytics', tab: 'categories' },
    { id: 'transactions', label: 'Transaction', tab: 'transactions' },
    { id: 'settings', label: 'Settings', action: 'budget' },
    { id: 'report', label: 'Report', tab: 'debts' },
  ];

  readonly greeting = computed(() => {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';

    return 'Good evening';
  });

  readonly displayName = computed(
    () => this.authService.user()?.displayName ?? 'Sumanth Nagireddi',
  );

  readonly firstName = computed(() => {
    const [firstName] = this.displayName().split(' ');
    return firstName || 'Sumanth';
  });

  readonly username = computed(
    () => this.authService.user()?.username ?? 'sumanthnagireddi',
  );

  readonly modeLabel = computed(() =>
    this.payloadType() === 'construction'
      ? 'Construction budget mode'
      : 'Personal spending mode',
  );

  readonly balanceStatus = computed(() => {
    if (this.isOverBudget()) {
      return {
        label: 'Over budget',
        tone:
          'inline-flex items-center rounded-full bg-red-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-600',
      };
    }

    if (this.isNearAlert()) {
      return {
        label: 'Needs attention',
        tone:
          'inline-flex items-center rounded-full bg-amber-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700',
      };
    }

    return {
      label: 'On track',
      tone:
        'inline-flex items-center rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700',
    };
  });

  readonly availableBalance = computed(() => {
    const budget = this.monthlyBudget();

    if (budget <= 0) {
      return 0;
    }

    return this.remaining();
  });

  readonly summaryCards = computed(() => {
    const budget = this.monthlyBudget();
    const spend = this.totalSpent();
    const expenses = this.expenses().length;

    return [
      {
        title: 'Monthly budget',
        icon: 'arrow_downward_alt',
        tone: 'income',
        value: budget,
        note:
          budget > 0
            ? `${this.percentUsed()}% allocated for ${this.monthLabel()}`
            : 'Set a budget to unlock your monthly snapshot',
      },
      {
        title: 'Monthly expenses',
        icon: 'arrow_upward_alt',
        tone: 'expense',
        value: spend,
        note:
          expenses > 0
            ? `${expenses} tracked item${expenses === 1 ? '' : 's'} this month`
            : 'No expenses tracked in this month yet',
      },
    ];
  });

  readonly expenseOverviewMetrics = computed(() => {
    const spent = this.totalSpent();
    const selectedDate = this.selectedMonth();
    const daysElapsed =
      selectedDate.getFullYear() === new Date().getFullYear() &&
      selectedDate.getMonth() === new Date().getMonth()
        ? new Date().getDate()
        : new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth() + 1,
            0,
          ).getDate();

    const daily = daysElapsed > 0 ? spent / daysElapsed : spent;
    const weekly = daily * 7;

    return [
      { label: 'Daily', value: daily },
      { label: 'Weekly', value: weekly },
      { label: 'Monthly', value: spent },
    ];
  });

  readonly ringSegments = computed<RingSegment[]>(() => {
    const palette = ['#22c55e', '#ef4444', '#f97316', '#22b8f0'];
    const radii = [78, 61, 44, 27];
    const total = this.totalSpent() || 1;

    return this.categoryBreakdown()
      .slice(0, 4)
      .map((item, index) => {
        const radius = radii[index] ?? 27;
        const circumference = 2 * Math.PI * radius;
        const rawRatio = item.total / total;
        const ratio = Math.max(0.18, Math.min(0.92, rawRatio));

        return {
          label: item.config.label,
          amount: item.total,
          percentage: Math.round(rawRatio * 100),
          color: palette[index] ?? '#cbd5e1',
          radius,
          dashArray: `${circumference * ratio} ${circumference}`,
          dashOffset: circumference * 0.08,
        };
      });
  });

  readonly leadingExpenseSegment = computed(() => this.ringSegments()[0] ?? null);

  readonly sortedExpenses = computed(() =>
    [...this.expenses()].sort(
      (left, right) =>
        this.getExpenseTimestamp(right) - this.getExpenseTimestamp(left),
    ),
  );

  readonly overviewTransactions = computed(() => {
    const searchTerm = this.transactionSearch().trim().toLowerCase();
    const sourceFilter = this.transactionSourceFilter();

    return this.sortedExpenses()
      .filter((expense) => {
        if (sourceFilter !== 'all' && expense.source !== sourceFilter) {
          return false;
        }

        if (!searchTerm) {
          return true;
        }

        const category = this.getCategoryConfig(expense.category);
        const haystack = [
          expense.title,
          expense.notes ?? '',
          expense.source ?? '',
          category.label,
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(searchTerm);
      })
      .slice(0, 6);
  });

  readonly chartData = computed(() => {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const focusIndex = this.selectedMonth().getMonth();
    const budget = this.monthlyBudget();
    const spent = this.totalSpent();
    const hasData = budget > 0 || spent > 0;
    const incomeBase = budget > 0 ? budget : spent;
    const expenseBase = spent;
    const incomeSeries = hasData
      ? this.buildTrendSeries(incomeBase, 0.11, 0.62, focusIndex, 1.02)
      : Array.from({ length: 12 }, () => 0);
    const expenseSeries = hasData
      ? this.buildTrendSeries(expenseBase, 0.16, 1.08, focusIndex, 1.08)
      : Array.from({ length: 12 }, () => 0);

    const width = 760;
    const height = 250;
    const top = 16;
    const bottom = 52;
    const left = 20;
    const right = 20;
    const chartHeight = height - top - bottom;
    const step = (width - left - right) / (monthNames.length - 1);
    const maxValue = Math.max(...incomeSeries, ...expenseSeries, 1) * 1.16;
    const yFor = (value: number) =>
      top + chartHeight - (value / maxValue) * chartHeight;

    const monthPoints = monthNames.map((label, index) => ({
      label,
      x: left + step * index,
    }));

    const mapSeriesToPoints = (series: number[]) =>
      series
        .map((value, index) => `${monthPoints[index].x},${yFor(value)}`)
        .join(' ');

    const average = (series: number[]) =>
      series.reduce((sum, value) => sum + value, 0) / series.length;

    return {
      hasData,
      width,
      height,
      baseline: top + chartHeight,
      focusX: monthPoints[focusIndex].x,
      months: monthPoints,
      incomeLine: mapSeriesToPoints(incomeSeries),
      expenseLine: mapSeriesToPoints(expenseSeries),
      incomeMarker: {
        x: monthPoints[focusIndex].x,
        y: yFor(incomeSeries[focusIndex]),
        value: incomeSeries[focusIndex],
      },
      expenseMarker: {
        x: monthPoints[focusIndex].x,
        y: yFor(expenseSeries[focusIndex]),
        value: expenseSeries[focusIndex],
      },
      averageIncome: average(incomeSeries),
      averageExpense: average(expenseSeries),
    };
  });

  ngOnInit(): void {
    this.dispatchForMonth(new Date());

    this.store
      .select(selectSelectedMonth)
      .pipe(
        distinctUntilChanged(
          (left, right) =>
            left.getFullYear() === right.getFullYear() &&
            left.getMonth() === right.getMonth(),
        ),
        skip(1),
      )
      .subscribe((date) => {
        this.dispatchForMonth(date);
      });
  }

  private dispatchForMonth(date: Date): void {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    this.store.dispatch(FinanceActions.loadMonthExpenses({ year, month }));
    this.store.dispatch(FinanceActions.loadBudgetForMonth({ monthKey }));
  }

  private buildTrendSeries(
    baseValue: number,
    variance: number,
    phase: number,
    focusIndex: number,
    emphasis: number,
  ): number[] {
    return Array.from({ length: 12 }, (_, index) => {
      const wave = Math.sin(index * 1.18 + phase) * variance;
      const drift = Math.cos(index * 0.64 + phase) * variance * 0.58;
      const focusBoost = index === focusIndex ? variance * emphasis : 0;
      const value = baseValue * (0.86 + wave + drift + focusBoost);

      return Math.max(baseValue * 0.55, Math.round(value));
    });
  }

  setActiveTab(tab: FinanceTab): void {
    this.store.dispatch(FinanceActions.setActiveTab({ tab }));
  }

  handleNavItemClick(item: FinanceNavItem): void {
    if (item.action === 'budget') {
      this.openBudgetSettings();
      return;
    }

    if (item.tab) {
      this.setActiveTab(item.tab);
    }
  }

  openBudgetSettings(): void {
    this.store.dispatch(FinanceActions.openBudgetSettings());
  }

  openAddForm(): void {
    this.store.dispatch(FinanceActions.openAddExpenseForm());
  }

  openEdit(expense: FinanceExpenseRow): void {
    this.store.dispatch(FinanceActions.openEditExpenseForm({ expense }));
  }

  goToTransactions(): void {
    this.setActiveTab('transactions');
  }

  cycleTransactionFilter(): void {
    const current = this.transactionSourceFilter();

    if (current === 'all') {
      this.transactionSourceFilter.set('manual');
      return;
    }

    if (current === 'manual') {
      this.transactionSourceFilter.set('sms');
      return;
    }

    this.transactionSourceFilter.set('all');
  }

  async copyBalance(): Promise<void> {
    const amount = this.availableBalance();

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.formatCurrency(amount));
      this.copiedBalance.set(true);
      setTimeout(() => this.copiedBalance.set(false), 1600);
    } catch {
      this.copiedBalance.set(false);
    }
  }

  getCategoryConfig(key: ExpenseCategory): CategoryConfig {
    return (
      EXPENSE_CATEGORIES.find((category) => category.key === key) ??
      EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
    );
  }

  getCategoryChipClass(key: ExpenseCategory): string {
    const category = this.getCategoryConfig(key);
    return `${category.color} ${category.textColor}`;
  }

  getSourceFilterLabel(): string {
    const current = this.transactionSourceFilter();

    if (current === 'manual') {
      return 'Manual';
    }

    if (current === 'sms') {
      return 'SMS';
    }

    return 'All';
  }

  getModeGlyph(): string {
    return this.payloadType() === 'construction' ? 'engineering' : 'wallet';
  }

  formatCurrency(amount: number, digits = 2): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  }

  private getExpenseTimestamp(expense: FinanceExpenseRow): number {
    return new Date(expense.createdAt || expense.date).getTime();
  }
}
