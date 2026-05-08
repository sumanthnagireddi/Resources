import { Injectable } from '@angular/core';
import { SidebarNode } from '../app.component';

@Injectable({ providedIn: 'root' })
export class SidebarDataService {
  readonly nodes: SidebarNode[] = [
    {
      id: 'eng', title: 'Engineering', type: 'space', permissions: 'public', starred: true,
      children: [
        {
          id: 'fe', title: 'Frontend', type: 'page', permissions: 'public', starred: true,
          children: [
            { id: 'ng', title: 'Angular Docs', type: 'page', permissions: 'public', starred: false, children: [] },
            { id: 'rx', title: 'React Docs', type: 'page', permissions: 'private', starred: false, children: [] },
            { id: 'vue', title: 'Vue.js Guide', type: 'page', permissions: 'public', starred: false, children: [] },
          ]
        },
        {
          id: 'be', title: 'Backend', type: 'page', permissions: 'public', starred: false,
          children: [
            { id: 'api', title: 'API Design', type: 'page', permissions: 'restricted', starred: false, children: [] },
            { id: 'db', title: 'Database Schema', type: 'page', permissions: 'private', starred: true, children: [] },
          ]
        },
        {
          id: 'devops', title: 'DevOps', type: 'page', permissions: 'public', starred: false,
          children: [
            { id: 'ci', title: 'CI/CD Pipeline', type: 'page', permissions: 'public', starred: false, children: [] },
          ]
        },
      ]
    },
    {
      id: 'hr', title: 'HR & Culture', type: 'space', permissions: 'restricted', starred: false,
      children: [
        {
          id: 'onb', title: 'Onboarding', type: 'page', permissions: 'public', starred: true,
          children: [
            { id: 'day1', title: 'Day 1 Guide', type: 'page', permissions: 'public', starred: false, children: [] },
          ]
        },
        { id: 'pol', title: 'Policies', type: 'page', permissions: 'restricted', starred: false, children: [] },
        { id: 'ben', title: 'Benefits', type: 'page', permissions: 'public', starred: false, children: [] },
      ]
    },
    {
      id: 'prod', title: 'Product', type: 'space', permissions: 'public', starred: true,
      children: [
        { id: 'road', title: 'Roadmap Q3', type: 'page', permissions: 'public', starred: false, children: [] },
        { id: 'spec', title: 'Design Specs', type: 'page', permissions: 'restricted', starred: false, children: [] },
        { id: 'meet', title: 'Meeting Notes', type: 'page', permissions: 'public', starred: false, children: [] },
      ]
    },
  ];

  findNode(id: string, nodes = this.nodes): SidebarNode | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children) {
        const found = this.findNode(id, n.children);
        if (found) return found;
      }
    }
    return null;
  }

  findPath(id: string, nodes = this.nodes, path: string[] = []): string[] | null {
    for (const n of nodes) {
      const p = [...path, n.title];
      if (n.id === id) return p;
      if (n.children) {
        const found = this.findPath(id, n.children, p);
        if (found) return found;
      }
    }
    return null;
  }

  matchesSearch(node: SidebarNode, query: string): boolean {
    if (!query) return true;
    const q = query.toLowerCase();
    if (node.title.toLowerCase().includes(q)) return true;
    return node.children?.some(c => this.matchesSearch(c, q)) ?? false;
  }
}