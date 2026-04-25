import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-ai-chat-typing-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-chat-typing-indicator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiChatTypingIndicatorComponent {
  readonly spinnerVerb = input('Thinking');
}
