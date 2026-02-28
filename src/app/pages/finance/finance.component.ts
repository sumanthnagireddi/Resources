import { Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { AsyncPipe } from '@angular/common';
import * as FinanceActions from '../../store/actions/finance.action';
import {
  selectActiveTab,
  selectSelectedMonth,
} from '../../store/selectors/finance.selector';

import { FinanceHeaderComponent } from './components/finance-header/finance-header.component';
import { FinanceMonthNavComponent } from './components/finance-month-nav/finance-month-nav.component';
import { FinanceBudgetAlertComponent } from './components/finance-budget-alert/finance-budget-alert.component';
import { FinanceSummarycardsComponent } from './components/finance-summarycards/finance-summarycards.component';
import { FinanceProgressBarComponent } from './components/finance-progress-bar/finance-progress-bar.component';
import { FinanceOverviewComponent } from './components/finance-overview/finance-overview.component';
import { FinanceTransactionsComponent } from './components/finance-transactions/finance-transactions.component';
import { FinanceCategoriesComponent } from './components/finance-categories/finance-categories.component';
import { FinanceExpenseModalsComponent } from './components/finance-expense-modals/finance-expense-modals.component';
import { TabsComponent } from '../../component/tabs/tabs.component';
import { distinctUntilChanged, skip } from 'rxjs';
import { FinanceCardsComponent } from './components/finance-cards/finance-cards.component';
import { FinanceDebtsComponent } from './components/finance-debts/finance-debts.component';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [
    AsyncPipe,
    FinanceHeaderComponent,
    FinanceMonthNavComponent,
    FinanceBudgetAlertComponent,
    FinanceSummarycardsComponent,
    FinanceProgressBarComponent,
    FinanceOverviewComponent,
    FinanceTransactionsComponent,
    FinanceCategoriesComponent,
    FinanceExpenseModalsComponent,
    TabsComponent,
    FinanceCardsComponent,
    FinanceDebtsComponent
  ],
  templateUrl: './finance.component.html',
  styleUrl: './finance.component.css',
})
export class FinanceComponent implements OnInit {
  private store = inject(Store);

  activeTab$ = this.store.select(selectActiveTab);

  tabNames = [
    { name: 'Overview', icon: 'chart-bar' },
    { name: 'Transactions', icon: 'list' },
    { name: 'Categories', icon: 'tag' },
    { name: 'Cards', icon: 'card' },
    { name: 'Debts', icon: 'hand-holding-dollar' },
      { name: 'Home', icon: 'home' },
  ];

  ngOnInit(): void {
    // Load once on init
    this.dispatchForMonth(new Date());

    // Then only reload when month actually changes via navigation
    this.store
      .select(selectSelectedMonth)
      .pipe(
        distinctUntilChanged(
          (a, b) =>
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth(),
        ),
        skip(1), // skip the initial emission — already handled above
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
  handleTabChange(tabName: any): void {
    this.store.dispatch(
      FinanceActions.setActiveTab({
        tab: tabName.toLowerCase() as
          | 'overview'
          | 'transactions'
          | 'categories'
          | 'cards'
          | 'debts'
          | 'home',
      }),
    );
  }
}
