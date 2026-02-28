// tabs.component.ts
import { CommonModule } from '@angular/common';
import {
  Component, ElementRef, Input, OnChanges,
  QueryList, ViewChildren, inject, AfterViewInit, OnInit,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { selectActiveTab } from '../../store/selectors/finance.selector';
import * as FinanceActions from '../../store/actions/finance.action';

@Component({
  selector: 'app-tabs',
  imports: [CommonModule],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.css',
})
export class TabsComponent implements AfterViewInit, OnInit {
  private store = inject(Store);

  @Input() tabNames: { name: string; icon: string }[] = [];

  indicatorWidth    = 0;
  indicatorPosition = 0;

  // Read active tab from store
  activeTab = toSignal(this.store.select(selectActiveTab), { initialValue: 'overview' });

  @ViewChildren('tabBtn') tabButtons!: QueryList<ElementRef>;

  ngOnInit(): void {
    // Whenever store tab changes (e.g. from overview "View all" button),
    // update the indicator to match
    this.store.select(selectActiveTab).subscribe((tab) => {
      const index = this.tabNames.findIndex(
        (t) => t.name.toLowerCase().replace(' ', '') === tab
      );
      if (index >= 0) {
        setTimeout(() => this.updateIndicator(index));
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.updateIndicator(0));
  }

  selectTab(tabName: string, index: number): void {
    // Map display name to store tab key
    const tabKey = tabName.toLowerCase().replace(' ', '') as
      'overview' | 'transactions' | 'categories' | 'cards' | 'debts' | 'home';

    this.store.dispatch(FinanceActions.setActiveTab({ tab: tabKey }));
    this.updateIndicator(index);
  }

  private updateIndicator(index: number): void {
    const tabs = this.tabButtons?.toArray();
    if (!tabs?.length) return;
    const tab = tabs[index]?.nativeElement;
    if (!tab) return;
    this.indicatorWidth    = tab.offsetWidth;
    this.indicatorPosition = tab.offsetLeft;
  }
}