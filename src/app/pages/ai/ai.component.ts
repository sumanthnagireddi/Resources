import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  OnInit,
  AfterViewChecked,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { AiService } from '../../services/ai.service';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

@Component({
  selector: 'app-ai',
  templateUrl: './ai.component.html',
  styleUrls: ['./ai.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule],
})
export class AiComponent implements OnInit, AfterViewChecked {
  private http = inject(HttpClient);
  readonly themeService = inject(ThemeService);
  readonly ragService = inject(AiService);

  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  chats: Chat[] = [];
  filteredChats: Chat[] = [];
  activeChatId: string | null = null;
  chatTitle = 'New conversation';
  userInput = '';
  sidebarOpen = false;
  isGenerating = false;
  private shouldScrollToBottom = false;

  suggestions = [
    'Explain quantum computing',
    'Write a short poem',
    'Help me brainstorm ideas',
    'Summarise a topic for me',
  ];

  ngOnInit() {
    this.chats = JSON.parse(localStorage.getItem('aria_chats') || '[]');
    this.filteredChats = [...this.chats];
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.messageContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  get currentMessages(): Message[] {
    const chat = this.chats.find((c) => c.id === this.activeChatId);
    return chat ? chat.messages : [];
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  newChat() {
    this.activeChatId = null;
    this.chatTitle = 'New conversation';
    this.sidebarOpen = false;
  }

  loadChat(id: string) {
    this.activeChatId = id;
    const chat = this.chats.find((c) => c.id === id);
    if (chat) this.chatTitle = chat.title;
    this.sidebarOpen = false;
    this.shouldScrollToBottom = true;
  }

  useSuggestion(text: string) {
    this.userInput = text;
    this.sendMessage();
  }

  sendMessage() {
    const text = this.userInput.trim();
    if (!text || this.isGenerating) return;

    if (!this.activeChatId) {
      const id = Date.now().toString();
      this.activeChatId = id;
      this.chats.unshift({
        id,
        title: text.length > 45 ? text.slice(0, 45) + '…' : text,
        messages: [],
        createdAt: new Date().toISOString(),
      });
    }

    const chat = this.chats.find((c) => c.id === this.activeChatId)!;
    chat.messages.push({ role: 'user', content: text });
    this.userInput = '';
    this.isGenerating = true;
    this.saveChats();
    this.shouldScrollToBottom = true;

    // Reset textarea height
    setTimeout(() => {
      const ta = document.querySelector('textarea');
      if (ta) {
        ta.style.height = 'auto';
      }
    });

    // Real API call
    this.http
      .post<{
        data: string;
      }>(`${environment.API_URL}/ai/ask`, { question: text })
      .subscribe({
        next: (res) => {
          chat.messages.push({
            role: 'assistant',
            content: res.data,
          });
          this.isGenerating = false;
          this.saveChats();
          this.shouldScrollToBottom = true;
        },
        error: (err) => {
          chat.messages.push({
            role: 'assistant',
            content: 'Sorry, something went wrong. Please try again.',
          });
          this.isGenerating = false;
          this.saveChats();
        },
      });
  }
  answer = '';
  isStreaming = false;

  ask() {
    this.answer = '';
    this.isStreaming = true;
  const text = this.userInput.trim();
    if (!text || this.isGenerating) return;

    this.ragService.askStream(text).subscribe({
      next: (token) => (this.answer += token), // ✅ appends each token
      complete: () => (this.isStreaming = false),
      error: () => (this.isStreaming = false),
    });
  }

  private getMockResponse(input: string): string {
    const responses = [
      `That's an interesting question. Here's what I think:\n\n**Key points to consider:**\n\nFirstly, this depends on the context you're working in. Let me break it down step by step so it's easier to follow.\n\nFeel free to ask me to elaborate on any specific part.`,
      `Great question! Here's a concise answer:\n\n> The best approach is always to start simple and iterate.\n\nYou can expand on this by exploring related topics — just let me know where you'd like to dive deeper.`,
      `I can help with that. Here's my take:\n\nThe topic you've asked about is multifaceted. **In short:** there are several angles to consider, and the right path depends on your specific goals.\n\nShall I explore any particular angle in more detail?`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  deleteChat(e: Event, id: string) {
    e.stopPropagation();
    this.chats = this.chats.filter((c) => c.id !== id);
    if (this.activeChatId === id) {
      this.activeChatId = null;
      this.chatTitle = 'New conversation';
    }
    this.saveChats();
  }

  searchChats(event: Event) {
    const val = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.filteredChats = val
      ? this.chats.filter(
          (c) =>
            c.title.toLowerCase().includes(val) ||
            c.messages.some((m) => m.content.toLowerCase().includes(val)),
        )
      : [...this.chats];
  }

  handleEnter(event: any) {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  autoResize(event: Event) {
    const ta = event.target as HTMLTextAreaElement;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
  }

  saveChats() {
    localStorage.setItem('aria_chats', JSON.stringify(this.chats));
    this.filteredChats = [...this.chats];
  }

  renderMarkdown(md: string): string {
    if (!md) return '';
    let html = md
      // Code blocks
      .replace(
        /```(\w+)?\n?([\s\S]*?)```/g,
        '<pre class="code-block"><code>$2</code></pre>',
      )
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Blockquote
      .replace(/^> (.+)$/gm, '<blockquote class="bq">$1</blockquote>')
      // Headings
      .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')
      // Unordered list items
      .replace(/^[\-\*] (.+)$/gm, '<li class="md-li">$1</li>')
      // Wrap consecutive <li> in <ul>
      .replace(
        /(<li class="md-li">.*<\/li>\n?)+/g,
        (m) => `<ul class="md-ul">${m}</ul>`,
      )
      // Paragraphs (double newline)
      .replace(/\n\n/g, '</p><p class="md-p">')
      // Single newline to <br>
      .replace(/\n/g, '<br>');

    return `<p class="md-p">${html}</p>`;
  }
}
