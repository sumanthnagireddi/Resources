// ====================== ROADMAP ======================
export type NodeStatus = 'done' | 'in-progress' | 'not-started' | 'skip';

export interface RoadmapResource {
  title: string;
  url: string;
  type: 'article' | 'video' | 'course' | 'documentation';
}

export interface RoadmapNode {
  id: string;
  label: string;
  description?: string;
  type: 'milestone' | 'topic' | 'subtopic' | 'checkpoint';
  status: NodeStatus;
  children?: RoadmapNode[];
  resources?: RoadmapResource[];
  isRecommended?: boolean;
  annotation?: string;
}

export interface Roadmap {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'role' | 'skill' | 'custom';
  tags?: string[];
  totalNodes: number;
  completedNodes: number;
  nodes: RoadmapNode[];
  createdAt?: string;
  updatedAt?: string;
}

// ====================== JOBS ======================
export type JobStatus =
  | 'wishlist'
  | 'applied'
  | 'phone-screen'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

export interface JobApplication {
  id: string;
  company: string;
  position: string;
  location: string;
  type: 'remote' | 'onsite' | 'hybrid';
  status: JobStatus;
  salary?: string;
  url?: string;
  notes?: string;
  appliedDate?: string;
  interviewDate?: string;
  tags?: string[];
  contactPerson?: string;
  contactEmail?: string;
  logo?: string;
}

// ====================== PROJECTS ======================
export type ProjectStatus =
  | 'planning'
  | 'in-progress'
  | 'completed'
  | 'on-hold'
  | 'archived';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number; // 0-100
  techStack: string[];
  repoUrl?: string;
  demoUrl?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  tasks?: ProjectTask[];
}

export interface ProjectTask {
  id: string;
  title: string;
  completed: boolean;
}

// ====================== BOOKMARKS ======================
export interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: string;
  tags?: string[];
  favicon?: string;
  createdAt?: string;
  isPinned?: boolean;
}

// ====================== IDEAS ======================
export type IdeaStatus = 'new' | 'exploring' | 'in-progress' | 'done' | 'parked';
export type IdeaPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Idea {
  id: string;
  title: string;
  description: string;
  status: IdeaStatus;
  priority: IdeaPriority;
  category?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  votes?: number;
}

// ====================== INTERVIEW BANK ======================
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface InterviewQuestion {
  id: string;
  question: string;
  answer: string;
  category: string;
  subcategory?: string;
  difficulty: QuestionDifficulty;
  tags?: string[];
  codeExample?: string;
  isReviewed?: boolean;
  isFavorite?: boolean;
  notes?: string;
  createdAt?: string;
}
