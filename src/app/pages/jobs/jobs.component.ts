import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobApplication, JobStatus } from '../../model/features.model';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.css',
})
export class JobsComponent {
  // ── View State ──
  viewMode = signal<'kanban' | 'list'>('kanban');
  searchQuery = signal('');
  showForm = signal(false);
  editingJob = signal<JobApplication | null>(null);
  draggedJob = signal<JobApplication | null>(null);

  // ── Form ──
  formData = signal<Partial<JobApplication>>({
    company: '',
    position: '',
    location: '',
    type: 'remote',
    status: 'wishlist',
    salary: '',
    url: '',
    notes: '',
    tags: [],
  });

  updateField(field: string, value: any) { this.formData.set({ ...this.formData(), [field]: value }); }

  // ── Data (replace with API later) ──
  jobs = signal<JobApplication[]>(MOCK_JOBS);

  columns: { key: JobStatus; label: string; icon: string; color: string }[] = [
    { key: 'wishlist', label: 'Wishlist', icon: 'favorite', color: 'slate' },
    { key: 'applied', label: 'Applied', icon: 'send', color: 'blue' },
    { key: 'phone-screen', label: 'Phone Screen', icon: 'phone_in_talk', color: 'violet' },
    { key: 'interview', label: 'Interview', icon: 'groups', color: 'amber' },
    { key: 'offer', label: 'Offer', icon: 'celebration', color: 'emerald' },
    { key: 'rejected', label: 'Rejected', icon: 'block', color: 'red' },
  ];

  filteredJobs = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.jobs();
    return this.jobs().filter(
      (j) =>
        j.company.toLowerCase().includes(q) ||
        j.position.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q)
    );
  });

  getColumnJobs(status: JobStatus): JobApplication[] {
    return this.filteredJobs().filter((j) => j.status === status);
  }

  getColumnCount(status: JobStatus): number {
    return this.getColumnJobs(status).length;
  }

  getColumnColorClasses(color: string): string {
    const map: Record<string, string> = {
      slate: 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
      blue: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800',
      violet: 'bg-violet-50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-800',
      amber: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800',
      emerald: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800',
      red: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
    };
    return map[color] || map['slate'];
  }

  getHeaderDotColor(color: string): string {
    const map: Record<string, string> = {
      slate: 'bg-slate-400',
      blue: 'bg-blue-500',
      violet: 'bg-violet-500',
      amber: 'bg-amber-500',
      emerald: 'bg-emerald-500',
      red: 'bg-red-500',
    };
    return map[color] || 'bg-slate-400';
  }

  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'remote': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'onsite': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'hybrid': return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
      default: return 'bg-slate-100 text-slate-600';
    }
  }

  totalJobs = computed(() => this.jobs().length);
  activeApplications = computed(
    () => this.jobs().filter((j) => !['rejected', 'withdrawn'].includes(j.status)).length
  );
  interviewCount = computed(
    () => this.jobs().filter((j) => ['interview', 'phone-screen'].includes(j.status)).length
  );
  offerCount = computed(
    () => this.jobs().filter((j) => j.status === 'offer').length
  );

  // ── CRUD ──
  openAddForm() {
    this.editingJob.set(null);
    this.formData.set({
      company: '',
      position: '',
      location: '',
      type: 'remote',
      status: 'wishlist',
      salary: '',
      url: '',
      notes: '',
      tags: [],
    });
    this.showForm.set(true);
  }

  openEditForm(job: JobApplication) {
    this.editingJob.set(job);
    this.formData.set({ ...job });
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingJob.set(null);
  }

  saveJob() {
    const data = this.formData();
    if (!data.company || !data.position) return;

    if (this.editingJob()) {
      // Update existing
      const updated = this.jobs().map((j) =>
        j.id === this.editingJob()!.id ? { ...j, ...data } as JobApplication : j
      );
      this.jobs.set(updated);
    } else {
      // Add new
      const newJob: JobApplication = {
        id: 'job-' + Date.now(),
        company: data.company!,
        position: data.position!,
        location: data.location || '',
        type: (data.type as any) || 'remote',
        status: (data.status as JobStatus) || 'wishlist',
        salary: data.salary,
        url: data.url,
        notes: data.notes,
        tags: data.tags || [],
        appliedDate: new Date().toISOString().split('T')[0],
      };
      this.jobs.set([...this.jobs(), newJob]);
    }
    this.closeForm();
  }

  deleteJob(job: JobApplication) {
    this.jobs.set(this.jobs().filter((j) => j.id !== job.id));
  }

  moveJob(job: JobApplication, newStatus: JobStatus) {
    const updated = this.jobs().map((j) =>
      j.id === job.id ? { ...j, status: newStatus } : j
    );
    this.jobs.set(updated);
  }

  // Drag & Drop
  onDragStart(event: DragEvent, job: JobApplication) {
    this.draggedJob.set(job);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', job.id);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, status: JobStatus) {
    event.preventDefault();
    const job = this.draggedJob();
    if (job) {
      this.moveJob(job, status);
      this.draggedJob.set(null);
    }
  }
}

// ── Mock Data ──
const MOCK_JOBS: JobApplication[] = [
  {
    id: 'j1',
    company: 'Google',
    position: 'Senior Frontend Engineer',
    location: 'Mountain View, CA',
    type: 'hybrid',
    status: 'interview',
    salary: '$180K - $250K',
    appliedDate: '2026-02-01',
    interviewDate: '2026-02-25',
    tags: ['FAANG', 'Angular', 'TypeScript'],
    logo: 'G',
  },
  {
    id: 'j2',
    company: 'Stripe',
    position: 'Full Stack Developer',
    location: 'San Francisco, CA',
    type: 'remote',
    status: 'applied',
    salary: '$160K - $220K',
    appliedDate: '2026-02-10',
    tags: ['Fintech', 'React', 'Node.js'],
    logo: 'S',
  },
  {
    id: 'j3',
    company: 'Vercel',
    position: 'Frontend Developer',
    location: 'Remote',
    type: 'remote',
    status: 'phone-screen',
    salary: '$140K - $180K',
    appliedDate: '2026-02-05',
    tags: ['Next.js', 'React', 'DevTools'],
    logo: 'V',
  },
  {
    id: 'j4',
    company: 'Netflix',
    position: 'UI Engineer',
    location: 'Los Gatos, CA',
    type: 'hybrid',
    status: 'wishlist',
    salary: '$200K - $300K',
    tags: ['FAANG', 'React', 'Performance'],
    logo: 'N',
  },
  {
    id: 'j5',
    company: 'Shopify',
    position: 'Senior Web Developer',
    location: 'Remote',
    type: 'remote',
    status: 'offer',
    salary: '$150K - $200K',
    appliedDate: '2026-01-15',
    tags: ['E-commerce', 'React', 'GraphQL'],
    logo: 'Sh',
  },
  {
    id: 'j6',
    company: 'Meta',
    position: 'Software Engineer',
    location: 'Menlo Park, CA',
    type: 'onsite',
    status: 'rejected',
    salary: '$190K - $280K',
    appliedDate: '2026-01-20',
    tags: ['FAANG', 'React', 'Mobile'],
    logo: 'M',
  },
  {
    id: 'j7',
    company: 'Figma',
    position: 'Frontend Engineer',
    location: 'San Francisco, CA',
    type: 'hybrid',
    status: 'applied',
    salary: '$155K - $210K',
    appliedDate: '2026-02-18',
    tags: ['Design Tools', 'WebGL', 'TypeScript'],
    logo: 'F',
  },
  {
    id: 'j8',
    company: 'Notion',
    position: 'Product Engineer',
    location: 'San Francisco, CA',
    type: 'hybrid',
    status: 'wishlist',
    salary: '$145K - $195K',
    tags: ['Productivity', 'React', 'Electron'],
    logo: 'No',
  },
];
