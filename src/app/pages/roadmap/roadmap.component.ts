import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Roadmap, RoadmapNode, NodeStatus, RoadmapResource } from '../../model/features.model';

@Component({
  selector: 'app-roadmap',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roadmap.component.html',
  styleUrl: './roadmap.component.css'
})
export class RoadmapComponent {
  // ── View State ──
  activeView = signal<'list' | 'detail'>('list');
  activeRoadmap = signal<Roadmap | null>(null);
  selectedNode = signal<RoadmapNode | null>(null);
  showNodePanel = signal(false);

  // ── Filters ──
  searchQuery = signal('');
  activeCategory = signal<'all' | 'role' | 'skill' | 'custom'>('all');

  // ── Data ──
  roadmaps = signal<Roadmap[]>(MOCK_ROADMAPS);

  categories: { key: 'all' | 'role' | 'skill' | 'custom'; label: string }[] = [
    { key: 'all', label: 'All Roadmaps' },
    { key: 'role', label: 'Role-based' },
    { key: 'skill', label: 'Skill-based' },
    { key: 'custom', label: 'Custom' },
  ];

  // ── Computed ──
  filteredRoadmaps = computed(() => {
    let items = this.roadmaps();
    const q = this.searchQuery().toLowerCase();
    const cat = this.activeCategory();
    if (q) items = items.filter(r => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    if (cat !== 'all') items = items.filter(r => r.category === cat);
    return items;
  });

  roleRoadmaps = computed(() => this.filteredRoadmaps().filter(r => r.category === 'role'));
  skillRoadmaps = computed(() => this.filteredRoadmaps().filter(r => r.category === 'skill'));
  customRoadmaps = computed(() => this.filteredRoadmaps().filter(r => r.category === 'custom'));

  progressStats = computed(() => {
    const rm = this.activeRoadmap();
    if (!rm) return { done: 0, inProgress: 0, skipped: 0, total: 0 };
    let done = 0, inProgress = 0, skipped = 0, total = 0;
    const count = (nodes: RoadmapNode[]) => {
      for (const n of nodes) {
        total++;
        if (n.status === 'done') done++;
        else if (n.status === 'in-progress') inProgress++;
        else if (n.status === 'skip') skipped++;
        if (n.children) count(n.children);
      }
    };
    count(rm.nodes);
    return { done, inProgress, skipped, total };
  });

  // ── Actions ──
  openRoadmap(roadmap: Roadmap) {
    this.activeRoadmap.set(roadmap);
    this.activeView.set('detail');
    this.selectedNode.set(null);
    this.showNodePanel.set(false);
  }

  backToList() {
    this.activeView.set('list');
    this.activeRoadmap.set(null);
    this.selectedNode.set(null);
    this.showNodePanel.set(false);
  }

  selectNode(node: RoadmapNode) {
    this.selectedNode.set(node);
    this.showNodePanel.set(true);
  }

  closeNodePanel() {
    this.showNodePanel.set(false);
    setTimeout(() => this.selectedNode.set(null), 300);
  }

  setNodeStatus(node: RoadmapNode, status: NodeStatus) {
    node.status = status;
    this.recalcProgress();
  }

  rightClickNode(event: MouseEvent, node: RoadmapNode) {
    event.preventDefault();
    const order: NodeStatus[] = ['not-started', 'done', 'in-progress', 'skip'];
    const idx = order.indexOf(node.status);
    node.status = order[(idx + 1) % order.length];
    this.recalcProgress();
  }

  recalcProgress() {
    const rm = this.activeRoadmap();
    if (!rm) return;
    let total = 0, done = 0;
    const count = (nodes: RoadmapNode[]) => {
      for (const n of nodes) { total++; if (n.status === 'done') done++; if (n.children) count(n.children); }
    };
    count(rm.nodes);
    rm.totalNodes = total;
    rm.completedNodes = done;
  }

  getProgress(roadmap: Roadmap): number {
    if (roadmap.totalNodes === 0) return 0;
    return Math.round((roadmap.completedNodes / roadmap.totalNodes) * 100);
  }

  progressPercent(type: string): number {
    const s = this.progressStats();
    if (s.total === 0) return 0;
    if (type === 'done') return Math.round((s.done / s.total) * 100);
    if (type === 'in-progress') return Math.round((s.inProgress / s.total) * 100);
    if (type === 'skip') return Math.round((s.skipped / s.total) * 100);
    return 0;
  }

  // ── Pair children into left/right rows for the flowchart ──
  getTopicPairs(children: RoadmapNode[]): { left: RoadmapNode | null; right: RoadmapNode | null }[] {
    const pairs: { left: RoadmapNode | null; right: RoadmapNode | null }[] = [];
    for (let i = 0; i < children.length; i += 2) {
      pairs.push({
        left: children[i] || null,
        right: i + 1 < children.length ? children[i + 1] : null,
      });
    }
    return pairs;
  }

  // ── Node Style Helpers ──
  getMilestoneClass(node: RoadmapNode): string {
    switch (node.status) {
      case 'done': return 'border-emerald-500 bg-emerald-500 text-white';
      case 'in-progress': return 'border-blue-500 bg-blue-500 text-white';
      case 'skip': return 'border-slate-400 bg-slate-400 text-white';
      default: return 'border-slate-800 dark:border-slate-200 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900';
    }
  }

  getNodeClass(node: RoadmapNode): string {
    if (node.isRecommended && node.status === 'not-started') return 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200';
    switch (node.status) {
      case 'done': return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200';
      case 'in-progress': return 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200';
      case 'skip': return 'border-slate-400 bg-slate-100 dark:bg-slate-700 text-slate-400 line-through';
      default: return 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200';
    }
  }

  getStatusBadgeClass(status: NodeStatus): string {
    switch (status) {
      case 'done': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'in-progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
      case 'skip': return 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
    }
  }

  getStatusLabel(status: NodeStatus): string {
    switch (status) {
      case 'done': return 'Done';
      case 'in-progress': return 'In Progress';
      case 'skip': return 'Skipped';
      default: return 'Not Started';
    }
  }

  getResourceIcon(type: string): string {
    switch (type) {
      case 'video': return 'play_circle';
      case 'course': return 'school';
      case 'documentation': return 'menu_book';
      default: return 'article';
    }
  }

  // ═══════════════════════════════════════════════
  //  CRUD — Roadmap (Add / Edit / Delete)
  // ═══════════════════════════════════════════════
  showRoadmapForm = signal(false);
  editingRoadmap = signal<Roadmap | null>(null);
  roadmapForm = signal<Partial<Roadmap>>({ title: '', description: '', icon: 'map', category: 'custom', tags: [] });
  roadmapTagInput = signal('');

  updateRoadmapField(field: string, value: any) {
    this.roadmapForm.set({ ...this.roadmapForm(), [field]: value });
  }

  openRoadmapForm(roadmap?: Roadmap) {
    if (roadmap) {
      this.editingRoadmap.set(roadmap);
      this.roadmapForm.set({ title: roadmap.title, description: roadmap.description, icon: roadmap.icon, category: roadmap.category, tags: [...(roadmap.tags || [])] });
    } else {
      this.editingRoadmap.set(null);
      this.roadmapForm.set({ title: '', description: '', icon: 'map', category: 'custom', tags: [] });
    }
    this.roadmapTagInput.set('');
    this.showRoadmapForm.set(true);
  }

  closeRoadmapForm() { this.showRoadmapForm.set(false); }

  addRoadmapTag() {
    const tag = this.roadmapTagInput().trim().toLowerCase();
    if (tag && !this.roadmapForm().tags?.includes(tag)) {
      this.roadmapForm.set({ ...this.roadmapForm(), tags: [...(this.roadmapForm().tags || []), tag] });
      this.roadmapTagInput.set('');
    }
  }

  removeRoadmapTag(tag: string) {
    this.roadmapForm.set({ ...this.roadmapForm(), tags: (this.roadmapForm().tags || []).filter(t => t !== tag) });
  }

  saveRoadmap() {
    const f = this.roadmapForm();
    if (!f.title?.trim()) return;
    const editing = this.editingRoadmap();
    if (editing) {
      editing.title = f.title!;
      editing.description = f.description || '';
      editing.icon = f.icon || 'map';
      editing.category = f.category as any || 'custom';
      editing.tags = f.tags || [];
      this.roadmaps.set([...this.roadmaps()]);
    } else {
      const newRm: Roadmap = {
        id: 'rm-' + Date.now(),
        title: f.title!,
        description: f.description || '',
        icon: f.icon || 'map',
        category: (f.category as any) || 'custom',
        tags: f.tags || [],
        totalNodes: 0,
        completedNodes: 0,
        nodes: [],
      };
      this.roadmaps.set([...this.roadmaps(), newRm]);
    }
    this.closeRoadmapForm();
  }

  deleteRoadmap(roadmap: Roadmap) {
    this.roadmaps.set(this.roadmaps().filter(r => r.id !== roadmap.id));
    if (this.activeRoadmap()?.id === roadmap.id) this.backToList();
  }

  // ═══════════════════════════════════════════════
  //  CRUD — Node / Topic (Add / Edit / Delete)
  // ═══════════════════════════════════════════════
  showNodeForm = signal(false);
  editingNode = signal<RoadmapNode | null>(null);
  parentNodeForAdd = signal<RoadmapNode | null>(null);  // null = add to root
  nodeForm = signal<Partial<RoadmapNode & { resourceTitle: string; resourceUrl: string; resourceType: string }>>({
    label: '', description: '', type: 'topic', annotation: '', isRecommended: false, resources: [],
    resourceTitle: '', resourceUrl: '', resourceType: 'article',
  });

  updateNodeField(field: string, value: any, resourceIndex?: number) {
    if (resourceIndex !== undefined && resourceIndex !== null) {
      const resources = [...(this.nodeForm().resources || [])];
      const res = { ...resources[resourceIndex] };
      if (field === 'resourceTitle') res.title = value;
      else if (field === 'resourceUrl') res.url = value;
      else if (field === 'resourceType') res.type = value;
      resources[resourceIndex] = res;
      this.nodeForm.set({ ...this.nodeForm(), resources });
    } else {
      this.nodeForm.set({ ...this.nodeForm(), [field]: value });
    }
  }

  openNodeForm(parent?: RoadmapNode | null, editNode?: RoadmapNode) {
    if (editNode) {
      this.editingNode.set(editNode);
      this.parentNodeForAdd.set(null);
      this.nodeForm.set({
        label: editNode.label, description: editNode.description || '', type: editNode.type,
        annotation: editNode.annotation || '', isRecommended: editNode.isRecommended || false,
        resources: editNode.resources ? [...editNode.resources] : [],
        resourceTitle: '', resourceUrl: '', resourceType: 'article',
      });
    } else {
      this.editingNode.set(null);
      this.parentNodeForAdd.set(parent || null);
      this.nodeForm.set({
        label: '', description: '', type: parent ? 'topic' : 'milestone', annotation: '',
        isRecommended: false, resources: [],
        resourceTitle: '', resourceUrl: '', resourceType: 'article',
      });
    }
    this.showNodeForm.set(true);
  }

  closeNodeForm() { this.showNodeForm.set(false); }

  addNodeResource() {
    const f = this.nodeForm();
    if (!f.resourceTitle?.trim() || !f.resourceUrl?.trim()) return;
    const res: RoadmapResource = { title: f.resourceTitle!, url: f.resourceUrl!, type: f.resourceType as any || 'article' };
    this.nodeForm.set({ ...f, resources: [...(f.resources || []), res], resourceTitle: '', resourceUrl: '' });
  }

  removeNodeResource(idx: number) {
    const resources = [...(this.nodeForm().resources || [])];
    resources.splice(idx, 1);
    this.nodeForm.set({ ...this.nodeForm(), resources });
  }

  saveNode() {
    const f = this.nodeForm();
    const rm = this.activeRoadmap();
    if (!f.label?.trim() || !rm) return;

    const editing = this.editingNode();
    if (editing) {
      editing.label = f.label!;
      editing.description = f.description || '';
      editing.type = f.type as any || 'topic';
      editing.annotation = f.annotation || '';
      editing.isRecommended = f.isRecommended || false;
      editing.resources = f.resources || [];
    } else {
      const newNode: RoadmapNode = {
        id: 'n-' + Date.now(),
        label: f.label!,
        description: f.description || '',
        type: f.type as any || 'topic',
        status: 'not-started',
        annotation: f.annotation || '',
        isRecommended: f.isRecommended || false,
        resources: f.resources || [],
        children: [],
      };
      const parent = this.parentNodeForAdd();
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(newNode);
      } else {
        rm.nodes.push(newNode);
      }
    }
    this.recalcProgress();
    this.closeNodeForm();
  }

  deleteNode(node: RoadmapNode) {
    const rm = this.activeRoadmap();
    if (!rm) return;
    // Try removing from root
    const rootIdx = rm.nodes.indexOf(node);
    if (rootIdx !== -1) { rm.nodes.splice(rootIdx, 1); }
    else {
      // Remove from parent's children
      for (const section of rm.nodes) {
        if (section.children) {
          const childIdx = section.children.indexOf(node);
          if (childIdx !== -1) { section.children.splice(childIdx, 1); break; }
        }
      }
    }
    this.recalcProgress();
    if (this.selectedNode() === node) this.closeNodePanel();
  }

  iconOptions = ['map', 'web', 'dns', 'cloud_sync', 'layers', 'phone_android', 'code', 'terminal', 'hub', 'inventory_2', 'cloud', 'trending_up', 'school', 'psychology', 'edit_note', 'rocket_launch', 'data_object', 'security', 'storage'];
}

// ═══════════════════════════════════════════════════
// MOCK DATA — Frontend Developer matching roadmap.sh
// ═══════════════════════════════════════════════════
const MOCK_ROADMAPS: Roadmap[] = [
  {
    id: 'frontend',
    title: 'Frontend Developer',
    description: 'Step by step guide to becoming a modern Frontend Developer in 2026',
    icon: 'web',
    category: 'role',
    tags: ['html', 'css', 'javascript', 'react', 'angular'],
    totalNodes: 72,
    completedNodes: 12,
    nodes: [
      {
        id: 'internet', label: 'Internet', type: 'milestone', status: 'done',
        description: 'Understanding the fundamentals of how the internet works.',
        annotation: 'Learn the basics of how the web works',
        children: [
          { id: 'how-internet', label: 'How does the Internet work?', type: 'topic', status: 'done',
            description: 'The Internet is a global network of computers connected to each other which communicate through a standardized set of protocols.',
            resources: [
              { title: 'How Does the Internet Work?', url: 'https://cs.fyi/guide/how-does-internet-work', type: 'article' },
              { title: 'How the Internet Works in 5 Minutes', url: 'https://www.youtube.com/watch?v=7_LPdttKXPc', type: 'video' },
            ],
          },
          { id: 'what-is-http', label: 'What is HTTP?', type: 'topic', status: 'done',
            description: 'HTTP is the TCP/IP based application layer communication protocol which standardizes how the client and server communicate with each other.',
            resources: [
              { title: 'Everything you need to know about HTTP', url: 'https://cs.fyi/guide/http-in-depth', type: 'article' },
              { title: 'What is HTTP?', url: 'https://www.cloudflare.com/learning/ddos/glossary/hypertext-transfer-protocol-http/', type: 'article' },
            ],
          },
          { id: 'what-is-domain', label: 'What is a Domain Name?', type: 'topic', status: 'done',
            resources: [{ title: 'What is a Domain Name?', url: 'https://developer.mozilla.org/en-US/docs/Learn/Common_questions/What_is_a_domain_name', type: 'article' }],
          },
          { id: 'what-is-hosting', label: 'What is Hosting?', type: 'topic', status: 'done',
            resources: [{ title: 'What is Web Hosting?', url: 'https://www.namecheap.com/hosting/what-is-web-hosting-definition/', type: 'article' }],
          },
          { id: 'dns', label: 'DNS and how it works?', type: 'topic', status: 'done',
            description: 'The Domain Name System (DNS) is the phonebook of the Internet.',
            resources: [{ title: 'What is DNS?', url: 'https://www.cloudflare.com/learning/dns/what-is-dns/', type: 'article' }],
          },
          { id: 'browsers', label: 'Browsers and how they work?', type: 'topic', status: 'done',
            description: 'A web browser is a software application that enables a user to access and display web pages.',
            resources: [{ title: 'How Browsers Work', url: 'https://www.html5rocks.com/en/tutorials/internals/howbrowserswork/', type: 'article' }],
          },
        ],
      },
      {
        id: 'html', label: 'HTML', type: 'milestone', status: 'done',
        description: 'HTML provides the structure of a webpage.',
        children: [
          { id: 'html-basics', label: 'Learn the Basics', type: 'topic', status: 'done',
            resources: [{ title: 'W3Schools: Learn HTML', url: 'https://www.w3schools.com/html/', type: 'article' }],
          },
          { id: 'semantic-html', label: 'Writing Semantic HTML', type: 'topic', status: 'done',
            resources: [{ title: 'Guide to Semantic HTML', url: 'https://cs.fyi/guide/writing-semantic-html', type: 'article' }],
          },
          { id: 'forms', label: 'Forms and Validations', type: 'topic', status: 'done',
            resources: [{ title: 'MDN: Web Forms', url: 'https://developer.mozilla.org/en-US/docs/Learn/Forms', type: 'documentation' }],
          },
          { id: 'a11y', label: 'Accessibility', type: 'topic', status: 'in-progress',
            resources: [{ title: 'Web Accessibility', url: 'https://www.w3.org/WAI/tips/developing/', type: 'documentation' }],
          },
          { id: 'seo-basics', label: 'SEO Basics', type: 'topic', status: 'not-started',
            resources: [{ title: 'Google SEO Guide', url: 'https://developers.google.com/search/docs', type: 'article' }],
          },
        ],
      },
      {
        id: 'css', label: 'CSS', type: 'milestone', status: 'in-progress',
        description: 'CSS describes how HTML elements should be displayed on screen.',
        children: [
          { id: 'css-basics', label: 'Learn the Basics', type: 'topic', status: 'done' },
          { id: 'making-layouts', label: 'Making Layouts', type: 'topic', status: 'in-progress', description: 'Floats, Positioning, Display, Box Model, CSS Grid, Flexbox.' },
          { id: 'responsive', label: 'Responsive Design', type: 'topic', status: 'not-started' },
        ],
      },
      {
        id: 'javascript', label: 'JavaScript', type: 'milestone', status: 'in-progress',
        description: 'JavaScript allows you to add interactivity to your pages.',
        annotation: 'HTML, CSS and JavaScript are the core building blocks of the web',
        children: [
          { id: 'js-syntax', label: 'Syntax and Basic Constructs', type: 'topic', status: 'done' },
          { id: 'dom', label: 'Learn DOM Manipulation', type: 'topic', status: 'in-progress' },
          { id: 'fetch', label: 'Fetch API / Ajax (XHR)', type: 'topic', status: 'not-started' },
          { id: 'es6', label: 'ES6+ and Modular JS', type: 'topic', status: 'not-started' },
        ],
      },
      {
        id: 'beginner-projects', label: 'Beginner Project Ideas', type: 'checkpoint', status: 'not-started',
        annotation: 'At this point you should be able to build basic static websites',
        children: [],
      },
      {
        id: 'vcs', label: 'Version Control Systems', type: 'milestone', status: 'not-started',
        description: 'Version control systems track changes to your codebase and allow collaboration.',
        children: [
          { id: 'git', label: 'Git', type: 'topic', status: 'not-started', isRecommended: true,
            resources: [{ title: 'Git Documentation', url: 'https://git-scm.com/doc', type: 'documentation' }],
          },
        ],
      },
      {
        id: 'vcs-hosting', label: 'VCS Hosting', type: 'milestone', status: 'not-started',
        children: [
          { id: 'github', label: 'GitHub', type: 'topic', status: 'not-started', isRecommended: true },
          { id: 'gitlab', label: 'GitLab', type: 'topic', status: 'not-started' },
          { id: 'bitbucket', label: 'Bitbucket', type: 'topic', status: 'not-started' },
        ],
      },
      {
        id: 'pkg-managers', label: 'Package Managers', type: 'milestone', status: 'not-started',
        children: [
          { id: 'npm', label: 'npm', type: 'topic', status: 'not-started', isRecommended: true },
          { id: 'pnpm', label: 'pnpm', type: 'topic', status: 'not-started' },
          { id: 'yarn', label: 'yarn', type: 'topic', status: 'not-started' },
        ],
      },
      {
        id: 'frameworks', label: 'Pick a Framework', type: 'milestone', status: 'not-started',
        annotation: 'Pick any one — React is the most popular',
        children: [
          { id: 'react', label: 'React', type: 'topic', status: 'not-started', isRecommended: true,
            resources: [{ title: 'React Documentation', url: 'https://react.dev/', type: 'documentation' }],
          },
          { id: 'angular', label: 'Angular', type: 'topic', status: 'not-started',
            resources: [{ title: 'Angular Documentation', url: 'https://angular.dev/', type: 'documentation' }],
          },
          { id: 'vue', label: 'Vue.js', type: 'topic', status: 'not-started',
            resources: [{ title: 'Vue.js Documentation', url: 'https://vuejs.org/', type: 'documentation' }],
          },
          { id: 'svelte', label: 'Svelte', type: 'topic', status: 'not-started' },
        ],
      },
      {
        id: 'css-arch', label: 'Writing CSS', type: 'milestone', status: 'not-started',
        children: [
          { id: 'tailwind', label: 'Tailwind CSS', type: 'topic', status: 'not-started', isRecommended: true },
          { id: 'css-modules', label: 'CSS Modules', type: 'topic', status: 'not-started' },
          { id: 'styled-components', label: 'Styled Components', type: 'topic', status: 'not-started' },
          { id: 'sass', label: 'Sass', type: 'topic', status: 'not-started' },
        ],
      },
      {
        id: 'css-framework', label: 'CSS Frameworks', type: 'milestone', status: 'not-started',
        children: [
          { id: 'bootstrap', label: 'Bootstrap', type: 'topic', status: 'not-started' },
          { id: 'material-ui', label: 'Material UI', type: 'topic', status: 'not-started' },
          { id: 'chakra-ui', label: 'Chakra UI', type: 'topic', status: 'not-started' },
        ],
      },
      {
        id: 'build-tools', label: 'Build Tools', type: 'milestone', status: 'not-started',
        children: [
          { id: 'vite', label: 'Vite', type: 'topic', status: 'not-started', isRecommended: true },
          { id: 'esbuild', label: 'esbuild', type: 'topic', status: 'not-started' },
          { id: 'webpack', label: 'Webpack', type: 'topic', status: 'not-started' },
          { id: 'rollup', label: 'Rollup', type: 'topic', status: 'not-started' },
        ],
      },
      {
        id: 'linters', label: 'Linters and Formatters', type: 'milestone', status: 'not-started',
        children: [
          { id: 'eslint', label: 'ESLint', type: 'topic', status: 'not-started', isRecommended: true },
          { id: 'prettier', label: 'Prettier', type: 'topic', status: 'not-started', isRecommended: true },
        ],
      },
      {
        id: 'testing', label: 'Testing', type: 'milestone', status: 'not-started',
        annotation: 'Learn the difference between Unit, Integration, and E2E testing',
        children: [
          { id: 'vitest', label: 'Vitest', type: 'topic', status: 'not-started', isRecommended: true },
          { id: 'jest', label: 'Jest', type: 'topic', status: 'not-started' },
          { id: 'playwright', label: 'Playwright', type: 'topic', status: 'not-started', isRecommended: true },
          { id: 'cypress', label: 'Cypress', type: 'topic', status: 'not-started' },
        ],
      },
      {
        id: 'type-checkers', label: 'Type Checkers', type: 'milestone', status: 'not-started',
        children: [
          { id: 'typescript', label: 'TypeScript', type: 'topic', status: 'not-started', isRecommended: true,
            resources: [{ title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/', type: 'documentation' }],
          },
        ],
      },
      {
        id: 'intermediate-projects', label: 'Intermediate Project Ideas', type: 'checkpoint', status: 'not-started',
        annotation: 'In this section you should be able to build complete web applications',
        children: [],
      },
      {
        id: 'ssr', label: 'Server-Side Rendering', type: 'milestone', status: 'not-started',
        children: [
          { id: 'nextjs', label: 'Next.js', type: 'topic', status: 'not-started', isRecommended: true },
          { id: 'nuxt', label: 'Nuxt.js', type: 'topic', status: 'not-started' },
          { id: 'angular-ssr', label: 'Angular SSR', type: 'topic', status: 'not-started' },
          { id: 'svelte-kit', label: 'SvelteKit', type: 'topic', status: 'not-started' },
        ],
      },
      {
        id: 'graphql', label: 'GraphQL', type: 'milestone', status: 'not-started',
        children: [
          { id: 'apollo', label: 'Apollo Client', type: 'topic', status: 'not-started', isRecommended: true },
          { id: 'relay', label: 'Relay', type: 'topic', status: 'not-started' },
        ],
      },
      {
        id: 'ssg', label: 'Static Site Generators', type: 'milestone', status: 'not-started',
        children: [
          { id: 'astro', label: 'Astro', type: 'topic', status: 'not-started', isRecommended: true },
          { id: 'gatsby', label: 'Gatsby', type: 'topic', status: 'not-started' },
          { id: 'hugo', label: 'Hugo', type: 'topic', status: 'not-started' },
          { id: '11ty', label: 'Eleventy', type: 'topic', status: 'not-started' },
        ],
      },
      {
        id: 'pwa', label: 'Progressive Web Apps', type: 'milestone', status: 'not-started',
        children: [
          { id: 'service-workers', label: 'Service Workers', type: 'topic', status: 'not-started' },
          { id: 'web-apis', label: 'Web APIs (Storage, Sockets, etc.)', type: 'topic', status: 'not-started' },
          { id: 'pwa-performance', label: 'Performance (Lighthouse, DevTools)', type: 'topic', status: 'not-started' },
        ],
      },
      {
        id: 'mobile', label: 'Mobile Applications', type: 'milestone', status: 'not-started',
        children: [
          { id: 'react-native', label: 'React Native', type: 'topic', status: 'not-started', isRecommended: true },
          { id: 'flutter', label: 'Flutter', type: 'topic', status: 'not-started' },
          { id: 'ionic', label: 'Ionic', type: 'topic', status: 'not-started' },
        ],
      },
      {
        id: 'desktop', label: 'Desktop Applications', type: 'milestone', status: 'not-started',
        children: [
          { id: 'electron', label: 'Electron', type: 'topic', status: 'not-started', isRecommended: true },
          { id: 'tauri', label: 'Tauri', type: 'topic', status: 'not-started' },
        ],
      },
      {
        id: 'advanced-projects', label: 'Advanced Project Ideas', type: 'checkpoint', status: 'not-started',
        annotation: 'Keep learning and building — the ecosystem is always evolving',
        children: [],
      },
    ],
  },
  {
    id: 'backend', title: 'Backend Developer',
    description: 'Step by step guide to becoming a modern backend developer in 2026',
    icon: 'dns', category: 'role', tags: ['nodejs', 'python', 'databases', 'api'],
    totalNodes: 22, completedNodes: 3, nodes: [],
  },
  {
    id: 'devops', title: 'DevOps Engineer',
    description: 'Step by step guide for DevOps, SRE or any other Operations Role in 2026',
    icon: 'cloud_sync', category: 'role', tags: ['docker', 'kubernetes', 'ci/cd', 'aws'],
    totalNodes: 18, completedNodes: 0, nodes: [],
  },
  {
    id: 'fullstack', title: 'Full Stack Developer',
    description: 'Guide to becoming a full stack developer covering both frontend and backend',
    icon: 'layers', category: 'role', tags: ['frontend', 'backend', 'databases', 'deployment'],
    totalNodes: 35, completedNodes: 5, nodes: [],
  },
  {
    id: 'android', title: 'Android Developer',
    description: 'Step by step guide to becoming an Android developer in 2026',
    icon: 'phone_android', category: 'role', tags: ['kotlin', 'java', 'android', 'mobile'],
    totalNodes: 20, completedNodes: 0, nodes: [],
  },
  {
    id: 'react-skill', title: 'React',
    description: 'Everything you need to become a React developer',
    icon: 'code', category: 'skill', tags: ['react', 'hooks', 'redux', 'nextjs'],
    totalNodes: 20, completedNodes: 12, nodes: [],
  },
  {
    id: 'angular-skill', title: 'Angular',
    description: 'Everything you need to become an Angular developer',
    icon: 'code', category: 'skill', tags: ['angular', 'typescript', 'rxjs', 'ngrx'],
    totalNodes: 18, completedNodes: 14, nodes: [],
  },
  {
    id: 'typescript-skill', title: 'TypeScript',
    description: 'Learn TypeScript from beginner to advanced',
    icon: 'code', category: 'skill', tags: ['typescript', 'types', 'generics'],
    totalNodes: 15, completedNodes: 6, nodes: [],
  },
  {
    id: 'nodejs-skill', title: 'Node.js',
    description: 'Step by step guide to becoming a Node.js developer',
    icon: 'terminal', category: 'skill', tags: ['nodejs', 'express', 'nestjs', 'api'],
    totalNodes: 16, completedNodes: 4, nodes: [],
  },
  {
    id: 'system-design', title: 'System Design',
    description: 'Learn how to design large-scale systems',
    icon: 'hub', category: 'skill', tags: ['architecture', 'scalability', 'distributed-systems'],
    totalNodes: 14, completedNodes: 2, nodes: [],
  },
  {
    id: 'docker-skill', title: 'Docker',
    description: 'Complete guide to containerization with Docker',
    icon: 'inventory_2', category: 'skill', tags: ['docker', 'containers', 'devops'],
    totalNodes: 12, completedNodes: 0, nodes: [],
  },
  {
    id: 'aws-skill', title: 'AWS',
    description: 'Step by step guide to learning Amazon Web Services',
    icon: 'cloud', category: 'skill', tags: ['aws', 'cloud', 'ec2', 's3', 'lambda'],
    totalNodes: 20, completedNodes: 3, nodes: [],
  },
  {
    id: 'my-career', title: 'My Career Path',
    description: 'Personal career development roadmap',
    icon: 'trending_up', category: 'custom', tags: ['career', 'personal'],
    totalNodes: 10, completedNodes: 4, nodes: [],
  },
];
