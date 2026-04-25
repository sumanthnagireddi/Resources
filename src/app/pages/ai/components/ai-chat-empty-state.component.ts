import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-ai-chat-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-chat-empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiChatEmptyStateComponent {
  readonly suggestions = input<string[]>([]);
  readonly suggestionSelected = output<string>();

  protected chooseSuggestion(prompt: string): void {
    this.suggestionSelected.emit(prompt);
  }

  protected trackByValue(_index: number, value: string): string {
    return value;
  }
}
