// finance-header.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { FormsModule } from '@angular/forms';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { FinancePayloadType } from '../../../../model/finance.model';
import {
  selectMonthLabel,
  selectShowBudgetSettings,
  selectShowAddForm,
  selectCurrentBudget,
  selectSavingBudget,
  selectSelectedMonth,
  selectCurrentMonthKey,
  selectPayloadType,
} from '../../../../store/selectors/finance.selector';
import * as FinanceActions from '../../../../store/actions/finance.action';


@Component({
  selector: 'app-finance-header',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './finance-header.component.html',
  styleUrl: './finance-header.component.css',
})
export class FinanceHeaderComponent implements OnInit {
  private store = inject(Store);

  // ── Selectors → template observables ──
  monthLabel$ = this.store.select(selectMonthLabel);
  showBudgetSettings$ = this.store.select(selectShowBudgetSettings);
  showAddForm$ = this.store.select(selectShowAddForm);
  currentBudget$ = this.store.select(selectCurrentBudget);
  savingBudget$ = this.store.select(selectSavingBudget);
  payloadType$ = this.store.select(selectPayloadType);

  payloadOptions = [
    { value: 'expense' as const, label: 'Normal', icon: 'account_balance_wallet' },
    { value: 'construction' as const, label: 'Construction', icon: 'engineering' },
  ];
  // Local form model — only lives here, not in store
  // (budget values are pre-filled from store when modal opens)
  budgetForm = {
    monthlyBudget: 0,
    alertThreshold: 80,
  };

  ngOnInit(): void {
    // Sync budgetForm whenever the store's currentBudget changes
    // (e.g. after loadBudgetForMonthSuccess fires on modal open)
    this.currentBudget$.subscribe((budget) => {
      if (budget) {
        this.budgetForm.monthlyBudget = budget.monthlyBudget;
        this.budgetForm.alertThreshold = budget.alertThreshold;
      }
    });
  }

  // ── Actions ──

  switchPayloadType(type: FinancePayloadType): void {
    this.store.dispatch(FinanceActions.setFinancePayloadType({ payloadType: type }));
  }

  openBudgetSettings(): void {
    // Effect will call loadBudgetForMonth → success will update
    // currentBudget$ → ngOnInit subscription syncs budgetForm
    this.store.dispatch(FinanceActions.openBudgetSettings());
  }

  closeBudgetSettings(): void {
    this.store.dispatch(FinanceActions.closeBudgetSettings());
  }

  openAddForm(): void {
    this.store.dispatch(FinanceActions.openAddExpenseForm());
  }

  closeAddForm(): void {
    this.store.dispatch(FinanceActions.closeAddExpenseForm());
  }

  copyBudgetFromPrevMonth(): void {
    this.store
      .select(selectSelectedMonth)
      .pipe(take(1))
      .subscribe((date) => {
        const prev = new Date(date);
        prev.setMonth(prev.getMonth() - 1);
        const prevMonthKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

        this.store
          .select(selectCurrentMonthKey)
          .pipe(take(1))
          .subscribe((currentMonthKey) => {
            this.store.dispatch(
              FinanceActions.copyBudgetFromPrevMonth({
                currentMonthKey,
                prevMonthKey,
              })
            );
          });
      });
  }

  saveBudget(): void {
    this.store
      .select(selectCurrentMonthKey)
      .pipe(take(1))
      .subscribe((monthKey) => {
        this.store.dispatch(
          FinanceActions.saveBudgetForMonth({
            monthKey,
            budget: {
              monthlyBudget: this.budgetForm.monthlyBudget,
              alertThreshold: this.budgetForm.alertThreshold,
            },
          })
        );
      });
  }
}