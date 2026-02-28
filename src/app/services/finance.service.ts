import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  Expense,
  ExpenseCategory,
  BudgetSettings,
  MonthlyBudgetMap,
  MonthSummary,
  ParsedSmsTransaction,
  EXPENSE_CATEGORIES,
} from '../model/finance.model';
import { environment } from '../../environments/environment';

const EXPENSES_KEY = 'finance_expenses';
const BUDGET_KEY = 'finance_budgets'; // now stores MonthlyBudgetMap

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private api = `${environment.API_URL}/finance`; // Adjust base URL as needed
  private apiUrl = `${environment.API_URL}`; // For debts endpoint
  constructor(private http: HttpClient) { }

  // ───── Expenses CRUD ─────

  getExpenses(type: string = 'expense'): Observable<Expense[]> {
    return this.http.get<Expense[]>(`${this.api}/get-expenses?type=${type}`);
  }

  addExpense(expense: Omit<Expense, 'id' | 'createdAt'>, type: string = 'expense'): Observable<Expense> {
    return this.http.post<Expense>(`${this.api}/add-expense?type=${type}`, { ...expense, type });
  }

  addExpenses(items: Omit<Expense, 'id' | 'createdAt'>[], type: string = 'expense'): Observable<Expense[]> {
    return this.http.post<Expense[]>(`${this.api}/add-expenses?type=${type}`, items);
  }

  updateExpense(id: string, changes: Partial<Expense>, type: string = 'expense'): Observable<Expense> {
    console.log('service updateExpense - id:', id); // debug
    return this.http.patch<Expense>(
      `${this.api}/update-expense/${id}?type=${type}`,
      changes
    );
  }

  deleteExpense(id: string, type: string = 'expense'): Observable<any> {
    return this.http.delete(`${this.api}/delete-expense/${id}?type=${type}`);
  }

  // saveExpenses removed (no longer needed)

  // ───── Month-Specific Budget ─────

  // getAllBudgets removed (no longer needed)

  getBudgetForMonth(monthKey: string, type: string = 'expense'): Observable<BudgetSettings> {
    return this.http.get<BudgetSettings>(`${this.api}/budget/${monthKey}?type=${type}`);
  }

  saveBudgetForMonth(monthKey: string, settings: BudgetSettings, type: string = 'budget'): Observable<any> {
    return this.http.put(`${this.api}/budget/${monthKey}?type=${type}`, { ...settings, type });
  }

  copyBudgetToMonth(fromKey: string, toKey: string, type: string = 'expense'): Observable<any> {
    return this.http.post(`${this.api}/budget/copy?type=${type}`, { fromKey, toKey });
  }

  // ───── Calculations ─────

  getMonthKey(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  getExpensesForMonth(year: number, month: number, type: string = 'expense'): Observable<Expense[]> {
    return this.http.get<Expense[]>(
      `${this.api}/expenses?year=${year}&month=${month}&type=${type}`
    );
  }

  getMonthSummary(year: number, month: number): Observable<MonthSummary> {
    const monthKey = this.getMonthKey(year, month);
    return this.getExpensesForMonth(year, month).pipe(
      switchMap(expenses =>
        this.getBudgetForMonth(monthKey).pipe(
          map(budget => {
            const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
            const remaining = budget.monthlyBudget - totalSpent;
            const percentUsed = budget.monthlyBudget > 0
              ? Math.round((totalSpent / budget.monthlyBudget) * 100)
              : 0;
            const categoryMap = new Map<ExpenseCategory, number>();
            expenses.forEach(e => {
              categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount);
            });
            const categoryBreakdown = Array.from(categoryMap.entries())
              .map(([category, total]) => ({ category, total }))
              .sort((a, b) => b.total - a.total);
            return {
              month: monthKey,
              totalSpent,
              budget: budget.monthlyBudget,
              remaining,
              percentUsed,
              categoryBreakdown,
            };
          })
        )
      )
    );
  }

  getTotalByCategory(expenses: Expense[]): { category: ExpenseCategory; total: number; config: typeof EXPENSE_CATEGORIES[0] }[] {
    const map = new Map<ExpenseCategory, number>();
    expenses.forEach(e => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([category, total]) => ({
        category,
        total,
        config: EXPENSE_CATEGORIES.find(c => c.key === category)!,
      }))
      .sort((a, b) => b.total - a.total);
  }

  // ───── SMS Parser ─────

  parseSmsMessages(rawText: string): ParsedSmsTransaction[] {
    // Split by double newline or by common SMS separators
    const messages = rawText
      .split(/\n{2,}|\r\n{2,}|(?=(?:Dear|Your|Rs\.|INR|Debited|Credited|Txn|Transaction))/gi)
      .map(m => m.trim())
      .filter(m => m.length > 10);

    return messages.map(msg => this.parseSingleSms(msg)).filter(Boolean) as ParsedSmsTransaction[];
  }

  private parseSingleSms(text: string): ParsedSmsTransaction | null {
    // Extract amount – match patterns: Rs.1234, Rs 1234, INR 1234, Rs.1,234.56
    const amountMatch = text.match(
      /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i
    );
    if (!amountMatch) return null;

    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) return null;

    // Determine debit/credit
    const isCredit = /credited|received|refund|cashback/i.test(text);
    const isDebit = /debited|spent|paid|purchase|withdrawn|deducted|charged/i.test(text);
    const type = isCredit ? 'credit' : isDebit ? 'debit' : 'unknown';

    // Extract merchant/description
    const merchant = this.extractMerchant(text);

    // Extract date
    const date = this.extractDate(text);

    // Auto-categorize
    const category = this.guessCategory(text, merchant);

    return {
      id: crypto.randomUUID(),
      rawText: text,
      amount,
      merchant,
      date,
      type,
      category,
      selected: type === 'debit', // auto-select debits
    };
  }

  private extractMerchant(text: string): string {
    // Common patterns: "at MERCHANT", "to MERCHANT", "from MERCHANT", "info: MERCHANT"
    const patterns = [
      /(?:at|to|from|@|info[:\s]*|VPA\s*)\s*([A-Za-z0-9\s&.'_-]{3,40})/i,
      /(?:towards|for)\s+([A-Za-z0-9\s&.'_-]{3,40})/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const cleaned = match[1].trim()
          .replace(/\s{2,}/g, ' ')
          .replace(/^(mr|ms|mrs)\s+/i, '')
          .substring(0, 40);
        if (cleaned.length >= 3) return cleaned;
      }
    }
    // Fallback: use first meaningful chunk
    const words = text.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().split(/\s+/).slice(0, 5).join(' ');
    return words.substring(0, 40) || 'Unknown';
  }

  private extractDate(text: string): string {
    // Try common date formats: dd/mm/yyyy, dd-mm-yyyy, dd/mm/yy, yyyy-mm-dd
    const patterns = [
      /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,
      /(\d{2})[\/\-](\d{2})[\/\-](\d{2})/,
      /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/,
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{2,4})/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          // Handle month-name format
          if (/[a-zA-Z]/.test(match[2])) {
            const d = new Date(`${match[2]} ${match[1]}, ${match[3]}`);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
          }
          // dd/mm/yyyy
          let y = match[3], m = match[2], d = match[1];
          if (match[1].length === 4) { y = match[1]; m = match[2]; d = match[3]; }
          if (y.length === 2) y = '20' + y;
          const date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
          if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
        } catch { }
      }
    }
    return new Date().toISOString().split('T')[0];
  }

  private guessCategory(text: string, merchant: string): ExpenseCategory {
    const combined = `${text} ${merchant}`.toLowerCase();

    const categoryKeywords: Record<ExpenseCategory, string[]> = {
      food: ['swiggy', 'zomato', 'restaurant', 'food', 'pizza', 'burger', 'cafe', 'dining', 'eat', 'kitchen', 'bakery', 'dominos', 'mcdonalds', 'kfc'],
      groceries: ['grocery', 'groceries', 'bigbasket', 'nature\'s basket', 'dmart', 'supermarket', 'foodhall', 'spencer\'s'],
      transport: ['uber', 'ola', 'rapido', 'petrol', 'fuel', 'metro', 'irctc', 'railway', 'flight', 'makemytrip', 'redbus', 'cab', 'parking'],
      entertainment: ['netflix', 'spotify', 'prime video', 'hotstar', 'movie', 'cinema', 'pvr', 'inox', 'game', 'bookmyshow'],
      shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'shopping', 'mall', 'store', 'mart', 'retail', 'meesho', 'nykaa'],
      bills: ['electricity', 'water', 'gas', 'broadband', 'wifi', 'mobile recharge', 'airtel', 'jio', 'vodafone', 'bsnl', 'bill', 'utility'],
      health: ['hospital', 'pharmacy', 'medical', 'doctor', 'apollo', 'medplus', 'medicine', 'clinic', 'health', 'lab', 'diagnostic', 'gym'],
      education: ['udemy', 'coursera', 'school', 'college', 'tuition', 'book', 'course', 'certification', 'exam'],
      rent: ['rent', 'house', 'apartment', 'flat', 'pg ', 'hostel', 'landlord', 'maintenance'],
      subscriptions: ['subscription', 'membership', 'annual', 'monthly plan', 'premium', 'youtube', 'icloud', 'google one'],
      other: [],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => combined.includes(kw))) {
        return category as ExpenseCategory;
      }
    }
    return 'other';
  }
  // ── Debts ──────────────────────────────────────────────
  getAllDebts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/debts`);
  }

  createDebt(debt: any): Observable<any> {
    return this.http.post<any>(`${this.api}/add-debt`, debt);
  }

  updateDebt(id: string, changes: any): Observable<any> {
    return this.http.patch<any>(`${this.api}/update-debt/${id}`, changes);
  }

  deleteDebt(id: string): Observable<any> {
    return this.http.delete<any>(`${this.api}/delete-debt/${id}`);
  }

  markDebtSettled(id: string): Observable<any> {
    return this.http.patch<any>(`${this.api}/debts/${id}/settle`, {});
  }

  recordPartialPayment(id: string, amount: number): Observable<any> {
    return this.http.patch<any>(`${this.api}/debts/${id}/partial`, { amount });
  }
}
