import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InterviewQuestion, QuestionDifficulty } from '../../model/features.model';

@Component({
  selector: 'app-interview-bank',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './interview-bank.component.html',
  styleUrl: './interview-bank.component.css',
})
export class InterviewBankComponent {
  searchQuery = signal('');
  activeCategory = signal('all');
  activeDifficulty = signal<QuestionDifficulty | 'all'>('all');
  showReviewedOnly = signal(false);
  expandedQuestion = signal<string | null>(null);
  showForm = signal(false);
  editingQuestion = signal<InterviewQuestion | null>(null);
  showCodeBlock = signal<string | null>(null);

  formData = signal<Partial<InterviewQuestion>>({
    question: '', answer: '', category: 'JavaScript', difficulty: 'medium',
    tags: [], codeExample: '', notes: '',
  });
  tagInput = signal('');

  updateField(field: string, value: any) { this.formData.set({ ...this.formData(), [field]: value }); }

  questions = signal<InterviewQuestion[]>(MOCK_QUESTIONS);

  categories = computed(() => {
    const cats = new Set(this.questions().map(q => q.category));
    return ['all', ...Array.from(cats).sort()];
  });

  difficulties: { key: QuestionDifficulty | 'all'; label: string; color: string }[] = [
    { key: 'all', label: 'All', color: '' },
    { key: 'easy', label: 'Easy', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    { key: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    { key: 'hard', label: 'Hard', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  ];

  filteredQuestions = computed(() => {
    let items = this.questions();
    const q = this.searchQuery().toLowerCase();
    const cat = this.activeCategory();
    const diff = this.activeDifficulty();
    const reviewed = this.showReviewedOnly();

    if (q) items = items.filter(i =>
      i.question.toLowerCase().includes(q) || i.answer.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) || i.tags?.some(t => t.toLowerCase().includes(q))
    );
    if (cat !== 'all') items = items.filter(i => i.category === cat);
    if (diff !== 'all') items = items.filter(i => i.difficulty === diff);
    if (reviewed) items = items.filter(i => i.isReviewed);
    return items;
  });

  totalCount = computed(() => this.questions().length);
  reviewedCount = computed(() => this.questions().filter(q => q.isReviewed).length);
  favoriteCount = computed(() => this.questions().filter(q => q.isFavorite).length);

  getDifficultyClass(diff: QuestionDifficulty): string {
    return this.difficulties.find(d => d.key === diff)?.color || '';
  }

  getCategoryIcon(cat: string): string {
    const map: Record<string, string> = {
      'JavaScript': 'javascript', 'TypeScript': 'code', 'Angular': 'code',
      'React': 'code', 'Node.js': 'terminal', 'System Design': 'hub',
      'CSS': 'palette', 'HTML': 'web', 'Data Structures': 'account_tree',
      'Behavioral': 'psychology', 'General': 'quiz',
    };
    return map[cat] || 'help';
  }

  getCategoryCount(cat: string): number {
    return this.questions().filter(q => q.category === cat).length;
  }

  getCategoryColor(cat: string): string {
    const map: Record<string, string> = {
      'JavaScript': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      'TypeScript': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'Angular': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      'React': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
      'Node.js': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'System Design': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
      'CSS': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
      'Data Structures': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      'Behavioral': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    };
    return map[cat] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
  }

  toggleExpand(id: string) {
    this.expandedQuestion.set(this.expandedQuestion() === id ? null : id);
  }

  toggleReviewed(q: InterviewQuestion) {
    const updated = this.questions().map(x => x.id === q.id ? { ...x, isReviewed: !x.isReviewed } : x);
    this.questions.set(updated);
  }

  toggleFavorite(q: InterviewQuestion) {
    const updated = this.questions().map(x => x.id === q.id ? { ...x, isFavorite: !x.isFavorite } : x);
    this.questions.set(updated);
  }

  openForm(q?: InterviewQuestion) {
    if (q) {
      this.editingQuestion.set(q);
      this.formData.set({ ...q, tags: [...(q.tags || [])] });
    } else {
      this.editingQuestion.set(null);
      this.formData.set({ question: '', answer: '', category: 'JavaScript', difficulty: 'medium', tags: [], codeExample: '', notes: '' });
    }
    this.tagInput.set('');
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); this.editingQuestion.set(null); }

  addTag() {
    const t = this.tagInput().trim();
    if (t && !(this.formData().tags || []).includes(t)) {
      this.formData.set({ ...this.formData(), tags: [...(this.formData().tags || []), t] });
      this.tagInput.set('');
    }
  }
  removeTag(tag: string) { this.formData.set({ ...this.formData(), tags: (this.formData().tags || []).filter(t => t !== tag) }); }

  saveQuestion() {
    const d = this.formData();
    if (!d.question || !d.answer) return;
    if (this.editingQuestion()) {
      const updated = this.questions().map(q => q.id === this.editingQuestion()!.id ? { ...q, ...d } as InterviewQuestion : q);
      this.questions.set(updated);
    } else {
      const nq: InterviewQuestion = {
        id: 'q-' + Date.now(), question: d.question!, answer: d.answer!,
        category: d.category || 'General', difficulty: (d.difficulty as QuestionDifficulty) || 'medium',
        tags: d.tags || [], codeExample: d.codeExample, notes: d.notes,
        isReviewed: false, isFavorite: false, createdAt: new Date().toISOString().split('T')[0],
      };
      this.questions.set([...this.questions(), nq]);
    }
    this.closeForm();
  }

  deleteQuestion(q: InterviewQuestion) { this.questions.set(this.questions().filter(x => x.id !== q.id)); }
}

const MOCK_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'q1', question: 'What is the difference between var, let, and const?',
    answer: '`var` is function-scoped and can be re-declared. `let` is block-scoped and cannot be re-declared but can be reassigned. `const` is block-scoped, cannot be re-declared or reassigned (but objects/arrays it holds can be mutated).',
    category: 'JavaScript', difficulty: 'easy', tags: ['variables', 'scope', 'es6'],
    codeExample: 'var x = 1; // function-scoped\nlet y = 2; // block-scoped\nconst z = 3; // block-scoped, immutable binding',
    isReviewed: true, isFavorite: true, createdAt: '2026-01-15',
  },
  {
    id: 'q2', question: 'Explain closures in JavaScript',
    answer: 'A closure is the combination of a function bundled together with references to its surrounding state (lexical environment). It gives you access to an outer function\'s scope from an inner function. Closures are created every time a function is created.',
    category: 'JavaScript', difficulty: 'medium', tags: ['closures', 'scope', 'functions'],
    codeExample: 'function outer() {\n  let count = 0;\n  return function inner() {\n    count++;\n    return count;\n  };\n}\nconst counter = outer();\ncounter(); // 1\ncounter(); // 2',
    isReviewed: true, isFavorite: false, createdAt: '2026-01-18',
  },
  {
    id: 'q3', question: 'What is the event loop in JavaScript?',
    answer: 'The event loop is a mechanism that allows JavaScript to perform non-blocking operations despite being single-threaded. It continuously checks the call stack and the task queue. When the call stack is empty, it takes the first event from the queue and pushes it to the call stack.',
    category: 'JavaScript', difficulty: 'hard', tags: ['event-loop', 'async', 'runtime'],
    isReviewed: false, isFavorite: true, createdAt: '2026-01-20',
  },
  {
    id: 'q4', question: 'What are Angular Signals?',
    answer: 'Signals are a reactive primitive in Angular that notify interested consumers when they change. They can contain any value, from simple primitives to complex data structures. A signal\'s value is always read through a getter function, which allows Angular to track where the signal is used.',
    category: 'Angular', difficulty: 'medium', tags: ['signals', 'reactivity', 'angular-16+'],
    codeExample: 'const count = signal(0);\nconst doubled = computed(() => count() * 2);\n\neffect(() => {\n  console.log(`Count: ${count()}, Doubled: ${doubled()}`);\n});\n\ncount.set(5); // triggers effect',
    isReviewed: true, isFavorite: false, createdAt: '2026-02-01',
  },
  {
    id: 'q5', question: 'Explain the difference between Observables and Promises',
    answer: 'Promises handle a single async event. Observables handle a stream of events over time. Promises are eager (execute immediately). Observables are lazy (only execute when subscribed). Promises cannot be cancelled. Observables can be unsubscribed. Observables support operators like map, filter, merge.',
    category: 'Angular', difficulty: 'medium', tags: ['rxjs', 'observables', 'promises', 'async'],
    isReviewed: false, isFavorite: false, createdAt: '2026-02-05',
  },
  {
    id: 'q6', question: 'What is a virtual DOM and how does React use it?',
    answer: 'Virtual DOM is a lightweight in-memory representation of the real DOM. React creates a virtual DOM tree, and when state changes, it creates a new virtual DOM tree, diffs it with the previous one (reconciliation), and applies only the necessary changes to the real DOM. This makes updates efficient.',
    category: 'React', difficulty: 'medium', tags: ['virtual-dom', 'reconciliation', 'performance'],
    isReviewed: true, isFavorite: false, createdAt: '2026-02-08',
  },
  {
    id: 'q7', question: 'Design a URL shortening service like bit.ly',
    answer: 'Key components: 1) API Gateway for receiving requests, 2) Application servers for business logic, 3) Database for storing URL mappings (NoSQL like DynamoDB for high throughput), 4) Cache layer (Redis) for popular URLs, 5) Load balancer, 6) Base62 encoding for short URL generation. Consider: read-heavy workload, horizontal scaling, custom aliases, analytics, expiration.',
    category: 'System Design', difficulty: 'hard', tags: ['url-shortener', 'distributed', 'scalability'],
    isReviewed: false, isFavorite: true, createdAt: '2026-02-10',
  },
  {
    id: 'q8', question: 'What is the difference between interface and type in TypeScript?',
    answer: 'Both can describe object shapes. Interfaces can be extended with `extends` and are open (can be augmented). Types use `&` for intersection and can represent unions, primitives, tuples. Interfaces have better error messages. Types are more flexible for complex type operations.',
    category: 'TypeScript', difficulty: 'easy', tags: ['interface', 'type', 'basics'],
    codeExample: 'interface User {\n  name: string;\n}\ninterface User { // declaration merging\n  age: number;\n}\n\ntype Status = "active" | "inactive"; // union type\ntype UserWithStatus = User & { status: Status }; // intersection',
    isReviewed: true, isFavorite: false, createdAt: '2026-02-12',
  },
  {
    id: 'q9', question: 'Tell me about a time you had a conflict with a team member',
    answer: 'Use STAR method: Situation - describe the context. Task - explain what needed to be done. Action - what you specifically did to resolve it. Result - the outcome. Focus on: active listening, empathy, finding compromise, and professional communication.',
    category: 'Behavioral', difficulty: 'medium', tags: ['star-method', 'conflict', 'teamwork'],
    isReviewed: false, isFavorite: false, createdAt: '2026-02-15',
  },
  {
    id: 'q10', question: 'Explain CSS specificity and how it works',
    answer: 'CSS specificity determines which styles are applied when multiple rules target the same element. The hierarchy (from lowest to highest): Type selectors (0,0,1), Class/attribute/pseudo-class selectors (0,1,0), ID selectors (1,0,0), Inline styles (1,0,0,0), !important overrides all.',
    category: 'CSS', difficulty: 'easy', tags: ['specificity', 'selectors', 'cascade'],
    codeExample: '/* Specificity: 0,0,1 */\np { color: red; }\n\n/* Specificity: 0,1,0 */\n.text { color: blue; }\n\n/* Specificity: 1,0,0 */\n#main { color: green; }\n\n/* Specificity: 0,1,1 */\np.text { color: purple; }',
    isReviewed: true, isFavorite: false, createdAt: '2026-02-18',
  },
];
