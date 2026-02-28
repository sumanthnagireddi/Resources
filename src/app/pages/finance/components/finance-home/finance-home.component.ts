import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import {
  selectFilteredDebts,
  selectDebtSummary,
  selectDebtFilter,
  selectShowAddDebt,
  selectShowEditDebt,
  selectDebtSaving,
  selectDebtLoading,
  selectEditingDebt,
} from '../../../../store/selectors/finance.selector';
import * as DebtActions from '../../../../store/actions/finance.action';
import { NgClass, DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-finance-home',
  imports: [FormsModule, NgClass, DatePipe, NgTemplateOutlet],
  templateUrl: './finance-home.component.html',
  styleUrl: './finance-home.component.css'
})
export class FinanceHomeComponent {
 private store = inject(Store);

  // Signals from store
  filteredDebts = toSignal(this.store.select(selectFilteredDebts), {
    initialValue: [],
  });
  summary = toSignal(this.store.select(selectDebtSummary), {
    initialValue: { totalOwedToMe: 0, totalIOwe: 0, netBalance: 0 },
  });
  filter = toSignal(this.store.select(selectDebtFilter), {
    initialValue: 'all' as const,
  });
  showAdd = toSignal(this.store.select(selectShowAddDebt), {
    initialValue: false,
  });
  showEdit = toSignal(this.store.select(selectShowEditDebt), {
    initialValue: false,
  });
  saving = toSignal(this.store.select(selectDebtSaving), {
    initialValue: false,
  });
  loading = toSignal(this.store.select(selectDebtLoading), {
    initialValue: false,
  });

  partialAmounts: Record<string, number> = {};

  filters = [
    { key: 'all' as const, label: 'Active' },
    { key: 'owed_to_me' as const, label: 'Owed to Me' },
    { key: 'i_owe' as const, label: 'I Owe' },
    { key: 'settled' as const, label: 'Settled' },
  ];

  newDebt = {
    name: '',
    amount: 0,
    debtType: 'owed_to_me',
    description: '',
    dueDate: '',
  };

  editDebt = {
    name: '',
    amount: 0,
    debtType: 'owed_to_me',
    description: '',
    dueDate: '',
  };

  ngOnInit(): void {
    this.store.dispatch(DebtActions.loadDebts());

    // Sync edit form when store sets editingDebt
    this.store.select(selectEditingDebt).subscribe((debt) => {
      if (debt) {
        this.editDebt = {
          name: debt.name,
          amount: debt.amount,
          debtType: debt.debtType,
          description: debt.description ?? '',
          dueDate: debt.dueDate ?? '',
        };
      }
    });
  }

  setFilter(f: 'all' | 'owed_to_me' | 'i_owe' | 'settled'): void {
    this.store.dispatch(DebtActions.setDebtFilter({ filter: f }));
  }

  openAdd(): void {
    this.newDebt = {
      name: '',
      amount: 0,
      debtType: 'owed_to_me',
      description: '',
      dueDate: '',
    };
    this.store.dispatch(DebtActions.openAddDebtForm());
  }

  closeAdd(): void {
    this.store.dispatch(DebtActions.closeAddDebtForm());
  }

  submitAdd(): void {
    if (!this.newDebt.name.trim() || this.newDebt.amount <= 0) return;
    this.store.dispatch(DebtActions.addDebt({ debt: { ...this.newDebt } }));
  }

  openEdit(debt: any): void {
    this.store.dispatch(DebtActions.openEditDebtForm({ debt }));
  }

  closeEdit(): void {
    this.store.dispatch(DebtActions.closeEditDebtForm());
  }

  submitEdit(): void {
    if (!this.editDebt.name.trim() || this.editDebt.amount <= 0) return;
    const editing = this.store.select(selectEditingDebt);
    editing
      .pipe()
      .subscribe((debt) => {
        if (!debt) return;
        this.store.dispatch(
          DebtActions.updateDebt({
            id: debt._id,
            changes: { ...this.editDebt },
          }),
        );
      })
      .unsubscribe();
  }

  markSettled(id: string): void {
    this.store.dispatch(DebtActions.markDebtSettled({ id }));
  }

  recordPartial(id: string): void {
    const amount = this.partialAmounts[id];
    if (!amount || amount <= 0) return;
    this.store.dispatch(DebtActions.recordPartialPayment({ id, amount }));
    this.partialAmounts[id] = 0;
  }

  delete(id: string): void {
    this.store.dispatch(DebtActions.deleteDebt({ id }));
  }

  getRemainingAmount(debt: any): number {
    return debt.amount - (debt.paidAmount ?? 0);
  }

  getProgressPercent(debt: any): number {
    return debt.amount > 0
      ? Math.round((debt.paidAmount / debt.amount) * 100)
      : 0;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

