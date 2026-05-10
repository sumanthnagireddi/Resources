import { Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs/operators';

import { FinancePayloadType } from '../../../../model/finance.model';
import {
  selectCurrentBudget,
  selectCurrentMonthKey,
  selectMonthLabel,
  selectPayloadType,
  selectSavingBudget,
  selectSelectedMonth,
  selectShowAddForm,
  selectShowBudgetSettings,
} from '../../../../store/selectors/finance.selector';
import * as FinanceActions from '../../../../store/actions/finance.action';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-finance-header',
  standalone: true,
  host: {
    class: 'block',
  },
  imports: [FormsModule, CommonModule],
  templateUrl: './finance-header.component.html',
})
export class FinanceHeaderComponent implements OnInit {
  private readonly store = inject(Store);
  readonly authService = inject(AuthService);

  monthLabel$ = this.store.select(selectMonthLabel);
  showBudgetSettings$ = this.store.select(selectShowBudgetSettings);
  showAddForm$ = this.store.select(selectShowAddForm);
  currentBudget$ = this.store.select(selectCurrentBudget);
  savingBudget$ = this.store.select(selectSavingBudget);
  payloadType$ = this.store.select(selectPayloadType);

  payloadOptions = [
    {
      value: 'expense' as const,
      label: 'Spend mode',
      shortLabel: 'Spend',
      icon: 'credit_card',
    },
    {
      value: 'construction' as const,
      label: 'Build mode',
      shortLabel: 'Build',
      icon: 'engineering',
    },
  ];

  budgetForm = {
    monthlyBudget: 0,
    alertThreshold: 80,
  };

  ngOnInit(): void {
    this.currentBudget$.subscribe((budget) => {
      if (budget) {
        this.budgetForm.monthlyBudget = budget.monthlyBudget;
        this.budgetForm.alertThreshold = budget.alertThreshold;
      }
    });
  }

  switchPayloadType(type: FinancePayloadType): void {
    this.store.dispatch(FinanceActions.setFinancePayloadType({ payloadType: type }));
  }

  openBudgetSettings(): void {
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
        const previousMonth = new Date(date);
        previousMonth.setMonth(previousMonth.getMonth() - 1);
        const prevMonthKey = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;

        this.store
          .select(selectCurrentMonthKey)
          .pipe(take(1))
          .subscribe((currentMonthKey) => {
            this.store.dispatch(
              FinanceActions.copyBudgetFromPrevMonth({
                currentMonthKey,
                prevMonthKey,
              }),
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
          }),
        );
      });
  }
}
