import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Project, ProjectStatus, ProjectTask } from '../../model/features.model';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css',
})
export class ProjectsComponent {
  searchQuery = signal('');
  activeFilter = signal<ProjectStatus | 'all'>('all');
  viewMode = signal<'grid' | 'list'>('grid');
  showForm = signal(false);
  editingProject = signal<Project | null>(null);
  expandedProject = signal<string | null>(null);

  formData = signal<Partial<Project>>({
    name: '', description: '', status: 'planning', progress: 0, techStack: [], repoUrl: '', demoUrl: '',
  });
  techInput = signal('');

  updateField(field: string, value: any) { this.formData.set({ ...this.formData(), [field]: value }); }

  projects = signal<Project[]>(MOCK_PROJECTS);

  statuses: { key: ProjectStatus | 'all'; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'apps' },
    { key: 'planning', label: 'Planning', icon: 'edit_note' },
    { key: 'in-progress', label: 'In Progress', icon: 'pending' },
    { key: 'completed', label: 'Completed', icon: 'check_circle' },
    { key: 'on-hold', label: 'On Hold', icon: 'pause_circle' },
    { key: 'archived', label: 'Archived', icon: 'archive' },
  ];

  filteredProjects = computed(() => {
    let items = this.projects();
    const q = this.searchQuery().toLowerCase();
    const f = this.activeFilter();
    if (q) items = items.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.techStack.some(t => t.toLowerCase().includes(q)));
    if (f !== 'all') items = items.filter(p => p.status === f);
    return items;
  });

  totalProjects = computed(() => this.projects().length);
  inProgressCount = computed(() => this.projects().filter(p => p.status === 'in-progress').length);
  completedCount = computed(() => this.projects().filter(p => p.status === 'completed').length);

  getStatusClasses(status: ProjectStatus): string {
    const map: Record<string, string> = {
      'planning': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'in-progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      'completed': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      'on-hold': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
      'archived': 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    };
    return map[status] || map['planning'];
  }

  getProgressColor(progress: number): string {
    if (progress >= 80) return 'from-emerald-400 to-emerald-500';
    if (progress >= 50) return 'from-accent to-blue-400';
    if (progress >= 25) return 'from-amber-400 to-orange-400';
    return 'from-slate-300 to-slate-400';
  }

  toggleExpand(projectId: string) {
    this.expandedProject.set(this.expandedProject() === projectId ? null : projectId);
  }

  toggleTask(project: Project, task: ProjectTask) {
    task.completed = !task.completed;
    const tasks = project.tasks || [];
    const done = tasks.filter(t => t.completed).length;
    project.progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
  }

  openForm(project?: Project) {
    if (project) {
      this.editingProject.set(project);
      this.formData.set({ ...project, techStack: [...project.techStack] });
    } else {
      this.editingProject.set(null);
      this.formData.set({ name: '', description: '', status: 'planning', progress: 0, techStack: [], repoUrl: '', demoUrl: '' });
    }
    this.techInput.set('');
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); this.editingProject.set(null); }

  addTech() {
    const t = this.techInput().trim();
    if (t && !(this.formData().techStack || []).includes(t)) {
      this.formData.set({ ...this.formData(), techStack: [...(this.formData().techStack || []), t] });
      this.techInput.set('');
    }
  }

  removeTech(tech: string) {
    this.formData.set({ ...this.formData(), techStack: (this.formData().techStack || []).filter(t => t !== tech) });
  }

  saveProject() {
    const d = this.formData();
    if (!d.name) return;
    if (this.editingProject()) {
      const updated = this.projects().map(p => p.id === this.editingProject()!.id ? { ...p, ...d } as Project : p);
      this.projects.set(updated);
    } else {
      const newP: Project = {
        id: 'proj-' + Date.now(), name: d.name!, description: d.description || '', status: (d.status as ProjectStatus) || 'planning',
        progress: d.progress || 0, techStack: d.techStack || [], repoUrl: d.repoUrl, demoUrl: d.demoUrl,
        startDate: new Date().toISOString().split('T')[0], tasks: [],
      };
      this.projects.set([...this.projects(), newP]);
    }
    this.closeForm();
  }

  deleteProject(p: Project) { this.projects.set(this.projects().filter(x => x.id !== p.id)); }
}

const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1', name: 'Interview Resources App', description: 'A comprehensive app to manage interview prep, technologies, roadmaps, and more.', status: 'in-progress', progress: 65,
    techStack: ['Angular', 'NgRx', 'Tailwind CSS', 'Firebase', 'Node.js'], repoUrl: 'https://github.com/user/interview-resources', demoUrl: 'https://interview-resources.app',
    startDate: '2025-09-01', tasks: [
      { id: 't1', title: 'Setup project structure', completed: true }, { id: 't2', title: 'Implement authentication', completed: true },
      { id: 't3', title: 'Build dashboard', completed: true }, { id: 't4', title: 'Build roadmap feature', completed: false },
      { id: 't5', title: 'Build jobs tracker', completed: false }, { id: 't6', title: 'Deploy to production', completed: false },
    ],
  },
  {
    id: 'p2', name: 'E-Commerce Platform', description: 'Full-stack e-commerce platform with microservices architecture.', status: 'in-progress', progress: 40,
    techStack: ['React', 'Node.js', 'MongoDB', 'Docker', 'Redis'], repoUrl: 'https://github.com/user/ecommerce',
    startDate: '2025-11-15', tasks: [
      { id: 't1', title: 'Design database schema', completed: true }, { id: 't2', title: 'Build product catalog API', completed: true },
      { id: 't3', title: 'Implement cart & checkout', completed: false }, { id: 't4', title: 'Payment integration', completed: false },
    ],
  },
  {
    id: 'p3', name: 'Portfolio Website', description: 'Personal portfolio showcasing projects and blogs.', status: 'completed', progress: 100,
    techStack: ['Angular', 'Tailwind CSS', 'Firebase'], demoUrl: 'https://myportfolio.dev',
    startDate: '2025-06-01', endDate: '2025-08-15',
  },
  {
    id: 'p4', name: 'AI Chatbot', description: 'Conversational AI assistant using LLM APIs.', status: 'planning', progress: 10,
    techStack: ['Python', 'FastAPI', 'OpenAI', 'React'], startDate: '2026-03-01',
  },
  {
    id: 'p5', name: 'Custom Code Editor', description: 'Web-based code editor with syntax highlighting and live preview.', status: 'on-hold', progress: 30,
    techStack: ['Web Components', 'Vite', 'Tailwind CSS'], repoUrl: 'https://github.com/user/custom-editor',
    startDate: '2025-10-01',
  },
];
