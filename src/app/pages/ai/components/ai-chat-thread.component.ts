import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AiPageMessage } from '../models/ai-page.models';
import { AiChatMessageComponent } from './ai-chat-message.component';
import { AiChatTypingIndicatorComponent } from './ai-chat-typing-indicator.component';

@Component({
  selector: 'app-ai-chat-thread',
  standalone: true,
  imports: [CommonModule, AiChatMessageComponent, AiChatTypingIndicatorComponent],
  templateUrl: './ai-chat-thread.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiChatThreadComponent {
  readonly messages = input<AiPageMessage[]>([]);
  readonly isGenerating = input(false);
  readonly spinnerVerb = input('');

  protected trackById(_index: number, message: AiPageMessage): string {
    return message.id;
  }
}
