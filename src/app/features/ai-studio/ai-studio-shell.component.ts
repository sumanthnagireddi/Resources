import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiMarkdownService } from '../ai-chat/services/ai-markdown.service';
import { AiStudioComposerComponent } from './components/ai-studio-composer.component';
import { AiStudioEmptyStateComponent } from './components/ai-studio-empty-state.component';
import { AiStudioHeaderComponent } from './components/ai-studio-header.component';
import { AiStudioSidebarComponent } from './components/ai-studio-sidebar.component';
import { AiStudioThreadComponent } from './components/ai-studio-thread.component';
import { AiStudioStore } from './services/ai-studio.store';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-ai-studio-shell',
  standalone: true,
  imports: [
    CommonModule,
    AiStudioHeaderComponent,
    AiStudioSidebarComponent,
    AiStudioThreadComponent,
    AiStudioComposerComponent,
    AiStudioEmptyStateComponent,
  ],
  templateUrl: './ai-studio-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AiStudioStore],
  host: {
    class: 'block h-full min-h-0',
  },
})
export class AiStudioShellComponent implements OnInit, AfterViewChecked, OnDestroy {
  readonly store = inject(AiStudioStore);
  readonly themeService = inject(ThemeService);
  private readonly markdownService = inject(AiMarkdownService);

  @ViewChild('messageContainer') private readonly messageContainer?: ElementRef<HTMLDivElement>;

  protected readonly showWorkspacePanel = signal(false);
  private shouldScrollToBottom = false;

  constructor() {
    effect(() => {
      if (this.store.scrollVersion() === 0) {
        return;
      }

      this.shouldScrollToBottom = true;
    });

    effect(() => {
      this.markdownService.setTheme(this.themeService.isDarkMode() ? 'dark' : 'light');
    });
  }

  ngOnInit(): void {
    this.store.initialize();
  }

  ngAfterViewChecked(): void {
    if (!this.shouldScrollToBottom) {
      return;
    }

    this.messageContainer?.nativeElement.scrollTo({
      top: this.messageContainer.nativeElement.scrollHeight,
      behavior: 'smooth',
    });
    this.shouldScrollToBottom = false;
  }

  ngOnDestroy(): void {
    this.store.destroy();
  }

  protected toggleWorkspacePanel(): void {
    this.showWorkspacePanel.update((value) => !value);
  }

  protected closeWorkspacePanel(): void {
    this.showWorkspacePanel.set(false);
  }

  protected handleNewConversation(): void {
    this.store.startNewConversation();
    this.closeWorkspacePanel();
  }

  protected handleAgentSelected(agentId: Parameters<AiStudioStore['selectAgent']>[0]): void {
    this.store.selectAgent(agentId);
    this.closeWorkspacePanel();
  }

  protected handleConversationSelected(
    conversationId: Parameters<AiStudioStore['selectConversation']>[0],
  ): void {
    this.store.selectConversation(conversationId);
    this.closeWorkspacePanel();
  }

  protected usePrompt(prompt: string): void {
    this.store.sendPrompt(prompt);
  }
}
