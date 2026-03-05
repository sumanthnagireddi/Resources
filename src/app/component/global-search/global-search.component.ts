import {
  Component,
  HostListener,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { SearchService } from '../../services/searchService';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  filter,
  tap,
  catchError,
  EMPTY,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './global-search.component.html',
  styleUrl: './global-search.component.css',
})
export class GlobalSearchComponent {
  private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);

  readonly isOpen = signal(false);
  readonly selectedIndex = signal(0);
  readonly isLoading = signal(false);
  readonly filteredResults = signal<any[]>([]);
  readonly searchControl = new FormControl('');

  readonly hasResults = computed(() => this.filteredResults().length > 0);
  readonly resultCount = computed(() => this.filteredResults().length);

  constructor() {
    this.searchControl.valueChanges
      .pipe(
        tap((query) => {
          this.selectedIndex.set(0);
          if (!query?.trim()) {
            this.filteredResults.set([]);
            this.isLoading.set(false);
          } else {
            this.isLoading.set(true);
          }
        }),
        debounceTime(400),
        // ✅ Only dedupe consecutive identical non-empty queries.
        //    Resetting to null/'' always lets the next real query through.
        distinctUntilChanged((prev, curr) => !!prev?.trim() && prev?.trim() === curr?.trim()),
        filter((query) => !!query?.trim()),
        switchMap((query) =>
          this.searchService.search(query!).pipe(
            catchError(() => {
              this.isLoading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((response) => {
        this.filteredResults.set(response.results);
        this.isLoading.set(false);
      });
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.toggleSearch();
      return;
    }

    if (!this.isOpen()) return;

    const keyActions: Record<string, () => void> = {
      Escape:    () => this.closeSearch(),
      ArrowDown: () => this.navigate(1),
      ArrowUp:   () => this.navigate(-1),
      Enter:     () => this.selectResult(this.filteredResults()[this.selectedIndex()]),
    };

    if (event.key in keyActions) {
      event.preventDefault();
      keyActions[event.key]();
    }
  }

  toggleSearch(): void {
    this.isOpen() ? this.closeSearch() : this.openSearch();
  }

  openSearch(): void {
    this.isOpen.set(true);
    setTimeout(() => document.getElementById('global-search-input')?.focus(), 100);
  }

  closeSearch(): void {
    this.isOpen.set(false);
    this.selectedIndex.set(0);
    this.filteredResults.set([]);
    // ✅ reset to null so distinctUntilChanged cache is fully broken
    this.searchControl.reset(null, { emitEvent: false });
  }

  private navigate(direction: 1 | -1): void {
    const next = this.selectedIndex() + direction;
    const max  = this.filteredResults().length - 1;
    if (next < 0 || next > max) return;
    this.selectedIndex.set(next);
    setTimeout(() => {
      document
        .querySelector('.search-result-selected')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  selectResult(result: any): void {
    if (!result) return;
    this.router.navigateByUrl(result.url);
    this.closeSearch();
  }

  getTypeColor(type: string): string {
    const colorMap: Record<string, string> = {
      content: 'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-300',
      blogs:     'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      topics:    'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-300',
    };
    return colorMap[type] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  }
}