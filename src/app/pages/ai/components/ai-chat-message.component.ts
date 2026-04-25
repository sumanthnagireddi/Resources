import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { AiMarkdownService } from '../../../features/ai-chat/services/ai-markdown.service';
import { AiPageMessage } from '../models/ai-page.models';

@Component({
  selector: 'app-ai-chat-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-chat-message.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiChatMessageComponent {
  private readonly markdownService = inject(AiMarkdownService);

  readonly message = input.required<AiPageMessage>();

  protected renderContent(content: string): string {
    return this.markdownService.render(content);
  }
}
