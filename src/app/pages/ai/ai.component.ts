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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiChatPageStore } from './services/ai-chat-page.store';
import { AiChatEmptyStateComponent } from './components/ai-chat-empty-state.component';
import { AiChatThreadComponent } from './components/ai-chat-thread.component';
import { AiChatComposerComponent } from './components/ai-chat-composer.component';

@Component({
  selector: 'app-ai',
  standalone: true,
  imports: [
    CommonModule,
    AiChatEmptyStateComponent,
    AiChatThreadComponent,
    AiChatComposerComponent,
  ],
  templateUrl: './ai.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AiChatPageStore],
  host: {
    class: 'block h-full min-h-0',
  },
})
export class AiComponent implements OnInit, AfterViewChecked, OnDestroy {
  readonly store = inject(AiChatPageStore);

  @ViewChild('messageContainer') private readonly messageContainer?: ElementRef<HTMLDivElement>;

  private shouldScrollToBottom = false;

  constructor() {
    effect(() => {
      if (this.store.scrollVersion() === 0) {
        return;
      }

      this.shouldScrollToBottom = true;
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

  protected updateDraft(text: string): void {
    this.store.updateDraft(text);
  }

  protected sendMessage(): void {
    this.store.sendDraft();
  }

  protected useSuggestion(suggestion: string): void {
    this.store.sendSuggestion(suggestion);
  }
}
