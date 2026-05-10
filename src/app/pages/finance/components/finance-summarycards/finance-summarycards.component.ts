// finance-summarycards.component.ts
import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { NgClass } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  selectTotalSpent,
  selectMonthlyBudget,
  selectRemaining,
  selectCurrentMonthExpenses,
} from '../../../../store/selectors/finance.selector';

@Component({
  selector: 'app-finance-summarycards',
  standalone: true,
  imports: [NgClass],
  templateUrl: './finance-summarycards.component.html',
})
export class FinanceSummarycardsComponent {
  private store = inject(Store);

  totalSpent  = toSignal(this.store.select(selectTotalSpent),              { initialValue: 0 });
  budget      = toSignal(this.store.select(selectMonthlyBudget),           { initialValue: 0 });
  remaining   = toSignal(this.store.select(selectRemaining),               { initialValue: 0 });
  expenses    = toSignal(this.store.select(selectCurrentMonthExpenses),    { initialValue: [] });

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR',
      minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(amount);
  }
}
