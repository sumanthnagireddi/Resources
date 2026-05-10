// finance-month-nav.component.ts
import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AsyncPipe, DatePipe } from '@angular/common';
import * as FinanceActions from '../../../../store/actions/finance.action';

import { selectSelectedMonth } from '../../../../store/selectors/finance.selector';

@Component({
  selector: 'app-finance-month-nav',
  standalone: true,
  host: {
    class: 'block w-full sm:w-auto',
  },
  imports: [DatePipe, AsyncPipe],
  templateUrl: './finance-month-nav.component.html',
})
export class FinanceMonthNavComponent {
  private store = inject(Store);

  selectedMonth$ = this.store.select(selectSelectedMonth);

  navigatePrev(): void {
    this.store.dispatch(FinanceActions.navigatePrevMonth());
  }

  navigateNext(): void {
    this.store.dispatch(FinanceActions.navigateNextMonth());
  }
}
