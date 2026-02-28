// finance.effects.ts
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { FinanceService } from '../../services/finance.service';
import * as FinanceActions from '../actions/finance.action';
import {
  selectCurrentMonthKey,
  selectParsedTransactions,
  selectPayloadType,
  selectSelectedMonth,
} from '../selectors/finance.selector';

@Injectable()
export class FinanceEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private financeService = inject(FinanceService);

  /* ── Reload expenses when month changes ── */
  reloadOnMonthChange$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        FinanceActions.navigatePrevMonth,
        FinanceActions.navigateNextMonth,
        FinanceActions.setSelectedMonth,
      ),
      withLatestFrom(this.store.select(selectSelectedMonth)),
      map(([, date]) =>
        FinanceActions.loadMonthExpenses({
          year: date.getFullYear(),
          month: date.getMonth() + 1,
        }),
      ),
    ),
  );

  /* ── Load expenses for month ── */
  loadMonthExpenses$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.loadMonthExpenses),
      withLatestFrom(this.store.select(selectPayloadType)),
      switchMap(([{ year, month }, payloadType]) =>
        this.financeService.getExpensesForMonth(year, month, payloadType).pipe(
          map((expenses) =>
            FinanceActions.loadMonthExpensesSuccess({ expenses }),
          ),
          catchError((error) =>
            of(
              FinanceActions.loadMonthExpensesFailure({ error: error.message }),
            ),
          ),
        ),
      ),
    ),
  );

  /* ── Also load budget when month changes ── */
  loadBudgetOnMonthChange$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        FinanceActions.navigatePrevMonth,
        FinanceActions.navigateNextMonth,
        FinanceActions.setSelectedMonth,
      ),
      withLatestFrom(this.store.select(selectCurrentMonthKey)),
      map(([, monthKey]) => FinanceActions.loadBudgetForMonth({ monthKey })),
    ),
  );

  /* ── Load budget for month ── */
  loadBudget$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.loadBudgetForMonth),
      withLatestFrom(this.store.select(selectPayloadType)),
      switchMap(([{ monthKey }, payloadType]) =>
        this.financeService.getBudgetForMonth(monthKey, payloadType === 'construction' ? 'home_budget' : 'budget').pipe(
          map((budget) => FinanceActions.loadBudgetForMonthSuccess({ budget })),
          catchError((error) =>
            of(
              FinanceActions.loadBudgetForMonthFailure({
                error: error.message,
              }),
            ),
          ),
        ),
      ),
    ),
  );

  /* ── Open budget settings: load current month budget ── */
  openBudgetSettings$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.openBudgetSettings),
      withLatestFrom(this.store.select(selectCurrentMonthKey)),
      map(([, monthKey]) => FinanceActions.loadBudgetForMonth({ monthKey })),
    ),
  );

  /* ── Copy budget from previous month ── */
  copyBudgetFromPrevMonth$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.copyBudgetFromPrevMonth),
      withLatestFrom(this.store.select(selectPayloadType)),
      switchMap(([{ prevMonthKey }, payloadType]) =>
        this.financeService.getBudgetForMonth(prevMonthKey, payloadType).pipe(
          map((budget) => FinanceActions.loadBudgetForMonthSuccess({ budget })),
          catchError((error) =>
            of(
              FinanceActions.loadBudgetForMonthFailure({
                error: error.message,
              }),
            ),
          ),
        ),
      ),
    ),
  );

  /* ── Save budget ── */
  saveBudget$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.saveBudgetForMonth),
      withLatestFrom(this.store.select(selectPayloadType)),
      switchMap(([{ monthKey, budget }, payloadType]) =>
        this.financeService.saveBudgetForMonth(monthKey, budget, payloadType === 'construction' ? 'home_budget' : 'budget').pipe(
          map((saved) =>
            FinanceActions.saveBudgetForMonthSuccess({
              monthKey,
              budget: saved,
            }),
          ),
          catchError((error) =>
            of(
              FinanceActions.saveBudgetForMonthFailure({
                error: error.message,
              }),
            ),
          ),
        ),
      ),
    ),
  );

  /* ── Add expense ── */
  addExpense$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.addExpense),
      withLatestFrom(this.store.select(selectPayloadType)),
      switchMap(([{ expense }, payloadType]) =>
        this.financeService.addExpense(expense, payloadType).pipe(
          map((saved) => FinanceActions.addExpenseSuccess({ expense: saved })),
          catchError((error) =>
            of(FinanceActions.addExpenseFailure({ error: error.message })),
          ),
        ),
      ),
    ),
  );

  /* ── Update expense ── */
  updateExpense$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.updateExpense),
      withLatestFrom(this.store.select(selectPayloadType)),
      switchMap(([{ id, changes }, payloadType]) => {
        console.log('updateExpense effect - id:', id, 'changes:', changes); // debug
        return this.financeService.updateExpense(id, changes, payloadType).pipe(
          map((updated) =>
            FinanceActions.updateExpenseSuccess({ expense: updated }),
          ),
          catchError((error) =>
            of(FinanceActions.updateExpenseFailure({ error: error.message })),
          ),
        );
      }),
    ),
  );

  reloadExpensesOnUpdate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        FinanceActions.addExpenseSuccess,
        FinanceActions.updateExpenseSuccess,
        FinanceActions.deleteExpenseSuccess,
        FinanceActions.addExpensesBulkSuccess,
      ),
      withLatestFrom(this.store.select(selectSelectedMonth)),
      map(([, date]) =>
        FinanceActions.loadMonthExpenses({
          year: date.getFullYear(),
          month: date.getMonth() + 1,
        })
      ),
    )
  );
  reloadExpensesandBudgetOnFinancePayloadTypeChange$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.setFinancePayloadType),
      withLatestFrom(this.store.select(selectSelectedMonth)),
      switchMap(([, date]) => {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        return of(
          FinanceActions.loadMonthExpenses({ year, month }),
          FinanceActions.loadBudgetForMonth({ monthKey }),
        );
      }),
    )
  );
  reloadBudgetOnUpdate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.saveBudgetForMonthSuccess),
      withLatestFrom(this.store.select(selectSelectedMonth)),
      map(([, date]) => {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        return FinanceActions.loadBudgetForMonth({
          monthKey: `${year}-${String(month).padStart(2, '0')}`,
        });
      }),
    )
  );
  /* ── Delete expense ── */
  deleteExpense$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.deleteExpense),
      withLatestFrom(this.store.select(selectPayloadType)),
      switchMap(([{ id }, payloadType]) =>
        this.financeService.deleteExpense(id, payloadType).pipe(
          map(() => FinanceActions.deleteExpenseSuccess({ id })),
          catchError((error) =>
            of(FinanceActions.deleteExpenseFailure({ error: error.message })),
          ),
        ),
      ),
    ),
  );

  /* ── Analyze SMS (synchronous via service, no HTTP) ── */
  analyzeSms$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.analyzeSms),
      withLatestFrom(this.store.select((s: any) => s.finance.smsRawText)),
      map(([, rawText]) => {
        const transactions = this.financeService.parseSmsMessages(rawText);
        return FinanceActions.analyzeSmsSuccess({ transactions });
      }),
    ),
  );

  /* ── Import selected SMS transactions ── */
  importSelectedSms$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.importSelectedSms),
      withLatestFrom(this.store.select(selectParsedTransactions)),
      withLatestFrom(this.store.select(selectPayloadType)),
      switchMap(([[, transactions], payloadType]) => {
        const selected = transactions.filter((t: any) => t.selected);
        const expenses = selected.map((t: any) => ({
          title: t.merchant,
          amount: t.amount,
          category: t.category,
          date: t.date,
          notes: `SMS: ${t.rawText.substring(0, 100)}`,
          source: 'sms' as const,
        }));
        return this.financeService.addExpenses(expenses, payloadType).pipe(
          map(() => FinanceActions.addExpensesBulkSuccess()),
          catchError((error) =>
            of(FinanceActions.addExpensesBulkFailure({ error: error.message })),
          ),
        );
      }),
    ),
  );

  /* ── Reload month data after bulk import ── */
  reloadAfterBulkImport$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.addExpensesBulkSuccess),
      withLatestFrom(this.store.select(selectSelectedMonth)),
      map(([, date]) =>
        FinanceActions.loadMonthExpenses({
          year: date.getFullYear(),
          month: date.getMonth() + 1,
        }),
      ),
    ),
  );
  loadDebts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.loadDebts),
      switchMap(() =>
        this.financeService.getAllDebts().pipe(
          map((debts) => FinanceActions.loadDebtsSuccess({ debts })),
          catchError((error) => of(FinanceActions.loadDebtsFailure({ error: error.message })))
        )
      )
    )
  );

  addDebt$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.addDebt),
      switchMap(({ debt }) =>
        this.financeService.createDebt(debt).pipe(
          map((saved) => FinanceActions.addDebtSuccess({ debt: saved })),
          catchError((error) => of(FinanceActions.addDebtFailure({ error: error.message })))
        )
      )
    )
  );

  updateDebt$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.updateDebt),
      switchMap(({ id, changes }) =>
        this.financeService.updateDebt(id, changes).pipe(
          map((debt) => FinanceActions.updateDebtSuccess({ debt })),
          catchError((error) => of(FinanceActions.updateDebtFailure({ error: error.message })))
        )
      )
    )
  );

  deleteDebt$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.deleteDebt),
      switchMap(({ id }) =>
        this.financeService.deleteDebt(id).pipe(
          map(() => FinanceActions.deleteDebtSuccess({ id })),
          catchError((error) => of(FinanceActions.deleteDebtFailure({ error: error.message })))
        )
      )
    )
  );

  markSettled$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.markDebtSettled),
      switchMap(({ id }) =>
        this.financeService.markDebtSettled(id).pipe(
          map((debt) => FinanceActions.markDebtSettledSuccess({ debt })),
          catchError((error) => of(FinanceActions.markDebtSettledFailure({ error: error.message })))
        )
      )
    )
  );

  recordPartial$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FinanceActions.recordPartialPayment),
      switchMap(({ id, amount }) =>
        this.financeService.recordPartialPayment(id, amount).pipe(
          map((debt) => FinanceActions.recordPartialPaymentSuccess({ debt })),
          catchError((error) => of(FinanceActions.recordPartialPaymentFailure({ error: error.message })))
        )
      )
    )
  );

}
