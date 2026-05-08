import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AiStudioLiveRun, AiStudioMessage } from '../models/ai-studio.models';
import { AiStudioMessageComponent } from './ai-studio-message.component';
import { AiStudioRunStatusComponent } from './ai-studio-run-status.component';

@Component({
  selector: 'app-ai-studio-thread',
  standalone: true,
  imports: [CommonModule, AiStudioMessageComponent, AiStudioRunStatusComponent],
  templateUrl: './ai-studio-thread.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiStudioThreadComponent {
  readonly messages = input.required<AiStudioMessage[]>();
  readonly liveRun = input<AiStudioLiveRun | null>(null);

  readonly followUpSelected = output<string>();

  protected trackByMessageId(_index: number, message: AiStudioMessage): string {
    return message.id;
  }
}
